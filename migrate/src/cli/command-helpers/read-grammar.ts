import { readFileIgnore } from '../helpers';
import * as CPXParser from '../../core/graph-grammars/cpx/parser';
import * as GGXParser from '../../core/graph-grammars/ggx/parser';
import { toVerifGrammar } from '../../core/graph-grammars/verif-grammar';
import { VerifierType } from '../../core/verification/verifier';
import { decorateRules } from '../../core/verification/verifier';
import { GrammarType } from '../../core/verification/grammar';
import { logger } from '../logger';
import { GraGra } from '../../core/graph-grammars/ggx/graph-types';

export async function readCPXGrammar(cpxPath: string, verifier: VerifierType): Promise<GrammarType> {
    const cpxText = await readFileIgnore(cpxPath);
    if (!cpxText) {
        return null;
    }
    let graGraCpx: CPXParser.GraGraCPX;
    try {
        graGraCpx = await CPXParser.parseXml(cpxText);
    } catch (error) {
        logger.trace({
            stack: error.stack,
        });
        logger.error(`error processing cpx ${cpxPath}. Error ${error}`);
        return null;
    }
    const verifGrammar = toVerifGrammar(graGraCpx.grammar, verifier);
    const decoratedRules = decorateRules(verifGrammar.rules, verifier);
    return {
        ...verifGrammar,
        rules: decoratedRules,
    };
}

export async function readCPX(path: string): Promise<CPXParser.GraGraCPX> {
    const cpxText = await readFileIgnore(path);
    if (null === cpxText) {
        logger.debug(`missing cpx at path ${path}`);
        return null;
    }
    return await await CPXParser.parseXml(cpxText);
}

export async function readGrammar(path: string): Promise<GraGra> {
    const grammarText = await readFileIgnore(path);
    if (null === grammarText) {
        logger.debug(`missing grammar at path ${path}`);
        return null;
    }
    return await GGXParser.parseXml(grammarText);
}

export async function readGGXGrammar(ggxPath: string, verifier: VerifierType): Promise<GrammarType> {
    const ggxText = await readFileIgnore(ggxPath);
    if (!ggxText) {
        return null;
    }
    const graGra = await GGXParser.parseXml(ggxText);
    const verifGrammar = toVerifGrammar(graGra, verifier);
    const decoratedRules = decorateRules(verifGrammar.rules, verifier);
    return {
        ...verifGrammar,
        rules: decoratedRules,
    };
}