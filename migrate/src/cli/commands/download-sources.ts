import * as Path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as promiseSpawn from '@npmcli/promise-spawn';
import {
    parseToDownload,
} from '../to-download';
import {
    mkdir,
    rmdir,
    readdir,
    awaitForEachArray,
    copyDirectoryByRegex,
} from '../helpers';
import { logger } from '../logger';

function randomFilename(): string {
    return uuidv4();
}

export async function downloadSources(sourcesPath: string, tmpDirPath: string): Promise<null|void> {
    logger.debug({ tmpDirPath, sourcesPath }, 'downloading sources');

    const toDownload = await parseToDownload(sourcesPath);
    if (undefined === toDownload) {
        logger.error('missing to-download.json file in sources folder');
        return null;
    }
    logger.debug(`found to-download.json, downloading ${toDownload.length} modules`);

    await awaitForEachArray(toDownload, async module => {
        logger.debug(`downloading ${module.versions.length} versions of module ${module.name}`);
        await awaitForEachArray(module.versions, async version => {
            const moduleVersion = `${module.name}@${version}`;
            const savePath = Path.join(sourcesPath, `${module.name.replace(/\//g, '_').replace(/\-/g, '_')}=${version}`);
            let savePathContents;
            try {
                savePathContents = await readdir(savePath);
            } catch {}
            if (savePathContents) {
                logger.debug(`skipping module ${moduleVersion}, already downloaded`);
                return;
            }
            logger.debug(`downloading ${moduleVersion}`);

            const tmpdir = Path.join(tmpDirPath, randomFilename());
            await mkdir(tmpdir, { recursive: true });
            logger.debug({ tmpdir }, 'created temporary directory');
            
            try {
                const promiseSpawnOutput = await promiseSpawn('npm', [
                    'install',
                    moduleVersion,
                    '--ignore-scripts',
                    '--production',
                    '--no-optional',
                    '--scripts-prepend-node-path',
                ], {
                    cwd: tmpdir,
                    stdioString: true,
                });
                logger.trace(`install output: ${promiseSpawnOutput.stdout.split('\n').join(' ')}`);
            } catch (error) {
                logger.error(`Error running install: ${error}.`);
                logger.debug(`stdout: ${error.stdout}`);
                logger.debug(`stderr: ${error.stderr}`);
                throw error;
            }

            const installedModulePath = Path.join(tmpdir, 'node_modules', module.name);
            await copyDirectoryByRegex(installedModulePath, savePath, ['.js', '.json']);

            await rmdir(tmpdir, { recursive: true });
            logger.debug({ tmpdir }, 'removed temporary directory');
        });
    });
}