import * as fs from 'fs';
import * as Path from 'path';
import {
    EdgeTypeEnum,
    OperationTypeEnum,
    ModuleNetType,
} from '../../translation/module-net-types';
import {
    extractInterface,
    generateClient,
    ExtractedClientType,
    combineExtractionsAndClients,
} from './simple-extractor';
import {
    ExtractedOperationType,
} from './types';

describe('simple-extractor', () => {
    describe('extractInterface', () => {
        it('extracts functions as root', async () => {
            const programPath = Path.resolve('./test-files/extracts-functions-as-root.js');
            const programFunction = `
                function foo(bar) {
                    // bar é a interface, só bar pode aparecer na operação
    
                    // a1 pode aparecer nos recursos/atributos
                    // acontece que a1 é local e não vai na operação, não faz diferença
                    const a1 = bar;
                    a2 = bar;
                    a3.a31 = bar;
    
                    // o que eu faço com b1? é local e não influencia nada
                    const b1 = a1;
                    b2 = a2;
                    b3.b31 = a3.a31;
    
                    // b3.b31 é a interface, b3.b31 pode aparecer na operação
                    return b3.b31;
                }
            `;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                let a2;
                const a3 = {};
                let b2;
                const b3 = {};
                ${programFunction}
                module.exports = foo;
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([{
                name: 'foo',
                code: programFunction.trim(),
            }]);
        });
        it('extracts arrow functions as root', async () => {
            const programPath = Path.resolve('./test-files/extracts-arrow-functions-as-root.js');
            const programFunction = `
                function foo(bar) {
                    // bar é a interface, só bar pode aparecer na operação
    
                    // a1 pode aparecer nos recursos/atributos
                    // acontece que a1 é local e não vai na operação, não faz diferença
                    const a1 = bar;
                    a2 = bar;
                    a3.a31 = bar;
    
                    // o que eu faço com b1? é local e não influencia nada
                    const b1 = a1;
                    b2 = a2;
                    b3.b31 = a3.a31;
    
                    // b3.b31 é a interface, b3.b31 pode aparecer na operação
                    return b3.b31;
                }
            `;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                let a2;
                const a3 = {};
                let b2;
                const b3 = {};
                ${programFunction}
                module.exports = bar => foo(bar);
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([{
                name: 'extracts-arrow-functions-as-root',
                code: 'bar => foo(bar)',
            }]);
        });
        it('extracts object methods as root, converting them to functions', async () => {
            const programPath = Path.resolve('./test-files/extracts-object-methods-as-root.js');
            const programFunction = `
                method(foobar) {}
            `;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                let a2;
                const a3 = {};
                let b2;
                const b3 = {};
                module.exports = {
                    ${programFunction}
                }
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([{
                name: 'method',
                code: 'function method(foobar) {}',
            }]);
        });
        it('extracts functions in objects', async () => {
            const programPath = Path.resolve('./test-files/extracts-functions-in-objects.js');
            const programFunction = `
                function foo(bar) {
                    // bar é a interface, só bar pode aparecer na operação
    
                    // a1 pode aparecer nos recursos/atributos
                    // acontece que a1 é local e não vai na operação, não faz diferença
                    const a1 = bar;
                    a2 = bar;
                    a3.a31 = bar;
    
                    // o que eu faço com b1? é local e não influencia nada
                    const b1 = a1;
                    b2 = a2;
                    b3.b31 = a3.a31;
    
                    // b3.b31 é a interface, b3.b31 pode aparecer na operação
                    return b3.b31;
                }
            `;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                let a2;
                const a3 = {};
                let b2;
                const b3 = {};
                ${programFunction}
                module.exports = { foo };
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([{
                name: 'foo',
                code: programFunction.trim(),
            }]);
        });
        it('extracts nested objects', async () => {
            const programPath = Path.resolve('./test-files/extracts-nested-objects.js');
            const programFunction = `function foo() {}`;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                ${programFunction}
                module.exports = {
                    obj: {
                        inner: {
                            foo,
                        },
                        foo,
                        bar: null,
                    },
                };
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([{
                name: 'obj-inner-foo',
                code: programFunction.trim(),
            }, {
                name: 'obj-foo',
                code: programFunction.trim(),
            }]);
        });
        it('ignores constants', async () => {
            const programPath = Path.resolve('./test-files/ignores-constants.js');
            const programFunction = `function foo() {}`;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                ${programFunction}
                module.exports = {
                    a: true,
                    foo,
                    b: 'bar',
                };
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([{
                name: 'foo',
                code: programFunction.trim(),
            }]);
        });
        it('ignores classes', async () => {
            const programPath = Path.resolve('./test-files/ignores-classes.js');
            const programFunction = `function foo() {}`;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                ${programFunction}
                module.exports = {
                    a: class A{},
                    foo,
                    b: class B{},
                };
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([{
                name: 'foo',
                code: programFunction.trim(),
            }]);
        });
        it('ignores arrays and sets', async () => {
            const programPath = Path.resolve('./test-files/ignores-arrays-and-sets.js');
            const programFunction = `function foo() {}`;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                ${programFunction}
                module.exports = {
                    a: new Set(),
                    foo,
                    b: ['bar'],
                };
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([{
                name: 'foo',
                code: programFunction.trim(),
            }]);
        });
        it('ignores null', async () => {
            const programPath = Path.resolve('./test-files/ignores-null.js');
            const programFunction = `function foo() {}`;
            const program = `
            // this file is automatically created by "simple-extractor.test.ts"
                ${programFunction}
                module.exports = null;
            `;
            await fs.promises.writeFile(programPath, program, 'utf-8');
            const extracted = extractInterface(programPath);
            expect(extracted).toStrictEqual([]);
        });
    });
    describe('generateClient', () => {
        it('generates a simple client', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                }],
                required: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-0',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-2',
                }],
            };
            const expected: ExtractedClientType = {
                forOperation: 'foo',
                requestResource: {
                    id: 'foo-request',
                    attributes: [
                        'foo-request.par-0',
                        'foo-request.par-1',
                        'foo-request.par-2',
                    ],
                },
                responseResource: {
                    id: 'foo-response',
                    attributes: [
                        'foo-response.return-0',
                        'foo-response.return-1',
                        'foo-response.return-2',
                    ],
                },
                required: [
                    'foo-response.return-0',
                    'foo-response.return-1',
                    'foo-response.return-2',
                ],
                generated: [
                    'foo-request',
                    'foo-response',
                    'foo-request.par-0',
                    'foo-request.par-1',
                    'foo-request.par-2',
                ],
            };
            expect(generateClient(extracted)).toStrictEqual(expected);
        });
        it('is the example we have in the dissertation', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1'],
                }],
                required: [
                    'foo.par-0', // used in declarator init
                    'foo.par-1', // used in return
                    'foo.par-2', // used in return
                ],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1'],
                mappings: [{
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-0',
                    toId: 'foo.return-0',
                }],
            };
            
            const expected: ExtractedClientType = {
                forOperation: 'foo',
                requestResource: {
                    id: 'foo-request',
                    attributes: [
                        'foo-request.par-0',
                        'foo-request.par-1',
                        'foo-request.par-2',
                    ],
                },
                responseResource: {
                    id: 'foo-response',
                    attributes: [
                        'foo-response.return-0',
                        'foo-response.return-1',
                    ],
                },
                required: [
                    'foo-response.return-0',
                    'foo-response.return-1',
                ],
                generated: [
                    'foo-request',
                    'foo-response',
                    'foo-request.par-0',
                    'foo-request.par-1',
                    'foo-request.par-2',
                ],
            };
            expect(generateClient(extracted)).toStrictEqual(expected);
        });
    });
    describe('combineExtractionsAndClients', () => {
        it('combines extracted operations and clients', () => {
            const operation: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                }],
                required: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-0',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-2',
                }],
            };
            const client: ExtractedClientType = {
                forOperation: 'foo',
                requestResource: {
                    id: 'foo-request',
                    attributes: [
                        'foo-request.par-0',
                        'foo-request.par-1',
                        'foo-request.par-2',
                    ],
                },
                responseResource: {
                    id: 'foo-response',
                    attributes: [
                        'foo-response.return-0',
                        'foo-response.return-1',
                        'foo-response.return-2',
                    ],
                },
                required: [
                    'foo-response.return-0',
                    'foo-response.return-1',
                    'foo-response.return-2',
                ],
                generated: [
                    'foo-request.par-0',
                    'foo-request.par-1',
                    'foo-request.par-2',
                ],
            };
            const expected: ModuleNetType = {
                name: 'mn',
                nodes: [{
                    id: 'foo-op',
                    generated: ['foo-op.foo'],
                    required: [
                        'foo-op.foo.par-0',
                        'foo-op.foo.par-1',
                        'foo-op.foo.par-2',
                    ],
                    resources: [{
                        id: 'foo-op.foo',
                        attributes: [
                            'foo-op.foo.par-0',
                            'foo-op.foo.par-1',
                            'foo-op.foo.par-2',
                            'foo-op.foo.return-0',
                            'foo-op.foo.return-1',
                            'foo-op.foo.return-2',
                        ],
                    }]
                }, {
                    id: 'foo-cl',
                    generated: [
                        'foo-cl.foo-request.par-0',
                        'foo-cl.foo-request.par-1',
                        'foo-cl.foo-request.par-2',
                    ],
                    required: [
                        'foo-cl.foo-response.return-0',
                        'foo-cl.foo-response.return-1',
                        'foo-cl.foo-response.return-2',
                    ],
                    resources: [{
                        id: 'foo-cl.foo-request',
                        attributes: [
                            'foo-cl.foo-request.par-0',
                            'foo-cl.foo-request.par-1',
                            'foo-cl.foo-request.par-2',
                        ],
                    }, {
                        id: 'foo-cl.foo-response',
                        attributes: [
                            'foo-cl.foo-response.return-0',
                            'foo-cl.foo-response.return-1',
                            'foo-cl.foo-response.return-2',
                        ],
                    }]
                }],
                edges: [{
                    id: 'foo',
                    type: OperationTypeEnum.GET,
                    fromId: 'foo-cl',
                    toId: 'foo-op',
                    graph: {
                        nodes: [{
                            id: 'foo-op.foo',
                        }, {
                            id: 'foo-cl.foo-request',
                        }, {
                            id: 'foo-cl.foo-response',
                        }],
                        edges: [{
                            id: 'foo-request',
                            fromId: 'foo-cl.foo-request',
                            toId: 'foo-op.foo',
                            type: EdgeTypeEnum.EDGE_INPUT,
                            attributeMapping: [{
                                fromId: 'foo-cl.foo-request.par-0',
                                toId: 'foo-op.foo.par-0',
                            }, {
                                fromId: 'foo-cl.foo-request.par-1',
                                toId: 'foo-op.foo.par-1',
                            }, {
                                fromId: 'foo-cl.foo-request.par-2',
                                toId: 'foo-op.foo.par-2',
                            }],
                        }, {
                            id: 'foo-response',
                            fromId: 'foo-op.foo',
                            toId: 'foo-cl.foo-response',
                            type: EdgeTypeEnum.EDGE_OUTPUT,
                            attributeMapping: [{
                                fromId: 'foo-op.foo.return-0',
                                toId: 'foo-cl.foo-response.return-0',
                            }, {
                                fromId: 'foo-op.foo.return-1',
                                toId: 'foo-cl.foo-response.return-1',
                            }, {
                                fromId: 'foo-op.foo.return-2',
                                toId: 'foo-cl.foo-response.return-2',
                            }],
                        }],
                    },
                }],
            };
            expect(combineExtractionsAndClients('mn', [operation], [client]))
                .toStrictEqual(expected);
        });
        it('ignores operations without matching clients, but keeps their resources', () => {
            const operation: ExtractedOperationType = {
                name: 'ope',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                }],
                required: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-0',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-2',
                }],
            };
            const expected: ModuleNetType = {
                name: 'mn',
                nodes: [{
                    id: 'ope-op',
                    generated: ['ope-op.foo'],
                    required: [
                        'ope-op.foo.par-0',
                        'ope-op.foo.par-1',
                        'ope-op.foo.par-2',
                    ],
                    resources: [{
                        id: 'ope-op.foo',
                        attributes: [
                            'ope-op.foo.par-0',
                            'ope-op.foo.par-1',
                            'ope-op.foo.par-2',
                            'ope-op.foo.return-0',
                            'ope-op.foo.return-1',
                            'ope-op.foo.return-2',
                        ],
                    }]
                }],
                edges: [],
            };
            expect(combineExtractionsAndClients('mn', [operation], []))
                .toStrictEqual(expected);
        });
        it('keeps resources of clients without matching operations', () => {
            const client: ExtractedClientType = {
                forOperation: 'foo',
                requestResource: {
                    id: 'foo-request',
                    attributes: [
                        'foo-request.par-0',
                        'foo-request.par-1',
                        'foo-request.par-2',
                    ],
                },
                responseResource: {
                    id: 'foo-response',
                    attributes: [
                        'foo-response.return-0',
                        'foo-response.return-1',
                        'foo-response.return-2',
                    ],
                },
                required: [
                    'foo-response.return-0',
                    'foo-response.return-1',
                    'foo-response.return-2',
                ],
                generated: [
                    'foo-request.par-0',
                    'foo-request.par-1',
                    'foo-request.par-2',
                ],
            };
            const expected: ModuleNetType = {
                name: 'mn',
                nodes: [{
                    id: 'foo-cl',
                    generated: [
                        'foo-cl.foo-request.par-0',
                        'foo-cl.foo-request.par-1',
                        'foo-cl.foo-request.par-2',
                    ],
                    required: [
                        'foo-cl.foo-response.return-0',
                        'foo-cl.foo-response.return-1',
                        'foo-cl.foo-response.return-2',
                    ],
                    resources: [{
                        id: 'foo-cl.foo-request',
                        attributes: [
                            'foo-cl.foo-request.par-0',
                            'foo-cl.foo-request.par-1',
                            'foo-cl.foo-request.par-2',
                        ],
                    }, {
                        id: 'foo-cl.foo-response',
                        attributes: [
                            'foo-cl.foo-response.return-0',
                            'foo-cl.foo-response.return-1',
                            'foo-cl.foo-response.return-2',
                        ],
                    }]
                }],
                edges: [],
            };
            expect(combineExtractionsAndClients('mn', [], [client]))
                .toStrictEqual(expected);
        });
        it('is the example we have in the dissertation', () => {
            const operation: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1'],
                }],
                required: [
                    'foo.par-0', // used in declarator init
                    'foo.par-1', // used in return
                    'foo.par-2', // used in return
                ],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1'],
                mappings: [{
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-0',
                    toId: 'foo.return-0',
                }],
            };
            
            const client: ExtractedClientType = {
                forOperation: 'foo',
                requestResource: {
                    id: 'foo-request',
                    attributes: [
                        'foo-request.par-0',
                        'foo-request.par-1',
                        'foo-request.par-2',
                    ],
                },
                responseResource: {
                    id: 'foo-response',
                    attributes: [
                        'foo-response.return-0',
                        'foo-response.return-1',
                    ],
                },
                required: [
                    'foo-response.return-0',
                    'foo-response.return-1',
                ],
                generated: [
                    'foo-request',
                    'foo-response',
                    'foo-request.par-0',
                    'foo-request.par-1',
                    'foo-request.par-2',
                ],
            };
            
            const expected: ModuleNetType = {
                name: 'mn',
                nodes: [{
                    id: 'foo-op',
                    generated: ['foo-op.foo'],
                    required: [
                        'foo-op.foo.par-0',
                        'foo-op.foo.par-1',
                        'foo-op.foo.par-2',
                    ],
                    resources: [{
                        id: 'foo-op.foo',
                        attributes: [
                            'foo-op.foo.par-0',
                            'foo-op.foo.par-1',
                            'foo-op.foo.par-2',
                            'foo-op.foo.return-0',
                            'foo-op.foo.return-1',
                        ],
                    }]
                }, {
                    id: 'foo-cl',
                    generated: [
                        'foo-cl.foo-request',
                        'foo-cl.foo-response',
                        'foo-cl.foo-request.par-0',
                        'foo-cl.foo-request.par-1',
                        'foo-cl.foo-request.par-2',
                    ],
                    required: [
                        'foo-cl.foo-response.return-0',
                        'foo-cl.foo-response.return-1',
                    ],
                    resources: [{
                        id: 'foo-cl.foo-request',
                        attributes: [
                            'foo-cl.foo-request.par-0',
                            'foo-cl.foo-request.par-1',
                            'foo-cl.foo-request.par-2',
                        ],
                    }, {
                        id: 'foo-cl.foo-response',
                        attributes: [
                            'foo-cl.foo-response.return-0',
                            'foo-cl.foo-response.return-1',
                        ],
                    }]
                }],
                edges: [{
                    id: 'foo',
                    type: OperationTypeEnum.GET,
                    fromId: 'foo-cl',
                    toId: 'foo-op',
                    graph: {
                        nodes: [{
                            id: 'foo-op.foo',
                        }, {
                            id: 'foo-cl.foo-request',
                        }, {
                            id: 'foo-cl.foo-response',
                        }],
                        edges: [{
                            id: 'foo-request',
                            fromId: 'foo-cl.foo-request',
                            toId: 'foo-op.foo',
                            type: EdgeTypeEnum.EDGE_INPUT,
                            attributeMapping: [{
                                fromId: 'foo-cl.foo-request.par-0',
                                toId: 'foo-op.foo.par-0',
                            }, {
                                fromId: 'foo-cl.foo-request.par-1',
                                toId: 'foo-op.foo.par-1',
                            }, {
                                fromId: 'foo-cl.foo-request.par-2',
                                toId: 'foo-op.foo.par-2',
                            }],
                        }, {
                            id: 'foo-response',
                            fromId: 'foo-op.foo',
                            toId: 'foo-cl.foo-response',
                            type: EdgeTypeEnum.EDGE_OUTPUT,
                            attributeMapping: [{
                                fromId: 'foo-op.foo.return-0',
                                toId: 'foo-cl.foo-response.return-0',
                            }, {
                                fromId: 'foo-op.foo.return-1',
                                toId: 'foo-cl.foo-response.return-1',
                            }],
                        }],
                    },
                }],
            };
            expect(combineExtractionsAndClients('mn', [operation], [client]))
                .toStrictEqual(expected);
        });
    });
});
