import * as Path from 'path';
import * as promiseSpawn from '@npmcli/promise-spawn';
import { logger } from '../logger';
import { copyDirectory } from '../helpers';

export async function install(sourcesPath: string, targetPath: string): Promise<void> {
    logger.debug({ sourcesPath }, 'installing dependencies');

    try {
        logger.info('installing');
        const promiseSpawnOutput = await promiseSpawn('npm', [
            'install',
        ], {
            cwd: sourcesPath,
            stdioString: true,
        });
        logger.debug(`install output: ${promiseSpawnOutput.stdout.split('\n').join(' ')}`);
        
        logger.info('copying');
        await copyDirectory(Path.join(sourcesPath, 'node_modules'), targetPath);
    } catch (error) {
        logger.error(`Error running install: ${error}.`);
        logger.debug(`stdout: ${error.stdout}`);
        logger.debug(`stderr: ${error.stderr}`);
        throw error;
    }
}