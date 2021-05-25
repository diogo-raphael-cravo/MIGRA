import { id } from '../helpers/uuid';
import {
    ModuleNetType,
    ModuleType,
    ResourceType,
    OperationType,
    EdgeContentType,
} from '../translation/module-net-types';
import {
    deduplicate,
} from '../helpers/sets';

export function getModuleById(id: string, moduleNet: ModuleNetType): ModuleType {
    return moduleNet.nodes.find(node => node.id === id);
}

export function getResourceById(id: string, module: ModuleType): ResourceType {
    return module.resources.find(resource => resource.id === makeResourceName(module.id, id));
}

export function addModule(moduleNet: ModuleNetType, moduleId: string): void {
    const moduleExists = undefined !== moduleNet.nodes
        .find(existingModule => existingModule.id === moduleId);
    if (moduleExists) {
        return;
    }
    moduleNet.nodes.push({
        id: moduleId,
        resources: [],
        required: [],
        generated: [],
    });
}

export function addResource(moduleNet: ModuleNetType, moduleId: string, resourceId: string): void {
    const module = getModuleById(moduleId, moduleNet);
    const qualifiedResourceId = makeResourceName(moduleId, resourceId);
    addResourceToModule(module, qualifiedResourceId);
}

export function addResourceToModule(module: ModuleType, qualifiedResourceId: string): void {
    if (module.id !== getModuleName(qualifiedResourceId)) {
        throw new Error('trying to add resource to the wrong module');
    }
    const resourceExists = undefined !== module.resources
        .find(existingResource => existingResource.id === qualifiedResourceId);
    if (resourceExists) {
        return;
    }
    module.resources.push({
        id: qualifiedResourceId,
        attributes: [],
    });
}

export function addAttribute(moduleNet: ModuleNetType, moduleId: string, resourceId: string, newAttributeId: string): void {
    const module = getModuleById(moduleId, moduleNet);
    const qualifiedAttributeId = makeAttributeName(moduleId, resourceId, newAttributeId);
    const resource = getResourceById(resourceId, module);
    const attributeExists = undefined !== resource.attributes
        .find(existingAttribute => existingAttribute === qualifiedAttributeId);
    if (attributeExists) {
        return;
    }
    resource.attributes.push(qualifiedAttributeId);
}

export function addAttributeToModule(module: ModuleType, qualifiedAttributeId: string): void {
    if (module.id !== getModuleName(qualifiedAttributeId)) {
        throw new Error('trying to add attribute to the wrong module');
    }
    const resourceId = getResourceName(qualifiedAttributeId);
    if (!getResourceById(resourceId, module)) {
        addResourceToModule(module, makeResourceName(module.id, resourceId));
    }
    const resource = getResourceById(resourceId, module);
    const attributeExists = undefined !== resource.attributes
        .find(existingAttribute => existingAttribute === qualifiedAttributeId);
    if (attributeExists) {
        return;
    }
    resource.attributes.push(qualifiedAttributeId);
}

export function makeRequired(moduleNet: ModuleNetType, moduleId: string, resourceOrAttributeId: string): void {
    const module = getModuleById(moduleId, moduleNet);
    module.required.push(resourceOrAttributeId);
}

export function makeGenerated(moduleNet: ModuleNetType, moduleId: string, resourceOrAttributeId: string): void {
    const module = getModuleById(moduleId, moduleNet);
    module.generated.push(resourceOrAttributeId);
}

export function isRequired(moduleNet: ModuleNetType, moduleId: string, resourceOrAttributeId: string): boolean {
    const module = getModuleById(moduleId, moduleNet);
    return undefined !== module.required.find(required => required === resourceOrAttributeId);
}

export function isGenerated(moduleNet: ModuleNetType, moduleId: string, resourceOrAttributeId: string): boolean {
    const module = getModuleById(moduleId, moduleNet);
    return undefined !== module.generated.find(generated => generated === resourceOrAttributeId);
}

export function removeResourcesWithoutAttributes(moduleNet: ModuleNetType): void {
    moduleNet.nodes.forEach(node => removeResourcesWithoutAttributesFromModule(node));
}

export function removeResourcesWithoutAttributesFromModule(module: ModuleType): void {
    module.resources = module.resources
        .filter(resource => resource.attributes.length > 0);
}

export function join(moduleNet: ModuleNetType, moduleId: string): ModuleNetType {
    const merged: ModuleNetType = {
        name: moduleNet.name,
        nodes: [],
        edges: [],
    };
    addModule(merged, moduleId);
    moduleNet.nodes.forEach(node => {
        node.resources.forEach(resource => {
            const resourceId = resource.id.replace('.', '-');
            addResource(merged, moduleId, resourceId);
            if (isRequired(moduleNet, node.id, resource.id)) {
                makeRequired(merged, moduleId, resourceId);
            }
            if (isGenerated(moduleNet, node.id, resource.id)) {
                makeGenerated(merged, moduleId, resourceId);
            }
            resource.attributes.forEach(attribute => {
                const attributeName = getAttributeName(attribute);
                const newAttributeName = makeAttributeName(moduleId, resourceId, attributeName);
                addAttribute(merged, moduleId, resourceId, attributeName);
                if (isRequired(moduleNet, node.id, attribute)) {
                    makeRequired(merged, moduleId, newAttributeName);
                }
                if (isGenerated(moduleNet, node.id, attribute)) {
                    makeGenerated(merged, moduleId, newAttributeName);
                }
            });
        });
    });
    // edges
    moduleNet.edges.forEach(edge => {
        merged.edges.push({
            ...edge,
            fromId: moduleId,
            toId: moduleId,
        });
    });
    return merged;
}

export function copyInto(into: ModuleNetType, from: ModuleNetType): void {
    from.nodes.forEach(node => {
        const nodeExists = undefined !== into.nodes
            .find(existingNode => existingNode.id === node.id);
        if (nodeExists) {
            throw new Error(`would overwrite module ${node.id}`);
        }
        const newNode = {
            id: node.id,
            resources: [],
            required: [...node.required],
            generated: [...node.generated],
        };
        into.nodes.push(newNode);
        node.resources.forEach(resource => {
            newNode.resources.push({
                id: resource.id,
                attributes: [...resource.attributes],
            });
        });
    });
    from.edges.forEach(edge => {
        const newEdge = {
            id: edge.id,
            type: edge.type,
            fromId: edge.fromId,
            toId: edge.toId,
            graph: {
                nodes: [],
                edges: [],
            },
        };
        into.edges.push(newEdge);
        edge.graph.nodes.forEach(graphNode => {
            newEdge.graph.nodes.push({
                id: graphNode.id,
            });
        });
        edge.graph.edges.forEach(graphEdge => {
            const newGraphEdge = {
                id: graphEdge.id,
                fromId: graphEdge.fromId,
                toId: graphEdge.toId,
                type: graphEdge.type,
                attributeMapping: [],
            };
            newEdge.graph.edges.push(newGraphEdge);
            graphEdge.attributeMapping.forEach(attributeMapping => {
                newGraphEdge.attributeMapping.push({
                    fromId: attributeMapping.fromId,
                    toId: attributeMapping.toId,
                });
            });
        });
    });
}

export function mergeInto(into: ModuleNetType, from: ModuleNetType): void {
    from.nodes.forEach(fromNode => {
        let intoNode = into.nodes
            .find(existingNode => existingNode.id === fromNode.id);
        const nodeExists = undefined !== intoNode;
        if (nodeExists) {
            intoNode.generated = deduplicate(intoNode.generated.concat(fromNode.generated));
            intoNode.required = deduplicate(intoNode.required.concat(fromNode.required));
        } else {
            intoNode = {
                id: fromNode.id,
                resources: [],
                required: [...fromNode.required],
                generated: [...fromNode.generated],
            };
            into.nodes.push(intoNode);
        }
        fromNode.resources.forEach(fromResource => {
            const intoResource = intoNode.resources
            .find(existingResource => existingResource.id === fromResource.id);
            const resourceExists = undefined !== intoResource;
            if (resourceExists) {
                intoResource.attributes = deduplicate(intoResource.attributes.concat(fromResource.attributes));
            } else {
                intoNode.resources.push({
                    id: fromResource.id,
                    attributes: [...fromResource.attributes],
                });
            }
        });
    });
    from.edges.forEach(edge => {
        const newEdge = {
            id: edge.id,
            type: edge.type,
            fromId: edge.fromId,
            toId: edge.toId,
            graph: {
                nodes: [],
                edges: [],
            },
        };
        into.edges.push(newEdge);
        edge.graph.nodes.forEach(graphNode => {
            newEdge.graph.nodes.push({
                id: graphNode.id,
            });
        });
        edge.graph.edges.forEach(graphEdge => {
            const newGraphEdge = {
                id: graphEdge.id,
                fromId: graphEdge.fromId,
                toId: graphEdge.toId,
                type: graphEdge.type,
                attributeMapping: [],
            };
            newEdge.graph.edges.push(newGraphEdge);
            graphEdge.attributeMapping.forEach(attributeMapping => {
                newGraphEdge.attributeMapping.push({
                    fromId: attributeMapping.fromId,
                    toId: attributeMapping.toId,
                });
            });
        });
    });
}

function findModule(qualifiedName: string, actualCaller: string, actualCallee: string,
    bindCaller: ModuleType, bindCallee: ModuleType): ModuleType {
    const moduleId = getModuleName(qualifiedName);
    const isCaller = moduleId === actualCaller;
    const isCallee = moduleId === actualCallee;
    if (!isCaller && !isCallee) {
        throw new Error(`could not find module ${moduleId}`);
    }
    if (isCaller) {
        return bindCaller;
    }
    return bindCallee;
}

function bindResource(qualifiedName: string, newModule: ModuleType): void {
    const resourceName = makeResourceName(newModule.id, getResourceName(qualifiedName));
    addResourceToModule(newModule, resourceName);
}

function bindAttribute(qualifiedName: string, newModule: ModuleType): void {
    const attributeName = makeAttributeName(newModule.id, getResourceName(qualifiedName), getAttributeName(qualifiedName));
    addAttributeToModule(newModule, attributeName);
}

export function bind(caller: ModuleType, callee: ModuleType, operations: OperationType[]): ModuleNetType {
    function findModuleBind(qualifiedName: string, fromId: string, toId: string): ModuleType {
        return findModule(qualifiedName, fromId, toId, caller, callee);
    }
    operations.forEach(operation => {
        // assumes modules will not have the same name
        operation.graph.nodes
            .forEach(resource => bindResource(resource.id, findModuleBind(resource.id, operation.fromId, operation.toId)));
        operation.graph.edges.map(edge => 
            edge.attributeMapping.forEach(({ fromId, toId }) => {
                bindAttribute(fromId, findModuleBind(fromId, operation.fromId, operation.toId));
                bindAttribute(toId, findModuleBind(toId, operation.fromId, operation.toId));
            }));
    });
    function makeResourceNameBind(qualifiedName: string, operation: OperationType): string {
        return makeResourceName(findModuleBind(qualifiedName, operation.fromId, operation.toId).id,
            getResourceName(qualifiedName));
    }
    function makeAttributeNameBind(qualifiedName: string, operation: OperationType): string {
        return makeAttributeName(findModuleBind(qualifiedName, operation.fromId, operation.toId).id,
            getResourceName(qualifiedName),  getAttributeName(qualifiedName));
    }
    return {
        name: '',
        nodes: [ caller, callee ],
        edges: operations.map(operation => ({
            ...operation,
            graph: {
                nodes: operation.graph.nodes.map(({ id }) => ({
                    id: makeResourceNameBind(id, operation),
                })),
                edges: operation.graph.edges.map(edge => {
                    const fromId = makeResourceNameBind(edge.fromId, operation);
                    const toId = makeResourceNameBind(edge.toId, operation);
                    return {
                        ...edge,
                        id: `${operation.id}-${fromId}-${toId}-${id()}`,
                        fromId,
                        toId,
                        attributeMapping: edge.attributeMapping
                            .map(({ fromId, toId }) => ({
                                fromId: makeAttributeNameBind(fromId, operation),
                                toId: makeAttributeNameBind(toId, operation),
                            })),
                    };
                }),
            },
            fromId: caller.id,
            toId: callee.id,
        })),
    };
}

export function sum(into: ModuleNetType, from: ModuleNetType): ModuleNetType {
    return combine(into, from, copyInto);
}

export function merge(into: ModuleNetType, from: ModuleNetType): ModuleNetType {
    return combine(into, from, mergeInto);
}

export function combine(into: ModuleNetType, from: ModuleNetType,
    mergeFunction: (into: ModuleNetType, from: ModuleNetType) => void): ModuleNetType {
    const sum: ModuleNetType = {
        name: into.name,
        nodes: [],
        edges: [],
    };
    mergeFunction(sum, into);
    mergeFunction(sum, from);
    return sum;
}

export function getModuleName(qualifiedName: string): string {
    return qualifiedName.split('.')[0];
}

export function getResourceName(qualifiedName: string): string {
    return qualifiedName.split('.')[1];
}

export function prefixResourceName(qualifiedResourceName: string, prefix: string): string {
    return `${getModuleName(qualifiedResourceName)}.${prefix}-${getResourceName(qualifiedResourceName)}`;
}

export function makeResourceName(module: string, resource: string): string {
    return `${module}.${resource}`;
}

export function makeAttributeName(module: string, resource: string, attribute: string): string {
    return `${module}.${resource}.${attribute}`;
}

export function getAttributeName(attribute: string): string {
    return attribute.split('.')[2];
}

function prefixAttributeName(qualifiedAttributeName: string, prefix: string): string {
    return `${getModuleName(qualifiedAttributeName)}.${prefix}-${getResourceName(qualifiedAttributeName)}`
        + `.${getAttributeName(qualifiedAttributeName)}`;
}

function getResourceFullName(id: string): string {
    const split = id.split('.');
    if (split.length < 2) {
        return null;
    }
    return makeResourceName(split[0], split[1]);
}

function restrictNodeToResources(nodeId: string, moduleNet: ModuleNetType, resourcesToKeep: string[]): ModuleType {
    const node = moduleNet.nodes.find(candidateNode => candidateNode.id === nodeId);
    const resources: ResourceType[] = node.resources
        .filter(moduleNetNode => resourcesToKeep.find(toKeep => toKeep === moduleNetNode.id));
    return {
        id: node.id,
        resources,
        required: node.required.filter(required =>
            undefined !== resources.find(resource => resource.id === getResourceFullName(required))),
        generated: node.generated.filter(generated =>
            undefined !== resources.find(resource => resource.id === getResourceFullName(generated))),
    };
}
export function breakByOperation(moduleNet: ModuleNetType): ModuleNetType[] {
    return moduleNet.edges.map(edge => ({
        name: moduleNet.name,
        nodes: [
            restrictNodeToResources(edge.fromId, moduleNet, edge.graph.nodes.map(({ id }) => id)),
            restrictNodeToResources(edge.toId, moduleNet, edge.graph.nodes.map(({ id }) => id)),
        ],
        edges: [edge],
    }));
}

export function optimizeModuleNetOperationEdges(moduleNet: ModuleNetType): ModuleNetType {
    moduleNet.edges = moduleNet.edges.map(edge => {
        edge.graph.edges = optimizeMergeOperationEdgesSameSourceTarget(edge.graph.edges);
        return edge;
    });
    return moduleNet;
}

export function optimizeMergeOperationEdgesSameSourceTarget(edges: EdgeContentType[]): EdgeContentType[] {
    const map: Record<string, Record<string, EdgeContentType>> = {};
    edges.forEach(edge => {
        const from = map[edge.fromId];
        if (from) {
            const to = from[edge.toId];
            if (to) {
                to.attributeMapping.push(...edge.attributeMapping);
                return;
            }
            from[edge.toId] = Object.assign({}, edge);
            return;
        }
        map[edge.fromId] = {
            [edge.toId]: Object.assign({}, edge),
        };
    });
    const optimizedEdges: EdgeContentType[] = [];
    Object.values(map)
        .forEach(to => Object.values(to)
            .forEach(edge => optimizedEdges.push(edge)));
    return optimizedEdges;
}

export function optimizeModuleNetRemoveIdenticalAttributeMappings(moduleNet: ModuleNetType): ModuleNetType {
    moduleNet.edges = moduleNet.edges.map(edge => {
        edge.graph.edges = edge.graph.edges.map(operationEdge => ({
            ...operationEdge,
            attributeMapping: operationEdge.attributeMapping
                .reduce((prev, curr) => {
                    const currIsIncluded = prev
                        .find(included => included.fromId === curr.fromId && included.toId === curr.toId);
                    if (!currIsIncluded) {
                        prev.push(curr);
                    }
                    return prev;
                }, []),
        }));
        return edge;
    });
    return moduleNet;
}

function prefixIfModule(toPrefix: string, moduleToPrefix: string, prefix: string, prefixFunction: (a: string, b: string) => string): string {
    return getModuleName(toPrefix) === moduleToPrefix ?
        prefixFunction(toPrefix, prefix) : toPrefix;
}
export function prefixEdgeIfModule(edge: EdgeContentType, moduleToPrefix: string, prefix: string): EdgeContentType {
    const toId = prefixIfModule(edge.toId, moduleToPrefix, prefix, prefixResourceName);
    const fromId = prefixIfModule(edge.fromId, moduleToPrefix, prefix, prefixResourceName);
    return {
        ...edge,
        toId,
        fromId,
        attributeMapping: edge.attributeMapping
            .map(mapping => ({
                fromId: prefixIfModule(mapping.fromId, moduleToPrefix, prefix, prefixAttributeName),
                toId: prefixIfModule(mapping.toId, moduleToPrefix, prefix, prefixAttributeName),
            })),
    };
}

export function iterateRename(moduleNet: ModuleNetType, apply: (name: string) => string): ModuleNetType {
    return {
        name: apply(moduleNet.name),
        nodes: moduleNet.nodes.map(node => ({
            id: apply(node.id),
            generated: node.generated.map(g => apply(g)),
            required: node.required.map(r => apply(r)),
            resources: node.resources.map(resource => ({
                id: apply(resource.id),
                attributes: resource.attributes.map(attribute => apply(attribute)),
            })),
        })),
        edges: moduleNet.edges.map(edge => ({
            id: apply(edge.id),
            fromId: apply(edge.fromId),
            toId: apply(edge.toId),
            type: edge.type,
            graph: {
                nodes: edge.graph.nodes.map(graphNode => ({
                    id: apply(graphNode.id),
                })),
                edges: edge.graph.edges.map(graphEdge => ({
                    id: apply(graphEdge.id),
                    fromId: apply(graphEdge.fromId),
                    toId: apply(graphEdge.toId),
                    type: graphEdge.type,
                    attributeMapping: graphEdge.attributeMapping.map(mapping => ({
                        fromId: apply(mapping.fromId),
                        toId: apply(mapping.toId),
                    })),
                })),
            },
        })),
    };
}