import * as Path from 'path';

function fixModuleName(moduleName: string): string {
    return moduleName.replace(/\//g, '_').replace(/\-/g, '_');
}

export function getWorkingFolder(resolvedExperimentsPath: string, moduleName: string): string {
    return Path.join(resolvedExperimentsPath, fixModuleName(moduleName));
}

export function getVersionsFolder(resolvedExperimentsPath: string): string {
    return Path.join(resolvedExperimentsPath, '_versions');
}

export function getInstallFolder(resolvedExperimentsPath: string): string {
    return Path.join(resolvedExperimentsPath, '_install');
}

export function getModulesFolder(resolvedExperimentsPath: string, moduleName: string): string {
    return Path.join(getWorkingFolder(resolvedExperimentsPath, moduleName), 'modules');
}

export function getSourcesFolder(resolvedExperimentsPath: string, moduleName: string): string {
    return Path.join(getWorkingFolder(resolvedExperimentsPath, moduleName), 'sources');
}

export function getExperimentsFolder(resolvedExperimentsPath: string, moduleName: string): string {
    return Path.join(getWorkingFolder(resolvedExperimentsPath, moduleName), 'experiments');
}

export function getExperimentAnalysisFile(resolvedExperimentsPath: string, moduleName: string, moduleVersion: string, verifier: string): string {
    return Path.join(getExperimentsFolder(resolvedExperimentsPath, moduleName),
        `${getModuleFolderName(moduleName, moduleVersion)}-${verifier}.json`);
}

export function getExperimentVerificationGrammar(resolvedExperimentsPath: string, moduleName: string, moduleVersion: string, verifier: string): string {
    return Path.join(getExperimentsFolder(resolvedExperimentsPath, moduleName),
        `${getModuleFolderName(moduleName, moduleVersion)}-${verifier}`, 'verification-grammar.ggx');
}

export function getModuleFolderName(moduleName: string, moduleVersion: string): string {
    return `${fixModuleName(moduleName)}=${moduleVersion}`;
}

export function getIndividualVersionFolder(resolvedExperimentsPath: string, moduleName: string, moduleVersion: string): string {
    return Path.join(getSourcesFolder(resolvedExperimentsPath, moduleName), getModuleFolderName(moduleName, moduleVersion));
}

export function getIndividualVersionModuleFolder(resolvedExperimentsPath: string, moduleName: string, moduleVersion: string): string {
    return Path.join(getModulesFolder(resolvedExperimentsPath, moduleName), getModuleFolderName(moduleName, moduleVersion), 'module-net.json');
}

export function getTranslationFolder(resolvedExperimentsPath: string, moduleName: string, moduleVersion: string, verifier: string): string {
    return Path.join(getExperimentsFolder(resolvedExperimentsPath, moduleName), `${getModuleFolderName(moduleName, moduleVersion)}-${verifier}`);
}