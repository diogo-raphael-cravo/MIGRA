import { extractModuleNetFromPrograms } from './javascript-extractor';

describe.skip('javascript-extractor', () => {
    it('extracts empty module', () => {
        const filenamesToPrograms = {
            index: ' ',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [],
                }, {
                    id: 'index.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }],
            edges: [],
        });
    });
    it('extracts global resources', () => {
        const filenamesToPrograms = {
            index: 'let alet, otherlet;var avar, othervar;const aconst = 1\nconst otherconst = 1;\n'
                + 'let { destructured } = { destructured: 1 };',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [
                        'index.global.alet',
                        'index.global.otherlet',
                        'index.global.avar',
                        'index.global.othervar',
                        'index.global.aconst',
                        'index.global.otherconst',
                        'index.global.destructured',
                    ],
                }, {
                    id: 'index.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }],
            edges: [],
        });
    });
    it('ignores classes (for now)', () => {
        const filenamesToPrograms = {
            index: 'class Foo { f() { let x = 1; } }',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [],
                }, {
                    id: 'index.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }],
            edges: [],
        });
    });
    it('extracts exports', () => {
        const filenamesToPrograms = {
            index: 'module.exports = 1;module.exports.a = 1;',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [],
                }, {
                    id: 'index.public',
                    attributes: [
                        'index.public.value',
                        'index.public.a',
                    ],
                }],
                required: [],
                generated: [],
            }],
            edges: [],
        });
    });
    it('extracts object exports', () => {
        const filenamesToPrograms = {
            index: 'module.exports = { a: 1, b: 2 }',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [],
                }, {
                    id: 'index.public',
                    attributes: [
                        'index.public.a',
                        'index.public.b',
                    ],
                }],
                required: [],
                generated: [],
            }],
            edges: [],
        });
    });
    it('extracts requires, processing each file once', () => {
        const filenamesToPrograms = {
            index: `module.exports = { a: require('foo'), b: require('foo') }`,
            foo: 'const x = 1;module.exports = 1',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [],
                }, {
                    id: 'index.public',
                    attributes: [
                        'index.public.a',
                        'index.public.b',
                    ],
                }],
                required: [],
                generated: [],
            }, {
                id: 'foo',
                resources: [{
                    id: 'foo.global',
                    attributes: ['foo.global.x'],
                }, {
                    id: 'foo.public',
                    attributes: ['foo.public.value'],
                }],
                required: [],
                generated: [],
            }],
            edges: [],
        });
    });
    it('extracts requires ignoring pathnames', () => {
        const filenamesToPrograms = {
            index: `module.exports = { a: require('./foo') }`,
            foo: `require('folder/foo');`,
            'folder/foo': `require('./bar');`,
            'folder/bar': 'let x = 1;',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [],
                }, {
                    id: 'index.public',
                    attributes: [
                        'index.public.a',
                    ],
                }],
                required: [],
                generated: [],
            }, {
                id: 'foo',
                resources: [{
                    id: 'foo.global',
                    attributes: [],
                }, {
                    id: 'foo.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }, {
                id: 'folder/foo',
                resources: [{
                    id: 'folder/foo.global',
                    attributes: [],
                }, {
                    id: 'folder/foo.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }, {
                id: 'folder/bar',
                resources: [{
                    id: 'folder/bar.global',
                    attributes: ['folder/bar.global.x'],
                }, {
                    id: 'folder/bar.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }],
            edges: [],
        });
    });
    it('extracts requires ignoring loops', () => {
        const filenamesToPrograms = {
            a: `require('b');require('c')`,
            b: `require('a');require('c')`,
            c: `require('a');require('b')`,
        };
        const moduleNet = extractModuleNetFromPrograms('a', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'a',
                resources: [{
                    id: 'a.global',
                    attributes: [],
                }, {
                    id: 'a.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }, {
                id: 'b',
                resources: [{
                    id: 'b.global',
                    attributes: [],
                }, {
                    id: 'b.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }, {
                id: 'c',
                resources: [{
                    id: 'c.global',
                    attributes: [],
                }, {
                    id: 'c.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }],
            edges: [],
        });
    });
    it('extracts global functions', () => {
        const filenamesToPrograms = {
            index: 'function f(a){let b = g(a); return b;}',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [],
                }, {
                    id: 'index.public',
                    attributes: [],
                }, {
                    id: 'index.f',
                    attributes: [
                        'index.f.b',
                        'index.f.a',
                    ],
                }],
                required: [],
                generated: [],
            }, {
                id: '?index',
                resources: [{
                    id: '?index.global',
                    attributes: [],
                }, {
                    id: '?index.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }],
            edges: [{
                id: 'f',
                fromId: '?index',
                toId: 'index',
                type: 'GET',
                graph: {
                    nodes: [],
                    edges: [],
                },
            }],
        });
    });
    it('extracts global arrow functions', () => {
        const filenamesToPrograms = {
            index: 'const f = (a) => {let b = g(a); return b;}',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [],
                }, {
                    id: 'index.public',
                    attributes: [],
                }, {
                    id: 'index.f',
                    attributes: [
                        'index.f.a',
                        'index.f.b',
                    ],
                }],
                required: [],
                generated: [],
            }, {
                id: '?index',
                resources: [{
                    id: '?index.global',
                    attributes: [],
                }, {
                    id: '?index.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }],
            edges: [{
                id: 'f',
                fromId: '?index',
                toId: 'index',
                type: 'GET',
                graph: {
                    nodes: [],
                    edges: [],
                },
            }],
        });
    });
    it.skip('extracts exported arrow functions', () => {
        const filenamesToPrograms = {
            index: 'const f = (a) => {let b = g(a); return b;}',
        };
        const moduleNet = extractModuleNetFromPrograms('index', filenamesToPrograms, 'x');
        expect(moduleNet).toEqual({
            name: 'x',
            nodes: [{
                id: 'index',
                resources: [{
                    id: 'index.global',
                    attributes: [
                        'index.global.f',
                    ],
                }, {
                    id: 'index.public',
                    attributes: [],
                }, {
                    id: 'index.f',
                    attributes: [
                        'index.f.a',
                        'index.f.b',
                    ],
                }],
                required: [],
                generated: [],
            }, {
                id: '?index',
                resources: [{
                    id: '?index.global',
                    attributes: [],
                }, {
                    id: '?index.public',
                    attributes: [],
                }],
                required: [],
                generated: [],
            }],
            edges: [{
                id: 'f',
                fromId: '?index',
                toId: 'index',
                type: 'GET',
                graph: {
                    nodes: [],
                    edges: [],
                },
            }],
        });
    });
});