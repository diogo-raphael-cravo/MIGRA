import {
    GraGra,
    GraGraNodeEdgeTypeType,
} from '../graph-grammars/ggx/graph-types';

export type GraphNodeType = {
    id: string,
};

export type GraphEdgeType = {
    fromId: string,
    toId: string,
};

export type GraphType<NODE_TYPE extends GraphNodeType, EDGE_CONTENT extends GraphEdgeType> = {
    nodes: NODE_TYPE[],
    edges: EDGE_CONTENT[],
};

export enum OperationTypeEnum {
    GET = 'GET',
    NEW = 'NEW',
    UPD = 'UPD',
    DEL = 'DEL',
}

export enum EdgeTypeEnum {
    EDGE_INPUT = 'EDGE_INPUT',
    EDGE_OUTPUT = 'EDGE_OUTPUT',
    MATCH = 'MATCH',
}

export type EdgeContentType = {
    id: string,
    fromId: string,
    toId: string,
    type: EdgeTypeEnum,
    attributeMapping: GraphEdgeType[],
};

export type OperationType = {
    id: string,
    fromId: string,
    toId: string,
    type: OperationTypeEnum,
    // each edge has a set of edges
    graph: GraphType<{ id: string}, EdgeContentType>,
};

export type ResourceType = {
    id: string,
    attributes: string[],
};

export type ModuleType = {
    id: string,
    resources: ResourceType[],
    required: string[],
    generated: string[],
};

export type ModuleNetType = GraphType<ModuleType, OperationType>
& {
    name: string,
};

export type HardcodedTypesType = {
    moduleNet: {
        attributes: {
            moduleName: string,
            resourceName: string,
            resourceRequired: string,
            resourceGenerated: string,
            attributeName: string,
            attributeRequired: string,
            attributeGenerated: string,
            operationName: string,
        },
        nodes: {
            module: string,
            resource: string,
            attribute: string,
            operation: string,
            resourceEdge: string,
            attributeEdge: string,
        },
        edges: {
            edge: string,
            source: string,
            target: string,
            resourceOf: string,
            attributeOf: string,
        },
    },
    gragra: {
        attributes: {
            edgeName: string,
            nodeName: string,
            ruleName: string,
            id: string,
        },
        nodes: {
            node: string,
            edge: string,
            graph: string,
            rule: string,
            graphTransformationSystem: string,
        },
        edges: {
            in: string,
            lhs: string,
            nac: string,
            rhs: string,
            rule: string,
            source: string,
            target: string,
        }
    }
}

function getNodeOrEdgeWithPredicate(gragra: GraGra,
    predicate: (nodeOrEdge: GraGraNodeEdgeTypeType) => boolean): GraGraNodeEdgeTypeType {
    let nodeOrEdge: GraGraNodeEdgeTypeType = gragra.types.nodes.find(predicate);
    const isNode = undefined !== nodeOrEdge;
    if (!isNode) {
        nodeOrEdge = gragra.types.edges.find(predicate);
    }
    const notFound = undefined === nodeOrEdge;
    if (notFound) {
        return null;
    }
    return nodeOrEdge;
}

function getNodeOrEdgeWithName(gragra: GraGra, name: string): GraGraNodeEdgeTypeType {
    const nodeEdge = getNodeOrEdgeWithPredicate(gragra, node => node.name.startsWith(`${name}%`));
    if (null === nodeEdge) {
        throw new Error(`could not find node or edge with name ${name}`);
    }
    return nodeEdge;
}

function getNodeOrEdgeWithType(gragra: GraGra, type: string): GraGraNodeEdgeTypeType {
    const nodeEdge = getNodeOrEdgeWithPredicate(gragra, node => node.ID === type);
    if (null === nodeEdge) {
        throw new Error(`could not find node or edge with type ${type}`);
    }
    return nodeEdge;
}

function getNodeEdgeTypeFromName(gragra: GraGra, name: string): string {
    return getNodeOrEdgeWithName(gragra, name).ID;
}

function getAttributeTypeFromName(gragra: GraGra, parentType: string, name: string): string {
    const nodeOrEdge: GraGraNodeEdgeTypeType = getNodeOrEdgeWithType(gragra, parentType);
    const attrType = nodeOrEdge.attrTypes.find(attrType => attrType.attrname === name);
    if (undefined === attrType) {
        throw new Error(`could not find attribute with name ${name}`);
    }
    return attrType.ID;
}

export function namesToIDs(gragra: GraGra, types: HardcodedTypesType): HardcodedTypesType {
    function getType(name: string): string {
        return getNodeEdgeTypeFromName(gragra, name);
    }
    function getAttrType(name: string, parent: string): string {
        return getAttributeTypeFromName(gragra, getType(parent), name);
    }
    return {
        moduleNet: {
            attributes: {
                moduleName: getAttrType(types.moduleNet.attributes.moduleName,
                    types.moduleNet.nodes.module),
                resourceName: getAttrType(types.moduleNet.attributes.resourceName,
                    types.moduleNet.nodes.resource),
                resourceRequired: getAttrType(types.moduleNet.attributes.resourceRequired,
                    types.moduleNet.nodes.resource),
                resourceGenerated: getAttrType(types.moduleNet.attributes.resourceGenerated,
                    types.moduleNet.nodes.resource),
                attributeName: getAttrType(types.moduleNet.attributes.attributeName,
                    types.moduleNet.nodes.attribute),
                attributeRequired: getAttrType(types.moduleNet.attributes.attributeRequired,
                    types.moduleNet.nodes.attribute),
                attributeGenerated: getAttrType(types.moduleNet.attributes.attributeGenerated,
                    types.moduleNet.nodes.attribute),
                operationName: getAttrType(types.moduleNet.attributes.operationName,
                    types.moduleNet.nodes.operation),
            },
            nodes: {
                module: getType(types.moduleNet.nodes.module),
                resource: getType(types.moduleNet.nodes.resource),
                attribute: getType(types.moduleNet.nodes.attribute),
                operation: getType(types.moduleNet.nodes.operation),
                resourceEdge: getType(types.moduleNet.nodes.resourceEdge),
                attributeEdge: getType(types.moduleNet.nodes.attributeEdge),
            },
            edges: {
                edge: getType(types.moduleNet.edges.edge),
                source: getType(types.moduleNet.edges.source),
                target: getType(types.moduleNet.edges.target),
                resourceOf: getType(types.moduleNet.edges.resourceOf),
                attributeOf: getType(types.moduleNet.edges.attributeOf),
            }
        },
        gragra: {
            attributes: {
                edgeName: getAttrType(types.gragra.attributes.edgeName,
                    types.gragra.nodes.edge),
                nodeName: getAttrType(types.gragra.attributes.nodeName,
                    types.gragra.nodes.node),
                ruleName: getAttrType(types.gragra.attributes.ruleName,
                    types.gragra.nodes.rule),
                id: getAttrType(types.gragra.attributes.id,
                    types.gragra.nodes.node),
            },
            nodes: {
                node: getType(types.gragra.nodes.node),
                edge: getType(types.gragra.nodes.edge),
                graph: getType(types.gragra.nodes.graph),
                rule: getType(types.gragra.nodes.rule),
                graphTransformationSystem: getType(types.gragra.nodes.graphTransformationSystem),
            },
            edges: {
                in: getType(types.gragra.edges.in),
                lhs: getType(types.gragra.edges.lhs),
                nac: getType(types.gragra.edges.nac),
                rhs: getType(types.gragra.edges.rhs),
                rule: getType(types.gragra.edges.rule),
                source: getType(types.gragra.edges.source),
                target: getType(types.gragra.edges.target),
            }
        }
    };
}