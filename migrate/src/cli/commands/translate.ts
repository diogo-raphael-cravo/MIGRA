import * as Path from 'path';

import { logger } from '../logger';
import {
    readdir,
    awaitForEachArray,
    readFileIgnore,
    writeFile,
    deepCopy,
} from '../helpers';
import { AGGTransform } from '../run-agg';
import { parseModuleNet } from '../module-net-helpers';
import { VerifierType } from '../../core/verification/verifier';
import { toGraph } from '../../core/translation/to-graph';
import {
    graphToGrammars,
    merge,
} from '../../core/translation/graph-to-grammar';
import { namesToIDs } from '../../core/translation/module-net-types';
import { GraGra } from '../../core/graph-grammars/ggx/graph-types';
import { breakByOperation } from '../../core/module-net/module-net';
import * as GGXWriter from '../../core/graph-grammars/ggx/writer';
import { readGrammar } from '../command-helpers/read-grammar';

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


async function translateModuleNet(experimentName: string, verifiersDir: string, experimentsDir: string, moduleNetDir: string): Promise<void> {
    logger.debug(`begin processing ${experimentName}`);

    const moduleNetName = experimentName.split('-')[0];
    if (undefined === moduleNetName) {
        logger.debug(`missing module net ${moduleNetName} in folder name`);
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('missing module net');
    }

    const verifierName = experimentName.split('-')[1];
    if (undefined === verifierName) {
        logger.debug(`missing verifier ${verifierName} in folder name`);
        logger.debug(`ignoring ${experimentName}`);
        throw new Error('missing verifier');
    }

    const moduleNet = await parseModuleNet(moduleNetDir, moduleNetName);
    if (null === moduleNet) {
        logger.debug(`missing module net ${moduleNetName}`);
        throw new Error('unable to parse module net');
    }

    const verifier = await parseVerifier(verifiersDir, verifierName);
    if (null === verifier) {
        logger.debug(`missing verifier ${verifierName}`);
        throw new Error('unable to parse verifier');
    }

    if (!verifier.translation) {
        logger.debug(`missing verifier translation ${verifierName}`);
        throw new Error('missing verifier translation');
    }

    logger.debug('reading translation grammar');
    const sourceDir = Path.join(verifiersDir, verifierName);
    const translationGrammarPath = Path.join(sourceDir, 'translation-grammar.ggx');
    const templateTranslationGrammar = await readGrammar(translationGrammarPath);
    if (null === templateTranslationGrammar) {
        logger.debug(`missing translation grammar for verifier ${verifierName}`);
        throw new Error('missing translation grammar');
    }
    logger.debug('removing graphs from translation grammar');
    templateTranslationGrammar.graphs = [];

    logger.debug('breaking module into smaller chunks');
    const moduleNetChunks = breakByOperation(moduleNet);
    logger.debug(`processing ${moduleNetChunks.length} chunks of module net ${moduleNet.name}`);
    if (0 === moduleNetChunks.length) {
        logger.debug('could not break into chunks');
        throw new Error('unable to break down module net');
    }

    let currentChunk = 0;
    const translationNamesAsIDs = namesToIDs(templateTranslationGrammar, verifier.translation);
    const translatedChunks = await awaitForEachArray(moduleNetChunks,
        async chunk => {
            logger.debug('loading module net to translation grammar');
            currentChunk++;
            const translationGrammar = deepCopy(templateTranslationGrammar);
            const chunkThisIteration = currentChunk;
            const moduleNetAsGraph = toGraph(chunk, translationNamesAsIDs);
            translationGrammar.name = `${experimentName}-chunk-${chunkThisIteration}-translation-grammar`;
            translationGrammar.graphs.push(moduleNetAsGraph);
            const grammarText = GGXWriter.writeGrammar(translationGrammar);
            const grammarPath = Path.join(experimentsDir, experimentName, `chunk-${chunkThisIteration}-translation-grammar.ggx`);
            await writeFile(grammarPath, grammarText);
            logger.debug(`written translation grammar to ${grammarPath}`);

            logger.debug('translating grammar');
            const translatedPath = Path.join(experimentsDir, experimentName, `chunk-${chunkThisIteration}-translated-grammar.ggx`);
            try {
                await AGGTransform(grammarPath, translatedPath);
            } catch (error) {
                logger.error({ error }, 'error translating grammar');
                return null;
            }

            logger.debug('reading translated grammar');
            const translatedGrammar = await readGrammar(translatedPath);
            if (null === translatedGrammar) {
                logger.debug(`missing translated grammar at path ${translatedPath}`);
                return null;
            }

            logger.debug({ experimentName }, 'extracting verification grammar from translated grammar');
            // IDs may have changed, need to extract again
            const translateNamesAsIDs = namesToIDs(translatedGrammar, verifier.translation);
            try {
                const verificationGrammars = graphToGrammars(translatedGrammar.graphs[0], translateNamesAsIDs);
                if (null === verificationGrammars || verificationGrammars.length === 0) {
                    logger.error(`extraction failed for ${experimentName}`);
                    return null;
                }
                return verificationGrammars[0];
            } catch (error) {
                logger.error(`extraction failed for ${experimentName}, chunk ${chunkThisIteration}`);
                throw error;
            }
        });
    
    const containsNull = translatedChunks.find(chunk => null === chunk);
    if (containsNull) {
        throw new Error('failed translating one or more chunks');
    }

    logger.debug('merging verification grammars');
    const verificationGrammar: GraGra = merge(translatedChunks);
    verificationGrammar.name = `${experimentName}-verification-grammar`;
    const verificationGrammarText = GGXWriter.writeGrammar(verificationGrammar);
    const verificationGrammarPath = Path.join(experimentsDir, experimentName, 'verification-grammar.ggx');
    await writeFile(verificationGrammarPath, verificationGrammarText);
}

export async function translate(verifiersDir: string, experimentsDir: string, moduleNetDir: string) : Promise<void> {
    logger.debug(`Translating grammar`);
    const experimentsFolders = await readdir(experimentsDir);
    let processedSoFar = 0;
    let failed = false;
    await awaitForEachArray(experimentsFolders,
        async experimentFolder => {
            try {
                await translateModuleNet(experimentFolder, verifiersDir, experimentsDir, moduleNetDir);
                processedSoFar++;
                logger.info(`Finished ${processedSoFar} of ${experimentsFolders.length}...`);
            } catch (error) {
                logger.error({
                    error: error.message,
                    stack: error.stack,
                }, `error processing experiment ${experimentFolder}`);
                processedSoFar++;
                logger.info(`Finished ${processedSoFar} of ${experimentsFolders.length}...`);
                failed = true;
            }
        });
    if (failed) {
        throw new Error('task failed, check logs above');
    }
}