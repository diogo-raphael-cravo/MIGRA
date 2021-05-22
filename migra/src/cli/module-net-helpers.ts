import * as Path from 'path';

import { logger } from './logger';
import {
    readFileIgnore,
} from './helpers';
import { ModuleNetType } from '../core/translation/module-net-types';

export async function parseModuleNet(moduleNetDir: string, moduleNetFolder: string, filename = 'module-net.json'): Promise<ModuleNetType> {
    const sourceDir = Path.join(moduleNetDir, moduleNetFolder);
    const moduleNetPath = Path.join(sourceDir, filename);
    const moduleNetFile = await readFileIgnore(moduleNetPath);
    if (null === moduleNetFile) {
        logger.debug(`ignoring ${moduleNetFolder}`);
        return null;
    }
    try {
        return JSON.parse(moduleNetFile);
    } catch (error) {
        logger.error({
            message: error.message,
            stack: error.stack,
        }, 'cannot parse module net');
        return null;
    }
}