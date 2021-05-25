import * as Path from 'path';

import { logger } from '../logger';
import {
    readFileIgnore,
    readdir,
    mkdir,
    writeJSON,
    awaitForEachArray,
    awaitForEachDictionary,
    Dictionary,
} from '../helpers';
import { AnalysisType } from '../command-helpers/make-critical-pairs';

import {
    SetType,
    setUnion,
    setDifference,
    setIntersection,
} from '../../core/helpers/sets';
import {
    ExperimentData,
    extractExperimentData,
} from '../../core/verification/experiment';
import { GrammarType } from '../../core/verification/grammar';
import {
    ALL_WARNINGS,
    WarningType,
    equalWarnings,
    makeWarnings,
} from '../../core/verification/warning';
import {
    ModuleNetRequirementsType,
    RequirementType,
} from '../../core/verification/module-net';
import { VerifierType } from '../../core/verification/verifier';
import { CPXCriticalPairsType } from '../../core/graph-grammars/critical-pairs-cpx';

type ReportType = {
    data: ExperimentData,
    warnings: WarningType[],
};

function doVerify(verifGrammar: GrammarType, criticalPairs: CPXCriticalPairsType, verifier: VerifierType): ReportType {
    try {
        const data = extractExperimentData(verifGrammar, criticalPairs, verifier);
        const warnings = makeWarnings(data, ALL_WARNINGS);
        return {
            data,
            warnings,
        };
    } catch (error) {
        logger.error({
            message: error.message,
            stack: error.stack,
        }, 'failed to verify grammar');
        return null;
    }
}

async function parseModuleNet(moduleNetsDir: string, moduleNetFolder: string): Promise<ModuleNetRequirementsType> {
    const sourceDir = Path.join(moduleNetsDir, moduleNetFolder);

    const requirementsPath = Path.join(sourceDir, 'requirements.json');
    const requirementsText = await readFileIgnore(requirementsPath);
    if (null === requirementsText) {
        logger.debug(`ignoring ${moduleNetFolder}`);
        return null;
    }
    try {
        return JSON.parse(requirementsText);
    } catch (error) {
        logger.error({
            message: error.message,
            stack: error.stack,
        }, 'cannot parse module net');
        return null;
    }
}

type RequirementsResultType = {
    requirementsMet: SetType<WarningType>,
    missedRequirements?: SetType<WarningType>,
};

type ExperimentResultType = {
    mainRequirements: RequirementsResultType,
    extraRequirements: RequirementsResultType,
    extraWarnings?: SetType<WarningType>,
};

function makeRequirements(requirements: RequirementType[], report: ReportType): RequirementsResultType {
    const expectedWarnings = requirements
        .filter(req => req.expected)
        .map(req => req.warning);
    const unexpectedWarnings = requirements
        .filter(req => !req.expected)
        .map(req => req.warning);
    // logger.trace({
    //     expectedWarnings,
    //     unexpectedWarnings,
    // }, 'makeRequirements');
    return {
        requirementsMet: setUnion(
            setIntersection(expectedWarnings, report.warnings, equalWarnings),
            setDifference(unexpectedWarnings, report.warnings, equalWarnings)),
        missedRequirements: setUnion(
            setDifference(expectedWarnings, report.warnings, equalWarnings),
            setIntersection(unexpectedWarnings, report.warnings, equalWarnings)),
    };
}

function makeExperimentResult(moduleNet: ModuleNetRequirementsType, report: ReportType): ExperimentResultType {
    const allExpectedWarnings = [
        ...moduleNet.mainRequirements,
        ...moduleNet.extraRequirements,
    ].filter(requirement => requirement.expected)
    .map(requirement => requirement.warning);
    return {
        mainRequirements: makeRequirements(moduleNet.mainRequirements, report),
        extraRequirements: makeRequirements(moduleNet.extraRequirements, report),
        extraWarnings: setDifference(report.warnings, allExpectedWarnings, equalWarnings),
    };
}

export type VerifyAnalysisType = {
    name: string,
    moduleNet: string,
    verifier: string,
    report: ReportType,
    results: ExperimentResultType,
};

async function processExperiment(experimentName: string, moduleNets: Dictionary<ModuleNetRequirementsType>, verifiers: Dictionary<VerifierType>,
    experimentsDir: string): Promise<VerifyAnalysisType> {
    logger.debug(`begin processing ${experimentName}`);

    const sourceDir = Path.join(experimentsDir, experimentName);

    const moduleNetName = experimentName.split('-')[0];
    const moduleNet = moduleNets[moduleNetName];
    if (undefined === moduleNet) {
        logger.debug(`missing module net ${moduleNet}`);
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('missing module net, if module net exists, make sure it has a "requirements.json" file');
    }

    const verifierName = experimentName.split('-')[1];
    const verifier = verifiers[verifierName];
    if (undefined === verifier) {
        logger.debug(`missing verifier ${verifierName}`);
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('missing verifier');
    }

    // const rulesPath = Path.join(sourceDir, 'rules.json');
    // const rulesText = await readFileIgnore(rulesPath);
    // if (null === rulesText) {
    //     logger.debug(`ignoring ${experimentName}`);
    //     return null;
    // }
    // const rules = JSON.parse(rulesText);
    // const experimentPath = Path.join(sourceDir, `${experimentName}-verigraph.ggx`);
    // const grammar = await readGGXGrammar(experimentPath, verifier);
    // const cpxPath = Path.join(sourceDir, 'verigraph-confs-deps.cpx');
    // const grammar = await readCPXGrammar(cpxPath, verifier);
    // if (null === grammar) {
    //     logger.debug('error processing grammar');
    //     logger.debug(`ignoring ${experimentName}`);
    //     return null;
    // }

    // const criticalPairs = await makeCriticalPairs.fromGGX(experimentPath));
    // const confsDepPath = Path.join(sourceDir, 'verigraph-confs-deps.txt');
    // const criticalPairs = await makeCriticalPairs.fromTXT(confsDepPath, grammar.rules.map(rule => rule.name));
    // const criticalPairs = await makeCriticalPairs.fromCPX(cpxPath, verifier);
    // if (null === criticalPairs) {
    //     logger.debug('error processing critical pairs');
    //     logger.debug(`ignoring ${experimentName}`);
    //     return null;
    // }

    const analysisPath = Path.join(sourceDir, 'analysis.json');
    const analysisText = await readFileIgnore(analysisPath);
    if (null === analysisText) {
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('missing analysis');
    }
    let analysis: AnalysisType = null;
    try {
        analysis = JSON.parse(analysisText);
    } catch (error) {
        logger.error({
            message: error.message,
            stack: error.stack,
        }, `cannot parse analysis for ${experimentName}`);
        throw new Error('unable to parse analysis');
    }

    const report = doVerify(analysis.grammar, analysis.cpxCriticalPairs, verifier);
    if (null === report) {
        logger.debug('error verifying grammar');
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('failed to verify grammar');
    }

    let results;
    if (moduleNets[moduleNetName]) {
        results = makeExperimentResult(moduleNet, report);
    } else {
        logger.debug(`missing module net for ${experimentName}`);
    }

    const experiment = {
        name: experimentName,
        moduleNet: moduleNetName,
        verifier: verifierName,
        report,
        results,
    };

    logger.debug(`end processing ${experimentName}`);
    return experiment;
}

type SummaryType = {
    mainRequirements: {
        met: number,
        missed: number,
        total: number,
    },
    extraRequirements: {
        met: number,
        missed: number,
        total: number,
    },
    totalMet: number,
    totalMissed: number,
    extraWarnings: number,
};

function makeSummary(experiments: VerifyAnalysisType[]): SummaryType {
    return experiments.reduce((prev, experiment) => {
        const mainReq = {
            missed: experiment.results.mainRequirements.missedRequirements.length,
            met: experiment.results.mainRequirements.requirementsMet.length,
            total: 0,
        };
        mainReq.total = mainReq.met + mainReq.missed;
        const extraReq = {
            missed: experiment.results.extraRequirements.missedRequirements.length,
            met:  experiment.results.extraRequirements.requirementsMet.length,
            total: 0,
        };
        extraReq.total = extraReq.met + extraReq.missed;
        const extra = experiment.results.extraWarnings.length;
        return {
            mainRequirements: {
                met: prev.mainRequirements.met + mainReq.met,
                missed: prev.mainRequirements.missed + mainReq.missed,
                total: prev.mainRequirements.total + mainReq.total,
            },
            extraRequirements: {
                met: prev.extraRequirements.met + extraReq.met,
                missed: prev.extraRequirements.missed + extraReq.missed,
                total: prev.extraRequirements.total + extraReq.total,
            },
            totalMet: prev.totalMet + mainReq.met + extraReq.met,
            totalMissed: prev.totalMissed + mainReq.missed + extraReq.missed,
            extraWarnings: prev.extraWarnings + extra,
        };
    }, {
        mainRequirements: {
            met: 0,
            missed: 0,
            total: 0,
        },
        extraRequirements: {
            met: 0,
            missed: 0,
            total: 0,
        },
        totalMet: 0,
        totalMissed: 0,
        extraWarnings: 0,
    });
}


async function parseVerifier(verifiersDir: string, verifierFolder: string): Promise<VerifierType> {
    const sourceDir = Path.join(verifiersDir, verifierFolder);

    const configurationPath = Path.join(sourceDir, 'configuration.json');
    const configurationText = await readFileIgnore(configurationPath);
    if (null === configurationText) {
        logger.debug(`ignoring ${verifierFolder}`);
        return null;
    }
    return JSON.parse(configurationText);
}

export async function verify(verifiersDir: string, moduleNetsDir: string, experimentsDir: string, resultsDir: string) : Promise<void> {
    logger.debug(`Reading module nets`);
    const moduleNetsFolders = await readdir(moduleNetsDir);
    const moduleNets = await awaitForEachDictionary(moduleNetsFolders,
        async moduleNetFolder => parseModuleNet(moduleNetsDir, moduleNetFolder),
        moduleNet => moduleNet.name);

    logger.debug(`Reading verifiers`);
    const verifiersFolders = await readdir(verifiersDir);
    const verifiers = await awaitForEachDictionary(verifiersFolders,
        async verifierFolder => parseVerifier(verifiersDir, verifierFolder),
        verifier => verifier.name);

    let failed = false;
    logger.debug(`Reading experiments`);
    const experimentsFolders = await readdir(experimentsDir);
    const experiments = await awaitForEachArray(experimentsFolders,
        async experimentFolder => {
            try {
                const experiment = await processExperiment(experimentFolder, moduleNets, verifiers, experimentsDir);
                return experiment;
            } catch (error) {
                logger.error({
                    error: error.message,
                    stack: error.stack,
                }, `error processing experiments ${experimentFolder}`);
                failed = true;
                return null;
            }
        });
    if (failed) {
        throw new Error('task failed, check logs above');
    }

    logger.debug(`Writing results`);
    const targetDir = resultsDir;
    await mkdir(targetDir, { recursive: true });
    await awaitForEachArray(experiments, async experiment => writeJSON<VerifyAnalysisType>(targetDir, experiment.name, experiment));
    const summary = Object.values(verifiers).map(verifier => ({
        verifier: verifier.name,
        summary: makeSummary(experiments.filter(ex => ex.verifier === verifier.name)),
    }));
    writeJSON(targetDir, '_summary', summary);
}