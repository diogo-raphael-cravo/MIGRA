import { toCriticalPairs } from './critical-pairs-cpx';
import {
    decorateGraGraCPX,
    decorateIDMapEntry,
} from './decorators.test';
import { PairEnum } from './critical-pairs';

describe('critical-pairs-cpx', () => {
    it('finds critical pairs', () => {
        const conflictContainer = {
            kind: 'exclude',
            Rules: [{
                R1: 'from-rule',
                R2: 'to-rule',
                overlappingPairs: [{
                    graph: {
                        name: '( 1 ) delete-use-verigraph-conflict',
                        nodes: [],
                        edges: [],
                    },
                    morphisms: [],
                }, {
                    graph: {
                        name: '( 1 ) delete-use-verigraph-conflict',
                        nodes: [],
                        edges: [],
                    },
                    morphisms: [],
                }, {
                    graph: {
                        name: '( 1 ) produce-forbid-verigraph-conflict',
                        nodes: [],
                        edges: [],
                    },
                    morphisms: [],
                }],
            }],
        };
        const criticalPairs = toCriticalPairs(decorateGraGraCPX({
            conflictContainer,
        }), []);
        expect(criticalPairs[PairEnum.DELETE_USE_CONFLICT].pairs)
            .toStrictEqual({
                'from-rule': {
                    'to-rule': 2,
                },
            });
        expect(criticalPairs[PairEnum.PRODUCE_FORBID_CONFLICT].pairs)
            .toStrictEqual({
                'from-rule': {
                    'to-rule': 1,
                },
            });
    });
    it('finds critical objects', () => {
        const conflictContainer = {
            kind: 'exclude',
            Rules: [{
                R1: '1.GET.call-E1_AB',
                R2: '2.GET.return-E1_AB',
                overlappingPairs: [],
            }, {
                R1: 'from-rule',
                R2: 'to-rule',
                overlappingPairs: [{
                    graph: {
                        name: '( 1 ) delete-use-verigraph-conflict',
                        nodes: [{
                            ID: 'critical-object-node',
                            type: 'critical-object-node-type',
                        }, {
                            ID: 'non-critical-object-node',
                            type: 'non-critical-object-node-type',
                        }],
                        edges: [{
                            ID: 'critical-object-edge',
                            type: 'critical-object-edge-type',
                            source: 'critical-object-node',
                            target: 'critical-object-node',
                        }, {
                            ID: 'non-critical-object-edge',
                            type: 'non-critical-object-edge-type',
                            source: 'critical-object-node',
                            target: 'non-critical-object-node',
                        }],
                    },
                    morphisms: [{
                        mappings: [{
                            image: 'critical-object-node',
                        }, {
                            image: 'critical-object-edge',
                        }, {
                            image: 'non-critical-object-node',
                        }, {
                            image: 'non-critical-object-edge',
                        }],
                    }, {
                        mappings: [{
                            image: 'critical-object-node',
                        }, {
                            image: 'critical-object-edge',
                        }],
                    }],
                }],
            }],
        };
        const criticalPairs = toCriticalPairs(decorateGraGraCPX({
            conflictContainer,
        }), [decorateIDMapEntry({
            ID: 'critical-object-node-type',
            fullName: 'critical-object-node-full-name',
        })]);
        expect(criticalPairs[PairEnum.DELETE_USE_CONFLICT].overlaps)
            .toStrictEqual([{
                name: '( 1 ) delete-use-verigraph-conflict',
                fromRule: 'from-rule',
                toRule: 'to-rule',
                criticalObjectTypes: ['critical-object-node-full-name'],
                informationRelay: [],
            }]);
    });
    /**
     * A, B from rule-1
     * A from rule-2
     * Therefore, from B to A
     *    A       B
     *    /\     /\
     *      \   /
     *        V
     */
    it('finds information relays', () => {
        const relayDependencyContainer = {
            kind: 'trigger_switch_dependency',
            Rules: [{
                R1: 'rule-1',
                R2: 'rule-2',
                overlappingPairs: [{
                    graph: {
                        name: '( 1 ) produce-use-verigraph-dependency',
                        nodes: [{
                            ID: 'A-ID',
                            type: 'A-type',
                        }, {
                            ID: 'B-ID',
                            type: 'B-type',
                        }, {
                            ID: 'V-ID',
                            type: 'V-type',
                        }],
                        edges: [{
                            ID: 'edge-A-ID',
                            type: 'value-of-type',
                            source: 'V-ID',
                            target: 'A-ID',
                        }, {
                            ID: 'edge-B-ID',
                            type: 'value-of-type',
                            source: 'V-ID',
                            target: 'B-ID',
                        }],
                    },
                    morphisms: [{
                        name: 'MorphOf_rule-1',
                        mappings: [{
                            image: 'A-ID',
                        }, {
                            image: 'B-ID',
                        }],
                    }, {
                        name: 'MorphOf_rule-2',
                        mappings: [{
                            image: 'A-ID',
                        }],
                    }],
                }],
            }],
        };
        const criticalPairs = toCriticalPairs(decorateGraGraCPX({
            dependencyContainer: relayDependencyContainer,
        }), [
            decorateIDMapEntry({
                ID: 'A-type',
                fullName: 'A-full-name',
            }),
            decorateIDMapEntry({
                ID: 'B-type',
                fullName: 'B-full-name',
            }),
        ], decorateIDMapEntry({ ID: 'V-type' }));
        expect(criticalPairs[PairEnum.PRODUCE_USE_DEPENDENCY].overlaps)
            .toStrictEqual([{
                name: '( 1 ) produce-use-verigraph-dependency',
                fromRule: 'rule-1',
                toRule: 'rule-2',
                criticalObjectTypes: ['A-full-name'],
                informationRelay: [{
                    fromType: {
                        nodeType: 'B-full-name',
                        inSourceRule: true,
                        inTargetRule: false,
                    },
                    toType: {
                        nodeType: 'A-full-name',
                        inSourceRule: true,
                        inTargetRule: true,
                    },
                }],
            }]);
    });
    /**
     * A,B from rule-1
     * rule-2 is empty
     * Therefore, no relays
     *    A       B
     *    /\     /\
     *      \   /
     *        V
     */
    it('ignores subgraphs that do not relay information', () => {
        const noRelayDependencyContainer = {
            kind: 'trigger_switch_dependency',
            Rules: [{
                R1: 'rule-1',
                R2: 'rule-2',
                overlappingPairs: [{
                    graph: {
                        name: '( 1 ) produce-use-verigraph-dependency',
                        nodes: [{
                            ID: 'A-ID',
                            type: 'A-type',
                        }, {
                            ID: 'B-ID',
                            type: 'B-type',
                        }, {
                            ID: 'V-ID',
                            type: 'V-type',
                        }],
                        edges: [{
                            ID: 'edge-A-ID',
                            type: 'value-of-type',
                            source: 'V-ID',
                            target: 'A-ID',
                        }, {
                            ID: 'edge-B-ID',
                            type: 'value-of-type',
                            source: 'V-ID',
                            target: 'B-ID',
                        }],
                    },
                    morphisms: [{
                        name: 'MorphOf_rule-1',
                        mappings: [{
                            image: 'A-ID',
                        }, {
                            image: 'B-ID',
                        }],
                    }, {
                        name: 'MorphOf_rule-2',
                        mappings: [],
                    }],
                }],
            }],
        };
        const criticalPairs = toCriticalPairs(decorateGraGraCPX({
            dependencyContainer: noRelayDependencyContainer,
        }), [], decorateIDMapEntry({ ID: 'V-type' }));
        expect(criticalPairs[PairEnum.PRODUCE_USE_DEPENDENCY].overlaps)
            .toStrictEqual([{
                name: '( 1 ) produce-use-verigraph-dependency',
                fromRule: 'rule-1',
                toRule: 'rule-2',
                criticalObjectTypes: [],
                informationRelay: [],
            }]);
    });
});