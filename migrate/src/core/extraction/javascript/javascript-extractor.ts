import * as Path from 'path';
import * as babelParser from '@babel/parser';
import {
    File,
} from '@babel/types';
import {
    deduplicate,
} from '../../helpers/sets';
import {
    ModuleType,
    ModuleNetType,
} from '../../translation/module-net-types';
import {
    getModuleById,
    bind,
    mergeInto,
    addModule,
    addAttributeToModule,
} from '../../module-net/module-net';
import {
    extractRequireNames,
} from './require-extractor';
import {
    extractRemainingOperations,
    extractOwnOperations,
    extractOperations,
    extractInterfaceOperations,
} from './operation-extractor';

export function extractModuleNetFromProgramsWithMockCaller(entryPoint: string,
    filenamesToPrograms: Record<string, string>, name: string): ModuleNetType {
    const filenamesToParsed: Record<string, File> = {};
    Object.keys(filenamesToPrograms).forEach(key => {
        const programText = filenamesToPrograms[key];
        filenamesToParsed[key] = babelParser.parse(programText);
    });
    const moduleNet: ModuleNetType = {
        name,
        nodes: [],
        edges: [],
    };
    extractModuleNetFromParsed(entryPoint, filenamesToParsed, moduleNet);
    const program = filenamesToParsed[entryPoint];
    const interfaceOperations = extractInterfaceOperations(program, entryPoint, filenamesToParsed);
    const mockCaller: ModuleType = {
        id: '?',
        generated: [],
        required: [],
        resources: [],
    };
    // bind to the right module
    // 
    interfaceOperations.operations.forEach(operation => {
        const toModule = getModuleById(operation.toId, moduleNet);
        if (!toModule) {
            throw new Error(`could not find module ${operation.toId}`);
        }
        mergeInto(moduleNet, bind(mockCaller, toModule, [operation]));
    });
    return moduleNet;
}

export function extractModuleNetFromPrograms(entryPoint: string,
    filenamesToPrograms: Record<string, string>, name: string): ModuleNetType {
    const filenamesToParsed: Record<string, File> = {};
    Object.keys(filenamesToPrograms).forEach(key => {
        const programText = filenamesToPrograms[key];
        filenamesToParsed[key] = babelParser.parse(programText);
    });
    const moduleNet: ModuleNetType = {
        name,
        nodes: [],
        edges: [],
    };
    extractModuleNetFromParsed(entryPoint, filenamesToParsed, moduleNet);
    return moduleNet;
}

function extractModuleNetFromParsed(entryPoint: string,
    filenamesToPrograms: Record<string, File>, accumulatedModuleNet: ModuleNetType): void {
    if (accumulatedModuleNet.nodes.find(node => node.id === entryPoint)) {
        return;
    }
    const program = filenamesToPrograms[entryPoint];
    if (!program) {
        throw new Error(`missing module ${entryPoint}`);
    }
    addModule(accumulatedModuleNet, entryPoint);
    extractModuleNet(program, entryPoint, filenamesToPrograms, accumulatedModuleNet);
}

function extractModuleNet(program: File, name: string,
    filenamesToPrograms: Record<string, File>, accumulatedModuleNet: ModuleNetType): void {
    // console.log('>>>', name)
    const thisModule = getModuleById(name, accumulatedModuleNet);

    // console.log('>>>>>>>>>>>>>>>>self ', name)
    const extractedOperationsSelf = extractOwnOperations(program, name);
    mergeInto(accumulatedModuleNet, bind(thisModule, thisModule, extractedOperationsSelf.operations));
    const uniqueRequires: string[] = extractRequireNames(program);
    uniqueRequires
        .forEach(require => {
            const normalizedRequire = normalizeRequire(require, name);
            const calleeProgram = filenamesToPrograms[normalizedRequire];
            if (!calleeProgram) {
                // ignore remaining operations, they will be processed later
                return;
            }
            extractModuleNetFromParsed(normalizedRequire, filenamesToPrograms, accumulatedModuleNet);
            const calleeModule = getModuleById(normalizedRequire, accumulatedModuleNet);
            // console.log('>>>>>>>>>>>>>>>>from ', name, ' to ', require, ' (normalized ', normalizedRequire, ' )')
            const extractedOperations = extractOperations(program, calleeProgram, name, require);
            mergeInto(accumulatedModuleNet, bind(thisModule, calleeModule, extractedOperations.operations));
        });
    // console.log('>>>>>>>>>>>>>>>>remaining ', name)
    const normalizedRequires: string[] = uniqueRequires.map(require => normalizeRequire(require, name));
    const allRequires = normalizedRequires.concat(uniqueRequires);
    const remainingOperations = extractRemainingOperations(program, name, allRequires);

    remainingOperations.requires.forEach(require => addAttributeToModule(thisModule, require));
    remainingOperations.generates.forEach(generate => addAttributeToModule(thisModule, generate));
    thisModule.required = deduplicate(thisModule.required.concat(remainingOperations.requires));
    thisModule.generated = deduplicate(thisModule.generated.concat(remainingOperations.generates));
}

function normalizeRequire(require: string, dirname: string): string {
    return Path.join(Path.dirname(dirname), require.replace('.js', ''));
}
