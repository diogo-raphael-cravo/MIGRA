import * as Path from 'path';
import { logger } from '../logger';
import {
    writeFile,
    ensureDirectory,
} from '../helpers';
import {
    extractInterface,
    extractCode,
    simplifyExtractedOperation,
    generateClient,
    combineExtractionsAndClients,
} from '../../core/extraction/simple/simple-extractor';
import {
    ExtractedOperationType,
} from '../../core/extraction/simple/types';
import { ModuleNetType } from '../../core/translation/module-net-types';
import { iterateRename } from '../../core/module-net/module-net';

function fixForAGG(moduleNet: ModuleNetType): ModuleNetType {
    return iterateRename(moduleNet, name => name
        .replace(/-/g, '_'));
}

function getOperations(sources: string): ExtractedOperationType[] {
    logger.debug(`Extracting interface from ${sources}`);
    const sourcesInterface = extractInterface(sources);
    if (0 === sourcesInterface.length) {
        logger.error(`empty interface for ${sources}`);
        throw new Error(`empty interface for ${sources}`);
    }
    return sourcesInterface.map(thisInterface => {
        logger.debug({ thisInterface }, `extracting next interface of ${sources}`);
        return simplifyExtractedOperation(extractCode(thisInterface));
    });
}

function getModuleNetName(sources: string): string {
    return Path.basename(sources);
}

function makeModuleNetFolder(saveToFolder: string, sources: string): string {
    return Path.join(saveToFolder, getModuleNetName(sources));
}

async function writeModuleNet(moduleNet: ModuleNetType, saveToFolder: string, sources: string): Promise<void> {
    logger.debug({
        saveToFolder,
        sources,
    },'writing module net');
    const moduleNetName = getModuleNetName(sources);
    const moduleNetFolder = makeModuleNetFolder(saveToFolder, sources);
    
    await ensureDirectory(moduleNetFolder);
    const moduleNetFile = Path.join(moduleNetFolder, 'module-net.json');
    try {
        await writeFile(moduleNetFile, JSON.stringify(moduleNet, null, 2));
        logger.info(`Successfully wrote file ${moduleNetFile}.`);
    } catch {
        logger.error(`Error writing file ${moduleNetFile}.`);
        throw new Error('failed writing file');
    }

    const moduleNetIsEmpty = moduleNet.nodes.length <= 1
        && moduleNet.edges.length === 0;
    if (moduleNetIsEmpty) {
        throw new Error('empty module net');
    }

    const requirementModuleNet = {
        name: moduleNetName,
        mainRequirements: [],
        extraRequirements: [],
    };
    const requirementModuleNetFile = Path.join(moduleNetFolder, 'requirements.json');
    try {
        await writeFile(requirementModuleNetFile, JSON.stringify(requirementModuleNet, null, 2));
        logger.info(`Successfully wrote file ${requirementModuleNetFile}.`);
    } catch {
        logger.error(`Error writing file ${requirementModuleNetFile}.`);
        throw new Error('failed writing file');
    }
}

async function extract(saveToFolder: string, v1Sources: string, v2Sources: string, v3Sources: string): Promise<void> {
    logger.debug('Generating operations for V2');
    const opsV2 = getOperations(v2Sources);
    logger.debug('Generating client based on V2');
    const clients = opsV2.map(op => generateClient(op));
    logger.debug('Generating module net for V2');
    const moduleNetV2 = combineExtractionsAndClients(getModuleNetName(v2Sources), opsV2, clients);
    await writeModuleNet(fixForAGG(moduleNetV2), saveToFolder, v2Sources);

    logger.debug('Generating operations for V1');
    const opsV1 = getOperations(v1Sources);
    const moduleNetV1 = combineExtractionsAndClients(getModuleNetName(v1Sources), opsV1, clients);
    await writeModuleNet(fixForAGG(moduleNetV1), saveToFolder, v1Sources);

    logger.debug('Generating operations for V3');
    const opsV3 = getOperations(v3Sources);
    const moduleNetV3 = combineExtractionsAndClients(getModuleNetName(v3Sources), opsV3, clients);
    await writeModuleNet(fixForAGG(moduleNetV3), saveToFolder, v3Sources);
}

export async function simpleExtract(saveToFolder: string, v1Sources: string, v2Sources: string, v3Sources: string): Promise<void> {
    logger.debug(`Extracting module nets (simple approach)`);
    let failed = false;
    try {
        await extract(saveToFolder, v1Sources, v2Sources, v3Sources);
    } catch (error) {
        logger.error({
            error: error.message,
            stack: error.stack,
        }, `error processing sources ${v1Sources}, ${v2Sources}, ${v3Sources} which would save to ${saveToFolder}`);
        failed = true;
    }
    if (failed) {
        throw new Error('task failed, check logs above');
    }
}