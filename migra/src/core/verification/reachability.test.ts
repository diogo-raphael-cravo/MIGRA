import { PairEnum } from '../graph-grammars/critical-pairs';
import Reachability from './reachability';

function decorateRuleMock(mock) {
    return {
        pattern: '',
        reachableByConstruction: false,
        requiredByDefault: true,
        mock: false,
        contains: {
            modules: [],
            resources: [],
            attributes: []
        },
        ...mock,
    };
}

describe('reachability', () => {
    it('throws if rule is not in rule array', () => {
        const rule = decorateRuleMock({
            name: 'rule',
            reachableByConstruction: false,
            mock: true,
        });
        const criticalPairs = {};
        expect(() => Reachability.isReachable(rule, [], criticalPairs)).toThrow();
    });
    it('throws if array and criticalPairs rules are not the same', () => {
        const ruleA = decorateRuleMock({
            name: 'rule-A',
            reachableByConstruction: false,
            mock: true,
        });
        const ruleB = decorateRuleMock({
            name: 'rule-B',
            reachableByConstruction: false,
            mock: true,
        });
        
        // one more in array
        const criticalPairsOneLess = {
            [PairEnum.DELETE_USE_CONFLICT]: {
                type: PairEnum.DELETE_USE_CONFLICT,
                transposed: false,
                pairs: {
                    'rule-B': {
                        'rule-B': 1,
                    },
                }
            }
        };
        expect(() => Reachability.isReachable(ruleA, [ruleA, ruleB], criticalPairsOneLess)).toThrow();

        // one more in critical pairs
        const criticalPairsOneMore = {
            [PairEnum.DELETE_USE_CONFLICT]: {
                type: PairEnum.DELETE_USE_CONFLICT,
                transposed: false,
                pairs: {
                    'rule-A': {
                        'rule-A': 1,
                        'rule-B': 1,
                    },
                    'rule-B': {
                        'rule-A': 1,
                        'rule-B': 1,
                    },
                }
            }
        };
        expect(() => Reachability.isReachable(ruleA, [ruleA], criticalPairsOneMore)).toThrow();
    });
    /**
     * reachable-by-construction
     */
    it('considers reachable an isolated rule reachable by construction', () => {
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'reachable-by-construction': {},
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'reachable-by-construction': {},
                }
            }
        };
        const ruleReal = decorateRuleMock({
            name: 'reachable-by-construction',
            reachableByConstruction: true,
            mock: false,
        });
        const reachableReal = Reachability.isReachable(ruleReal, [ruleReal], criticalPairs);
        expect(reachableReal).toBeTruthy();

        const ruleMock = decorateRuleMock({
            name: 'reachable-by-construction',
            reachableByConstruction: true,
            mock: true,
        });
        const reachableMock = Reachability.isReachable(ruleMock, [ruleMock], criticalPairs);
        expect(reachableMock).toBeTruthy();
    });
    /**
     * unreachable-by-construction
     */
    it('considers reachable an isolated non-reachable by construction rule', () => {
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'unreachable-by-construction': {},
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'unreachable-by-construction': {},
                }
            }
        };
        const ruleReal = decorateRuleMock({
            name: 'unreachable-by-construction',
            reachableByConstruction: false,
            mock: false,
        });
        const reachableReal = Reachability.isReachable(ruleReal, [ruleReal], criticalPairs);
        expect(reachableReal).toBeTruthy();

        const ruleMock = decorateRuleMock({
            name: 'unreachable-by-construction',
            reachableByConstruction: false,
            mock: true,
        });
        const reachableMock = Reachability.isReachable(ruleMock, [ruleMock], criticalPairs);
        expect(reachableMock).toBeTruthy();
    });
    /**
     * r-by-cons-real ---dep---> unr-by-cons
     */
    it('considers reachable a non-reachable by constrution rule that depends on real reachable by construction rules', () => {
        const rByConsReal = decorateRuleMock({
            name: 'r-by-cons-real',
            reachableByConstruction: true,
            mock: false,
        });
        const unrByCons = decorateRuleMock({
            name: 'unr-by-cons',
            reachableByConstruction: false,
            mock: false,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'r-by-cons-real': {
                        'r-by-cons-real': 0,
                        'unr-by-cons': 1,
                    },
                    'unr-by-cons': {
                        'r-by-cons-real': 0,
                        'unr-by-cons': 0,
                    },
                }
            },
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'r-by-cons-real': {},
                    'unr-by-cons': {},
                }
            }
        };
        const reachable = Reachability.isReachable(unrByCons, [rByConsReal, unrByCons], criticalPairs);
        expect(reachable).toBeTruthy();
    });
    /**
     * r-by-cons-mock ---dep---> unr-by-cons
     */
    it('considers unreachable a non-reachable by construction rule that depends on non-real reachable by construction rules', () => {
        const rByConsMock = decorateRuleMock({
            name: 'r-by-cons-mock',
            reachableByConstruction: true,
            mock: true,
        });
        const unrByCons = decorateRuleMock({
            name: 'unr-by-cons',
            reachableByConstruction: false,
            mock: false,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'r-by-cons-mock': {
                        'r-by-cons-mock': 0,
                        'unr-by-cons': 1,
                    },
                    'unr-by-cons': {
                        'r-by-cons-mock': 0,
                        'unr-by-cons': 0,
                    },
                }
            },
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'r-by-cons-mock': {},
                    'unr-by-cons': {},
                }
            }
        };
        const reachable = Reachability.isReachable(unrByCons, [rByConsMock, unrByCons], criticalPairs);
        expect(reachable).toBeFalsy();
    });
    /**
     * r-by-cons-mock ---dep---> unr-by-cons
     *            \               /\
     *             \con          /dep
     *              \/          /
     *           unr-by-cons-real
     */
    it('considers reachable a non-starting rule that depends on non-real starting rules which form a triangle', () => {
        const unrByCons = decorateRuleMock({
            name: 'unr-by-cons',
            reachableByConstruction: false,
            mock: false,
        });
        const rByConsMock = decorateRuleMock({
            name: 'r-by-cons-mock',
            reachableByConstruction: true,
            mock: true,
        });
        const unrByConsReal = decorateRuleMock({
            name: 'unr-by-cons-real',
            reachableByConstruction: false,
            mock: false,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'unr-by-cons': {},
                    'r-by-cons-mock': {
                        'unr-by-cons': 1,
                    },
                    'unr-by-cons-real': {
                        'unr-by-cons': 1,
                    },
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'unr-by-cons': {},
                    'r-by-cons-mock': {
                        'unr-by-cons-real': 1,
                    },
                    'unr-by-cons-real': {},
                }
            }
        };
        const reachable = Reachability.isReachable(unrByCons, [unrByCons, rByConsMock, unrByConsReal], criticalPairs);
        expect(reachable).toBeTruthy();

        // not reachable anymore when dep is removed
        const criticalPairsNoDep = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'unr-by-cons': {},
                    'r-by-cons-mock': {
                        'unr-by-cons': 1,
                    },
                    'unr-by-cons-real': {},
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'unr-by-cons': {},
                    'r-by-cons-mock': {
                        'unr-by-cons-real': 1,
                    },
                    'unr-by-cons-real': {},
                }
            }
        };
        const reachableNoDep = Reachability.isReachable(unrByCons, [unrByCons, rByConsMock, unrByConsReal], criticalPairsNoDep);
        expect(reachableNoDep).toBeFalsy();

        // not reachable anymore when con is removed
        const criticalPairsNoCon = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'unr-by-cons': {},
                    'r-by-cons-mock': {
                        'unr-by-cons': 1,
                    },
                    'unr-by-cons-real': {
                        'unr-by-cons': 1,
                    },
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'unr-by-cons': {},
                    'r-by-cons-mock': {},
                    'unr-by-cons-real': {},
                }
            }
        };
        const reachableNoCon = Reachability.isReachable(unrByCons, [unrByCons, rByConsMock, unrByConsReal], criticalPairsNoCon);
        expect(reachableNoCon).toBeFalsy();
    });
    /**
     * A ---dep---> B ---dep---> C ---dep---> D
     */
    it('goes up the graph recursively', () => {
        const A = decorateRuleMock({
            name: 'A',
            reachableByConstruction: false,
            mock: false,
        });
        const B = decorateRuleMock({
            name: 'B',
            reachableByConstruction: false,
            mock: false,
        });
        const C = decorateRuleMock({
            name: 'C',
            reachableByConstruction: false,
            mock: false,
        });
        const D = decorateRuleMock({
            name: 'D',
            reachableByConstruction: false,
            mock: false,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    A: {
                        B: 1,
                    },
                    B: {
                        C: 1,
                    },
                    C: {
                        D: 1,
                    },
                    D: {},
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    A: {},
                    B: {},
                    C: {},
                    D: {},
                }
            }
        };
        const reachable = Reachability.isReachable(D, [A, B, C, D], criticalPairs);
        expect(reachable).toBeTruthy();

        const mockA = decorateRuleMock({
            name: 'A',
            reachableByConstruction: true,
            mock: true,
        });
        const reachableDUnreachableB = Reachability.isReachable(D, [mockA, B, C, D], criticalPairs);
        expect(reachableDUnreachableB).toBeFalsy();
    });
    /**
     * A <---dep--- B
     *  \          /\
     *   \dep     /dep
     *    \/     /
     *        C
     */
    it('considers reachable an isolated cycle', () => {
        const A = decorateRuleMock({
            name: 'A',
            reachableByConstruction: false,
            mock: false,
        });
        const B = decorateRuleMock({
            name: 'B',
            reachableByConstruction: false,
            mock: false,
        });
        const C = decorateRuleMock({
            name: 'C',
            reachableByConstruction: false,
            mock: false,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    A: {
                        B: 1,
                    },
                    B: {
                        C: 1,
                    },
                    C: {
                        A: 1,
                    }
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    A: {},
                    B: {},
                    C: {},
                }
            }
        };
        const reachableA = Reachability.isReachable(A, [A, B, C], criticalPairs);
        const reachableB = Reachability.isReachable(B, [A, B, C], criticalPairs);
        const reachableC = Reachability.isReachable(C, [A, B, C], criticalPairs);
        expect(reachableA).toBeTruthy();
        expect(reachableB).toBeTruthy();
        expect(reachableC).toBeTruthy();
    });
    /**
     * A <---dep--- B <---dep--- mock
     *  \          /\
     *   \dep     /dep
     *    \/     /
     *        C
     */
    it('considers unreachable a cycle with an unreachable rule', () => {
        const A = decorateRuleMock({
            name: 'A',
            reachableByConstruction: false,
            mock: false,
        });
        const B = decorateRuleMock({
            name: 'B',
            reachableByConstruction: false,
            mock: false,
        });
        const C = decorateRuleMock({
            name: 'C',
            reachableByConstruction: false,
            mock: false,
        });
        const D = decorateRuleMock({
            name: 'D',
            reachableByConstruction: false,
            mock: true,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    A: {
                        B: 1,
                    },
                    B: {
                        C: 1
                    },
                    C: {
                        A: 1,
                    },
                    D: {
                        B: 1,
                    }
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    A: {},
                    B: {},
                    C: {},
                    D: {},
                }
            }
        };
        const reachableA = Reachability.isReachable(A, [A, B, C, D], criticalPairs);
        const reachableB = Reachability.isReachable(B, [A, B, C, D], criticalPairs);
        const reachableC = Reachability.isReachable(C, [A, B, C, D], criticalPairs);
        const reachableD = Reachability.isReachable(D, [A, B, C, D], criticalPairs);
        expect(reachableA).toBeFalsy();
        expect(reachableB).toBeFalsy();
        expect(reachableC).toBeFalsy();
        expect(reachableD).toBeTruthy();
    });

    /**
     * gA1 ---dep---> ga1 ---dep---> GetCall
     * gB1 ---dep---> mb1 ---con---> GetCall
     *     ---dep---> GetCall
     */
    it('considers reachable a non-starting rule that depends on real starting rules', () => {
        const gA1 = decorateRuleMock({
            name: 'gA1',
            reachableByConstruction: true,
            mock: false,
        });
        const ga1 = decorateRuleMock({
            name: 'ga1',
            reachableByConstruction: false,
            mock: false,
        });
        const gB1 = decorateRuleMock({
            name: 'gB1',
            reachableByConstruction: true,
            mock: false,
        });
        const mb1 = decorateRuleMock({
            name: 'mb1',
            reachableByConstruction: false,
            mock: true,
        });
        const GetCall = decorateRuleMock({
            name: 'GetCall',
            reachableByConstruction: false,
            mock: false,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'gA1': {
                        'ga1': 1,
                    },
                    'ga1': {
                        'GetCall': 1,
                    },
                    'gB1': {
                        'mb1': 1,
                        'GetCall': 1,
                    },
                    'mb1': {},
                    'GetCall': {},
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'gA1': {},
                    'ga1': {},
                    'gB1': {},
                    'mb1': {
                        'GetCall': 1,
                    },
                    'GetCall': {},
                }
            }
        };
        const reachable = Reachability.isReachable(GetCall, [gA1, ga1, gB1, mb1, GetCall], criticalPairs);
        expect(reachable).toBeTruthy();

        /**
         * gA1 ---dep---> ma1 ---dep---> GET
         * gB1 ---dep---> mb1 ---con---> GET
         *     ---dep---> GET
         */
        // unreachable
        // not reachable anymore when ga1 becomes ma1
        const ma1 = decorateRuleMock({
            name: 'ma1',
            reachableByConstruction: false,
            mock: true,
        });
        const criticalPairsNoDep = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    'gA1': {
                        'ma1': 1,
                    },
                    'ma1': {
                        'GetCall': 1,
                    },
                    'gB1': {
                        'mb1': 1,
                        'GetCall': 1,
                    },
                    'mb1': {},
                    'GetCall': {},
                }
            }, 
            [PairEnum.PRODUCE_FORBID_CONFLICT]: {
                type: PairEnum.PRODUCE_FORBID_CONFLICT,
                transposed: false,
                pairs: {
                    'gA1': {},
                    'ma1': {},
                    'gB1': {},
                    'mb1': {
                        'GetCall': 1,
                    },
                    'GetCall': {},
                }
            }
        };
        const reachableNoDep = Reachability.isReachable(GetCall, [gA1, ma1, gB1, mb1, GetCall], criticalPairsNoDep);
        expect(reachableNoDep).toBeFalsy();
    });
    it('is a problem', () => {
        const rules = [
            {
              "reachableByConstruction": false,
              "mock": false,
              "mapsToOperation": 'true',
              "requiredByDefault": false,
              "name": "GET.return-E1_AB",
              "pattern": "GET",
              "contains": {
                "modules": [
                  "B",
                  "A"
                ],
                "resources": [
                  "A.A.A1",
                  "B.B.B1"
                ],
                "attributes": [
                  "B.B.B1.B.B1.b1",
                  "A.A.A1.A.A1.a1"
                ]
              }
            },
            {
              "reachableByConstruction": true,
              "mock": false,
              "mapsToOperation": 'false',
              "requiredByDefault": false,
              "name": "gA1",
              "pattern": "generate-resource",
              "contains": {
                "modules": [
                  "A"
                ],
                "resources": [
                  "A.A.A1"
                ],
                "attributes": []
              }
            },
            {
              "reachableByConstruction": false,
              "mock": false,
              "mapsToOperation": 'false',
              "requiredByDefault": true,
              "name": "require-B.B1.b1",
              "pattern": "require",
              "contains": {
                "modules": [
                  "B"
                ],
                "resources": [
                  "B.B.B1"
                ],
                "attributes": [
                  "B.B.B1.B.B1.b1"
                ]
              }
            },
            {
              "reachableByConstruction": true,
              "mock": false,
              "mapsToOperation": 'false',
              "requiredByDefault": false,
              "name": "gB1",
              "pattern": "generate-resource",
              "contains": {
                "modules": [
                  "B"
                ],
                "resources": [
                  "B.B.B1"
                ],
                "attributes": []
              }
            },
            {
              "reachableByConstruction": false,
              "mock": true,
              "mapsToOperation": 'false',
              "requiredByDefault": false,
              "name": "mb1",
              "pattern": "mockgenerate-attribute",
              "contains": {
                "modules": [
                  "B"
                ],
                "resources": [
                  "B.B.B1"
                ],
                "attributes": [
                  "B.B.B1.B.B1.b1"
                ]
              }
            },
            {
              "reachableByConstruction": false,
              "mock": true,
              "mapsToOperation": 'false',
              "requiredByDefault": false,
              "name": "ma1",
              "pattern": "mockgenerate-attribute",
              "contains": {
                "modules": [
                  "A"
                ],
                "resources": [
                  "A.A.A1"
                ],
                "attributes": [
                  "A.A.A1.A.A1.a1"
                ]
              }
            },
            {
              "reachableByConstruction": false,
              "mock": false,
              "mapsToOperation": 'true',
              "requiredByDefault": false,
              "name": "GET.call-E1_BC",
              "pattern": "GET",
              "contains": {
                "modules": [
                  "C",
                  "B"
                ],
                "resources": [
                  "B.B.B1",
                  "C.C.C1"
                ],
                "attributes": [
                  "B.B.B1.B.B1.b1",
                  "C.C.C1.C.C1.c1"
                ]
              }
            },
            {
              "reachableByConstruction": false,
              "mock": false,
              "mapsToOperation": 'false',
              "requiredByDefault": true,
              "name": "require-C.C1.c1",
              "pattern": "require",
              "contains": {
                "modules": [
                  "C"
                ],
                "resources": [
                  "C.C.C1"
                ],
                "attributes": [
                  "C.C.C1.C.C1.c1"
                ]
              }
            },
            {
              "reachableByConstruction": false,
              "mock": false,
              "mapsToOperation": 'true',
              "requiredByDefault": false,
              "name": "GET.return-E1_BC",
              "pattern": "GET",
              "contains": {
                "modules": [
                  "C",
                  "B"
                ],
                "resources": [
                  "B.B.B1",
                  "C.C.C1"
                ],
                "attributes": [
                  "C.C.C1.C.C1.c1",
                  "B.B.B1.B.B1.b1"
                ]
              }
            },
            {
              "reachableByConstruction": true,
              "mock": false,
              "mapsToOperation": 'false',
              "requiredByDefault": false,
              "name": "generate-C.C1",
              "pattern": "generate-resource",
              "contains": {
                "modules": [
                  "C"
                ],
                "resources": [
                  "C.C.C1"
                ],
                "attributes": []
              }
            },
            {
              "reachableByConstruction": false,
              "mock": true,
              "mapsToOperation": 'false',
              "requiredByDefault": false,
              "name": "mockgenerate-C.C1.c1",
              "pattern": "mockgenerate-attribute",
              "contains": {
                "modules": [
                  "C"
                ],
                "resources": [
                  "C.C.C1"
                ],
                "attributes": [
                  "C.C.C1.C.C1.c1"
                ]
              }
            }
        ];
        const GET = {
            "reachableByConstruction": false,
            "mock": false,
            "mapsToOperation": 'true',
            "requiredByDefault": false,
            "name": "GET",
            "pattern": "GET",
            "contains": {
              "modules": [
                "B",
                "A"
              ],
              "resources": [
                "A.A.A1",
                "B.B.B1"
              ],
              "attributes": [
                "A.A.A1.A.A1.a1",
                "B.B.B1.B.B1.b1"
              ]
            }
        };
        const criticalPairs = {
            "PRODUCE_FORBID_CONFLICT": {
              "type": PairEnum.PRODUCE_FORBID_CONFLICT,
              "transposed": false,
              "pairs": {
                "GET.return-E1_AB": {},
                "GET": {
                //   "GET.return-E1_BC": 6
                },
                "gA1": {},
                // "require-B.B1.b1": {},
                "gB1": {},
                "mb1": {
                  "GET": 6,
                //   "GET.return-E1_BC": 6
                },
                "ma1": {
                    //comentar aqui
                      "GET.return-E1_AB": 6
                },
                // "GET.call-E1_BC": {},
                // "require-C.C1.c1": {},
                // "GET.return-E1_BC": {
                //   "GET": 6
                // },
                // "generate-C.C1": {},
                // "mockgenerate-C.C1.c1": {
                //   "GET.call-E1_BC": 6
                // }
              },
              "overlaps": []
            },
            "PRODUCE_USE_DEPENDENCY": {
              "type": PairEnum.PRODUCE_USE_DEPENDENCY,
              "transposed": false,
              "pairs": {
                "GET.return-E1_AB": {
                  "GET": 6
                },
                "GET": {
                  "GET.return-E1_AB": 10,
                //   "require-B.B1.b1": 3,
                //   "GET.call-E1_BC": 3
                },
                "gA1": {
                  "GET.return-E1_AB": 1,
                  "ma1": 1
                },
                // "require-B.B1.b1": {},
                "gB1": {
                  "GET": 1,
                  "mb1": 1,
                //   "GET.return-E1_BC": 1
                },
                "mb1": {
                  "GET.return-E1_AB": 3,
                //   "require-B.B1.b1": 3,
                //   "GET.call-E1_BC": 3
                },
                "ma1": {
                  "GET": 3
                },
                // "GET.call-E1_BC": {
                //   "require-C.C1.c1": 3,
                //   "GET.return-E1_BC": 10
                // },
                // "require-C.C1.c1": {},
                // "GET.return-E1_BC": {
                //   "GET.return-E1_AB": 3,
                //   "require-B.B1.b1": 3,
                //   "GET.call-E1_BC": 6
                // },
                // "generate-C.C1": {
                //   "GET.call-E1_BC": 1,
                //   "mockgenerate-C.C1.c1": 1
                // },
                // "mockgenerate-C.C1.c1": {
                //   "require-C.C1.c1": 3,
                //   "GET.return-E1_BC": 3
                // }
              },
              "overlaps": []
            },
        };
        const reachable = Reachability.isReachable(GET, [GET, ...rules], criticalPairs);
        expect(reachable).toBeTruthy();
    });
});