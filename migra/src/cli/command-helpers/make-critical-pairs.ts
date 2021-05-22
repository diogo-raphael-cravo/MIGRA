import * as Path from 'path';
import {
    mkdir,
    readFileIgnore,
    writeFile,
    awaitForEachArray,
    writeJSON,
} from '../helpers';
import { logger } from '../logger';
import { AGGLoadAndSave } from '../run-agg';
import {
    VerigraphAnalysis,
    VerigraphAnalysisSaveOutput,
} from '../run-verigraph';
import { CriticalPairsType } from '../../core/graph-grammars/critical-pairs';
import {
    CPXCriticalPairsType,
    toCriticalPairs,
    merge as mergeCriticalPairs,
} from '../../core/graph-grammars/critical-pairs-cpx';
import { GraGra } from '../../core/graph-grammars/ggx/graph-types';
import * as GGXWriter from '../../core/graph-grammars/ggx/writer';
import * as GGXParser from '../../core/graph-grammars/ggx/parser';
import * as CPXParser from '../../core/graph-grammars/cpx/parser';
import CriticalPairsVerigraphGUI from '../../core/graph-grammars/critical-pairs-parser-gui';
import { VerifierType } from '../../core/verification/verifier';
import { GrammarType, merge as mergeVerificationGrammars } from '../../core/verification/grammar';
import {
    retypeEdges,
} from '../../core/graph-grammars/ggx/iterator';
import {
    toVerifGrammar,
    VerifGrammarType,
} from '../../core/graph-grammars/verif-grammar';
import {
    readGrammar,
    readCPXGrammar,
} from '../command-helpers/read-grammar';
import { NodeRolesEnum } from '../../core/graph-grammars/verif-grammar-id-map';
import { split } from '../../core/graph-grammars/ggx/splitter';
import { v4 as uuidv4 } from 'uuid';

function randomFolder(): string {
    return `temp-${uuidv4()}`;
}

function randomFilename(): string {
    return `temp-${uuidv4()}.ggx`;
}

export async function fromCPX(cpxPath: string, verifier: VerifierType): Promise<CPXCriticalPairsType> {
    const cpxText = await readFileIgnore(cpxPath);
    if (!cpxText) {
        return null;
    }
    let graGraCpx: CPXParser.GraGraCPX;
    try {
        graGraCpx = await CPXParser.parseXml(cpxText);
        const firstRule = graGraCpx.grammar.rules[0];
        if (firstRule && firstRule.ID !== firstRule.name) {
            logger.debug({ cpxPath }, 'setting rule IDs to names');
            let fixedText = cpxText;
            graGraCpx.grammar.rules.forEach(rule => {
                fixedText = fixedText.replace(new RegExp(`"${rule.ID}"`, 'g'), `"${rule.name}"`);
            });
            graGraCpx = await CPXParser.parseXml(fixedText);
        }
    } catch (error) {
        logger.trace({ stack: error.stack });
        logger.error(`error processing cpx ${cpxPath}. Error ${error}`);
        return null;
    }
    const verifGrammar = toVerifGrammar(graGraCpx.grammar, verifier);
    const valueNodeEntry = verifGrammar.idMap.find(({ name }) => name === verifier.valueNodeName);
    try {
        return toCriticalPairs(graGraCpx, verifGrammar.idMap, valueNodeEntry);
    } catch (error) {
        logger.trace({ stack: error.stack });
        logger.error(`error processing cpx ${cpxPath}. Error ${error}`);
        return null;
    }
}

export async function fromGGX(ggxPath: string, tmpDirPath: string): Promise<CriticalPairsType> {
    const tmpdir = Path.join(tmpDirPath, 'grammars');
    await mkdir(tmpdir, { recursive: true });
    const tmpPath = Path.join(tmpdir, randomFilename());

    await AGGLoadAndSave(ggxPath, tmpPath);
    const ggxText = await readFileIgnore(tmpPath);
    if (!ggxText) {
        return null;
    }
    const ggx = await GGXParser.parseXml(ggxText);
    return await VerigraphAnalysis(ggx.rules.map(({ name }) => name), tmpPath);
}

/**
 * Verigraph requires each edge type to connect at most two node types.
 * An edge type reused such as in the example below causes an error such as following:
 * 
 *      Rule 'Nmockgenerate': left morphism: domain: The morphism doesn't preserve incidence/adjacency
 * 
 * Example edge types:
 * 
 *      nodeA    ---edgeOk--->       nodeB
 *               ---edgeError--->    nodeB
 *      nodeC    ---edgeError--->    nodeD
 *        //-------------\\
 *        \/             ||
 *      nodeA    ---otherEdgeOk
 */
async function fixForVerigraph(inputGrammar: GraGra): Promise<GraGra> {
    // iterate type graph, rename edge types
    const types: string[] = [];
    inputGrammar.types.typeGraph = retypeEdges(inputGrammar.types.typeGraph, types);
    // iterate types, remove all edgetypes, add new edgetypes
    inputGrammar.types.edges = inputGrammar.types.edges 
        .map(edge => {
            const typesThisEdge = types.filter(type => type.startsWith(edge.ID));
            return typesThisEdge.map(type => ({
                ...edge,
                ID: type,
            }));
        })
        .reduce((prev, curr) => [...prev, ...curr], []);
    // iterate graphs, for each edge, read source/target types and change edge type
    inputGrammar.rules = inputGrammar.rules.map(rule => {
        const graphs = rule.graphs.map(graph => retypeEdges(graph));
        const newRule = {
            ...rule,
            graphs,
        };
        if (rule.applCondition) {
            newRule.applCondition.nacs = rule.applCondition.nacs.map(nac => ({
                ...nac,
                graph: retypeEdges(nac.graph),
            }));
        }
        return newRule;
    });
    return inputGrammar;
}

async function prepareGrammar(ggxPath: string, tmpdir: string): Promise<string> {
    const inputGrammar = await readGrammar(ggxPath);

    const fixedGrammar = await fixForVerigraph(inputGrammar);
    const grammarText = GGXWriter.writeGrammar(fixedGrammar);
    const fixedPath = Path.join(tmpdir, `fixed-${randomFilename()}`);
    await writeFile(fixedPath, grammarText);

    const aggSavedPath = Path.join(tmpdir, `agg-${randomFilename()}`);
    await AGGLoadAndSave(fixedPath, aggSavedPath);
    return aggSavedPath;
}

export async function fromCPXToJson(cpxPath: string, analysisPath: string, verifier: VerifierType): Promise<void> {
    const grammar = await readCPXGrammar(cpxPath, verifier);
    const cpxCriticalPairs = await fromCPX(cpxPath, verifier);
    
    const analysis: AnalysisType = {
        grammar,
        cpxCriticalPairs,
    };
    await writeJSON(Path.dirname(analysisPath), Path.basename(analysisPath).replace(Path.extname(analysisPath), ''), analysis);
}

export async function fromGGXToCPX(ggxPath: string, analysisPath: string, verifier: VerifierType, tmpDirPath: string): Promise<void> {
    const tmpdir = Path.join(tmpDirPath, 'grammars', randomFolder());
    await mkdir(tmpdir, { recursive: true });

    const aggSavedPath = await prepareGrammar(ggxPath, tmpdir);
    const cpxPath = analysisPath.replace('.json', '.cpx');
    await VerigraphAnalysisSaveOutput(aggSavedPath, cpxPath);

    const grammar = await readCPXGrammar(cpxPath, verifier);
    const cpxCriticalPairs = await fromCPX(cpxPath, verifier);
    
    const analysis: AnalysisType = {
        grammar,
        cpxCriticalPairs,
    };
    await writeJSON(Path.dirname(analysisPath), Path.basename(analysisPath).replace(Path.extname(analysisPath), ''), analysis);
}

export type AnalysisType = {
    grammar: GrammarType,
    cpxCriticalPairs: CPXCriticalPairsType,
};
export async function fromGGXToCPXFast(ggxPath: string, analysisPath: string, verifier: VerifierType, tmpDirPath: string): Promise<void> {
    const tmpdir = Path.join(tmpDirPath, 'grammars', randomFolder());
    await mkdir(tmpdir, { recursive: true });

    const aggSavedPath = await prepareGrammar(ggxPath, tmpdir);

    const aggGrammar = await readGrammar(aggSavedPath);
    // split after fix, so that value-of, attribute-of and resource-of edges are multiplied
    // with these edges multiplied, they are not shared between many rules,
    // thus yielding more grammars
    const verifGrammar: VerifGrammarType = toVerifGrammar(aggGrammar, verifier);
    const moduleIds = verifGrammar.idMap
        .filter(id => id.role === NodeRolesEnum.MODULE)
        .map(id => id.ID);
    const grammars = split(aggGrammar, moduleIds);

    // console.log('found ', grammars.length, ' grammars');
    // const t = grammars.reduce((prev, curr) => {
    //     return prev + curr.rules.length;
    // }, 0);
    // const min = grammars.reduce((prev, curr) => {
    //     if (curr.rules.length < prev) {
    //         return curr.rules.length;
    //     }
    //     return prev;
    // }, grammars[0].rules.length);
    // const max = grammars.reduce((prev, curr) => {
    //     if (curr.rules.length > prev) {
    //         return curr.rules.length;
    //     }
    //     return prev;
    // }, grammars[0].rules.length);
    // console.log('they sum ', t, ' rules with min ', min, ' and max ', max);

    const cpxGrammars = [];
    const criticalPairs = [];
    await awaitForEachArray(grammars, async (grammar, i) => {
        const grammarText = GGXWriter.writeGrammar(grammar);
        const grammarPath = Path.join(tmpdir, randomFilename());
        await writeFile(grammarPath, grammarText);
        
        const analysisPath = Path.join(tmpdir, `verigraph-confs-deps-chunk${i}.cpx`);
        await VerigraphAnalysisSaveOutput(grammarPath, analysisPath);

        const cpxGrammar = await readCPXGrammar(analysisPath, verifier);
        cpxGrammars.push(cpxGrammar);
        const pairs = await fromCPX(analysisPath, verifier);
        criticalPairs.push(pairs);
    });

    const analysis: AnalysisType = {
        grammar: mergeVerificationGrammars(cpxGrammars),
        cpxCriticalPairs: mergeCriticalPairs(criticalPairs),
    };
    await writeJSON(Path.dirname(analysisPath), Path.basename(analysisPath).replace(Path.extname(analysisPath), ''), analysis);
}

export async function fromTXT(confsDepPath: string, ruleNames: string[]): Promise<CriticalPairsType> {
    const confsDepsText = await readFileIgnore(confsDepPath);
    if (null === confsDepsText) {
        return null;
    }
    return CriticalPairsVerigraphGUI.parseTables(ruleNames, confsDepsText);
}