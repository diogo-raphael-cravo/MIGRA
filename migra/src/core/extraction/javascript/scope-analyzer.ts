import * as babelTraverse from '@babel/traverse';
import {
    Node,
} from '@babel/types';
import {
    IdentifierType,
    getTopParent,
} from './identifier-extractor';

function getBlockName(block: Node): string {
    if ('Program' === block.type) {
        return 'global';
    }
    if ('ArrowFunctionExpression' === block.type) {
        return 'arrowfn';
    }
    if ('WhileStatement' === block.type) {
        return 'whilestatement';
    }
    if ('ForStatement' === block.type) {
        return 'forstatement';
    }
    if ('ForOfStatement' === block.type) {
        return 'forofstatement';
    }
    if ('BlockStatement' === block.type) {
        return 'blockstatement';
    }
    if ('FunctionDeclaration' === block.type
        || 'FunctionExpression' === block.type) {
        return block.id.name;
    }
    if ('ObjectMethod' === block.type) {
        if ('Identifier' === block.key.type) {
            return block.key.name;
        }
        throw new Error(`unexpected block key type ${block.key.type}`);
    }
    throw new Error(`unexpected block type ${block.type}`);
}

export function getScopeName(scope: babelTraverse.Scope, joinString = '-'): string {
    if (!scope.parent) {
        return getBlockName(scope.block);
    }
    return `${getScopeName(scope.parent, joinString)}${joinString}${getBlockName(scope.block)}`;
}

function isRuntimeVariable(identifier: IdentifierType): boolean {
    return 'process' === getTopParent(identifier).value
        || 'module' === getTopParent(identifier).value;
}

export function getIdentifierScopeName(identifier: IdentifierType, scope: babelTraverse.Scope): string {
    if (!scope) {
        if (identifier && isRuntimeVariable(identifier)) {
            return 'runtime';
        }
        return 'unknown';
    }
    if (scope.getOwnBinding(getTopParent(identifier).value)) {
        return getScopeName(scope);
    }
    return getIdentifierScopeName(identifier, scope.parent);
}