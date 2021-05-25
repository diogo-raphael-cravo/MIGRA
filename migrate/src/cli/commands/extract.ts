import * as Path from 'path';
import {
    writeFile,
    readFileIgnore,
    readdir,
    awaitForEachArray,
    ensureDirectory,
    applyPredicateToDirectory,
} from '../helpers';
import { logger } from '../logger';
import {
    extractModuleNetFromProgramsWithMockCaller,
} from '../../core/extraction/javascript/javascript-extractor';
import {
    // join,
    // removeResourcesWithoutAttributes,
    optimizeModuleNetOperationEdges,
    iterateRename,
    optimizeModuleNetRemoveIdenticalAttributeMappings,
} from '../../core/module-net/module-net';
import { ModuleNetType } from '../../core/translation/module-net-types';

function optimize(moduleNet: ModuleNetType): ModuleNetType {
    return optimizeModuleNetRemoveIdenticalAttributeMappings(optimizeModuleNetOperationEdges(moduleNet));
}

function fixForAGG(moduleNet: ModuleNetType): ModuleNetType {
    return iterateRename(moduleNet, name => name
        .replace('?', 'GENERICCLIENT')
        .replace(/-/g, '_'));
}

const RAW_MODULE_NET = 'module-net.json';
// const MERGED_MODULE_NET = 'module-net.json';
async function extractModuleNet(sourcesFolder: string, sourceFolderName: string, modulesFolder: string): Promise<void> {
    logger.debug(`Extracting module net from ${sourceFolderName}`);
    const sourceFolder = Path.join(sourcesFolder, sourceFolderName);
    const packageJsonPath = Path.join(sourceFolder, 'package.json');
    const packageJsonText = await readFileIgnore(packageJsonPath);
    if (null === packageJsonText) {
        logger.error(`Could not find package.json. Searched at ${packageJsonPath}.`);
    }
    let packageJson;
    try {
        packageJson = JSON.parse(packageJsonText);
    } catch {
        logger.error(`Could not parse package.json, found at ${packageJsonPath}.`);
        throw new Error('no package.json');
    }

    let main = packageJson.main;
    if (!main) {
        main = 'index.js';
        logger.debug(`Could not find 'main' in package.json, found at ${packageJsonPath}, assuming '${main}'.`);
    }
    const entrypoint = Path.join(main).replace('.js', '');
    const filenamesToPrograms: Record<string, string> = {};
    await applyPredicateToDirectory(sourceFolder, async filename => {
        if (filename.endsWith('package.json')) {
            return;
        }
        const relativePath = Path.relative(sourceFolder, filename).replace('.js', '');
        filenamesToPrograms[relativePath] = await readFileIgnore(filename);
    });
    const moduleNetName = sourceFolderName;

    logger.info(`Extracting module net '${moduleNetName}' with entrypoint '${entrypoint}'`
        + ` and ${Object.keys(filenamesToPrograms).length} files.`);
    const moduleNet = fixForAGG(optimize(extractModuleNetFromProgramsWithMockCaller(entrypoint, filenamesToPrograms, moduleNetName)));
    const moduleNetFolder = Path.join(modulesFolder, sourceFolderName);
    await ensureDirectory(moduleNetFolder);
    const moduleNetFile = Path.join(moduleNetFolder, RAW_MODULE_NET);
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

export async function extract(sourcesFolder: string, modulesFolder: string): Promise<void> {
    logger.debug(`Extracting module nets`);
    const sourceFolders = await readdir(sourcesFolder);
    let failed = false;
    await awaitForEachArray(sourceFolders,
        async sourceFolder => {
            if ('to-download.json' === sourceFolder) {
                return;
            }
            try {
                await extractModuleNet(sourcesFolder, sourceFolder, modulesFolder);
            } catch (error) {
                logger.error({
                    error: error.message,
                    stack: error.stack,
                }, `error processing source ${sourceFolder}`);
                failed = true;
            }
        });
    if (failed) {
        throw new Error('task failed, check logs above');
    }
}