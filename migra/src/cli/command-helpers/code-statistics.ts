import { logger } from '../logger';
import {
    readFileIgnore,
    applyPredicateToDirectory,
} from '../helpers';

export type CodeStatisticsType = {
    module: string,
    version: string,
    location: string,
    files: number,
    total: number
};
export async function getCodeStatisticsFromFolder(folder: string, module: string, version: string): Promise<CodeStatisticsType> {
    const statistics: CodeStatisticsType = {
        module,
        version,
        location: folder,
        files: 0,
        total: 0,
    };
    try {
        await applyPredicateToDirectory(folder, async filename => {
            statistics.files++;
            let text;
            try {
                text = await readFileIgnore(filename);
            } catch (error) {
                logger.debug({ error }, `error finding file ${filename} to compute code statistics`);
                return;
            }
            try {
                const stats = {
                    total: text.split('\n').length,
                };
                statistics.total += stats.total;
            } catch (error) {
                logger.debug({ error }, `error computing statistics for file ${filename}`);
            }
        });
    } catch (error) {
        logger.debug({ error }, `error finding directory ${folder} to compute code statistics`);
    }
    return statistics;
}
