import * as promiseSpawn from '@npmcli/promise-spawn';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { defaultPool } from './async-pool';
import {
    add,
    remove,
    shuttingDown,
} from './graceful-shutdown';

const DOCKER_PATH = 'docker';

export type DockerImageType = {
    imageName: string,
    imageVersion: string,
    volumePath: string,
    containerName: string,
};

export type DockerEnvironmentEntryType = {
    entryName: string,
    entryValue: string,
};

export type PromiseSpawnType = {
    cmd: string,
    args: string[],
    code: number,
    signal: string,
    stdout: string,
    stderr: string,
};

export async function queueContainer(image: DockerImageType, environment: DockerEnvironmentEntryType[]): Promise<PromiseSpawnType> {
    return defaultPool.run(() => spawnContainer(image, environment));
}

/**
 * If you see an error about containers already running,
 * make sure to run "docker system prune", such containers
 * can be leftover from failed executions.
 */
async function spawnContainer(image: DockerImageType, environment: DockerEnvironmentEntryType[]): Promise<PromiseSpawnType> {
    if (shuttingDown()) {
        logger.debug('cancelling container spawn due to shutdown');
        return Promise.resolve(null);
    }
    process.setMaxListeners(1000);
    const containerName = `${image.containerName}-${uuidv4()}`;
    const handler = code => {
        logger.debug(`${code} removing container ${containerName}`);
        return promiseSpawn(DOCKER_PATH, [
            'kill',
            containerName
        ], {
            stdioString: true,
        });
        // exit, mas só se não houver outro handler
    };
    const handlerId = add(handler);
    const environmentEntries: string[] = environment
        .map(entry => ['-e', `${entry.entryName}=${entry.entryValue}`])
        .reduce((prev, curr) => [...prev, ...curr], []);
    const dockerArguments = [
        'run',
        '-v',
        `/:${image.volumePath}`,
    ];
    dockerArguments.push(...environmentEntries);
    dockerArguments.push(...[
        '--rm',
        '--name',
        containerName,
        `${image.imageName}:${image.imageVersion}`
    ]);
    logger.debug(`spawning container ${containerName}`);
    const result: PromiseSpawnType = await promiseSpawn(DOCKER_PATH, dockerArguments, {
        stdioString: true,
    });
    logger.debug(`container ${containerName} finished`);
    remove(handlerId);
    return result;
}
