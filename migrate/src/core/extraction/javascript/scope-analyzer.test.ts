import * as babelParser from '@babel/parser';
import {
    getPath,
    findFirstChild,
} from '../compilers/babel-helpers';
import {
    getScopeName,
    getIdentifierScopeName,
} from './scope-analyzer';
import {
    IdentifierType,
} from './identifier-extractor';

describe('scope-analyzer', () => {
    it('extracts scope name', () => {
        const program = `
        function foo() {
            function bar() {
                f();
            }
        }
        `;
        const path = getPath(babelParser.parse(program));
        const childPath = findFirstChild(path, (candidate) => candidate.isCallExpression());
        const actual = getScopeName(childPath.scope);
        const expected = 'global-foo-bar';
        expect(actual).toStrictEqual(expected);
    });
    it('extracts scope name from object methods', () => {
        const program = `
        module.exports = {
            foo() {
                f();
            },
        };
        `;
        const path = getPath(babelParser.parse(program));
        const childPath = findFirstChild(path, (candidate) => candidate.isCallExpression());
        const actual = getScopeName(childPath.scope);
        const expected = 'global-foo';
        expect(actual).toStrictEqual(expected);
    });
    it('prefixes with global scope identifier', () => {
        const program = `
        const a = 1;
        function foo(b) {
            f(a);
        }
        `;
        const path = getPath(babelParser.parse(program));
        const childPath = findFirstChild(path, (candidate) => candidate.isCallExpression());
        const identifier: IdentifierType = {
            destructured: false,
            parent: null,
            value: 'a',
        };
        const actual = getIdentifierScopeName(identifier, childPath.scope);
        const expected = 'global';
        expect(actual).toStrictEqual(expected);
    });
    it('prefixes with function scope identifier', () => {
        const program = `
        function foo(b) {
            f(b);
        }
        `;
        const path = getPath(babelParser.parse(program));
        const childPath = findFirstChild(path, (candidate) => candidate.isCallExpression());
        const identifier: IdentifierType = {
            destructured: false,
            parent: null,
            value: 'b',
        };
        const actual = getIdentifierScopeName(identifier, childPath.scope);
        const expected = 'global-foo';
        expect(actual).toStrictEqual(expected);
    });
    it('prefixes with function scope identifier runtime identifier', () => {
        const program = `
        function foo() {
            f(process.env.foobar);
        }
        `;
        const path = getPath(babelParser.parse(program));
        const childPath = findFirstChild(path, (candidate) => candidate.isCallExpression());
        const identifier: IdentifierType = {
            destructured: false,
            parent: {
                destructured: false,
                parent: {
                    destructured: false,
                    parent: null,
                    value: 'process',
                },
                value: 'env',
            },
            value: 'FOOBAR',
        };
        const actual = getIdentifierScopeName(identifier, childPath.scope);
        const expected = 'runtime';
        expect(actual).toStrictEqual(expected);
    });
    it('prefixes with function scope identifier literal', () => {
        const program = 'const src = exports.src = [];\n'
            + 'function foo() {f(`(${src[t.NUMERICIDENTIFIER]})\\.`);}';
        const path = getPath(babelParser.parse(program));
        const childPath = findFirstChild(path, (candidate) => candidate.isCallExpression());
        const identifier: IdentifierType = {
            destructured: false,
            parent: {
                destructured: false,
                parent: null,
                value: 'src',
            },
            value: 'NUMERICIDENTIFIER',
        };
        const actual = getIdentifierScopeName(identifier, childPath.scope);
        const expected = 'global';
        expect(actual).toStrictEqual(expected);
    });
    it('prefixes with function scope nested arrow function', () => {
        const program = `
            const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
        `;
        const path = getPath(babelParser.parse(program));
        const childPath = findFirstChild(path, (candidate) => candidate.isCallExpression()
            && candidate.node.callee['name'] === 'compareBuild');
        const identifier: IdentifierType = {
            destructured: false,
            parent: null,
            value: 'a',
        };
        const actual = getIdentifierScopeName(identifier, childPath.scope);
        const expected = 'global-arrowfn-arrowfn';
        expect(actual).toStrictEqual(expected);
    });
});