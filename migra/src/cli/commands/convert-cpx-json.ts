import * as Path from 'path';

import { logger } from '../logger';
import {
    readdir,
    awaitForEachArray,
    readFileIgnore,
    awaitForEachDictionary,
    Dictionary,
} from '../helpers';
import { fromCPXToJson } from '../command-helpers/make-critical-pairs';
import { VerifierType } from '../../core/verification/verifier';

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

async function processExperiment(experimentName: string, verifiers: Dictionary<VerifierType>, experimentsDir: string): Promise<void> {
    logger.debug(`begin processing ${experimentName}`);
    // if (!experimentName.startsWith('example')) {
    //     return;
    // }

    const moduleNetName = experimentName.split('-')[0];
    if (undefined === moduleNetName) {
        logger.debug(`missing module net ${moduleNetName} in folder name`);
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('missing module net');
    }

    const sourceDir = Path.join(experimentsDir, experimentName);
    const analysisPath = Path.join(sourceDir, 'analysis.json');
    const analysisFile = await readFileIgnore(analysisPath);
    if (null !== analysisFile) {
        logger.debug(`analysis file exists ${analysisPath}`);
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('analysis file exists');
    }
    
    const verifierName = experimentName.split('-')[1];
    const verifier = verifiers[verifierName];
    if (undefined === verifierName) {
        logger.debug(`missing verifier ${verifierName} in folder name`);
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('missing verifier');
    }

    try {
        const cpxPath = Path.join(sourceDir, 'analysis.cpx');
        await fromCPXToJson(cpxPath, analysisPath, verifier);
    } catch (error) {
        logger.error(`Error converting cpx to json for experiment ${experimentName}: ${error}, ${error.stdout}, ${error.stderr}.`);
        throw new Error('error converting cpx to json');
    }
    logger.info(`Finished converting cpx to json for experiment ${experimentName}`);
}

export async function convertCpxJson(verifiersDir: string, experimentsDir: string) : Promise<void> {
    logger.debug(`Reading verifiers`);
    const verifiersFolders = await readdir(verifiersDir);
    const verifiers = await awaitForEachDictionary(verifiersFolders,
        async verifierFolder => parseVerifier(verifiersDir, verifierFolder),
        verifier => verifier.name);

    let failed = false;
    logger.debug(`Reading experiments`);
    const experimentsFolders = await readdir(experimentsDir);
    await awaitForEachArray(experimentsFolders,
        async experimentFolder => {
            try {
                await processExperiment(experimentFolder, verifiers, experimentsDir);
            } catch (error) {
                logger.error({
                    error: error.message,
                    stack: error.stack,
                }, `error processing experiments ${experimentFolder}`);
                failed = true;
            }
        });
    if (failed) {
        throw new Error('task failed, check logs above');
    }
}