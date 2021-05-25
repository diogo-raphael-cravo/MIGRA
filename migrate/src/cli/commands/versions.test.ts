import * as SemVer from 'semver';
import {
    getReleases,
    getHighestVersion,
    getRequiredModuleVersions,
    getMostFrequentMinorVersions,
} from './versions';


describe('versions', () => {
    describe('getReleases', () => {
        it('filters prerelease versions', () => {
            const moduleVersions = [
                '0.0.0', '0.0.1', '0.1.0', '1.0.0',
                '2.0.0-alpha', '2.0.0', '2.0.1', '2.1.0',
                '6.3.0', '6.3.1-alpha', '7.3.5-beta',
            ];
            const versions = getReleases( moduleVersions);
            expect(versions).toStrictEqual([
                '0.0.0', '0.0.1', '0.1.0', '1.0.0',
                '2.0.0', '2.0.1', '2.1.0',
                '6.3.0',
            ]);
        });
    });
    describe('getHighestVersion', () => {
        it('finds highest version', () => {
            const moduleVersions = [
                '1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.0.6',
                '1.1.0', '1.1.1', '1.1.2', '1.1.3', '1.1.4',
                '2.0.0-alpha', '2.0.0-beta', '2.0.1', '2.0.2', '2.0.3', '2.0.4',
                '2.1.0',
                '2.2.0', '2.2.1',
                '2.3.0', '2.3.1', '2.3.2',
                '3.0.0', '3.0.1',
                '4.0.0', '4.0.2', '4.0.3',
                '4.1.0', '4.1.1',
                '4.2.0', '4.2.1', '4.2.2',
                '4.3.0', '4.3.1', '4.3.2', '4.3.3', '4.3.4', '4.3.5', '4.3.6',
                '5.0.0', '5.0.1', '5.0.2', '5.0.3',
                '5.1.0', '5.1.1',
                '5.2.0',
                '5.3.0',
                '5.4.0', '5.4.1',
                '5.5.0', '5.5.1',
                '5.6.0',
                '5.7.0', '5.7.1',
                '6.0.0',
                '6.1.0', '6.1.1', '6.1.2', '6.1.3',
                '6.2.0',
                '6.3.0', '6.3.1-alpha', '6.3.1-alpha1', '6.3.1-alpha2', '6.3.1-alpha3', '6.3.1-alpha4',
                '7.0.0', '7.1.0', '7.1.1', '7.1.2', '7.1.3',
                '7.2.0', '7.2.1', '7.2.2', '7.2.3',
                '7.3.0', '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.5',
            ];
            const versions = getHighestVersion(moduleVersions);
            expect(versions).toStrictEqual('7.3.5');
        });
    });
    describe('getMostFrequentMinorVersions', () => {
        it('gets most frequent minor versions when reference is highest', () => {
            const moduleVersions = [
                '1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.0.6',
                '1.1.0', '1.1.1', '1.1.2', '1.1.3', '1.1.4',
                '2.0.1', '2.0.2', '2.0.3', '2.0.4',
                '2.1.0',
                '2.2.0', '2.2.1',
                '2.3.0', '2.3.1', '2.3.2',
                '3.0.0', '3.0.1',
                '4.0.0', '4.0.2', '4.0.3',
                '4.1.0', '4.1.1',
                '4.2.0', '4.2.1', '4.2.2',
                '4.3.0', '4.3.1', '4.3.2', '4.3.3', '4.3.4', '4.3.5', '4.3.6',
                '5.0.0', '5.0.1', '5.0.2', '5.0.3',
                '5.1.0', '5.1.1',
                '5.2.0',
                '5.3.0',
                '5.4.0', '5.4.1',
                '5.5.0', '5.5.1',
                '5.6.0',
                '5.7.0', '5.7.1',
                '6.0.0',
                '6.1.0', '6.1.1', '6.1.2', '6.1.3',
                '6.2.0',
                '6.3.0',
                '7.0.0', '7.1.0', '7.1.1', '7.1.2', '7.1.3',
                '7.2.0', '7.2.1', '7.2.2', '7.2.3',
                '7.3.0', '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.5',
            ];
            const versions = getMostFrequentMinorVersions(moduleVersions, version => SemVer.major(version) === 6);
            expect(versions).toStrictEqual(['6.1.0', '6.1.1', '6.1.2', '6.1.3']);
        });
        it('gets most frequent minor versions when reference is not highest', () => {
            const moduleVersions = [
                '1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.0.6',
                '1.1.0', '1.1.1', '1.1.2', '1.1.3', '1.1.4',
                '2.0.1', '2.0.2', '2.0.3', '2.0.4',
                '2.1.0',
                '2.2.0', '2.2.1',
                '2.3.0', '2.3.1', '2.3.2',
                '3.0.0', '3.0.1',
                '4.0.0', '4.0.2', '4.0.3',
                '4.1.0', '4.1.1',
                '4.2.0', '4.2.1', '4.2.2',
                '4.3.0', '4.3.1', '4.3.2', '4.3.3', '4.3.4', '4.3.5', '4.3.6',
                '5.0.0', '5.0.1', '5.0.2', '5.0.3',
                '5.1.0', '5.1.1',
                '5.2.0',
                '5.3.0',
                '5.4.0', '5.4.1',
                '5.5.0', '5.5.1',
                '5.6.0',
                '5.7.0', '5.7.1',
                '6.0.0',
                '6.1.0', '6.1.1', '6.1.2', '6.1.3',
                '6.2.0',
                '6.3.0',
                '7.0.0', '7.1.0', '7.1.1', '7.1.2', '7.1.3',
                '7.2.0', '7.2.1', '7.2.2', '7.2.3',
                '7.3.0', '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.5',
            ];
            const versions = getMostFrequentMinorVersions(moduleVersions, version => SemVer.major(version) === 5);
            expect(versions).toStrictEqual(['5.0.0', '5.0.1', '5.0.2', '5.0.3']);
        });
    });
    describe('getRequiredModuleVersions', () => {
        it('gets major versions from libraries with major updates', () => {
            const moduleName = 'moduleName';
            const moduleVersions = [
                '1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.0.6',
                '1.1.0', '1.1.1', '1.1.2', '1.1.3', '1.1.4',
                '2.0.0-alpha', '2.0.0-beta', '2.0.1', '2.0.2', '2.0.3', '2.0.4',
                '2.1.0',
                '2.2.0', '2.2.1',
                '2.3.0', '2.3.1', '2.3.2',
                '3.0.0', '3.0.1',
                '4.0.0', '4.0.2', '4.0.3',
                '4.1.0', '4.1.1',
                '4.2.0', '4.2.1', '4.2.2',
                '4.3.0', '4.3.1', '4.3.2', '4.3.3', '4.3.4', '4.3.5', '4.3.6',
                '5.0.0', '5.0.1', '5.0.2', '5.0.3',
                '5.1.0', '5.1.1',
                '5.2.0',
                '5.3.0',
                '5.4.0', '5.4.1',
                '5.5.0', '5.5.1',
                '5.6.0',
                '5.7.0', '5.7.1',
                '6.0.0',
                '6.1.0', '6.1.1', '6.1.2', '6.1.3',
                '6.2.0',
                '6.3.0', '6.3.1-alpha', '6.3.1-alpha1', '6.3.1-alpha2', '6.3.1-alpha3', '6.3.1-alpha4',
                '7.0.0', '7.1.0', '7.1.1', '7.1.2', '7.1.3',
                '7.2.0', '7.2.1', '7.2.2', '7.2.3',
                '7.3.0', '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.5', '7.3.5-beta',
            ];
            const versions = getRequiredModuleVersions(moduleName, moduleVersions);
            expect(versions).toStrictEqual({
                lowestPatchVersion: '6.1.0',
                highestPatchVersion: '6.1.3',
                highestVersion: '7.3.5',
            });
        });
        it('gets major versions from libraries with major updates even if it takes several iterations', () => {
            const moduleName = 'moduleName';
            const moduleVersions = [
                '1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.0.6',
                '1.1.0', '1.1.1', '1.1.2', '1.1.3', '1.1.4',
                '2.0.0-alpha', '2.0.0-beta', '2.0.1', '2.0.2', '2.0.3', '2.0.4',
                '2.1.0',
                '2.2.0', '2.2.1',
                '2.3.0', '2.3.1', '2.3.2',
                '3.0.0', '3.0.1',
                '4.0.0', '4.0.2', '4.0.3',
                '4.1.0', '4.1.1',
                '4.2.0', '4.2.1', '4.2.2',
                '4.3.0', '4.3.1', '4.3.2', '4.3.3', '4.3.4', '4.3.5', '4.3.6',
                '5.0.0', '5.0.1', '5.0.2', '5.0.3',
                '5.1.0', '5.1.1', '5.1.2', '5.1.3',
                '5.2.0',
                '5.3.0',
                '5.4.0',
                '5.5.0',
                '5.6.0',
                '5.7.0',
                '6.0.0',
                '6.1.0',
                '6.2.0',
                '6.3.0',
                '7.0.0',
                '7.2.0',
                '7.3.0', '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.5', '7.3.5-beta',
            ];
            const versions = getRequiredModuleVersions(moduleName, moduleVersions);
            expect(versions).toStrictEqual({
                lowestPatchVersion: '5.1.0',
                highestPatchVersion: '5.1.3',
                highestVersion: '6.3.0',
            });
        });
        it('throws when it cannot find three versions matching requirements', () => {
            const moduleName = 'moduleName';
            const moduleVersions = [
                '1.0.0',
                '1.1.0',
                '2.0.0-alpha', '2.0.0-beta', '2.0.1',
                '2.1.0',
                '2.2.0',
                '2.3.0',
                '3.0.0',
                '4.0.0',
                '4.1.0',
                '4.2.0',
                '4.3.0',
                '5.0.0',
                '5.1.0',
                '5.2.0',
                '5.3.0',
                '5.4.0',
                '5.5.0',
                '5.6.0',
                '5.7.0',
                '6.0.0',
                '6.1.0',
                '6.2.0',
                '6.3.0',
                '7.0.0',
                '7.2.0',
                '7.3.0', '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.5', '7.3.5-beta',
            ];
            expect(getRequiredModuleVersions(moduleName, moduleVersions)).toBeNull();
        });
        it('uses same major versions when it cannot find otherwise', () => {
            const moduleName = 'moduleName';
            const moduleVersions = [
                '1.0.0',
                '1.2.0', '1.2.1', '1.2.2',
                '1.3.0',
                '1.4.0', '1.4.2',
                '1.5.0',
                '1.6.0',
                '1.7.0',
                '1.8.0'
            ];
            const versions = getRequiredModuleVersions(moduleName, moduleVersions);
            expect(versions).toStrictEqual({
                lowestPatchVersion: '1.2.0',
                highestPatchVersion: '1.2.2',
                highestVersion: '1.8.0',
            });
        });
    });
});