import {
    toGraph,
} from './to-graph';
import {
    GraGraGraphType,
    GraGraGraphTypesEnum,
} from '../graph-grammars/ggx/graph-types';
import {
    ModuleType,
    OperationType,
    ResourceType,
    ModuleNetType,
    EdgeContentType,
    EdgeTypeEnum,
    OperationTypeEnum,
} from './module-net-types';
import {
    decorateHardcodedTypes,
} from './decorators.test';

/**
 * Module net
 */
const A_A1: ResourceType = {
    id: 'A.A1',
    attributes: ['A.A1.a1'],
};
const A: ModuleType = {
    id: 'A',
    resources: [ A_A1 ],
    required: [ 'A.A1.a1' ],
    generated: [ 'A.A1.a1' ],
};
const B_B1: ResourceType = {
    id: 'B.B1',
    attributes: [ 'B.B1.b1' ],
};
const B: ModuleType = {
    id: 'B',
    resources: [ B_B1 ],
    required: [],
    generated: [ B_B1.id ],
};
const C: ModuleType = {
    id: 'C',
    resources: [],
    required: [],
    generated: [],
};

const E1_AB_EI: EdgeContentType = {
    id: 'E_I',
    fromId: A_A1.id,
    toId: B_B1.id,
    type: EdgeTypeEnum.EDGE_INPUT,
    attributeMapping: [],
};
const E1_AB_EO: EdgeContentType = {
    id: 'E_O',
    fromId: B_B1.id,
    toId: A_A1.id,
    type: EdgeTypeEnum.EDGE_OUTPUT,
    attributeMapping: [{
        fromId: 'B.B1.b1',
        toId: 'A.A1.a1',
    }],
};
const E1_AB: OperationType = {
    id: 'E1_AB',
    fromId: A.id,
    toId: B.id,
    type: OperationTypeEnum.GET,
    graph: {
        edges: [ E1_AB_EI, E1_AB_EO ],
        nodes: [{ id: A_A1.id }, { id: B_B1.id }],
    },
};

const E1_CB_EI: EdgeContentType = {
    id: 'E_I',
    fromId: null,
    toId: B_B1.id,
    type: EdgeTypeEnum.EDGE_INPUT,
    attributeMapping: [],
};
const E1_CB_EO: EdgeContentType = {
    id: 'E_O',
    fromId: B_B1.id,
    toId: null,
    type: EdgeTypeEnum.EDGE_OUTPUT,
    attributeMapping: [],
};
const E1_CB: OperationType = {
    id: 'E1_CB',
    fromId: C.id,
    toId: B.id,
    type: OperationTypeEnum.DEL,
    graph: {
        edges: [ E1_CB_EI, E1_CB_EO ],
        nodes: [{ id: B_B1.id }],
    },
};

const moduleNet: ModuleNetType = {
    name: 'translation-test',
    nodes: [ A, B, C ],
    edges: [ E1_AB, E1_CB ],
};

/**
 * Graph
 */
const graph: GraGraGraphType = {
    ID: 'Graph',
    name: 'Graph',
    kind: GraGraGraphTypesEnum.HOST,
    nodes: [{
        ID: 'A',
        type: 'moduleType',
        attributes: [{
            type: 'moduleName',
            constant: 'true',
            value: {
                string: 'A',
            }
        }],
    }, {
        ID: 'B',
        type: 'moduleType',
        attributes: [{
            type: 'moduleName',
            constant: 'true',
            value: {
                string: 'B',
            }
        }],
    }, {
        ID: 'C',
        type: 'moduleType',
        attributes: [{
            type: 'moduleName',
            constant: 'true',
            value: {
                string: 'C',
            }
        }],
    }, {
        ID: 'A.A1',
        type: 'resourceType',
        attributes: [{
            type: 'resourceName',
            constant: 'true',
            value: {
                string: 'A.A1',
            }
        }, {
            type: 'resourceRequired',
            constant: 'true',
            value: {
                boolean: 'false',
            }
        }, {
            type: 'resourceGenerated',
            constant: 'true',
            value: {
                boolean: 'false',
            }
        }],
    }, {
        ID: 'B.B1',
        type: 'resourceType',
        attributes: [{
            type: 'resourceName',
            constant: 'true',
            value: {
                string: 'B.B1',
            }
        }, {
            type: 'resourceRequired',
            constant: 'true',
            value: {
                boolean: 'false',
            }
        }, {
            type: 'resourceGenerated',
            constant: 'true',
            value: {
                boolean: 'true',
            }
        }],
    }, {
        ID: 'A.A1.a1',
        type: 'attributeType',
        attributes: [{
            type: 'attributeName',
            constant: 'true',
            value: {
                string: 'A.A1.a1',
            }
        }, {
            type: 'attributeRequired',
            constant: 'true',
            value: {
                boolean: 'true',
            }
        }, {
            type: 'attributeGenerated',
            constant: 'true',
            value: {
                boolean: 'true',
            }
        }],
    }, {
        ID: 'B.B1.b1',
        type: 'attributeType',
        attributes: [{
            type: 'attributeName',
            constant: 'true',
            value: {
                string: 'B.B1.b1',
            }
        }, {
            type: 'attributeRequired',
            constant: 'true',
            value: {
                boolean: 'false',
            }
        }, {
            type: 'attributeGenerated',
            constant: 'true',
            value: {
                boolean: 'false',
            }
        }],
    }, {
        ID: 'E1_AB',
        type: 'operationType',
        attributes: [{
            type: 'operationName',
            constant: 'true',
            value: {
                string: 'E1_AB',
            }
        }],
    }, {
        ID: 'E1_CB',
        type: 'operationType',
        attributes: [{
            type: 'operationName',
            constant: 'true',
            value: {
                string: 'E1_CB',
            }
        }],
    }, {
        ID: 'E1_AB-E_I',
        type: 'resourceEdgeType',
        attributes: [],
    }, {
        ID: 'E1_AB-E_O',
        type: 'resourceEdgeType',
        attributes: [],
    }, {
        ID: 'E1_AB-E_O-B.B1.b1-A.A1.a1',
        type: 'attributeEdgeType',
        attributes: [],
    }, {
        ID: 'E1_CB-E_I',
        type: 'resourceEdgeType',
        attributes: [],
    }, {
        ID: 'E1_CB-E_O',
        type: 'resourceEdgeType',
        attributes: [],
    }],
    edges: [{
        ID: 'E1_AB_source',
        source: 'E1_AB',
        target: 'A',
        type: 'sourceType',
        attributes: [],
    }, {
        ID: 'E1_AB_target',
        source: 'E1_AB',
        target: 'B',
        type: 'targetType',
        attributes: [],
    }, {
        ID: 'E1_CB_source',
        source: 'E1_CB',
        target: 'C',
        type: 'sourceType',
        attributes: [],
    }, {
        ID: 'E1_CB_target',
        source: 'E1_CB',
        target: 'B',
        type: 'targetType',
        attributes: [],
    }, {
        ID: 'resource-of-A.A1',
        source: 'A.A1',
        target: 'A',
        type: 'resourceOfType',
        attributes: [],
    }, {
        ID: 'resource-of-B.B1',
        source: 'B.B1',
        target: 'B',
        type: 'resourceOfType',
        attributes: [],
    }, {
        ID: 'attribute-of-A.A1.a1',
        source: 'A.A1.a1',
        target: 'A.A1',
        type: 'attributeOfType',
        attributes: [],
    }, {
        ID: 'attribute-of-B.B1.b1',
        source: 'B.B1.b1',
        target: 'B.B1',
        type: 'attributeOfType',
        attributes: [],
    }, {
        ID: 'edge-E1_AB-E_I',
        source: 'E1_AB-E_I',
        target: 'E1_AB',
        type: 'edgeType',
        attributes: [],
    }, {
        ID: 'E1_AB-E_I_source',
        source: 'E1_AB-E_I',
        target: 'A.A1',
        type: 'sourceType',
        attributes: [],
    }, {
        ID: 'E1_AB-E_I_target',
        source: 'E1_AB-E_I',
        target: 'B.B1',
        type: 'targetType',
        attributes: [],
    }, {
        ID: 'edge-E1_AB-E_O',
        source: 'E1_AB-E_O',
        target: 'E1_AB',
        type: 'edgeType',
        attributes: [],
    }, {
        ID: 'E1_AB-E_O_source',
        source: 'E1_AB-E_O',
        target: 'B.B1',
        type: 'sourceType',
        attributes: [],
    }, {
        ID: 'E1_AB-E_O_target',
        source: 'E1_AB-E_O',
        target: 'A.A1',
        type: 'targetType',
        attributes: [],
    }, {
        ID: 'edge-E1_AB-E_O-B.B1.b1-A.A1.a1',
        source: 'E1_AB-E_O-B.B1.b1-A.A1.a1',
        target: 'E1_AB',
        type: 'edgeType',
        attributes: [],
    }, {
        ID: 'E1_AB-E_O-B.B1.b1-A.A1.a1_source',
        source: 'E1_AB-E_O-B.B1.b1-A.A1.a1',
        target: 'B.B1.b1',
        type: 'sourceType',
        attributes: [],
    }, {
        ID: 'E1_AB-E_O-B.B1.b1-A.A1.a1_target',
        source: 'E1_AB-E_O-B.B1.b1-A.A1.a1',
        target: 'A.A1.a1',
        type: 'targetType',
        attributes: [],
    }, {
        ID: 'edge-E1_CB-E_I',
        source: 'E1_CB-E_I',
        target: 'E1_CB',
        type: 'edgeType',
        attributes: [],
    }, {
        ID: 'E1_CB-E_I_target',
        source: 'E1_CB-E_I',
        target: 'B.B1',
        type: 'targetType',
        attributes: [],
    }, {
        ID: 'edge-E1_CB-E_O',
        source: 'E1_CB-E_O',
        target: 'E1_CB',
        type: 'edgeType',
        attributes: [],
    }, {
        ID: 'E1_CB-E_O_source',
        source: 'E1_CB-E_O',
        target: 'B.B1',
        type: 'sourceType',
        attributes: [],
    }],
};

describe('module-net/to-graph', () => {
    it('translates a module net to graph grammar', () => {
        const translated = toGraph(moduleNet, decorateHardcodedTypes({
            moduleNet: {
                attributes: {
                    moduleName: 'moduleName',
                    resourceName: 'resourceName',
                    resourceRequired: 'resourceRequired',
                    resourceGenerated: 'resourceGenerated',
                    attributeName: 'attributeName',
                    attributeRequired: 'attributeRequired',
                    attributeGenerated: 'attributeGenerated',
                    operationName: 'operationName',
                },
                nodes: {
                    module: 'moduleType',
                    resource: 'resourceType',
                    attribute: 'attributeType',
                    operation: 'operationType',
                    resourceEdge: 'resourceEdgeType',
                    attributeEdge: 'attributeEdgeType',
                },
                edges: {
                    edge: 'edgeType',
                    source: 'sourceType',
                    target: 'targetType',
                    resourceOf: 'resourceOfType',
                    attributeOf: 'attributeOfType',
                },
            }
        }));
        expect(translated).toStrictEqual(graph);
    });
});