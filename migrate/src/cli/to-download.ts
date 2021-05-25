import * as Path from 'path';
import {
    readFileIgnore,
} from './helpers';
import { logger } from './logger';

export type ToDownloadEntry = {
    name: string,
    versions: string[],
};

export type ToDownloadType = ToDownloadEntry[];

export async function parseToDownload(sourcesDir: string): Promise<ToDownloadType> {
    const toDownloadPath = Path.join(sourcesDir, 'to-download.json');
    const toDownloadText = await readFileIgnore(toDownloadPath);
    if (null === toDownloadText) {
        logger.debug('to-download.json is empty or does not exist');
        return null;
    }
    try {
        return JSON.parse(toDownloadText);
    } catch (error) {
        logger.error({
            message: error.message,
            stack: error.stack,
        }, 'cannot parse to-download.json');
        return null;
    }
}