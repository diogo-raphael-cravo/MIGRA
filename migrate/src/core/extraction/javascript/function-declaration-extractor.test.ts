import * as babelParser from '@babel/parser';
import * as babelTraverse from '@babel/traverse';
import {
    findFirstChild,
} from '../compilers/babel-helpers';
import {
    FunctionDeclarationType,
    resolveFunctionDeclaration,
    pathToFunctionDeclaration,
} from './function-declaration-extractor';

function parse(program: string): babelTraverse.NodePath {
    const node = babelParser.parse(program);
    let path = null;
    babelTraverse.default(node, {
        Program: {
            enter(rootPath) {
                path = rootPath;
            },
        },
    });
    return path;
}

describe('function-declaration-extractor', () => {
    it('extract simple function', () => {
        const program = `
        function foobar(foo, bar) {
            return foo + bar;
        }
        `;
        const node = parse(program);
        const functionPath = findFirstChild(node, path => path.isFunctionDeclaration());
        const functionDeclaration: FunctionDeclarationType = pathToFunctionDeclaration(functionPath);
        const expectedFunctionDeclaration: FunctionDeclarationType = {
            functionIdentifier: {
                destructured: false,
                parent: null,
                value: 'foobar',
            },
            parametersByPosition: [{
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
            return: [{
                destructured: false,
                parent: null,
                value: 'foo',
            }, {
                destructured: false,
                parent: null,
                value: 'bar',
            }],
        };
        expect(functionDeclaration).toStrictEqual(expectedFunctionDeclaration);
    });
    it('extract arrow function', () => {
        const program = `
        (foo, bar) => {
            if (a) {
                return foo
            }
            return bar.baz;
        }
        `;
        const node = parse(program);
        const functionPath = findFirstChild(node, path => path.isArrowFunctionExpression());
        const functionDeclaration: FunctionDeclarationType = pathToFunctionDeclaration(functionPath);
        const expectedFunctionDeclaration: FunctionDeclarationType = {
            functionIdentifier: null,
            parametersByPosition: [{
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
            return: [{
                destructured: false,
                parent: null,
                value: 'foo',
            }, {
                destructured: false,
                parent: {
                    destructured: false,
                    parent: null,
                    value: 'bar',
                },
                value: 'baz',
            }],
        };
        expect(functionDeclaration).toStrictEqual(expectedFunctionDeclaration);
    });
    it('extract object method', () => {
        const program = `
        const foobar = {
            foo(bar) {
                return bar;
            }
        }
        `;
        const node = parse(program);
        const functionPath = findFirstChild(node, path => path.isObjectMethod());
        const functionDeclaration: FunctionDeclarationType = pathToFunctionDeclaration(functionPath);
        const expectedFunctionDeclaration: FunctionDeclarationType = {
            functionIdentifier: {
                destructured: false,
                parent: null,
                value: 'foo',
            },
            parametersByPosition: [{
                identifiers: [{
                    destructured: false,
                    parent: null,
                    value: 'bar',
                }],
            }],
            return: [{
                destructured: false,
                parent: null,
                value: 'bar',
            }],
        };
        expect(functionDeclaration).toStrictEqual(expectedFunctionDeclaration);
    });
    it('extract function defined in another node', () => {
        const program = `
        function barfoo() {
            return null;
        }
        function foobar(foo, bar) {
            return foo + bar;
        }
        const x = foobar;
        `;
        const node = parse(program);
        const foobarPath = <babelTraverse.NodePath> findFirstChild(node, path => path.isVariableDeclarator()).get('init');
        const functionDeclaration: FunctionDeclarationType = pathToFunctionDeclaration(resolveFunctionDeclaration(foobarPath));
        const expectedFunctionDeclaration: FunctionDeclarationType = {
            functionIdentifier: {
                destructured: false,
                parent: null,
                value: 'foobar',
            },
            parametersByPosition: [{
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
            return: [{
                destructured: false,
                parent: null,
                value: 'foo',
            }, {
                destructured: false,
                parent: null,
                value: 'bar',
            }],
        };
        expect(functionDeclaration).toStrictEqual(expectedFunctionDeclaration);
    });
});