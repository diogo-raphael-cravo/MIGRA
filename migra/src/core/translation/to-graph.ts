import {
    GraGraGraphTypesEnum,
    GraGraGraphType,
    GraGraGraphNodeType,
    GraGraGraphEdgeType
} from '../graph-grammars/ggx/graph-types';
import {
    ModuleNetType,
    HardcodedTypesType
} from './module-net-types';
import {
    makeResourceOfID,
    makeAttributeOfID,
    isRequired,
    isGenerated
} from './helpers';

export function toGraph(moduleNet: ModuleNetType, types: HardcodedTypesType): GraGraGraphType {
    const nodes: GraGraGraphNodeType[] = [];
    moduleNet.nodes.forEach(node => nodes.push({
        ID: node.id,
        type: types.moduleNet.nodes.module,
        attributes: [{
            type: types.moduleNet.attributes.moduleName,
            constant: 'true',
            value: {
                string: node.id,
            },
        }],
    }));
    moduleNet.nodes.forEach(node =>
        node.resources.forEach(resource => nodes.push({
            ID: resource.id,
            type: types.moduleNet.nodes.resource,
            attributes: [{
                type: types.moduleNet.attributes.resourceName,
                constant: 'true',
                value: {
                    string: resource.id,
                },
            }, {
                type: types.moduleNet.attributes.resourceRequired,
                constant: 'true',
                value: {
                    boolean: isRequired(node, resource.id),
                },
            }, {
                type: types.moduleNet.attributes.resourceGenerated,
                constant: 'true',
                value: {
                    boolean: isGenerated(node, resource.id),
                },
            }],
        })));
    moduleNet.nodes.forEach(node =>
        node.resources.forEach(resource => 
            resource.attributes.forEach(attribute => nodes.push({
                ID: attribute,
                type: types.moduleNet.nodes.attribute,
                attributes: [{
                    type: types.moduleNet.attributes.attributeName,
                    constant: 'true',
                    value: {
                        string: attribute,
                    },
                }, {
                    type: types.moduleNet.attributes.attributeRequired,
                    constant: 'true',
                    value: {
                        boolean: isRequired(node, attribute),
                    },
                }, {
                    type: types.moduleNet.attributes.attributeGenerated,
                    constant: 'true',
                    value: {
                        boolean: isGenerated(node, attribute),
                    },
                }],
            }))));
    moduleNet.edges.forEach(edge => nodes.push({
        ID: edge.id,
        type: types.moduleNet.nodes.operation,
        attributes: [{
            type: types.moduleNet.attributes.operationName,
            constant: 'true',
            value: {
                string: edge.id,
            },
        }],
    }));
    moduleNet.edges.forEach(edge => edge.graph.edges.forEach(resourceEdge => {
        nodes.push({
            ID: `${edge.id}-${resourceEdge.id}`,
            type: types.moduleNet.nodes.resourceEdge,
            attributes: [],
        });
        resourceEdge.attributeMapping.forEach(attributeEdge => {
            nodes.push({
                ID: `${edge.id}-${resourceEdge.id}-${attributeEdge.fromId}-${attributeEdge.toId}`,
                type: types.moduleNet.nodes.attributeEdge,
                attributes: [],
            });
        });
    }));

    const edges: GraGraGraphEdgeType[] = [];
    moduleNet.edges.forEach(edge => {
        edges.push({
            ID: `${edge.id}_source`,
            source: edge.id,
            target: edge.fromId,
            type: types.moduleNet.edges.source,
            attributes: [],
        });
        edges.push({
            ID: `${edge.id}_target`,
            source: edge.id,
            target: edge.toId,
            type: types.moduleNet.edges.target,
            attributes: [],
        });
    });
    moduleNet.nodes.forEach(node =>
        node.resources.forEach(resource => edges.push({
            ID: makeResourceOfID(resource.id),
            source: resource.id,
            target: node.id,
            type: types.moduleNet.edges.resourceOf,
            attributes: [],
        })));
    moduleNet.nodes.forEach(node =>
        node.resources.forEach(resource =>
            resource.attributes.forEach(attribute => edges.push({
            ID: makeAttributeOfID(attribute),
            source: attribute,
            target: resource.id,
            type: types.moduleNet.edges.attributeOf,
            attributes: [],
        }))));
    moduleNet.edges.forEach(edge => edge.graph.edges.forEach(resourceEdge => {
        const resourceId = `${edge.id}-${resourceEdge.id}`;
        edges.push({
            ID: `edge-${resourceId}`,
            source: resourceId,
            target: edge.id,
            type: types.moduleNet.edges.edge,
            attributes: [],
        });
        if (null !== resourceEdge.fromId) {
            edges.push({
                ID: `${resourceId}_source`,
                source: resourceId,
                target: resourceEdge.fromId,
                type: types.moduleNet.edges.source,
                attributes: [],
            });
        }
        if (null != resourceEdge.toId) {
            edges.push({
                ID: `${resourceId}_target`,
                source: resourceId,
                target: resourceEdge.toId,
                type: types.moduleNet.edges.target,
                attributes: [],
            });
        }
        resourceEdge.attributeMapping.forEach(attributeEdge => {
            const attributeId = `${edge.id}-${resourceEdge.id}-${attributeEdge.fromId}-${attributeEdge.toId}`;
            edges.push({
                ID: `edge-${attributeId}`,
                source: attributeId,
                target: edge.id,
                type: types.moduleNet.edges.edge,
                attributes: [],
            });
            if (null !== attributeEdge.fromId) {
                edges.push({
                    ID: `${attributeId}_source`,
                    source: attributeId,
                    target: attributeEdge.fromId,
                    type: types.moduleNet.edges.source,
                    attributes: [],
                });
            }
            if (null !== attributeEdge.toId) {
                edges.push({
                    ID: `${attributeId}_target`,
                    source: attributeId,
                    target: attributeEdge.toId,
                    type: types.moduleNet.edges.target,
                    attributes: [],
                });
            }
        });
    }));
    return {
        ID: 'Graph',
        kind: GraGraGraphTypesEnum.HOST,
        name: 'Graph',
        nodes,
        edges,
    };
}