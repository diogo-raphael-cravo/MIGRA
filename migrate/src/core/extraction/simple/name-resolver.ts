import * as t from '@babel/types';
import {
    TRAVERSED_TYPES,
    isSkipped,
    isTraversedLiteral,
} from './types';
import {
    ScopeTable,
    getEntryByName,
} from '../compilers/scope-table';

function getNamesIdentifier(node: t.Identifier, scope: ScopeTable<t.Node>): string[] {
    const entry = getEntryByName(node.name, scope);
    if (!entry) {
        return [];
    }
    return [node.name];
}
function getNamesCallExpression(node: t.CallExpression, scope: ScopeTable<t.Node>): string[] {
    return [
        ...getNames(node.callee, scope),
        ...node.arguments
            .map(arg => getNames(arg, scope))
            .reduce((prev, curr) => [...prev, ...curr], []),
    ];
}
function getNamesConditionalExpression(node: t.ConditionalExpression, scope: ScopeTable<t.Node>): string[] {
    return [
        ...getNames(node.test, scope),
        ...getNames(node.consequent, scope),
        ...getNames(node.alternate, scope),
    ];
}
function getNamesArrayExpression(node: t.ArrayExpression, scope: ScopeTable<t.Node>): string[] {
    return node.elements
        .map(element => getNames(element, scope))
        .reduce((prev, curr) => [...prev, ...curr], []);
}
function getNamesBinaryExpression(node: t.BinaryExpression, scope: ScopeTable<t.Node>): string[] {
    return [
        ...getNames(node.left, scope),
        ...getNames(node.right, scope),
    ];
}
function getNamesUnaryExpression(node: t.UnaryExpression, scope: ScopeTable<t.Node>): string[] {
    return getNames(node.argument, scope);
}
function getNamesUpdateExpression(node: t.UpdateExpression, scope: ScopeTable<t.Node>): string[] {
    return getNames(node.argument, scope);
}
function getNamesLogicalExpression(node: t.LogicalExpression, scope: ScopeTable<t.Node>): string[] {
    return [
        ...getNames(node.left, scope),
        ...getNames(node.right, scope),
    ];
}
function getNamesAwaitExpression(node: t.AwaitExpression, scope: ScopeTable<t.Node>): string[] {
    return getNames(node.argument, scope);
}
function getNamesMemberExpression(node: t.MemberExpression, scope: ScopeTable<t.Node>): string[] {
    return getNames(node.object, scope);
}
function getNamesTemplateLiteral(node: t.TemplateLiteral, scope: ScopeTable<t.Node>): string[] {
    return node.expressions
        .map(element => getNames(element, scope))
        .reduce((prev, curr) => [...prev, ...curr], []);
}
export function getNames(node: t.Node, scope: ScopeTable<t.Node>): string[] {
    if (isSkipped(node.type)) {
        return [];
    }
    if (isTraversedLiteral(node.type)) {
        return [];
    }
    switch (node.type) {
        case TRAVERSED_TYPES.Identifier:
            return getNamesIdentifier(<t.Identifier> node, scope);
        case TRAVERSED_TYPES.CallExpression:
            return getNamesCallExpression(<t.CallExpression> node, scope);
        case TRAVERSED_TYPES.ConditionalExpression:
            return getNamesConditionalExpression(<t.ConditionalExpression> node, scope);
        case TRAVERSED_TYPES.ArrayExpression:
            return getNamesArrayExpression(<t.ArrayExpression> node, scope);
        case TRAVERSED_TYPES.BinaryExpression:
            return getNamesBinaryExpression(<t.BinaryExpression> node, scope);
        case TRAVERSED_TYPES.UnaryExpression:
            return getNamesUnaryExpression(<t.UnaryExpression> node, scope);
        case TRAVERSED_TYPES.UpdateExpression:
            return getNamesUpdateExpression(<t.UpdateExpression> node, scope);
        case TRAVERSED_TYPES.LogicalExpression:
            return getNamesLogicalExpression(<t.LogicalExpression> node, scope);
        case TRAVERSED_TYPES.AwaitExpression:
            return getNamesAwaitExpression(<t.AwaitExpression> node, scope);
        case TRAVERSED_TYPES.MemberExpression:
            return getNamesMemberExpression(<t.MemberExpression> node, scope);
        case TRAVERSED_TYPES.TemplateLiteral:
            return getNamesTemplateLiteral(<t.TemplateLiteral> node, scope);
        case TRAVERSED_TYPES.ArrowFunctionExpression:
        case TRAVERSED_TYPES.ObjectExpression:
        case TRAVERSED_TYPES.FunctionExpression:
            return [];
        default:
            throw new Error(`unexpected type ${node.type}`);
    }
}
