import * as Sinon from 'sinon';
import * as uuid from '../helpers/uuid';
import {
    ModuleType,
    OperationType,
    ResourceType,
    ModuleNetType,
    EdgeContentType,
    EdgeTypeEnum,
    OperationTypeEnum,
} from '../translation/module-net-types';
import {
    breakByOperation,
    merge,
    bind,
    optimizeMergeOperationEdgesSameSourceTarget,
} from './module-net';


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
const B_B2: ResourceType = {
    id: 'B.B2',
    attributes: [],
};
const B_B3: ResourceType = {
    id: 'B.B3',
    attributes: [],
};
const B: ModuleType = {
    id: 'B',
    resources: [ B_B1, B_B2, B_B3 ],
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
    toId: B_B2.id,
    type: EdgeTypeEnum.EDGE_INPUT,
    attributeMapping: [],
};
const E1_CB_EO: EdgeContentType = {
    id: 'E_O',
    fromId: B_B2.id,
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
        nodes: [{ id: B_B2.id }],
    },
};

const moduleNet: ModuleNetType = {
    name: 'translation-test',
    nodes: [ A, B, C ],
    edges: [ E1_AB, E1_CB ],
};

describe('module-net', () => {
    const stubs: Sinon.SinonStub[] = [];
    beforeEach(() => {
        stubs.push(Sinon.stub(uuid, 'id')
            .returns('uuid'));
    });
    afterEach(() => {
        stubs.forEach(stub => stub.restore());
    });
    it('merges module nets', () => {
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
            attributes: [],
        };
        const moduleNetAB: ModuleNetType = {
            name: 'translation-test',
            nodes: [ A, {
                id: 'B',
                resources: [ B_B1, {
                    id: 'B.B2',
                    attributes: ['B.B2.b1', 'B.B2.b2']
                }],
                generated: ['B.B2.b2'],
                required: [],
            }],
            edges: [],
        };

        const B_B3: ResourceType = {
            id: 'B.B3',
            attributes: [],
        };
        const C: ModuleType = {
            id: 'C',
            resources: [],
            required: [],
            generated: [],
        };
        const moduleNetBC: ModuleNetType = {
            name: 'translation-test',
            nodes: [ {
                id: 'B',
                resources: [ B_B3, {
                    id: 'B.B2',
                    attributes: ['B.B2.b2', 'B.B2.b3']
                } ],
                generated: [],
                required: ['B.B2.b2'],
            }, C ],
            edges: [],
        };

        const mergedB = {
            id: 'B',
            resources: [ B_B1, {
                id: 'B.B2',
                attributes: ['B.B2.b1', 'B.B2.b2', 'B.B2.b3']
            }, B_B3],
            generated: ['B.B2.b2'],
            required: ['B.B2.b2'],
        };
        const expectedModuleNet: ModuleNetType = {
            name: 'translation-test',
            nodes: [ A, mergedB, C ],
            edges: [],
        };
        const merged = merge(moduleNetAB, moduleNetBC);
        expect(merged).toStrictEqual(expectedModuleNet);
    });
    it('breaks a module net into several module nets, one for each operation', () => {
        const B_AB: ModuleType = {
            id: 'B',
            resources: [ B_B1 ],
            required: [],
            generated: [ B_B1.id ],
        };
        const B_BC: ModuleType = {
            id: 'B',
            resources: [ B_B2 ],
            required: [],
            generated: [],
        };
        const moduleNetAB = {
            name: 'translation-test',
            nodes: [ A, B_AB ],
            edges: [ E1_AB ],
        };
        const moduleNetBC = {
            name: 'translation-test',
            nodes: [ C, B_BC ],
            edges: [ E1_CB ],
        };
        const broken = breakByOperation(moduleNet);
        expect(broken).toStrictEqual([
            moduleNetAB,
            moduleNetBC,
        ]);
    });
    it('binds operations to modules', () => {
        const caller: ModuleType = {
            id: 'caller',
            resources: [],
            required: [],
            generated: [],
        };
        const callee: ModuleType = {
            id: 'callee',
            resources: [],
            required: [],
            generated: [],
        };
        const operations: OperationType[] = [{
            id: 'call',
            fromId: 'a',
            toId: 'b',
            type: null,
            graph: {
                nodes: [{
                    id: 'a.res',
                }, {
                    id: 'b.global',
                }],
                edges: [{
                    id: '',
                    fromId: 'a.res',
                    toId: 'b.global',
                    type: null,
                    attributeMapping: [{
                        fromId: 'a.res.attr',
                        toId: 'b.global.attr',
                    }, {
                        fromId: 'a.res.attr',
                        toId: 'b.global.attr2',
                    }]
                }, {
                    id: '',
                    fromId: 'b.global',
                    toId: 'a.res',
                    type: null,
                    attributeMapping: [{
                        fromId: 'b.global.foo',
                        toId: 'a.res.bar',
                    }]
                }]
            }
        }];
        const expected: ModuleNetType = {
            name: '',
            nodes: [{
                id: 'caller',
                resources: [{
                    id: 'caller.res',
                    attributes: [
                        'caller.res.attr',
                        'caller.res.bar',
                    ],
                }],
                generated: [],
                required: [],
            }, {
                id: 'callee',
                resources: [{
                    id: 'callee.global',
                    attributes: [
                        'callee.global.attr',
                        'callee.global.attr2',
                        'callee.global.foo',
                    ],
                }],
                generated: [],
                required: [],
            }],
            edges: [{
                id: 'call',
                fromId: 'caller',
                toId: 'callee',
                type: null,
                graph: {
                    nodes: [{
                        id: 'caller.res',
                    }, {
                        id: 'callee.global',
                    }],
                    edges: [{
                        id: 'call-caller.res-callee.global-uuid',
                        fromId: 'caller.res',
                        toId: 'callee.global',
                        type: null,
                        attributeMapping: [{
                            fromId: 'caller.res.attr',
                            toId: 'callee.global.attr',
                        }, {
                            fromId: 'caller.res.attr',
                            toId: 'callee.global.attr2',
                        }]
                    }, {
                        id: 'call-callee.global-caller.res-uuid',
                        fromId: 'callee.global',
                        toId: 'caller.res',
                        type: null,
                        attributeMapping: [{
                            fromId: 'callee.global.foo',
                            toId: 'caller.res.bar',
                        }]
                    }]
                }
            }],
        };
        const actual = bind(caller, callee, operations);
        expect(actual).toStrictEqual(expected);
    });
    it('merges similar operation edges', () => {
        const edges: EdgeContentType[] = [{
            id: '',
            fromId: 'a.a1',
            toId: 'b.b1',
            type: null,
            attributeMapping: [{
                fromId: 'a.a1.a11',
                toId: 'b.b1.b11',
            }],
        }, {
            id: '',
            fromId: 'a.a1',
            toId: 'b.b1',
            type: null,
            attributeMapping: [{
                fromId: 'a.a2.a21',
                toId: 'b.b1.b12',
            }],
        }, {
            id: '',
            fromId: 'c.a1',
            toId: 'd.b1',
            type: null,
            attributeMapping: [{
                fromId: 'c.a1.a11',
                toId: 'd.b1.b11',
            }]
        }, {
            id: '',
            fromId: 'c.a1',
            toId: 'd.b1',
            type: null,
            attributeMapping: [{
                fromId: 'c.a2.a21',
                toId: 'd.b1.b12',
            }]
        }];
        const expected: EdgeContentType[] = [{
            id: '',
            fromId: 'a.a1',
            toId: 'b.b1',
            type: null,
            attributeMapping: [{
                fromId: 'a.a1.a11',
                toId: 'b.b1.b11',
            }, {
                fromId: 'a.a2.a21',
                toId: 'b.b1.b12',
            }],
        }, {
            id: '',
            fromId: 'c.a1',
            toId: 'd.b1',
            type: null,
            attributeMapping: [{
                fromId: 'c.a1.a11',
                toId: 'd.b1.b11',
            }, {
                fromId: 'c.a2.a21',
                toId: 'd.b1.b12',
            }]
        }];
        const actual = optimizeMergeOperationEdgesSameSourceTarget(edges);
        expect(actual).toStrictEqual(expected);
    });
});