import * as babelParser from '@babel/parser';
import { File } from '@babel/types';
import { OperationType } from '../../translation/module-net-types';
import { ExportNameType } from './export-extractor';
import {
    IdentifierType,
} from './identifier-extractor';
import {
    IntegrationPointType,
    isSameIdentifier,
    ExtractedOperationType,
    toOperation,
    extractOperations,
    extractOwnOperations,
    extractRemainingOperations,
    extractInterfaceOperations,
} from './operation-extractor';
import {
    getPath,
    findLastChild,
} from '../compilers/babel-helpers';

function getLastCallExpression(program: string) {
    const path = getPath(babelParser.parse(program));
    return findLastChild(path, (candidate) => candidate.isCallExpression());
}
function getFile(program: string) {
    return babelParser.parse(program);
}

describe('operation-extractor', () => {
    describe('matches export and caller names', () => {
        it('matches root exports', () => {
            // when ignoring module, caller is null and so is callee
            let caller: IdentifierType = {
                destructured: false,
                parent: null,
                value: 'module', // not destructured, so ignore module
            };
            let callee: ExportNameType = {
                parent: null,
                name: null,
            };
            expect(isSameIdentifier(caller, callee)).toBeTruthy();
            expect(isSameIdentifier(caller, null)).toBeTruthy();
            caller = {
                destructured: false,
                parent: null,
                value: null,
            };
            callee = {
                parent: null,
                name: null,
            };
            expect(isSameIdentifier(caller, callee)).toBeFalsy();
        });
        it('matches methods called on root exports', () => {
            // when ignoring foobar, caller is null and so is callee
            let caller: IdentifierType = {
                destructured: false,
                parent: {
                    destructured: false,
                    parent: null,
                    value: 'module',
                },
                value: 'method',
            };
            let callee: ExportNameType = {
                parent: null,
                name: 'method',
            };
            expect(isSameIdentifier(caller, callee)).toBeTruthy();
            caller = {
                destructured: false,
                parent: {
                    destructured: false,
                    parent: null,
                    value: 'module',
                },
                value: 'method',
            };
            callee = {
                parent: null,
                name: 'othermethod',
            };
            expect(isSameIdentifier(caller, callee)).toBeFalsy();
        });
    });
    describe('makes operations', () => {
        it('makes an empty operation', () => {
            const callerId: IdentifierType = {
                destructured: false,
                parent: {
                    destructured: false,
                    parent: null,
                    value: 'foo',
                },
                value: 'bar',
            };
            const integration: IntegrationPointType = {
                callerSite: {
                    path: null,
                    argumentsByPosition: [],
                    functionIdentifier: callerId,
                    assignedTo: [],
                },
                calleeSite: {
                    functionDeclaration: {
                        parametersByPosition: [],
                        return: [],
                        functionIdentifier: null,
                    },
                    export: null,
                },
            };
            const actual = toOperation(integration, 'caller-module', 'callee-module');
            const expected: OperationType = {
                id: 'foo.bar',
                fromId: 'caller-module',
                toId: 'callee-module',
                type: null,
                graph: {
                    edges: [],
                    nodes: [],
                },
            };
            expect(actual).toStrictEqual(expected);
        });
        it('makes an operation with arguments', () => {
            const callerSitePath = getLastCallExpression(`
            const c = require('callee-module');
            const bar = 1;
            function f(foo) {
                c.g(foo, bar);
            }
            `);
            const calleeSitePath = getLastCallExpression(`
            module.exports = {};
            module.exports.g = function g(first, second) {
                foobar();
            }
            `);
            const integration: IntegrationPointType = {
                callerSite: {
                    path: callerSitePath,
                    argumentsByPosition: [{
                        identifiers: [{
                            destructured: false,
                            parent: null,
                            value: 'foo',
                        }],
                    }, {
                        identifiers: [{
                            destructured: false,
                            parent: null,
                            value: 'bar',
                        }],
                    }],
                    functionIdentifier: null,
                    assignedTo: [],
                },
                calleeSite: {
                    functionDeclaration: {
                        parametersByPosition: [{
                            identifiers: [{
                                destructured: false,
                                parent: null,
                                value: 'first',
                            }]
                        }, {
                            identifiers: [{
                                destructured: false,
                                parent: null,
                                value: 'second',
                            }]
                        }],
                        return: [],
                        functionIdentifier: null,
                    },
                    export: {
                        assignee: null,
                        export: calleeSitePath,
                    },
                },
            };
            const actual = toOperation(integration, 'caller-module', 'callee-module');
            const expected: OperationType = {
                id: null,
                fromId: 'caller-module',
                toId: 'callee-module',
                type: null,
                graph: {
                    edges: [{
                        id: '',
                        fromId: 'caller-module.global-f',
                        toId: 'callee-module.global-g',
                        type: null,
                        attributeMapping: [{
                            fromId: 'caller-module.global-f.foo',
                            toId: 'callee-module.global-g.first',
                        }],
                    }, {
                        id: '',
                        fromId: 'caller-module.global',
                        toId: 'callee-module.global-g',
                        type: null,
                        attributeMapping: [{
                            fromId: 'caller-module.global.bar',
                            toId: 'callee-module.global-g.second',
                        }],
                    }],
                    nodes: [{
                        id: 'caller-module.global-f',
                    }, {
                        id: 'callee-module.global-g',
                    }, {
                        id: 'caller-module.global',
                    }],
                },
            };
            expect(actual.graph).toStrictEqual(expected.graph);
        });
        it('makes an operation with return', () => {
            const callerSitePath = getLastCallExpression(`
            const c = require('callee-module');
            let baz;
            function f() {
                baz = c.g();
            }
            `);
            const calleeSitePath = getLastCallExpression(`
            module.exports = {};
            module.exports.g = function g() {
                const x = foobar();
                const y = 1;
                return x + y;
            }
            `);
            const integration: IntegrationPointType = {
                callerSite: {
                    path: callerSitePath,
                    argumentsByPosition: [],
                    functionIdentifier: null,
                    assignedTo: [{
                        destructured: false,
                        parent: null,
                        value: 'baz',
                    }],
                },
                calleeSite: {
                    functionDeclaration: {
                        parametersByPosition: [],
                        return: [{
                            destructured: false,
                            parent: null,
                            value: 'x',
                        }, {
                            destructured: false,
                            parent: null,
                            value: 'y',
                        }],
                        functionIdentifier: null,
                    },
                    export: {
                        assignee: null,
                        export: calleeSitePath,
                    },
                },
            };
            const actual = toOperation(integration, 'caller-module', 'callee-module');
            const expected: OperationType = {
                id: null,
                fromId: 'caller-module',
                toId: 'callee-module',
                type: null,
                graph: {
                    edges: [{
                        id: '',
                        fromId: 'callee-module.global-g',
                        toId: 'caller-module.global',
                        type: null,
                        attributeMapping: [{
                            fromId: 'callee-module.global-g.x',
                            toId: 'caller-module.global.baz',
                        }],
                    }, {
                        id: '',
                        fromId: 'callee-module.global-g',
                        toId: 'caller-module.global',
                        type: null,
                        attributeMapping: [{
                            fromId: 'callee-module.global-g.y',
                            toId: 'caller-module.global.baz',
                        }],
                    }],
                    nodes: [{
                        id: 'callee-module.global-g',
                    }, {
                        id: 'caller-module.global',
                    }],
                },
            };
            expect(actual.graph).toStrictEqual(expected.graph);
        });
    });
    describe('extracts operations with mode CALLEE_IS_NOT_CALLER', () => {
        it('extracts operations', () => {
            const callerFile = getFile(`
            const fs = require('fs');
            const c = require('callee-module');
            const bar = 1;
            const other = 2;
            function f(foo, filename) {
                console.log(other);
                const contents = fs.readFile(filename);
                bar = g(foo);
                let x = c.g(foo, bar);
            }
            function g(first) {
                return first;
            }
            `);
            const calleeFile = getFile(`
            module.exports = {};
            module.exports.g = function g(first, second) {
                return first;
            }
            `);
            const actual = extractOperations(callerFile, calleeFile, 'caller-module', 'callee-module');
            const expected: ExtractedOperationType = {
                generates: [],
                requires: [],
                operations: [{
                    id: 'c.g',
                    fromId: 'caller-module',
                    toId: 'callee-module',
                    type: null,
                    graph: {
                        edges: [{
                            id: '',
                            fromId: 'caller-module.global-f',
                            toId: 'callee-module.global-g',
                            type: null,
                            attributeMapping: [{
                                fromId: 'caller-module.global-f.foo',
                                toId: 'callee-module.global-g.first',
                            }],
                        }, {
                            id: '',
                            fromId: 'caller-module.global',
                            toId: 'callee-module.global-g',
                            type: null,
                            attributeMapping: [{
                                fromId: 'caller-module.global.bar',
                                toId: 'callee-module.global-g.second',
                            }],
                        }, {
                            id: '',
                            fromId: 'callee-module.global-g',
                            toId: 'caller-module.global-f',
                            type: null,
                            attributeMapping: [{
                                fromId: 'callee-module.global-g.first',
                                toId: 'caller-module.global-f.x',
                            }],
                        }],
                        nodes: [{
                            id: 'caller-module.global-f',
                        }, {
                            id: 'callee-module.global-g',
                        }, {
                            id: 'caller-module.global',
                        }],
                    },
                }]
            };
            expect(actual).toStrictEqual(expected);
        });
        it('extracts single exported operations with resolved names', () => {
            const callerFile = getFile(`
            const fs = require('fs');
            const c = require('callee-module');
            const bar = 1;
            const other = 2;
            function f(foo, filename) {
                console.log(other);
                const contents = fs.readFile(filename);
                bar = g(foo);
                let x = c(foo, bar);
            }
            function g(first) {
                return first;
            }
            `);
            const calleeFile = getFile(`
            const gt = (first, second) => first
            module.exports = gt
            `);
            const actual = extractOperations(callerFile, calleeFile, 'caller-module', 'callee-module');
            const expected: ExtractedOperationType = {
                generates: [],
                requires: [],
                operations: [{
                    id: 'c',
                    fromId: 'caller-module',
                    toId: 'callee-module',
                    type: null,
                    graph: {
                        edges: [{
                            id: '',
                            fromId: 'caller-module.global-f',
                            toId: 'callee-module.global-arrowfn',
                            type: null,
                            attributeMapping: [{
                                fromId: 'caller-module.global-f.foo',
                                toId: 'callee-module.global-arrowfn.first',
                            }],
                        }, {
                            id: '',
                            fromId: 'caller-module.global',
                            toId: 'callee-module.global-arrowfn',
                            type: null,
                            attributeMapping: [{
                                fromId: 'caller-module.global.bar',
                                toId: 'callee-module.global-arrowfn.second',
                            }],
                        }, 
                        // {
                        //     id: '',
                        //     fromId: 'callee-module.global-arrowfn',
                        //     toId: 'caller-module.global-f',
                        //     type: null,
                        //     attributeMapping: [{
                        //         fromId: 'callee-module.global-arrowfn.first',
                        //         toId: 'caller-module.global-f.x',
                        //     }],
                        // }
                    ],
                        nodes: [{
                            id: 'caller-module.global-f',
                        }, {
                            id: 'callee-module.global-arrowfn',
                        }, {
                            id: 'caller-module.global',
                        }],
                    },
                }]
            };
            expect(actual).toStrictEqual(expected);
        });
    });
    describe('extracts operations with mode CALLEE_SAME_AS_CALLER', () => {
        it('extracts operations', () => {
            const callerFile = getFile(`
            const fs = require('fs');
            const c = require('callee-module');
            const bar = 1;
            const other = 2;
            function f(foo, filename) {
                console.log(other);
                const contents = fs.readFile(filename);
                bar = g(foo);
                let x = c.g(foo, bar);
            }
            function g(first) {
                return first;
            }
            `);
            const actual = extractOwnOperations(callerFile, 'self-module');
            const expected: ExtractedOperationType = {
                generates: [],
                requires: [],
                operations: [{
                    id: 'g',
                    fromId: 'self-module',
                    toId: 'self-module',
                    type: null,
                    graph: {
                        edges: [{
                            id: '',
                            fromId: 'self-module.global-f',
                            toId: 'self-module.global-g',
                            type: null,
                            attributeMapping: [{
                                fromId: 'self-module.global-f.foo',
                                toId: 'self-module.global-g.first',
                            }],
                        }, {
                            id: '',
                            fromId: 'self-module.global-g',
                            toId: 'self-module.global',
                            type: null,
                            attributeMapping: [{
                                fromId: 'self-module.global-g.first',
                                toId: 'self-module.global.bar',
                            }],
                        }],
                        nodes: [{
                            id: 'self-module.global-f',
                        }, {
                            id: 'self-module.global-g',
                        }, {
                            id: 'self-module.global',
                        }],
                    },
                }]
            };
            expect(actual).toStrictEqual(expected);
        });
    });
    describe('extracts operations with mode IGNORE_CALLEE', () => {
        it('extracts operations', () => {
            const callerFile = getFile(`
            const fs = require('fs');
            const c = require('callee-module');
            const bar = 1;
            const other = 2;
            function f(foo, filename) {
                console.log(other);
                const contents = fs.readFile(filename);
                bar = g(foo);
                let x = c.g(foo, bar);
            }
            function g(first) {
                return first;
            }
            `);
            const actual = extractRemainingOperations(callerFile, 'self-module', ['callee-module']);
            const expected: ExtractedOperationType = {
                generates: ['self-module.global-f.contents'],
                requires: [
                    'self-module.global.other',
                    'self-module.global-f.filename',
                ],
                operations: []
            };
            expect(actual).toStrictEqual(expected);
        });
    });
    describe('extracts operations with mode IGNORE_CALLER', () => {
        it('extracts operations', () => {
            const calleeFile = getFile(`
            const functions = require('./functions');
            module.exports = {
                required: functions.f,
                singleFunctionExport: require('./singleFunction'),
                manyFunctions: require('./foobar/manyFunctions'),
            };
            module.exports.g = function g(first, second) {
                return first;
            }
            `);
            const modulesToSearch: Record<string, File> = {
                functions: getFile(`
                    module.exports = {
                        f() {
                            return 1;
                        },
                    }
                `),
                singleFunction: getFile(`
                    let local;
                    module.exports = function f(a) {
                        return a + local;
                    }
                `),
                'foobar/manyFunctions': getFile(`
                    module.exports = {
                        f() {},
                        g() {},
                        h() {},
                    };
                `),
            };
            const actual = extractInterfaceOperations(calleeFile, 'callee-module', modulesToSearch);
            const callee: OperationType = {
                id: 'callee-module-g',
                fromId: '?',
                toId: 'callee-module',
                type: null,
                graph: {
                    nodes: [{
                        id: '?.callee-module-global-g',
                    }, {
                        id: 'callee-module.global-g',
                    }],
                    edges: [{
                        id: '',
                        type: null,
                        fromId: '?.callee-module-global-g',
                        toId: 'callee-module.global-g',
                        attributeMapping: [{
                            fromId: '?.callee-module-global-g.first',
                            toId: 'callee-module.global-g.first',
                        }],
                    }, {
                        id: '',
                        type: null,
                        fromId: '?.callee-module-global-g',
                        toId: 'callee-module.global-g',
                        attributeMapping: [{
                            fromId: '?.callee-module-global-g.second',
                            toId: 'callee-module.global-g.second',
                        }],
                    }, {
                        id: '',
                        type: null,
                        fromId: 'callee-module.global-g',
                        toId: '?.callee-module-global-g',
                        attributeMapping: [{
                            fromId: 'callee-module.global-g.first',
                            toId: '?.callee-module-global-g.first',
                        }],
                    }],
                }
            };
            // const functions: OperationType = {
            //     id: 'functions-f',
            //     fromId: '?',
            //     toId: 'functions',
            //     type: null,
            //     graph: {
            //         nodes: [],
            //         edges: [],
            //     }
            // };
            const singleFunction: OperationType = {
                id: 'singleFunction-singleFunctionExport',
                fromId: '?',
                toId: 'singleFunction',
                type: null,
                graph: {
                    nodes: [{
                        id: '?.singleFunction-global-f',
                    }, {
                        id: 'singleFunction.global-f',
                    }, {
                        id: 'singleFunction.global',
                    }, {
                        id: '?.singleFunction-global',
                    }],
                    edges: [{
                        id: '',
                        fromId: '?.singleFunction-global-f',
                        toId: 'singleFunction.global-f',
                        type: null,
                        attributeMapping: [{
                            fromId: '?.singleFunction-global-f.a',
                            toId: 'singleFunction.global-f.a',
                        }],
                    }, {
                        id: '',
                        fromId: 'singleFunction.global-f',
                        toId: '?.singleFunction-global-f',
                        type: null,
                        attributeMapping: [{
                            fromId: 'singleFunction.global-f.a',
                            toId: '?.singleFunction-global-f.a',
                        }],
                    }, {
                        id: '',
                        fromId: 'singleFunction.global',
                        toId: '?.singleFunction-global-f',
                        type: null,
                        attributeMapping: [{
                            fromId: 'singleFunction.global.local',
                            toId: '?.singleFunction-global-f.a',
                        }],
                    }, {
                        id: '',
                        fromId: 'singleFunction.global-f',
                        toId: '?.singleFunction-global',
                        type: null,
                        attributeMapping: [{
                            fromId: 'singleFunction.global-f.a',
                            toId: '?.singleFunction-global.local',
                        }],
                    }, {
                        id: '',
                        fromId: 'singleFunction.global',
                        toId: '?.singleFunction-global',
                        type: null,
                        attributeMapping: [{
                            fromId: 'singleFunction.global.local',
                            toId: '?.singleFunction-global.local',
                        }],
                    }],
                }
            };
            const manyFunctions: OperationType[] = [{
                id: 'foobar/manyFunctions-manyFunctions.f',
                fromId: '?',
                toId: 'foobar/manyFunctions',
                type: null,
                graph: {
                    nodes: [],
                    edges: [],
                }
            }, {
                id: 'foobar/manyFunctions-manyFunctions.g',
                fromId: '?',
                toId: 'foobar/manyFunctions',
                type: null,
                graph: {
                    nodes: [],
                    edges: [],
                }
            }, {
                id: 'foobar/manyFunctions-manyFunctions.h',
                fromId: '?',
                toId: 'foobar/manyFunctions',
                type: null,
                graph: {
                    nodes: [],
                    edges: [],
                }
            }];
            const expected: ExtractedOperationType = {
                generates: [],
                requires: [],
                operations: [
                    callee,
                    // functions,
                    singleFunction,
                    ...manyFunctions,
                ],
            };
            expect(actual).toStrictEqual(expected);
        });
    });
});