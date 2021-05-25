import * as t from '@babel/types';
import {
    getNames,
} from './name-resolver';
import {
    ScopeTable,
    ScopeTableEntry,
    pushEntry,
    pushScope,
} from '../compilers/scope-table';

function makeScopeTable(...names: string[]): ScopeTable<t.Node> {
    const node: t.ArrowFunctionExpression = ArrowFunctionExpression({
        body: null,
        expression: null,
        params: null,
    });
    const scope = pushScope<t.Node>(node);
    names.forEach(name => {
        const entry: ScopeTableEntry<t.Node> = {
            name,
            alias: 'alias',
            node: Identifier({ name }),
        };
        pushEntry(entry, scope);
    });
    return scope;
}

type omittedProps = 'leadingComments'
    | 'innerComments'
    | 'trailingComments'
    | 'start'
    | 'end'
    | 'type'
    | 'loc';

function decorateNode<T>(node: any): T {
    return {
        ...node,
        leadingComments: null,
        innerComments: null,
        trailingComments: null,
        start: null,
        end: null,
        loc: null,
    };
}
function Identifier(node: Omit<t.Identifier, omittedProps>): t.Identifier {
    return decorateNode({
        ...node,
        type: 'Identifier',
    });
}
function CallExpression(node: Omit<t.CallExpression, omittedProps>): t.CallExpression {
    return decorateNode({
        ...node,
        type: 'CallExpression',
    });
}
function ArrowFunctionExpression(node: Omit<t.ArrowFunctionExpression, omittedProps>): t.ArrowFunctionExpression {
    return decorateNode({
        ...node,
        type: 'ArrowFunctionExpression',
    });
}
function ConditionalExpression(node: Omit<t.ConditionalExpression, omittedProps>): t.ConditionalExpression {
    return decorateNode({
        ...node,
        type: 'ConditionalExpression',
    });
}
function RegExpLiteral(node: Omit<t.RegExpLiteral, omittedProps>): t.RegExpLiteral {
    return decorateNode({
        ...node,
        type: 'RegExpLiteral',
    });
}
function NullLiteral(node: Omit<t.NullLiteral, omittedProps>): t.NullLiteral {
    return decorateNode({
        ...node,
        type: 'NullLiteral',
    });
}
function StringLiteral(node: Omit<t.StringLiteral, omittedProps>): t.StringLiteral {
    return decorateNode({
        ...node,
        type: 'StringLiteral',
    });
}
function BooleanLiteral(node: Omit<t.BooleanLiteral, omittedProps>): t.BooleanLiteral {
    return decorateNode({
        ...node,
        type: 'BooleanLiteral',
    });
}
function NumericLiteral(node: Omit<t.NumericLiteral, omittedProps>): t.NumericLiteral {
    return decorateNode({
        ...node,
        type: 'NumericLiteral',
    });
}
function BigIntLiteral(node: Omit<t.BigIntLiteral, omittedProps>): t.BigIntLiteral {
    return decorateNode({
        ...node,
        type: 'BigIntLiteral',
    });
}
function DecimalLiteral(node: Omit<t.DecimalLiteral, omittedProps>): t.DecimalLiteral {
    return decorateNode({
        ...node,
        type: 'DecimalLiteral',
    });
}
function ArrayExpression(node: Omit<t.ArrayExpression, omittedProps>): t.ArrayExpression {
    return decorateNode({
        ...node,
        type: 'ArrayExpression',
    });
}
function ThisExpression(node: Omit<t.ThisExpression, omittedProps>): t.ThisExpression {
    return decorateNode({
        ...node,
        type: 'ThisExpression',
    });
}
function BinaryExpression(node: Omit<t.BinaryExpression, omittedProps>): t.BinaryExpression {
    return decorateNode({
        ...node,
        type: 'BinaryExpression',
    });
}
function UnaryExpression(node: Omit<t.UnaryExpression, omittedProps>): t.UnaryExpression {
    return decorateNode({
        ...node,
        type: 'UnaryExpression',
    });
}
function UpdateExpression(node: Omit<t.UpdateExpression, omittedProps>): t.UpdateExpression {
    return decorateNode({
        ...node,
        type: 'UpdateExpression',
    });
}
function LogicalExpression(node: Omit<t.LogicalExpression, omittedProps>): t.LogicalExpression {
    return decorateNode({
        ...node,
        type: 'LogicalExpression',
    });
}
function AwaitExpression(node: Omit<t.AwaitExpression, omittedProps>): t.AwaitExpression {
    return decorateNode({
        ...node,
        type: 'AwaitExpression',
    });
}
function MemberExpression(node: Omit<t.MemberExpression, omittedProps>): t.MemberExpression {
    return decorateNode({
        ...node,
        type: 'MemberExpression',
    });
}
function FunctionExpression(node: Omit<t.FunctionExpression, omittedProps>): t.FunctionExpression {
    return decorateNode({
        ...node,
        type: 'FunctionExpression',
    });
}
function TemplateLiteral(node: Omit<t.TemplateLiteral, omittedProps>): t.TemplateLiteral {
    return decorateNode({
        ...node,
        type: 'TemplateLiteral',
    });
}
function BlockStatement(node: Omit<t.BlockStatement, omittedProps>): t.BlockStatement {
    return decorateNode({
        ...node,
        type: 'BlockStatement',
    });
}
function AssignmentExpression(node: Omit<t.AssignmentExpression, omittedProps>): t.AssignmentExpression {
    return decorateNode({
        ...node,
        type: 'AssignmentExpression',
    });
}

describe('name-resolver', () => {
    describe('getNames', () => {
        describe('remaining expressions (8/8)', () => {
            it('CallExpression', () => {
                const node: t.CallExpression = CallExpression({
                    callee: Identifier({ name: 'c' }),
                    arguments: [
                        Identifier({ name: 'arg' }),
                    ],
                });
                const names = getNames(node, makeScopeTable('c', 'arg'));
                expect(names).toStrictEqual(['c', 'arg']);
            });
            it('ArrowFunctionExpression', () => {
                const node: t.ArrowFunctionExpression = ArrowFunctionExpression({
                    body: null,
                    expression: null,
                    params: null,
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
            it('ConditionalExpression', () => {
                const node: t.ConditionalExpression = ConditionalExpression({
                    test: Identifier({ name: 't' }),
                    consequent: Identifier({ name: 'c' }),
                    alternate: Identifier({ name: 'a' }),
                });
                const names = getNames(node, makeScopeTable('t', 'c', 'a'));
                expect(names).toStrictEqual(['t', 'c', 'a']);
            });
            it('ArrayExpression', () => {
                const node: t.ArrayExpression = ArrayExpression({
                    elements: [Identifier({ name: 'foo' })]
                });
                const names = getNames(node, makeScopeTable('foo'));
                expect(names).toStrictEqual(['foo']);
            });
            it('AwaitExpression', () => {
                const node: t.AwaitExpression = AwaitExpression({
                    argument: Identifier({ name: 'foo' }),
                });
                const names = getNames(node, makeScopeTable('foo'));
                expect(names).toStrictEqual(['foo']);
            });
            it('MemberExpression', () => {
                const node: t.MemberExpression = MemberExpression({
                    computed: true,
                    object: Identifier({ name: 'foo' }),
                    property: Identifier({ name: 'bar' }),
                });
                const names = getNames(node, makeScopeTable('foo'));
                expect(names).toStrictEqual(['foo']);
            });
            it('FunctionExpression', () => {
                const node: t.FunctionExpression = FunctionExpression({
                    body: BlockStatement({
                        body: [],
                        directives: [],
                    }),
                    params: [],
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
            it('TemplateLiteral', () => {
                const node: t.TemplateLiteral = TemplateLiteral({
                    expressions: [
                        Identifier({ name: 'foo' }),
                        Identifier({ name: 'bar' }),
                    ],
                    quasis: [],
                });
                const names = getNames(node, makeScopeTable('foo', 'bar'));
                expect(names).toStrictEqual(['foo', 'bar']);
            });
        });
        describe('operator expressions (5/5)', () => {
            it('BinaryExpression', () => {
                const node: t.BinaryExpression = BinaryExpression({
                    left: Identifier({ name: 'left' }),
                    operator: '*',
                    right: Identifier({ name: 'right' }),
                });
                const names = getNames(node, makeScopeTable('left', 'right'));
                expect(names).toStrictEqual(['left', 'right']);
            });
            it('UnaryExpression', () => {
                const node: t.UnaryExpression = UnaryExpression({
                    argument: Identifier({ name: 'foo' }),
                    operator: '!',
                    prefix: true,
                });
                const names = getNames(node, makeScopeTable('foo'));
                expect(names).toStrictEqual(['foo']);
            });
            it('UpdateExpression', () => {
                const node: t.UpdateExpression = UpdateExpression({
                    argument: Identifier({ name: 'foo' }),
                    operator: '++',
                    prefix: true,
                });
                const names = getNames(node, makeScopeTable('foo'));
                expect(names).toStrictEqual(['foo']);
            });
            it('LogicalExpression', () => {
                const node: t.LogicalExpression = LogicalExpression({
                    left: Identifier({ name: 'left' }),
                    operator: '&&',
                    right: Identifier({ name: 'right' }),
                });
                const names = getNames(node, makeScopeTable('left', 'right'));
                expect(names).toStrictEqual(['left', 'right']);
            });
            it('AssignmentExpression', () => {
                const node: t.AssignmentExpression = AssignmentExpression({
                    left: Identifier({ name: 'left' }),
                    operator: '&&',
                    right: Identifier({ name: 'right' }),
                });
                expect(() => getNames(node, makeScopeTable('left', 'right'))).toThrow();
            });
        });
        describe('remaining nodes (1/1)', () => {
            it('Identifier', () => {
                const node: t.Identifier = Identifier({
                    name: 'foo',
                });
                const names = getNames(node, makeScopeTable('foo'));
                expect(names).toStrictEqual(['foo']);
            });
        });
        describe('literals (7/7)', () => {
            it('RegExpLiteral', () => {
                const node: t.RegExpLiteral = RegExpLiteral({
                    flags: null,
                    pattern: null,
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
            it('NullLiteral', () => {
                const node: t.NullLiteral = NullLiteral({});
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
            it('StringLiteral', () => {
                const node: t.StringLiteral = StringLiteral({
                    value: '',
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
            it('BooleanLiteral', () => {
                const node: t.BooleanLiteral = BooleanLiteral({
                    value: true,
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
            it('NumericLiteral', () => {
                const node: t.NumericLiteral = NumericLiteral({
                    value: 1,
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
            it('BigIntLiteral', () => {
                const node: t.BigIntLiteral = BigIntLiteral({
                    value: '1',
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
            it('DecimalLiteral', () => {
                const node: t.DecimalLiteral = DecimalLiteral({
                    value: '1',
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
        });
        describe('ignore cases', () => {
            it('ThisExpression', () => {
                const node: t.ThisExpression = ThisExpression({});
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
        });
        describe('ignores names not in scope', () => {
            it('Identifier', () => {
                const node: t.Identifier = Identifier({
                    name: 'not-in-scope',
                });
                const names = getNames(node, makeScopeTable());
                expect(names).toStrictEqual([]);
            });
        });
    });
});
