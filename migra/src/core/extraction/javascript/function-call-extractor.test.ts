import * as babelParser from '@babel/parser';
import {
    FunctionCallType,
    extractFunctionCalls,
} from './function-call-extractor';

describe('function-call-extractor', () => {
    it('extracts simple declarator', () => {
        const program = `
        const foo = require('foo');
        const a = 2;
        const b = { c: 3 };
        let r = foo.bar(1, a, b.c, a + a + 2 * b, ...b, string.trim().replace(), 
            undefined, null, (c, d) => console.log(c,d,a));
        `;
        const node = babelParser.parse(program);
        const functionCalls: FunctionCallType[] = extractFunctionCalls(node);
        const expectedFunctionCalls: FunctionCallType[] = [{
            path: null,
            argumentsByPosition: [{
                identifiers: [],
            }],
            functionIdentifier: {
                destructured: false,
                value: 'require',
                parent: null,
            },
            assignedTo: [{
                destructured: false,
                parent: null,
                value: 'foo',
            }],
        }, {
            path: null,
            argumentsByPosition: [{
                identifiers: [],
            }, {
                identifiers: [{
                    destructured: false,
                    value: 'a',
                    parent: null,
                }],
            }, {
                identifiers: [{
                    destructured: false,
                    value: 'c',
                    parent: {
                        destructured: false,
                        value: 'b',
                        parent: null,
                    },
                }],
            }, {
                identifiers: [{
                    destructured: false,
                    value: 'a',
                    parent: null,
                }, {
                    destructured: false,
                    value: 'a',
                    parent: null,
                }, {
                    destructured: false,
                    value: 'b',
                    parent: null,
                }],
            }, {
                identifiers: [{
                    destructured: false,
                    value: 'b',
                    parent: null,
                }],
            }, {
                identifiers: [],
            }, {
                identifiers: [],
            }, {
                identifiers: [],
            }, {
                identifiers: [],
            }],
            functionIdentifier: {
                destructured: false,
                value: 'bar',
                parent: {
                    destructured: false,
                    value: 'foo',
                    parent: null,
                },
            },
            assignedTo: [{
                destructured: false,
                parent: null,
                value: 'r',
            }],
        }, {
            path: null,
            argumentsByPosition: [],
            functionIdentifier: {
                destructured: false,
                value: 'trim',
                parent: {
                    destructured: false,
                    parent: null,
                    value: 'string',
                },
            },
            assignedTo: [],
        }, {
            path: null,
            argumentsByPosition: [{
                identifiers: [{
                    destructured: false,
                    value: 'c',
                    parent: null,
                }],
            }, {
                identifiers: [{
                    destructured: false,
                    value: 'd',
                    parent: null,
                }],
            }, {
                identifiers: [{
                    destructured: false,
                    value: 'a',
                    parent: null,
                }],
            }],
            functionIdentifier: {
                destructured: false,
                value: 'log',
                parent: {
                    destructured: false,
                    parent: null,
                    value: 'console',
                },
            },
            assignedTo: [],
        }];
        expect(functionCalls.map(f => {
            f.path = null;
            return f;
        })).toStrictEqual(expectedFunctionCalls);
    });
    it('ignores classes', () => {
        const program = `
        class Foobar {
            constructor() {
                const foo = require('foo');
                const a = 2;
                const b = { c: 3 };
                let r = foo.bar(1, a, b.c, a + a + 2 * b, ...b, string.trim().replace());
                new SemVer(version, options).inc(release, identifier).version
            }
        }
        `;
        const node = babelParser.parse(program);
        const functionCalls: FunctionCallType[] = extractFunctionCalls(node);
        const expectedFunctionCalls: FunctionCallType[] = [];
        expect(functionCalls.map(call => ({
            ...call,
            ancestors: [],
        }))).toStrictEqual(expectedFunctionCalls);
    });
    it('extracts methods', () => {
        const program = `
        new SemVer(version, options).inc(release, identifier).version
        `;
        const node = babelParser.parse(program);
        const functionCalls: FunctionCallType[] = extractFunctionCalls(node);
        const expectedFunctionCalls: FunctionCallType[] = [{
            path: null,
            argumentsByPosition: [{
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'release',
                }]
            }, {
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'identifier',
                }]
            }],
            functionIdentifier: {
                destructured: false,
                value: 'inc',
                parent: {
                    destructured: false,
                    value: 'SemVer',
                    parent: null,
                },
            },
            assignedTo: [],
        }, {
            path: null,
            argumentsByPosition: [{
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'version',
                }]
            }, {
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'options',
                }]
            }],
            functionIdentifier: {
                destructured: false,
                value: 'SemVer',
                parent: null,
            },
            assignedTo: [],
        }];
        expect(functionCalls.map(f => {
            f.path = null;
            return f;
        })).toStrictEqual(expectedFunctionCalls);
    });
    it.skip('extracts new expressions as arguments', () => {
        const program = `
        foo(new Foo(bar, baz))
        `;
        const node = babelParser.parse(program);
        const functionCalls: FunctionCallType[] = extractFunctionCalls(node);
        const expectedFunctionCalls: FunctionCallType[] = [{
            path: null,
            argumentsByPosition: [{
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'bar',
                }, {
                    destructured: false,
                    parent: null,
                    value: 'baz',
                }]
            }],
            functionIdentifier: {
                destructured: false,
                value: 'foo',
                parent: null,
            },
            assignedTo: [],
        }, {
            path: null,
            argumentsByPosition: [{
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'bar',
                }]
            }, {
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'baz',
                }]
            }],
            functionIdentifier: {
                destructured: false,
                value: 'Foo',
                parent: null,
            },
            assignedTo: [],
        }];
        expect(functionCalls.map(f => {
            f.path = null;
            return f;
        })).toStrictEqual(expectedFunctionCalls);
    });
    it.skip('ignores arrow functions as arguments', () => {
        const program = `
        foo((a, b, c) => {
            return foobar + a
        })
        `;
        const node = babelParser.parse(program);
        const functionCalls: FunctionCallType[] = extractFunctionCalls(node);
        const expectedFunctionCalls: FunctionCallType[] = [{
            path: null,
            argumentsByPosition: [{
                identifiers: [],
            }],
            functionIdentifier: {
                destructured: false,
                parent: null,
                value: 'foo',
            },
            assignedTo: [],
        }];
        expect(functionCalls.map(f => {
            f.path = null;
            return f;
        })).toStrictEqual(expectedFunctionCalls);
    });
    it('ignores methods invoked on template literals', () => {
        const program = '`foo${bar}`.trim()';
        const node = babelParser.parse(program);
        const functionCalls: FunctionCallType[] = extractFunctionCalls(node);
        const expectedFunctionCalls: FunctionCallType[] = [];
        expect(functionCalls).toStrictEqual(expectedFunctionCalls);
    });
    it('extracts method calls in exported methods', () => {
        const program = `
        let localResource;
        module.exports = {
            create(required) {
                localResource = required;
            },
            read() {
                console.log(localResource);
            },
        };
        `;
        const node = babelParser.parse(program);
        const functionCalls: FunctionCallType[] = extractFunctionCalls(node);
        const expectedFunctionCalls: FunctionCallType[] = [{
            path: null,
            argumentsByPosition: [{
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'localResource',
                }],
            }],
            functionIdentifier: {
                destructured: false,
                value: 'log',
                parent: {
                    destructured: false,
                    parent: null,
                    value: 'console',
                },
            },
            assignedTo: [],
        }];
        expect(functionCalls.map(f => {
            f.path = null;
            return f;
        })).toStrictEqual(expectedFunctionCalls);
    });
});