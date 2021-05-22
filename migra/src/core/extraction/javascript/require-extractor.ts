import { deduplicate } from '../../helpers/sets';
import * as babelTraverse from '@babel/traverse';
import {
    File,
    CallExpression,
    StringLiteral,
    Identifier,
    Statement,
    ObjectExpression,
} from '@babel/types';
import {
    IdentifierType,
    extractIdentifierWrites,
} from './identifier-extractor';
import { traverseFromRoot } from '../compilers/babel-helpers';

export type RequireType = {
    identifier: IdentifierType,
    required: string,
};

function removeRequire(identifier: IdentifierType): IdentifierType {
    if (null === identifier || undefined === identifier) {
        return null;
    }
    if ('require' === identifier.value) {
        return null;
    }
    return {
        ...identifier,
        parent: removeRequire(identifier.parent),
    };
}

export function getRequire(path: babelTraverse.NodePath): RequireType {
    if (!path.isCallExpression()) {
        return null;
    }
    const callExpression: CallExpression = <CallExpression> path.node;
    const callee: Identifier = <Identifier> callExpression.callee;
    if ('require' !== callee.name) {
        return null;
    }
    const firstArgument: StringLiteral = <StringLiteral> callExpression.arguments[0];
    const statement: babelTraverse.NodePath<Statement> = path.getStatementParent();
    const identifiers = extractIdentifierWrites<Statement>(statement);
    let position = -1;
    if (path.parentPath.isObjectProperty() && path.parentPath.parentPath.isObjectExpression()) {
        const objExpression: babelTraverse.NodePath<ObjectExpression> = path.parentPath.parentPath;
        position = objExpression.node.properties
            .findIndex(property => 'ObjectProperty' === property.type && property.value === path.node);
        if (-1 === position) {
            throw new Error('cannot determine position for require');
        }
    } else {
        position = 0;
    }
    return {
        identifier: removeRequire(identifiers[position]),
        required: firstArgument.value,
    };
}

export function extractRequires(program: File): RequireType[] {
    const requires: RequireType[] = [];
    traverseFromRoot(program, {
        CallExpression: {
            enter(path) {
                const required = getRequire(path);
                if (null !== required) {
                    requires.push(required);
                }
        }}
    });
    return deduplicate(requires);
}

export function extractRequireNames(program: File): string[] {
    return deduplicate(extractRequires(program)
        .map(({ required }) => required));
}
