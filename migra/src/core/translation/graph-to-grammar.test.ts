import * as Sinon from 'sinon';
import * as uuid from '../helpers/uuid';
import {
    graphToGrammars,
    merge,
} from './graph-to-grammar';
import {
    GraGra,
    GraGraTypes,
    GraGraGraphType,
    GraGraGraphTypesEnum,
    GraGraRuleType
} from '../graph-grammars/ggx/graph-types';
import {
    decorateHardcodedTypes,
} from './decorators.test';

const types = decorateHardcodedTypes({
    gragra: {
        attributes: {
            edgeName: 'edgeName',
            nodeName: 'nodeName',
            ruleName: 'ruleName',
            id: 'id',
        },
        nodes: {
            node: 'node',
            edge: 'edge',
            graph: 'graph',
            rule: 'rule',
            graphTransformationSystem: 'graphTransformationSystem',
        },
        edges: {
            in: 'in',
            lhs: 'lhs',
            nac: 'nac',
            rhs: 'rhs',
            rule: 'rule',
            source: 'source',
            target: 'target',
        }
    },
});

describe('module-net/graph-to-grammar', () => {
    const stubs: Sinon.SinonStub[] = [];
    beforeEach(() => {
        stubs.push(Sinon.stub(uuid, 'id')
            .returns('uuid'));
    });
    afterEach(() => {
        stubs.forEach(stub => stub.restore());
    });
    it('translates a graph to type graph', () => {
        // if there's a "type: 'node'", its attribute with name "type" is a new NodeType
            // additionally there is a type graph node with "type" as ID
        // if there's a "type: 'edge'", its attribute with name "type" is a new EdgeType
            // additionally there is a type graph edge with "type" as ID
            // whose source and target IDs are the "types" of the edge source and target nodes
        const graph: GraGraGraphType = {
            ID: 'IGraph',
            name: 'Graph',
            kind: GraGraGraphTypesEnum.HOST,
            nodes: [{
                ID: 'IA',
                type: 'moduleType',
                attributes: [{
                    type: 'moduleName',
                    constant: 'true',
                    value: {
                        string: 'A',
                    }
                }],
            }, {
                ID: 'A_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'A',
                    }
                }, {
                    type: 'id',
                    constant: 'true',
                    value: {
                        string: 'actualA_ID',
                    }
                }],
            }, {
                ID: 'A_ID_other',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'A',
                    }
                }, {
                    type: 'id',
                    constant: 'true',
                    value: {
                        string: 'actualA_ID',
                    }
                }],
            }, {
                ID: 'IB',
                type: 'moduleType',
                attributes: [{
                    type: 'moduleName',
                    constant: 'true',
                    value: {
                        string: 'B',
                    }
                }],
            }, {
                ID: 'B_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'B',
                    }
                }],
            }, {
                ID: 'IC',
                type: 'moduleType',
                attributes: [{
                    type: 'moduleName',
                    constant: 'true',
                    value: {
                        string: 'C',
                    }
                }],
            }, {
                ID: 'C_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'C',
                    }
                }],
            }, {
                ID: 'IA.A1',
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
                ID: 'A.A1_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'A.A1',
                    }
                }],
            }, {
                ID: 'IB.B1',
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
                ID: 'B.B1_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'B.B1',
                    }
                }],
            }, {
                ID: 'IA.A1.a1',
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
                ID: 'A.A1.a1_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'A.A1.a1',
                    }
                }],
            }, {
                ID: 'IB.B1.b1',
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
                ID: 'B.B1.b1_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'B.B1.b1',
                    }
                }],
            }, {
                ID: 'IE1_AB',
                type: 'operationType',
                attributes: [{
                    type: 'operationName',
                    constant: 'true',
                    value: {
                        string: 'E1_AB',
                    }
                }],
            }, {
                ID: 'IE1_CB',
                type: 'operationType',
                attributes: [{
                    type: 'operationName',
                    constant: 'true',
                    value: {
                        string: 'E1_CB',
                    }
                }],
            }, {
                ID: 'V_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'V',
                    }
                }],
            }, {
                ID: 'valueofa1_ID',
                type: 'edge',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'value-of',
                    }
                }],
            }, {
                ID: 'valueofb1_ID',
                type: 'edge',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'value-of',
                    }
                }],
            }, {
                ID: 'resourceofA_ID_other',
                type: 'edge',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'resource-of',
                    }
                }],
            }, {
                ID: 'resourceofB_ID',
                type: 'edge',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'resource-of',
                    }
                }],
            }, {
                ID: 'attributeofA1_ID',
                type: 'edge',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'attribute-of',
                    }
                }],
            }, {
                ID: 'attributeofB1_ID',
                type: 'edge',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'attribute-of',
                    }
                }],
            }, {
                ID: 'graph_ID',
                type: 'graph',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'attribute-of',
                    }
                }],
            }, {
                ID: 'gts_ID',
                type: 'graphTransformationSystem',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'attribute-of',
                    }
                }],
            }],
            edges: [{
                ID: 'IE1_AB_source',
                source: 'E1_AB_ID',
                target: 'A_ID',
                type: 'sourceType',
                attributes: [],
            }, {
                ID: 'IE1_AB_target',
                source: 'E1_AB_ID',
                target: 'B_ID',
                type: 'targetType',
                attributes: [],
            }, {
                ID: 'IE1_CB_source',
                source: 'E1_CB_ID',
                target: 'C_ID',
                type: 'sourceType',
                attributes: [],
            }, {
                ID: 'IE1_CB_target',
                source: 'E1_CB_ID',
                target: 'B_ID',
                type: 'targetType',
                attributes: [],
            }, {
                ID: 'Iresource-of-A.A1',
                source: 'A.A1_ID',
                target: 'A_ID_other',
                type: 'resourceOfType',
                attributes: [],
            }, {
                ID: 'Iresource-of-B.B1',
                source: 'B.B1_ID',
                target: 'B_ID',
                type: 'resourceOfType',
                attributes: [],
            }, {
                ID: 'Iattribute-of-A.A1.a1',
                source: 'A.A1.a1_ID',
                target: 'A.A1_ID',
                type: 'attributeOfType',
                attributes: [],
            }, {
                ID: 'Iattribute-of-B.B1.b1',
                source: 'B.B1.b1_ID',
                target: 'B.B1_ID',
                type: 'attributeOfType',
                attributes: [],
            }, {
                ID: 'A_IDin_ID',
                source: 'A_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'B_IDin_ID',
                source: 'B_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'C_IDin_ID',
                source: 'C_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'A.A1_IDin_ID',
                source: 'A.A1_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'B.B1_IDin_ID',
                source: 'B.B1_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'A.A1.a1_IDin_ID',
                source: 'A.A1.a1_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'B.B1.b1_IDin_ID',
                source: 'B.B1.b1_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'V_IDin_ID',
                source: 'V_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'valueof_IDin_ID',
                source: 'valueofa1_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'valueof_IDin_ID',
                source: 'valueofb1_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'resourceof_IDin_ID',
                source: 'resourceofA_ID_other',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'resourceof_IDin_ID',
                source: 'resourceofB_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'attributeof_IDin_ID',
                source: 'attributeofA1_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'attributeof_IDin_ID',
                source: 'attributeofB1_ID',
                target: 'graph_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'source_ID',
                source: 'valueofa1_ID',
                target: 'V_ID',
                type: 'source',
                attributes: [],
            }, {
                ID: 'target_ID',
                source: 'valueofa1_ID',
                target: 'A.A1.a1_ID',
                type: 'target',
                attributes: [],
            }, {
                ID: 'source_ID',
                source: 'resourceofA_ID_other',
                target: 'A.A1_ID',
                type: 'source',
                attributes: [],
            }, {
                ID: 'target_ID',
                source: 'resourceofA_ID_other',
                target: 'A_ID_other',
                type: 'target',
                attributes: [],
            }, {
                ID: 'source_ID',
                source: 'attributeofA1_ID',
                target: 'A.A1.a1_ID',
                type: 'source',
                attributes: [],
            }, {
                ID: 'target_ID',
                source: 'attributeofA1_ID',
                target: 'A.A1_ID',
                type: 'target',
                attributes: [],
            }, {
                ID: 'source_ID',
                source: 'valueofb1_ID',
                target: 'V_ID',
                type: 'source',
                attributes: [],
            }, {
                ID: 'target_ID',
                source: 'valueofb1_ID',
                target: 'B.B1.b1_ID',
                type: 'target',
                attributes: [],
            }, {
                ID: 'source_ID',
                source: 'resourceofB_ID',
                target: 'B.B1_ID',
                type: 'source',
                attributes: [],
            }, {
                ID: 'target_ID',
                source: 'resourceofB_ID',
                target: 'B_ID',
                type: 'target',
                attributes: [],
            }, {
                ID: 'source_ID',
                source: 'attributeofB1_ID',
                target: 'B.B1.b1_ID',
                type: 'source',
                attributes: [],
            }, {
                ID: 'target_ID',
                source: 'attributeofB1_ID',
                target: 'B.B1_ID',
                type: 'target',
                attributes: [],
            }],
        };
        // type graph IDs are generated, its nodes and edges
        // are not in the translated grammar host graph
        // types of type graph nodes and edges are IDs of NodeTypes and EdgeTypes
        const expectedTypeGraph: GraGraGraphType = {
            ID: 'TypeGraph',
            kind: GraGraGraphTypesEnum.TYPE_GRAPH,
            name: 'TypeGraph',
            nodes: [{
                ID: 'A_typegraphid',
                type: 'A_nodetype',
                attributes: [],
            }, {
                ID: 'B_typegraphid',
                type: 'B_nodetype',
                attributes: [],
            }, {
                ID: 'C_typegraphid',
                type: 'C_nodetype',
                attributes: [],
            }, {
                ID: 'A.A1_typegraphid',
                type: 'A.A1_nodetype',
                attributes: [],
            }, {
                ID: 'B.B1_typegraphid',
                type: 'B.B1_nodetype',
                attributes: [],
            }, {
                ID: 'A.A1.a1_typegraphid',
                type: 'A.A1.a1_nodetype',
                attributes: [],
            }, {
                ID: 'B.B1.b1_typegraphid',
                type: 'B.B1.b1_nodetype',
                attributes: [],
            }, {
                ID: 'V_typegraphid',
                type: 'V_nodetype',
                attributes: [],
            }],
            edges: [{
                ID: 'value-of_edgetype-V_typegraphid-A.A1.a1_typegraphid_typegraphid',
                type: 'value-of_edgetype',
                source: 'V_typegraphid',
                target: 'A.A1.a1_typegraphid',
                attributes: [],
            }, {
                ID: 'value-of_edgetype-V_typegraphid-B.B1.b1_typegraphid_typegraphid',
                type: 'value-of_edgetype',
                source: 'V_typegraphid',
                target: 'B.B1.b1_typegraphid',
                attributes: [],
            }, {
                ID: 'resource-of_edgetype-A.A1_typegraphid-A_typegraphid_typegraphid',
                type: 'resource-of_edgetype',
                source: 'A.A1_typegraphid',
                target: 'A_typegraphid',
                attributes: [],
            }, {
                ID: 'resource-of_edgetype-B.B1_typegraphid-B_typegraphid_typegraphid',
                type: 'resource-of_edgetype',
                source: 'B.B1_typegraphid',
                target: 'B_typegraphid',
                attributes: [],
            }, {
                ID: 'attribute-of_edgetype-A.A1.a1_typegraphid-A.A1_typegraphid_typegraphid',
                type: 'attribute-of_edgetype',
                source: 'A.A1.a1_typegraphid',
                target: 'A.A1_typegraphid',
                attributes: [],
            }, {
                ID: 'attribute-of_edgetype-B.B1.b1_typegraphid-B.B1_typegraphid_typegraphid',
                type: 'attribute-of_edgetype',
                source: 'B.B1.b1_typegraphid',
                target: 'B.B1_typegraphid',
                attributes: [],
            }],
        };
        const expectedTypes: GraGraTypes = {
            nodes: [{
                ID: 'A_nodetype',
                name: 'A',
                attrTypes: [],
            }, {
                ID: 'B_nodetype',
                name: 'B',
                attrTypes: [],
            }, {
                ID: 'C_nodetype',
                name: 'C',
                attrTypes: [],
            }, {
                ID: 'A.A1_nodetype',
                name: 'A.A1',
                attrTypes: [],
            }, {
                ID: 'B.B1_nodetype',
                name: 'B.B1',
                attrTypes: [],
            }, {
                ID: 'A.A1.a1_nodetype',
                name: 'A.A1.a1',
                attrTypes: [],
            }, {
                ID: 'B.B1.b1_nodetype',
                name: 'B.B1.b1',
                attrTypes: [],
            }, {
                ID: 'V_nodetype',
                name: 'V',
                attrTypes: [],
            }],
            edges: [{
                ID: 'value-of_edgetype',
                name: 'value-of',
                attrTypes: [],
            }, {
                ID: 'resource-of_edgetype',
                name: 'resource-of',
                attrTypes: [],
            }, {
                ID: 'attribute-of_edgetype',
                name: 'attribute-of',
                attrTypes: [],
            }],
            typeGraph: expectedTypeGraph,
        };
        const expectedGragra: GraGra = {
            version: '1.0',
            name: 'Graph',
            taggedValues: [],
            graphs: [],
            types: expectedTypes,
            rules: [],
        };
        const translated = graphToGrammars(graph, types);
        expect(translated[0]).toStrictEqual(expectedGragra);
    });
    it('translates a graph to rules', () => {
        const graph: GraGraGraphType = {
            ID: 'Graph',
            name: 'Graph',
            kind: GraGraGraphTypesEnum.HOST,
            nodes: [{
                ID: 'common_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'common',
                    }
                }, {
                    type: 'id',
                    constant: 'true',
                    value: {
                        string: 'actualA_ID',
                    }
                }],
            }, {
                ID: 'LHS_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'LHS',
                    }
                }],
            }, {
                ID: 'RHS_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'RHS',
                    }
                }],
            }, {
                ID: 'typegraph_ID',
                type: 'graph',
                attributes: [],
            }, {
                ID: 'graphlhs_ID',
                type: 'graph',
                attributes: [],
            }, {
                ID: 'graphrhs_ID',
                type: 'graph',
                attributes: [],
            }, {
                ID: 'rule_ID',
                type: 'rule',
                attributes: [{
                    type: 'ruleName',
                    value: {
                        string: 'thisIsRuleName',
                    },
                }],
            }, {
                ID: 'gts_ID',
                type: 'graphTransformationSystem',
                attributes: [],
            }],
            edges: [{
                ID: 'typegraph_ID',
                source: 'typegraph_ID',
                target: 'gts_ID',
                type: 'typegraph',
                attributes: [],
            }, {
                ID: 'rule_ID',
                source: 'rule_ID',
                target: 'gts_ID',
                type: 'rule',
                attributes: [],
            }, {
                ID: 'graphlhs_ID',
                source: 'graphlhs_ID',
                target: 'rule_ID',
                type: 'lhs',
                attributes: [],
            }, {
                ID: 'LHS_ID',
                source: 'LHS_ID',
                target: 'graphlhs_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'graphrhs_ID',
                source: 'graphrhs_ID',
                target: 'rule_ID',
                type: 'rhs',
                attributes: [],
            }, {
                ID: 'RHS_ID',
                source: 'RHS_ID',
                target: 'graphrhs_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'commonLHS_ID',
                source: 'common_ID',
                target: 'graphlhs_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'commonRHS_ID',
                source: 'common_ID',
                target: 'graphrhs_ID',
                type: 'in',
                attributes: [],
            }],
        };
        const expectedRules: GraGraRuleType[] = [{
            ID: 'rule_ID',
            name: 'thisIsRuleName',
            morphism: {
                name: 'thisIsRuleName',
                mappings: [{
                    orig: 'rule_ID_graphlhs_ID_actualA_ID_ID',
                    image: 'rule_ID_graphrhs_ID_actualA_ID_ID',
                }],
            },
            graphs: [{
                ID: 'rule_ID_graphlhs_ID',
                name: 'rule_ID_graphlhs_ID',
                kind: GraGraGraphTypesEnum.LHS_GRAPH,
                nodes: [{
                    ID: 'rule_ID_graphlhs_ID_uuid_ID',
                    type: 'LHS_nodetype',
                    attributes: []
                }, {
                    ID: 'rule_ID_graphlhs_ID_actualA_ID_ID',
                    type: 'common_nodetype',
                    attributes: []
                }],
                edges: [],
            }, {
                ID: 'rule_ID_graphrhs_ID',
                name: 'rule_ID_graphrhs_ID',
                kind: GraGraGraphTypesEnum.RHS_GRAPH,
                nodes: [{
                    ID: 'rule_ID_graphrhs_ID_uuid_ID',
                    type: 'RHS_nodetype',
                    attributes: []
                }, {
                    ID: 'rule_ID_graphrhs_ID_actualA_ID_ID',
                    type: 'common_nodetype',
                    attributes: []
                }],
                edges: [],
            }],
            taggedValues: [],
        }];
        // a tradução é 1:n, onde todos n têm o mesmo tipo 1, então o tipo é construído baseado no nodeName
        const translated = graphToGrammars(graph, types);
        expect(translated[0].rules).toStrictEqual(expectedRules);
    });
    it('translates a graph to rules with nac', () => {
        const graph: GraGraGraphType = {
            ID: 'Graph',
            name: 'Graph',
            kind: GraGraGraphTypesEnum.HOST,
            nodes: [{
                ID: 'NAC_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'NAC',
                    }
                }],
            }, {
                ID: 'common_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'common',
                    }
                }, {
                    type: 'id',
                    constant: 'true',
                    value: {
                        string: 'actualA_ID',
                    }
                }],
            }, {
                ID: 'LHS_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'LHS',
                    }
                }],
            }, {
                ID: 'RHS_ID',
                type: 'node',
                attributes: [{
                    type: 'nodeName',
                    constant: 'true',
                    value: {
                        string: 'RHS',
                    }
                }],
            }, {
                ID: 'typegraph_ID',
                type: 'graph',
                attributes: [],
            }, {
                ID: 'graphlhs_ID',
                type: 'graph',
                attributes: [],
            }, {
                ID: 'graphrhs_ID',
                type: 'graph',
                attributes: [],
            }, {
                ID: 'graphnac_ID',
                type: 'graph',
                attributes: [],
            }, {
                ID: 'rule_ID',
                type: 'rule',
                attributes: [{
                    type: 'ruleName',
                    value: {
                        string: 'thisIsRuleName',
                    },
                }],
            }, {
                ID: 'gts_ID',
                type: 'graphTransformationSystem',
                attributes: [],
            }],
            edges: [{
                ID: 'typegraph_ID',
                source: 'typegraph_ID',
                target: 'gts_ID',
                type: 'typegraph',
                attributes: [],
            }, {
                ID: 'rule_ID',
                source: 'rule_ID',
                target: 'gts_ID',
                type: 'rule',
                attributes: [],
            }, {
                ID: 'graphlhs_ID',
                source: 'graphlhs_ID',
                target: 'rule_ID',
                type: 'lhs',
                attributes: [],
            }, {
                ID: 'LHS_ID',
                source: 'LHS_ID',
                target: 'graphlhs_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'graphrhs_ID',
                source: 'graphrhs_ID',
                target: 'rule_ID',
                type: 'rhs',
                attributes: [],
            }, {
                ID: 'RHS_ID',
                source: 'RHS_ID',
                target: 'graphrhs_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'graphnac_ID',
                source: 'graphnac_ID',
                target: 'rule_ID',
                type: 'nac',
                attributes: [],
            }, {
                ID: 'NAC_ID',
                source: 'NAC_ID',
                target: 'graphnac_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'commonLHS_ID',
                source: 'common_ID',
                target: 'graphlhs_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'commonRHS_ID',
                source: 'common_ID',
                target: 'graphrhs_ID',
                type: 'in',
                attributes: [],
            }, {
                ID: 'commonNAC_ID',
                source: 'common_ID',
                target: 'graphnac_ID',
                type: 'in',
                attributes: [],
            }],
        };
        const expectedRules: GraGraRuleType[] = [{
            ID: 'rule_ID',
            name: 'thisIsRuleName',
            morphism: {
                name: 'thisIsRuleName',
                mappings: [{
                    orig: 'rule_ID_graphlhs_ID_actualA_ID_ID',
                    image: 'rule_ID_graphrhs_ID_actualA_ID_ID',
                }],
            },
            graphs: [{
                ID: 'rule_ID_graphlhs_ID',
                name: 'rule_ID_graphlhs_ID',
                kind: GraGraGraphTypesEnum.LHS_GRAPH,
                nodes: [{
                    ID: 'rule_ID_graphlhs_ID_uuid_ID',
                    type: 'LHS_nodetype',
                    attributes: []
                }, {
                    ID: 'rule_ID_graphlhs_ID_actualA_ID_ID',
                    type: 'common_nodetype',
                    attributes: []
                }],
                edges: [],
            }, {
                ID: 'rule_ID_graphrhs_ID',
                name: 'rule_ID_graphrhs_ID',
                kind: GraGraGraphTypesEnum.RHS_GRAPH,
                nodes: [{
                    ID: 'rule_ID_graphrhs_ID_uuid_ID',
                    type: 'RHS_nodetype',
                    attributes: []
                }, {
                    ID: 'rule_ID_graphrhs_ID_actualA_ID_ID',
                    type: 'common_nodetype',
                    attributes: []
                }],
                edges: [],
            }],
            applCondition: {
                nacs: [{
                    graph: {
                        ID: 'rule_ID_graphnac_ID',
                        name: 'rule_ID_graphnac_ID',
                        kind: GraGraGraphTypesEnum.NAC,
                        nodes: [{
                            ID: 'rule_ID_graphnac_ID_uuid_ID',
                            type: 'NAC_nodetype',
                            attributes: []
                        }, {
                            ID: 'rule_ID_graphnac_ID_actualA_ID_ID',
                            type: 'common_nodetype',
                            attributes: []
                        }],
                        edges: [],
                    },
                    morphism: {
                        name: 'uuid',
                        mappings: [{
                            image: 'rule_ID_graphnac_ID_actualA_ID_ID',
                            orig: 'rule_ID_graphlhs_ID_actualA_ID_ID',
                        }],
                    }
                }]
            },
            taggedValues: [],
        }];
        // a tradução é 1:n, onde todos n têm o mesmo tipo 1, então o tipo é construído baseado no nodeName
        const translated = graphToGrammars(graph, types);
        expect(translated[0].rules).toStrictEqual(expectedRules);
    });
    it('merges grammars from different translations', () => {
        const expectedTypeGraph: GraGraGraphType = {
            ID: 'TypeGraph-0',
            kind: GraGraGraphTypesEnum.TYPE_GRAPH,
            name: 'TypeGraph',
            nodes: [{
                ID: 'A',
                type: 'A_type',
                attributes: [],
            }, {
                ID: 'B',
                type: 'B_type',
                attributes: [],
            }, {
                ID: 'A.A1',
                type: 'A.A1_type',
                attributes: [],
            }, {
                ID: 'B.B1',
                type: 'B.B1_type',
                attributes: [],
            }, {
                ID: 'B.B2',
                type: 'B.B2_type',
                attributes: [],
            }, {
                ID: 'A.A1.a1',
                type: 'A.A1.a1_type',
                attributes: [],
            }, {
                ID: 'B.B1.b1',
                type: 'B.B1.b1_type',
                attributes: [],
            }, {
                ID: 'V',
                type: 'V_type',
                attributes: [],
            }, {
                ID: 'C',
                type: 'C_type',
                attributes: [],
            }, {
                ID: 'B.B3',
                type: 'B.B3_type',
                attributes: [],
            }],
            edges: [{
                ID: 'value-of-V-A.A1.a1-0',
                type: 'value-of_type',
                source: 'V',
                target: 'A.A1.a1',
                attributes: [],
            }, {
                ID: 'value-of-V-B.B1.b1-0',
                type: 'value-of_type',
                source: 'V',
                target: 'B.B1.b1',
                attributes: [],
            }, {
                ID: 'resource-of-A.A1-A-0',
                type: 'resource-of_type',
                source: 'A.A1',
                target: 'A',
                attributes: [],
            }, {
                ID: 'resource-of-B.B1-B-0',
                type: 'resource-of_type',
                source: 'B.B1',
                target: 'B',
                attributes: [],
            }, {
                ID: 'resource-of-B.B2-B-0',
                type: 'resource-of_type',
                source: 'B.B2',
                target: 'B',
                attributes: [],
            }, {
                ID: 'attribute-of-A.A1.a1-A.A1-0',
                type: 'attribute-of_type',
                source: 'A.A1.a1',
                target: 'A.A1',
                attributes: [],
            }, {
                ID: 'attribute-of-B.B1.b1-B.B1-0',
                type: 'attribute-of_type',
                source: 'B.B1.b1',
                target: 'B.B1',
                attributes: [],
            }, {
                ID: 'resource-of-B.B3-B-1',
                type: 'resource-of_type',
                source: 'B.B3',
                target: 'B',
                attributes: [],
            }],
        };
        const expectedTypes: GraGraTypes = {
            nodes: [{
                ID: 'A_type',
                name: 'A',
                attrTypes: [],
            }, {
                ID: 'B_type',
                name: 'B',
                attrTypes: [],
            }, {
                ID: 'A.A1_type',
                name: 'A.A1',
                attrTypes: [],
            }, {
                ID: 'B.B1_type',
                name: 'B.B1',
                attrTypes: [],
            }, {
                ID: 'B.B2_type',
                name: 'B.B2',
                attrTypes: [],
            }, {
                ID: 'A.A1.a1_type',
                name: 'A.A1.a1',
                attrTypes: [],
            }, {
                ID: 'B.B1.b1_type',
                name: 'B.B1.b1',
                attrTypes: [],
            }, {
                ID: 'V_type',
                name: 'V',
                attrTypes: [],
            }, {
                ID: 'C_type',
                name: 'C',
                attrTypes: [],
            }, {
                ID: 'B.B3_type',
                name: 'B.B3',
                attrTypes: [],
            }],
            edges: [{
                ID: 'value-of_type',
                name: 'value-of',
                attrTypes: [],
            }, {
                ID: 'resource-of_type',
                name: 'resource-of',
                attrTypes: [],
            }, {
                ID: 'attribute-of_type',
                name: 'attribute-of',
                attrTypes: [],
            }],
            typeGraph: expectedTypeGraph,
        };
        const expectedGragra: GraGra = {
            version: '1.0',
            name: 'Graph',
            taggedValues: [],
            graphs: [],
            types: expectedTypes,
            rules: [],
        };

        const typeGraphAB: GraGraGraphType = {
            ID: 'TypeGraph',
            kind: GraGraGraphTypesEnum.TYPE_GRAPH,
            name: 'TypeGraph',
            nodes: [{
                ID: 'A',
                type: 'A_type',
                attributes: [],
            }, {
                ID: 'B',
                type: 'B_type',
                attributes: [],
            }, {
                ID: 'A.A1',
                type: 'A.A1_type',
                attributes: [],
            }, {
                ID: 'B.B1',
                type: 'B.B1_type',
                attributes: [],
            }, {
                ID: 'B.B2',
                type: 'B.B2_type',
                attributes: [],
            }, {
                ID: 'A.A1.a1',
                type: 'A.A1.a1_type',
                attributes: [],
            }, {
                ID: 'B.B1.b1',
                type: 'B.B1.b1_type',
                attributes: [],
            }, {
                ID: 'V',
                type: 'V_type',
                attributes: [],
            }],
            edges: [{
                ID: 'value-of-V-A.A1.a1',
                type: 'value-of_type',
                source: 'V',
                target: 'A.A1.a1',
                attributes: [],
            }, {
                ID: 'value-of-V-B.B1.b1',
                type: 'value-of_type',
                source: 'V',
                target: 'B.B1.b1',
                attributes: [],
            }, {
                ID: 'resource-of-A.A1-A',
                type: 'resource-of_type',
                source: 'A.A1',
                target: 'A',
                attributes: [],
            }, {
                ID: 'resource-of-B.B1-B',
                type: 'resource-of_type',
                source: 'B.B1',
                target: 'B',
                attributes: [],
            }, {
                ID: 'resource-of-B.B2-B',
                type: 'resource-of_type',
                source: 'B.B2',
                target: 'B',
                attributes: [],
            }, {
                ID: 'attribute-of-A.A1.a1-A.A1',
                type: 'attribute-of_type',
                source: 'A.A1.a1',
                target: 'A.A1',
                attributes: [],
            }, {
                ID: 'attribute-of-B.B1.b1-B.B1',
                type: 'attribute-of_type',
                source: 'B.B1.b1',
                target: 'B.B1',
                attributes: [],
            }],
        };
        const typesAB: GraGraTypes = {
            nodes: [{
                ID: 'A_type',
                name: 'A',
                attrTypes: [],
            }, {
                ID: 'B_type',
                name: 'B',
                attrTypes: [],
            }, {
                ID: 'A.A1_type',
                name: 'A.A1',
                attrTypes: [],
            }, {
                ID: 'B.B1_type',
                name: 'B.B1',
                attrTypes: [],
            }, {
                ID: 'B.B2_type',
                name: 'B.B2',
                attrTypes: [],
            }, {
                ID: 'A.A1.a1_type',
                name: 'A.A1.a1',
                attrTypes: [],
            }, {
                ID: 'B.B1.b1_type',
                name: 'B.B1.b1',
                attrTypes: [],
            }, {
                ID: 'V_type',
                name: 'V',
                attrTypes: [],
            }],
            edges: [{
                ID: 'value-of_type',
                name: 'value-of',
                attrTypes: [],
            }, {
                ID: 'resource-of_type',
                name: 'resource-of',
                attrTypes: [],
            }, {
                ID: 'attribute-of_type',
                name: 'attribute-of',
                attrTypes: [],
            }],
            typeGraph: typeGraphAB,
        };
        const gragraAB: GraGra = {
            version: '1.0',
            name: 'Graph',
            taggedValues: [],
            graphs: [],
            types: typesAB,
            rules: [],
        };

        const typeGraphBC: GraGraGraphType = {
            ID: 'TypeGraph',
            kind: GraGraGraphTypesEnum.TYPE_GRAPH,
            name: 'TypeGraph',
            nodes: [{
                ID: 'B',
                type: 'B_type',
                attributes: [],
            }, {
                ID: 'C',
                type: 'C_type',
                attributes: [],
            }, {
                ID: 'B.B1',
                type: 'B.B1_type',
                attributes: [],
            }, {
                ID: 'B.B3',
                type: 'B.B3_type',
                attributes: [],
            }, {
                ID: 'B.B1.b1',
                type: 'B.B1.b1_type',
                attributes: [],
            }, {
                ID: 'V',
                type: 'V_type',
                attributes: [],
            }],
            edges: [{
                ID: 'value-of-V-B.B1.b1',
                type: 'value-of_type',
                source: 'V',
                target: 'B.B1.b1',
                attributes: [],
            }, {
                ID: 'resource-of-B.B1-B',
                type: 'resource-of_type',
                source: 'B.B1',
                target: 'B',
                attributes: [],
            }, {
                ID: 'resource-of-B.B3-B',
                type: 'resource-of_type',
                source: 'B.B3',
                target: 'B',
                attributes: [],
            }, {
                ID: 'attribute-of-B.B1.b1-B.B1',
                type: 'attribute-of_type',
                source: 'B.B1.b1',
                target: 'B.B1',
                attributes: [],
            }],
        };
        const typesBC: GraGraTypes = {
            nodes: [{
                ID: 'B_type',
                name: 'B',
                attrTypes: [],
            }, {
                ID: 'C_type',
                name: 'C',
                attrTypes: [],
            }, {
                ID: 'B.B1_type',
                name: 'B.B1',
                attrTypes: [],
            }, {
                ID: 'B.B3_type',
                name: 'B.B3',
                attrTypes: [],
            }, {
                ID: 'B.B1.b1_type',
                name: 'B.B1.b1',
                attrTypes: [],
            }, {
                ID: 'V_type',
                name: 'V',
                attrTypes: [],
            }],
            edges: [{
                ID: 'value-of_type',
                name: 'value-of',
                attrTypes: [],
            }, {
                ID: 'resource-of_type',
                name: 'resource-of',
                attrTypes: [],
            }, {
                ID: 'attribute-of_type',
                name: 'attribute-of',
                attrTypes: [],
            }],
            typeGraph: typeGraphBC,
        };
        const gragraBC: GraGra = {
            version: '1.0',
            name: 'Graph',
            taggedValues: [],
            graphs: [],
            types: typesBC,
            rules: [],
        };
        const translated = merge([gragraAB, gragraBC]);
        expect(translated).toStrictEqual(expectedGragra);
    });
    it('merges grammar rules from different translations', () => {
        const rule = {
            ID: 'rule_ID',
            name: 'thisIsRuleName',
            morphism: {
                name: 'thisIsRuleName',
                mappings: [],
            },
            graphs: [],
            taggedValues: [],
        };

        const expectedGragra: GraGra = {
            version: '1.0',
            name: 'Graph',
            taggedValues: [],
            graphs: [],
            types: {
                nodes: [],
                edges: [],
                typeGraph: {
                    ID: '',
                    edges: [],
                    kind: '',
                    name: '',
                    nodes: [],
                },
            },
            rules: [{
                ...rule,
                ID: 'foobar-AB-0',
                name: 'foobar',
            }, {
                ...rule,
                ID: 'some-other-AB-0',
                name: 'some-other',
            }, {
                ...rule,
                ID: 'yet-anoother-BC-1',
                name: 'yet-anoother',
            }],
        };

        const gragraAB: GraGra = {
            ...expectedGragra,
            rules: [{
                ...rule,
                ID: 'foobar-AB',
                name: 'foobar',
            }, {
                ...rule,
                ID: 'some-other-AB',
                name: 'some-other',
            }],
        };

        const gragraBC: GraGra = {
            ...expectedGragra,
            rules: [{
                ...rule,
                ID: 'foobar-BC',
                name: 'foobar',
            }, {
                ...rule,
                ID: 'yet-anoother-BC',
                name: 'yet-anoother',
            }],
        };
        const translated = merge([gragraAB, gragraBC]);
        expect(translated.rules).toStrictEqual(expectedGragra.rules);
    });
});