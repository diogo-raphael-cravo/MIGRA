import * as Path from 'path';
import * as SemVer from 'semver';
import * as promiseSpawn from '@npmcli/promise-spawn';
import {
    readFileIgnore,
    awaitForEachArray,
    writeJSON
} from '../helpers';
import { logger } from '../logger';
import {
    ToDownloadType,
} from '../to-download';

async function getAllModuleVersions(moduleName: string): Promise<string[]> {
    try {
        const promiseSpawnOutput = await promiseSpawn('npm', [
            'view',
            moduleName,
            'versions',
        ], {
            stdioString: true,
        });
        // logger.trace(`npm output: ${promiseSpawnOutput.stdout.split('\n').join(' ')}`);
        const sanitizedOutput = promiseSpawnOutput.stdout.replace(/'/g, '"');
        const parsedOutput = JSON.parse(sanitizedOutput);
        return parsedOutput;
    } catch (error) {
        logger.error(`Error running npm: ${error}.`);
        logger.debug(`stdout: ${error.stdout}`);
        logger.debug(`stderr: ${error.stderr}`);
        throw error;
    }
}

type ModuleVersions = {
    lowestPatchVersion: string,
    highestPatchVersion: string,
    highestVersion: string,
};
export function getReleases(versions: string[]): string[] {
    return versions
        .filter(version => null === SemVer.prerelease(version) && !version.match(/\-/g));
}
export function getHighestVersion(versions: string[]): string {
    return versions.reduce((prev, curr) => SemVer.gt(prev, curr) ? prev : curr, '0.0.0');
}
/**
 * Given reference major version X, will find set of versions Y.Z
 * such that:
 *   - Y satisfies predicate
 *      for example Y = X-1 or Y = X
 *   - count of Z is the greatest for versions with major Y
 */
export function getMostFrequentMinorVersions(versions: string[], versionPredicate: (string) => boolean): string[] {
    const oneMajorBelowHighestMajor: string[] = versions
        .filter(version => versionPredicate(version));
    const sameMinor: Record<number, string[]> = oneMajorBelowHighestMajor
        .reduce((prev, curr) => {
            const currMinor = SemVer.minor(curr);
            if (!prev[currMinor]) {
                prev[currMinor] = [];
            }
            prev[currMinor].push(curr);
            return prev;
        }, {});
    return Object.values(sameMinor)
        .reduce((prev, curr) => prev.length <= curr.length ? curr : prev, []);
}
function getRequiredModuleVersionsWithHigherMajor(moduleName: string, moduleVersions: string[], threshold: string = null): ModuleVersions {
    const releasesBelowThreshold: string[] = getReleases(moduleVersions)
        .filter(release => null === threshold || SemVer.lt(release, threshold));
    if (releasesBelowThreshold.length === 0) {
        return null;
    }
    const highestVersion: string = getHighestVersion(releasesBelowThreshold);
    const mostFrequentMinor: string[] = getMostFrequentMinorVersions(releasesBelowThreshold,
        version => SemVer.major(version) === SemVer.major(highestVersion) - 1);
    if (mostFrequentMinor.length < 2) {
        // try again with lower version
        let newThreshold;
        if (threshold) {
            const newThesholdMajor = SemVer.major(threshold) - 1;
            if (newThesholdMajor < 0) {
                return null;
            }
            newThreshold = `${SemVer.major(threshold) - 1}.999.999`;
        } else {
            newThreshold = highestVersion;
        }
        return getRequiredModuleVersionsWithHigherMajor(moduleName, moduleVersions, newThreshold);
    }
    const lowestPatchVersion = mostFrequentMinor[0];
    const highestPatchVersion = mostFrequentMinor.reverse()[0];
    return {
        highestVersion,
        lowestPatchVersion,
        highestPatchVersion,
    };
}
function getRequiredModuleVersionsWithSameMajor(moduleName: string, moduleVersions: string[], threshold: string = null): ModuleVersions {
    const releasesBelowThreshold: string[] = getReleases(moduleVersions)
        .filter(release => null === threshold || SemVer.lt(release, threshold));
    if (releasesBelowThreshold.length === 0) {
        return null;
    }
    const highestVersion: string = getHighestVersion(releasesBelowThreshold);
    const mostFrequentMinor: string[] = getMostFrequentMinorVersions(releasesBelowThreshold,
        version => SemVer.major(version) === SemVer.major(highestVersion)
            && SemVer.minor(version) < SemVer.minor(highestVersion));
    if (mostFrequentMinor.length < 2) {
        // try again with lower version
        let newThreshold;
        if (threshold) {
            const newThesholdMinor = SemVer.minor(threshold) - 1;
            if (newThesholdMinor < 0) {
                return null;
            }
            newThreshold = `${SemVer.major(threshold)}.${SemVer.minor(threshold) - 1}.999`;
        } else {
            newThreshold = highestVersion;
        }
        return getRequiredModuleVersionsWithHigherMajor(moduleName, moduleVersions, newThreshold);
    }
    const lowestPatchVersion = mostFrequentMinor[0];
    const highestPatchVersion = mostFrequentMinor.reverse()[0];
    return {
        highestVersion,
        lowestPatchVersion,
        highestPatchVersion,
    };
}
export function getRequiredModuleVersions(moduleName: string, moduleVersions: string[]): ModuleVersions {
    const majors = getRequiredModuleVersionsWithHigherMajor(moduleName, moduleVersions);
    if (null !== majors) {
        return majors;
    }
    return getRequiredModuleVersionsWithSameMajor(moduleName, moduleVersions);
}

async function parseModules(sourcesDir: string): Promise<string[]> {
    const modulesPath = Path.join(sourcesDir, 'modules.json');
    const modulesText = await readFileIgnore(modulesPath);
    if (null === modulesText) {
        logger.debug('modules.json is empty or does not exist');
        return null;
    }
    try {
        return JSON.parse(modulesText);
    } catch (error) {
        logger.error({
            message: error.message,
            stack: error.stack,
        }, 'cannot parse modules.json');
        return null;
    }
}

export async function versions(sources: string): Promise<void> {
    logger.debug('Querying npm for module versions');
    const modules = await parseModules(sources);
    const toDownload: ToDownloadType = [];
    let failed = false;
    await awaitForEachArray(modules,
        async moduleName => {
            try {
                const moduleVersions: string[] = await getAllModuleVersions(moduleName);
                logger.debug({ moduleVersions }, `all module versions for module ${moduleName}`);
                const requiredVersions = getRequiredModuleVersions(moduleName, moduleVersions);
                logger.debug({ requiredVersions }, `required versions for module ${moduleName}`);
                if (null === requiredVersions) {
                    logger.error(`could not find suitable versions for module ${moduleName}`);
                } else {
                    toDownload.push({
                        name: moduleName,
                        versions: [...Object.values(requiredVersions)],
                    });
                }
            } catch (error) {
                logger.error({
                    error: error.message,
                    stack: error.stack,
                }, `error processing versions for ${moduleName}`);
                failed = true;
            }
        });
    if (failed) {
        throw new Error('task failed, check logs above');
    }
    await writeJSON(sources, 'to-download', toDownload);
}