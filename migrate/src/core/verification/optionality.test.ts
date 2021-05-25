import { PairEnum } from '../graph-grammars/critical-pairs';
import { getOptionals, inRequiredPath } from './optionality';

function decorateRuleMock(mock) {
    return {
        ...mock,
        pattern: "",
        reachableByConstruction: true,
        mock: false,
    };
}
function decorateRuleMocks(mocks) {
    return mocks.map(x => decorateRuleMock(x));
}

describe('optionality', () => {
    /**
     * optA <---dep--- optB
     *    \          /\
     *     \dep     /dep
     *      \/     /
     *        optC
     */
    it('considers optional an isolated cycle without required rules', () => {
        const optA = decorateRuleMock({
            name: 'optA',
            requiredByDefault: false,
        });
        const optB = decorateRuleMock({
            name: 'optB',
            requiredByDefault: false,
        });
        const optC = decorateRuleMock({
            name: 'optC',
            requiredByDefault: false,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    optA: {
                        optB: 1,
                    },
                    optB: {
                        optC: 1,
                    },
                    optC: {
                        optA: 1,
                    }
                }
            }
        };
        const inReqPathOptA = inRequiredPath(optA, [optA, optB, optC], criticalPairs);
        const inReqPathOptB = inRequiredPath(optB, [optA, optB, optC], criticalPairs);
        const inReqPathOptC = inRequiredPath(optC, [optA, optB, optC], criticalPairs);
        expect(inReqPathOptA).toBeFalsy();
        expect(inReqPathOptB).toBeFalsy();
        expect(inReqPathOptC).toBeFalsy();
    });
    /**
     * req <---dep--- optA
     *    \          /\
     *     \dep     /dep
     *      \/     /
     *        optB
     */
    it('considers required an isolated cycle with a required rule', () => {
        const optA = decorateRuleMock({
            name: 'optA',
            requiredByDefault: false,
        });
        const optB = decorateRuleMock({
            name: 'optB',
            requiredByDefault: false,
        });
        const req = decorateRuleMock({
            name: 'req',
            requiredByDefault: true,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    optA: {
                        optB: 1,
                    },
                    optB: {
                        req: 1,
                    },
                    req: {
                        optA: 1,
                    }
                }
            }
        };
        const inReqPathOptA = inRequiredPath(optA, [optA, optB, req], criticalPairs);
        const inReqPathOptB = inRequiredPath(optB, [optA, optB, req], criticalPairs);
        const inReqPathReq = inRequiredPath(req, [optA, optB, req], criticalPairs);
        expect(inReqPathOptA).toBeTruthy();
        expect(inReqPathOptB).toBeTruthy();
        expect(inReqPathReq).toBeTruthy();
    });
    /**
     * optA <---dep--- optB ---dep---> req
     *    \          /\
     *     \dep     /dep
     *      \/     /
     *        optC
     */
    it('considers required a cycle leading to a required rule', () => {
        const optA = decorateRuleMock({
            name: 'optA',
            requiredByDefault: false,
        });
        const optB = decorateRuleMock({
            name: 'optB',
            requiredByDefault: false,
        });
        const optC = decorateRuleMock({
            name: 'optC',
            requiredByDefault: false,
        });
        const req = decorateRuleMock({
            name: 'req',
            requiredByDefault: true,
        });
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    optA: {
                        optB: 1,
                    },
                    optB: {
                        optC: 1,
                        req: 1,
                    },
                    optC: {
                        optA: 1,
                    },
                    req: {},
                }
            }
        };
        const inReqPathOptA = inRequiredPath(optA, [optA, optB, optC, req], criticalPairs);
        const inReqPathOptB = inRequiredPath(optB, [optA, optB, optC, req], criticalPairs);
        const inReqPathOptC = inRequiredPath(optC, [optA, optB, optC, req], criticalPairs);
        const inReqPathReq = inRequiredPath(req, [optA, optB, optC, req], criticalPairs);
        expect(inReqPathOptA).toBeTruthy();
        expect(inReqPathOptB).toBeTruthy();
        expect(inReqPathOptC).toBeTruthy();
        expect(inReqPathReq).toBeTruthy();
    });
    /**
     * reqRoot ---dep---> req1 ---dep---> req2
     *         ---dep---> opt1
     * optRoot ---dep---> opt2
     */
    it('considers optional rules, modules, resources and attributes not in required paths', () => {
        const rules = [{
            name: "reqRoot",
            requiredByDefault: false,
            contains: {
                modules: ["reqRoot-module"],
                resources: ["reqRoot-resource"],
                attributes: ["reqRoot-attribute"]
            }
        }, {
            name: "req1",
            requiredByDefault: false,
            contains: {
                modules: ["req1-module"],
                resources: ["req1-resource"],
                attributes: ["req1-attribute"]
            }
        }, {
            name: "req2",
            requiredByDefault: true,
            contains: {
                modules: ["req2-module"],
                resources: ["req2-resource"],
                attributes: ["req2-attribute"]
            }
        }, {
            name: "opt1",
            requiredByDefault: false,
            contains: {
                modules: ["opt1-module"],
                resources: ["opt1-resource"],
                attributes: ["opt1-attribute"]
            }
        }, {
            name: "optRoot",
            requiredByDefault: false,
            contains: {
                modules: ["optRoot-module"],
                resources: ["optRoot-resource"],
                attributes: ["optRoot-attribute"]
            }
        }, {
            name: "opt2",
            requiredByDefault: false,
            contains: {
                modules: ["opt2-module"],
                resources: ["opt2-resource"],
                attributes: ["opt2-attribute"]
            }
        }];
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    reqRoot: {
                        req1: 1,
                        opt1: 1,
                    },
                    req1: {
                        req2: 1,
                    },
                    req2: {},
                    opt1: {},
                    optRoot: {
                        opt2: 1,
                    },
                    opt2: {},
                }
            }
        };
        const optionals = getOptionals(decorateRuleMocks(rules), criticalPairs);
        expect(optionals).toEqual({
            rules: [
                "opt1",
                "optRoot",
                "opt2",
            ],
            modules: [
                "opt1-module",
                "optRoot-module",
                "opt2-module",
            ],
            resources: [
                "opt1-resource",
                "optRoot-resource",
                "opt2-resource",
            ],
            attributes: [
                "opt1-attribute",
                "optRoot-attribute",
                "opt2-attribute",
            ],
        });
    });
    /**
     * reqRoot ---dep---> req
     *         ---dep---> opt
     */
    it('considers required modules, resources and attributes in required and optional paths', () => {
        const rules = [{
            name: "reqRoot",
            requiredByDefault: false,
            contains: {
                modules: ["module"],
                resources: ["resource"],
                attributes: ["attribute"]
            }
        }, {
            name: "req",
            requiredByDefault: true,
            contains: {
                modules: ["req-module"],
                resources: ["req-resource"],
                attributes: ["req-attribute"]
            }
        }, {
            name: "opt",
            requiredByDefault: false,
            contains: {
                modules: ["module", "opt-module"],
                resources: ["resource", "opt-resource"],
                attributes: ["attribute", "opt-attribute"]
            }
        }];
        const criticalPairs = {
            [PairEnum.PRODUCE_USE_DEPENDENCY]: {
                type: PairEnum.PRODUCE_USE_DEPENDENCY,
                transposed: false,
                pairs: {
                    reqRoot: {
                        req: 1,
                        opt: 1,
                    },
                    req: {},
                    opt: {},
                }
            }
        };
        const optionals = getOptionals(decorateRuleMocks(rules), criticalPairs);
        expect(optionals).toEqual({
            rules: ["opt"],
            modules: ["opt-module"],
            resources: ["opt-resource"],
            attributes: ["opt-attribute"],
        });
    });
});