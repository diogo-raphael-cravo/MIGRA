import * as Path from 'path';
import * as babelTraverse from '@babel/traverse';
import {
    File,
} from '@babel/types';
import {
    getPath,
} from '../compilers/babel-helpers';
import {
    deduplicate,
} from '../../helpers/sets';
import {
    OperationType,
    EdgeContentType,
} from '../../translation/module-net-types';
import {
    prefixEdgeIfModule,
    getModuleName,
    prefixResourceName,
} from '../../module-net/module-net';
import {
    extractRequires,
    getRequire,
} from './require-extractor';
import {
    append,
    getFullName,
    getTopParent,
    IdentifierType,
    removeTopParent,
} from './identifier-extractor';
import {
    FunctionCallType,
    extractFunctionCalls,
} from './function-call-extractor';
import {
    ExportType,
    ExportNameType,
    extractExports,
    toIdentifier,
} from './export-extractor';
import {
    ParameterType,
    FunctionDeclarationType,
    pathToFunctionDeclaration,
    resolveFunctionDeclaration,
} from './function-declaration-extractor';
import {
    getIdentifierScopeName,
} from './scope-analyzer';

function getCalleerFunctionCalls(caller: File, calleeName: string): FunctionCallType[] {
    const requires = extractRequires(caller);
    const calleeIdentifiers = requires
        .filter(({ required }) => required === calleeName)
        .filter(({ identifier }) => identifier)
        .map(({ identifier }) => identifier);
    const callerFunctionCalls: FunctionCallType[] = extractFunctionCalls(caller)
        // keep functions invoked on required module
        .filter(functionCall => calleeIdentifiers.find(identifier =>
            // this excludes following
            // const { foobar } = require('foobar')
            identifier.value === getTopParent(functionCall.functionIdentifier).value));
    return callerFunctionCalls;
}

function getLocalFunctionCalls(caller: File): FunctionCallType[] {
    const requires = extractRequires(caller);
    const allIdentifiers = requires
        .filter(({ identifier }) => identifier)
        .map(({ identifier }) => identifier);
    const localFunctionCalls: FunctionCallType[] = extractFunctionCalls(caller)
        // keep functions not invoked on any required module
        .filter(functionCall => !allIdentifiers.find(identifier =>
            // this excludes following
            // const { foobar } = require('foobar')
            identifier.value === getTopParent(functionCall.functionIdentifier).value));
    return localFunctionCalls;
}

function getRequiredFunctionCalls(caller: File, calleeNamesToExclude: string[]): FunctionCallType[] {
    const requires = extractRequires(caller);
    const calleeIdentifiers = requires
        .filter(({ required }) => !calleeNamesToExclude.find(calleeName => required === calleeName))
        .filter(({ identifier }) => identifier)
        .map(({ identifier }) => identifier);
    const callerFunctionCalls: FunctionCallType[] = extractFunctionCalls(caller)
        // keep functions invoked on required module
        .filter(functionCall => calleeIdentifiers.find(identifier =>
            // this excludes following
            // const { foobar } = require('foobar')
            identifier.value === getTopParent(functionCall.functionIdentifier).value));
    return callerFunctionCalls;
}

type FunctionDeclarationExportType = {
    functionDeclaration: FunctionDeclarationType,
    export: ExportType,
};
function getFunctionExports(calleeExports: ExportType[]): FunctionDeclarationExportType[] {
    const calleeFunctionExports: FunctionDeclarationExportType[] = calleeExports
        .map((exported: ExportType) => {
            const functionDeclaration = pathToFunctionDeclaration(exported.export);
            if (null === functionDeclaration) {
                // try to resolve function name
                const resolvedExport = resolveFunctionDeclaration(exported.export);
                const resolvedFunctionDeclaration = pathToFunctionDeclaration(resolvedExport);
                if (null === resolvedFunctionDeclaration) {
                    return null;
                }
                return {
                    functionDeclaration: resolvedFunctionDeclaration,
                    export: {
                        assignee: exported.assignee,
                        export: resolvedExport,
                    },
                };
            }
            return {
                functionDeclaration,
                export: exported,
            };
        })
        .filter(x => x);
    return calleeFunctionExports;
}

function identifierToExport(identifier: IdentifierType): ExportNameType {
    if (null === identifier) {
        return null;
    }
    if (identifier.destructured) {
        throw new Error('cannot transform destructured identifier');
    }
    return {
        name: identifier.value,
        parent: identifierToExport(identifier.parent),
    };
}

function getFunctionDeclarations(file: File): FunctionDeclarationExportType[] {
    const programPath = getPath(file);
    const bodyPath: babelTraverse.NodePath[] = <babelTraverse.NodePath[]> programPath.get('body');
    return bodyPath.map(statement => {
        const functionDeclaration = pathToFunctionDeclaration(statement);
        if (null === functionDeclaration) {
            return null;
        }
        return {
            functionDeclaration,
            export: {
                assignee: identifierToExport(functionDeclaration.functionIdentifier),
                export: statement,
            },
        };
    })
    .filter(x => x);
}

export type IntegrationPointType = {
    callerSite: FunctionCallType,
    calleeSite: FunctionDeclarationExportType,
};
function getFunctionCallsWithoutMatches(callerFunctionCalls: FunctionCallType[],
    calleeFunctionExports: FunctionDeclarationExportType[]): FunctionCallType[] {
    const functionCallsWithoutMatches: FunctionCallType[] = [];
    callerFunctionCalls.forEach(callerFunctionCall => {
        let matches = false;
        calleeFunctionExports.forEach(calleeFunctionExport => {
            matches = isSameIdentifier(callerFunctionCall.functionIdentifier, calleeFunctionExport.export.assignee);
        });
        if (!matches) {
            functionCallsWithoutMatches.push(callerFunctionCall);
        }
    });
    return functionCallsWithoutMatches;
}
function getIntegrationPoints(callerFunctionCalls: FunctionCallType[],
    calleeFunctionExports: FunctionDeclarationExportType[]): IntegrationPointType[] {
    const integrations: IntegrationPointType[] = [];
    callerFunctionCalls.forEach(callerFunctionCall => {
        calleeFunctionExports.forEach(calleeFunctionExport => {
            const same = isSameIdentifier(callerFunctionCall.functionIdentifier, calleeFunctionExport.export.assignee);
            if (same) {
                integrations.push({
                    callerSite: callerFunctionCall,
                    calleeSite: calleeFunctionExport,
                });
            }
        });
    });
    return integrations;
}

export type ExtractedOperationType = {
    requires: string[],
    generates: string[],
    operations: OperationType[],
};

function prefixOperations(operations: OperationType[], moduleToPrefix: string): OperationType[] {
    return operations.map(operation => ({
        ...operation,
        id: `${operation.toId}-${operation.id}`,
        graph: {
            nodes: operation.graph.nodes
                .map(node => {
                    if (getModuleName(node.id) === moduleToPrefix) {
                        return {
                            id: prefixResourceName(node.id, operation.toId),
                        };
                    }
                    return node;
                }),
            edges: operation.graph.edges
                .map(edge => prefixEdgeIfModule(edge, moduleToPrefix, operation.toId)),
        }
    }));
}

function normalizeRequire(require: string, dirname: string): string {
    return Path.join(Path.dirname(dirname), require.replace('.js', ''));
}

/**
 * IGNORE_CALLER
 * Extracts exposed operations, creating caller as needed.
 */
export function extractInterfaceOperations(callee: File, calleeName: string,
    modulesToSearch: Record<string, File>, exportedName: IdentifierType = null): ExtractedOperationType {
    const extractedOperations: ExtractedOperationType = {
        requires: [],
        generates: [],
        operations: [],
    };
    const callerName = '?';

    const calleeExports: ExportType[] = extractExports(callee);
    // console.log('calleeExports=================================================================================')
    // console.log(calleeExports)

    const calleeFunctionExports: FunctionDeclarationExportType[] = [];
    calleeFunctionExports.push(...getFunctionExports(calleeExports));
    // console.log('calleeFunctionExports=================================================================================')
    // console.log(calleeFunctionExports)

    const integrations: IntegrationPointType[] = [];
    calleeFunctionExports.forEach(calleeSite => {
        integrations.push({
            calleeSite,
            callerSite: {
                argumentsByPosition: calleeSite.functionDeclaration.parametersByPosition,
                assignedTo: calleeSite.functionDeclaration.return,
                functionIdentifier: append(exportedName, toIdentifier(calleeSite.export.assignee)),
                path: calleeSite.export.export,
            },
        });
    });
    // console.log('integrations=================================================================================')
    // console.log(integrations)

    const sanitizedCalleeName = calleeName.replace('../', '').replace('./', '').replace('.js', '');
    const operationCalleeName = sanitizedCalleeName;
    const unprefixedOperations = integrations.map(integration => toOperation(integration, callerName, operationCalleeName));
    const operations = prefixOperations(unprefixedOperations, callerName);
    // console.log('operations=================================================================================')
    // console.log(operations)
    extractedOperations.operations.push(...operations);

    // example: module.exports.x = require('x');
    const exportedRequires = calleeExports.map(e => getRequire(e.export)).filter(x => x);
    // console.log('exportedRequires=================================================================================')
    // console.log(exportedRequires)
    exportedRequires.forEach(require => {
        const normalizedRequire = normalizeRequire(require.required, calleeName);
        const calleesCalleeProgram = modulesToSearch[normalizedRequire];
        if (!calleesCalleeProgram) {
            // silently ignore unavailable modules
            return;
        }
        // remove module.exports
        const exportedName = removeTopParent(removeTopParent(require.identifier));
        // console.log('extract for ', require.required, ' in ', calleeName)
        const nestedExtracted = extractInterfaceOperations(calleesCalleeProgram, require.required, modulesToSearch, exportedName);
        extractedOperations.requires.push(...nestedExtracted.requires);
        extractedOperations.generates.push(...nestedExtracted.generates);
        extractedOperations.operations.push(...nestedExtracted.operations);
    });

    return extractedOperations;
}

/**
 * IGNORE_CALLEE
 * Remaining is an operation that is:
 *  - neither locally defined
 *  - nor invoked on one of the modules from the list provided as argument
 */
export function extractRemainingOperations(caller: File, callerName: string, modulesToExclude: string[]): ExtractedOperationType {
    const extractedOperations: ExtractedOperationType = {
        requires: [],
        generates: [],
        operations: [],
    };

    const callerFunctionCalls: FunctionCallType[] = [];
    const localFunctionCalls = getLocalFunctionCalls(caller);
    // console.log('localFunctionCalls=================================================================================')
    // console.log(localFunctionCalls)
    callerFunctionCalls.push(...localFunctionCalls);
    const requiredFunctionCalls = getRequiredFunctionCalls(caller, modulesToExclude);
    // console.log('requiredFunctionCalls=================================================================================')
    // console.log(requiredFunctionCalls)
    callerFunctionCalls.push(...requiredFunctionCalls);
    // console.log('callerFunctionCalls=================================================================================')
    // console.log(callerFunctionCalls)

    const calleeFunctionExports: FunctionDeclarationExportType[] = [];
    calleeFunctionExports.push(...getFunctionDeclarations(caller));
    // console.log('calleeFunctionExports=================================================================================')
    // console.log(calleeFunctionExports)

    // remove functions that match local declarations
    const remainingFunctionCalls: FunctionCallType[] = getFunctionCallsWithoutMatches(callerFunctionCalls, calleeFunctionExports);
    // console.log('remainingFunctionCalls=================================================================================')
    // console.log(remainingFunctionCalls)

    remainingFunctionCalls.forEach(remaining => {
        if ('require' === remaining.functionIdentifier.value) {
            // ignore requires
            return;
        }
        remaining.argumentsByPosition.forEach(argument => {
            argument.identifiers.forEach(identifier => {
                const name = makeAttributeName(callerName, identifier, remaining.path.scope);
                extractedOperations.requires.push(name);
            });
        });
        remaining.assignedTo.forEach(identifier => {
            const name = makeAttributeName(callerName, identifier, remaining.path.scope);
            extractedOperations.generates.push(name);
        });
    });
    return extractedOperations;
}

/**
 * CALLEE_SAME_AS_CALLER
 */
export function extractOwnOperations(caller: File, callerName: string): ExtractedOperationType {
    const extractedOperations: ExtractedOperationType = {
        requires: [],
        generates: [],
        operations: [],
    };

    const callerFunctionCalls: FunctionCallType[] = [];
    callerFunctionCalls.push(...getLocalFunctionCalls(caller));
    // console.log('callerFunctionCalls=================================================================================')
    // console.log(callerFunctionCalls)

    const calleeFunctionExports: FunctionDeclarationExportType[] = [];
    calleeFunctionExports.push(...getFunctionDeclarations(caller));
    // console.log('calleeFunctionExports=================================================================================')
    // console.log(calleeFunctionExports)

    const integrations: IntegrationPointType[] = getIntegrationPoints(callerFunctionCalls, calleeFunctionExports);
    // console.log('integrations=================================================================================')
    // console.log(integrations)

    const operationCalleeName = callerName;
    const operations = integrations.map(integration => toOperation(integration, callerName, operationCalleeName));
    // console.log('operations=================================================================================')
    // console.log(operations)
    extractedOperations.operations.push(...operations);

    return extractedOperations;
}

/**
 * CALLEE_IS_NOT_CALLER
 */
export function extractOperations(caller: File, callee: File, callerName: string, calleeName: string): ExtractedOperationType {
    const extractedOperations: ExtractedOperationType = {
        requires: [],
        generates: [],
        operations: [],
    };

    const callerFunctionCalls: FunctionCallType[] = [];
    callerFunctionCalls.push(...getCalleerFunctionCalls(caller, calleeName));
    // if (callerName === 'ranges/min-version' && calleeName === '../functions/gt') {
    //     console.log('callerFunctionCalls=================================================================================')
    //     console.log(callerFunctionCalls)
    // }
    // console.log('callerFunctionCalls=================================================================================')
    // console.log(callerFunctionCalls)

    const calleeFunctionExports: FunctionDeclarationExportType[] = [];
    const calleeExports: ExportType[] = extractExports(callee);
    // if (callerName === 'ranges/min-version' && calleeName === '../functions/gt') {
    //     console.log('calleeExports=================================================================================')
    //     console.log(calleeExports)
    // }
    // console.log('calleeExports=================================================================================')
    // console.log(calleeExports)

    calleeFunctionExports.push(...getFunctionExports(calleeExports));
    // if (callerName === 'ranges/min-version' && calleeName === '../functions/gt') {
    //     console.log('calleeFunctionExports=================================================================================')
    //     console.log(calleeFunctionExports)
    // }
    // console.log('calleeFunctionExports=================================================================================')
    // console.log(calleeFunctionExports)

    const integrations: IntegrationPointType[] = getIntegrationPoints(callerFunctionCalls, calleeFunctionExports);
    // console.log('integrations=================================================================================')
    // console.log(integrations)

    const sanitizedCalleeName = calleeName.replace('../', '').replace('./', '').replace('.js', '');
    const operationCalleeName = sanitizedCalleeName;
    const operations = integrations.map(integration => toOperation(integration, callerName, operationCalleeName));
    // console.log('operations=================================================================================')
    // console.log(operations)
    extractedOperations.operations.push(...operations);

    return extractedOperations;
}

function makeAttributeName(moduleName: string, identifier: IdentifierType, scope: babelTraverse.Scope): string {
    return `${makeResourceName(moduleName, identifier, scope)}.${identifier.value}`;
}

function makeResourceName(moduleName: string, identifier: IdentifierType, scope: babelTraverse.Scope): string {
    const prefixedResourceName = getIdentifierScopeName(identifier, scope);
    if (null === prefixedResourceName) {
        throw new Error(`could not prefix scope for identifier ${identifier.value}`);
    }
    return `${moduleName}.${prefixedResourceName}`;
}

function makeCallerToCalleeEdges(integration: IntegrationPointType, callerModule: string, calleeModule: string): EdgeContentType[] {
    return integration.callerSite.argumentsByPosition
        .map((callerArgument, i) => {
            const calleeArgumentIds: ParameterType = integration.calleeSite.functionDeclaration.parametersByPosition[i];
            if (calleeArgumentIds.identifiers.length !== 1) {
                throw new Error('wrong number of parameters for function');
            }
            const calleeArgument: IdentifierType = calleeArgumentIds.identifiers[0];
            const calleeResource = makeResourceName(calleeModule, calleeArgument, integration.calleeSite.export.export.scope);
            return callerArgument.identifiers.map(callerIdentifier => {
                const callerResource = makeResourceName(callerModule, callerIdentifier, integration.callerSite.path.scope);
                return {
                    id: '',
                    fromId: callerResource,
                    toId: calleeResource,
                    type: null,
                    attributeMapping: [{
                        fromId: makeAttributeName(callerModule, callerIdentifier, integration.callerSite.path.scope),
                        toId: makeAttributeName(calleeModule, calleeArgument, integration.calleeSite.export.export.scope),
                    }],
                };
            });
        })
        .reduce((prev, curr) => [...prev, ...curr], []);
}

function makeCalleeToCallerEdges(integration: IntegrationPointType, callerModule: string, calleeModule: string): EdgeContentType[] {
    if (integration.callerSite.assignedTo.length === 0) {
        return [];
    }
    return integration.callerSite.assignedTo.map(assingmentIdentifier => {
        const callerResource = makeResourceName(callerModule, assingmentIdentifier, integration.callerSite.path.scope);
        return integration.calleeSite.functionDeclaration.return
            .map(returnIdentifier => {
                const calleeResource = makeResourceName(calleeModule, returnIdentifier, integration.calleeSite.export.export.scope);
                return {
                    id: '',
                    fromId: calleeResource,
                    toId: callerResource,
                    type: null,
                    attributeMapping: [{
                        fromId: makeAttributeName(calleeModule, returnIdentifier, integration.calleeSite.export.export.scope),
                        toId: makeAttributeName(callerModule, assingmentIdentifier, integration.callerSite.path.scope),
                    }],
                };
            });
    }).reduce((prev, curr) => [...prev, ...curr], []);
}

export function toOperation(integration: IntegrationPointType, callerModule: string, calleeModule: string): OperationType {
    const nodeNames: string[] = [];
    const callerToCallee = makeCallerToCalleeEdges(integration, callerModule, calleeModule);
    callerToCallee.forEach(edge => {
        nodeNames.push(edge.fromId);
        nodeNames.push(edge.toId);
    });
    const calleeToCaller = makeCalleeToCallerEdges(integration, callerModule, calleeModule);
    calleeToCaller.forEach(edge => {
        nodeNames.push(edge.fromId);
        nodeNames.push(edge.toId);
    });
    return {
        id: getFullName(integration.callerSite.functionIdentifier),
        type: null,
        fromId: callerModule,
        toId: calleeModule,
        graph: {
            edges: callerToCallee.concat(calleeToCaller),
            nodes: deduplicate(nodeNames).map(name => ({ id: name })),
        },
    };
}

/**
 * assumes the following:
 *      - caller is the identifier of a function call in caller module
 *      - when not destructured, caller contains callee module name in caller module
 *      - callee is the exported name of a function declared in callee module
 */
export function isSameIdentifier(caller: IdentifierType, callee: ExportNameType): boolean {
    if (null === callee) {
        return true;
    }
    if (null === caller) {
        return false;
    }
    if (null === caller.value) {
        return false;
    }
    if (null === callee.name) {
        return true;
    }
    if (caller.destructured) {
        throw new Error('not implemented');
    }
    if (caller.value === callee.name) {
        if (null === callee.parent) {
            return true;
        }
        return isSameIdentifier(caller.parent, callee.parent);
    }
    return false;
}