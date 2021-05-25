import * as Path from 'path';
import {
    ModuleType,
    GraphEdgeType,
    ModuleNetType,
    ResourceType,
    OperationTypeEnum,
    EdgeTypeEnum,
} from "../../translation/module-net-types";
import {
    ExtractedOperationType,
    SourceExportedItemType,
    SourceInterfaceType,
} from './types';
import {
    fullSimplify,
} from './simplifier';
import {
    extract,
} from './code-extractor';

function extractInterfaceAnything(name: string, code: any): SourceInterfaceType {
    const isFunction = typeof code === 'function';
    if (isFunction) {
        return extractInterfaceFunction(name, code);
    }
    // https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript/8511350#8511350
    const isObject = typeof code === 'object' && null !== code;
    if (isObject) {
        return extractInterfaceObject(name, code);
    }
    return [];
}
function extractInterfaceObject(name: string, obj: any): SourceInterfaceType {
    const keys = Object.keys(obj);
    return keys.map(key => extractInterfaceAnything(`${name}-${key}`, obj[key]))
        .reduce((prev, curr) => [...prev, ...curr], []);
}
// eslint-disable-next-line @typescript-eslint/ban-types
function extractInterfaceFunction(name: string, code: Function): SourceInterfaceType {
    const stringCode = code.toString();
    if (stringCode.startsWith('class ')) {
        return [];
    }
    if (stringCode.startsWith('function') || stringCode.startsWith('(')) {
        // either a function or arrow function
        return [{
            name,
            code: stringCode,
        }];
    }
    // is it object method or arrow function?
    // if it's object method, it'll be "name() {}"
    // it it's arrow function, it'll be "() => {}"
    // all we have to do is test whether the code starts with its name
    // ... but we could still have an arrow function named foo which is "foo => {}"
    // to cover that case, we also check for "=>"
    if (stringCode.trim().startsWith(code.name) && -1 === stringCode.indexOf('=>')) {
        // object method
        return [{
            name,
            code: `function ${stringCode}`,
        }];
    }
    return [{
        name,
        code: stringCode,
    }];
}
export function extractInterface(sourcesPath: string): SourceInterfaceType {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sources = require(sourcesPath);
    // require cache files, so it's not possible to reuse filepaths
    // and change content between extractInterface calls
    // see https://stackoverflow.com/questions/9210542/node-js-require-cache-possible-to-invalidate
    // delete require.cache[require.resolve(sourcesPath)]; // does not work as expected
    if (null === sources) {
        return [];
    }

    const isFunction = typeof sources === 'function';
    if (isFunction) {
        return extractInterfaceFunction(sources['name'] || Path.basename(sourcesPath, '.js'), sources);
    }

    const exports = Object.keys(sources);
    return exports.map(key => extractInterfaceAnything(key, sources[key]))
        .reduce((prev, curr) => [...prev, ...curr], []);
}

export function extractCode(exported: SourceExportedItemType): ExtractedOperationType {
    return extract(exported);
}

/**
 * Current module net does not support arrows between resources of same module.
 * This removes such arrows, resources and attributes.
 * @param extractedOperation 
 */
export function simplifyExtractedOperation(extractedOperation: ExtractedOperationType): ExtractedOperationType {
    return fullSimplify(extractedOperation);
}

/**
 * Generates a client that can be easily integrated into extracted operations to make a module net.
 * @param extractedOperation 
 */
export type ExtractedClientType = {
    forOperation: string,
    requestResource: ResourceType,
    responseResource: ResourceType,
    required: string[],
    generated: string[],
};
export function generateClient(extractedOperation: ExtractedOperationType): ExtractedClientType {
    const reqId = `${extractedOperation.name}-request`;
    const resId = `${extractedOperation.name}-response`;
    function getAttribute(name: string): string {
        return name.split('.')[1];
    }
    const parameters: string[] = extractedOperation.parameters
        .map(par => `${reqId}.${getAttribute(par)}`);
    const returns: string[] = extractedOperation.returns
        .map(ret => `${resId}.${getAttribute(ret)}`);
    return {
        forOperation: extractedOperation.name,
        requestResource: {
            id: reqId,
            attributes: parameters,
        },
        responseResource: {
            id: resId,
            attributes: returns,
        },
        generated: [
            reqId,
            resId,
            ...parameters,
        ],
        required: returns,
    };
}

export function combineExtractionsAndClients(name: string, operations: ExtractedOperationType[], clients: ExtractedClientType[]): ModuleNetType {
    type PairType = {
        client: ExtractedClientType,
        operation: ExtractedOperationType,
    };
    const operationsClients: PairType[] = operations.map(operation => {
        const client = clients.find(({ forOperation }) => forOperation === operation.name);
        if (undefined === client) {
            return null;
        }
        return {
            client,
            operation,
        };
    }).filter(x => null !== x);
    const remainingOperations = operations
        .filter(({ name }) => undefined === operationsClients
            .find(({ operation }) => name === operation.name));
    const remainingClients = clients
        .filter(({ forOperation }) => undefined === operationsClients
            .find(({ operation }) => forOperation === operation.name));
    const moduleNet: ModuleNetType = {
        name,
        nodes: [],
        edges: [],
    };

    function prefix(prefix: string, node: ModuleType): ModuleType {
        return {
            id: prefix,
            generated: node.generated.map(gen => `${prefix}.${gen}`),
            required: node.required.map(req => `${prefix}.${req}`),
            resources: node.resources.map(res => ({
                id: `${prefix}.${res.id}`,
                attributes: res.attributes.map(attr => `${prefix}.${attr}`),
            })),
        };
    }
    function addClientNode(client: ExtractedClientType): ModuleType {
        const nodeId = `${client.forOperation}-cl`;
        const module = prefix(nodeId, {
            id: nodeId,
            required: client.required,
            generated: client.generated,
            resources: [
                client.requestResource,
                client.responseResource,
            ],
        });
        moduleNet.nodes.push(module);
        return module;
    }
    function addOperationNode(operation: ExtractedOperationType): ModuleType {
        const nodeId = `${operation.name}-op`;
        const module = prefix(nodeId, {
            id: nodeId,
            required: operation.required,
            generated: operation.generated,
            resources: operation.resources,
        });
        moduleNet.nodes.push(module);
        return module;
    }
    function pairAttributes(lhs: string[], rhs: string[]): GraphEdgeType[] {
        if (0 === lhs.length || 0 === rhs.length) {
            return [];
        }
        return [
            {
                fromId: lhs[0],
                toId: rhs[0],
            },
            ...pairAttributes(lhs.slice(1), rhs.slice(1)),
        ];
    }
    function addBoth(pair: PairType): void {
        const opModule = addOperationNode(pair.operation);
        const clModule = addClientNode(pair.client);
        const requestResource = clModule.resources[0];
        const responseResource = clModule.resources[1];
        const opResource = opModule.resources[0];
        const parAttributes = opResource.attributes
            .filter(attr => null !== attr.match(/\.par\-/g));
        const returnAttributes = opResource.attributes
            .filter(attr => null !== attr.match(/\.return\-/g));
        moduleNet.edges.push({
            id: pair.operation.name,
            fromId: clModule.id,
            toId: opModule.id,
            type: OperationTypeEnum.GET,
            graph: {
                nodes: [
                    ...opModule.resources.map(({ id }) => ({ id })),
                    ...clModule.resources.map(({ id }) => ({ id })),
                ],
                edges: [{
                    id: `${pair.operation.name}-request`,
                    fromId: requestResource.id,
                    toId: opResource.id,
                    type: EdgeTypeEnum.EDGE_INPUT,
                    attributeMapping: pairAttributes(requestResource.attributes, parAttributes),
                }, {
                    id: `${pair.operation.name}-response`,
                    fromId: opResource.id,
                    toId: responseResource.id,
                    type: EdgeTypeEnum.EDGE_OUTPUT,
                    attributeMapping: pairAttributes(returnAttributes, responseResource.attributes),
                }],
            },
        });
    }

    remainingOperations.forEach(operation => addOperationNode(operation));
    remainingClients.forEach(client => addClientNode(client));
    operationsClients.forEach(pair => addBoth(pair));
    return moduleNet;
}