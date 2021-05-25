import * as babelTraverse from '@babel/traverse';
import {
    extractIdentifierReads,
    IdentifierType,
} from './identifier-extractor';
import {
    findAllChildren,
} from '../compilers/babel-helpers';

export type ParameterType = {
    identifiers: IdentifierType[],
};
export type FunctionDeclarationType = {
    functionIdentifier: IdentifierType,
    parametersByPosition: ParameterType[],
    // identifiersRequired: IdentifierType[],
    // identifiersGenerated: IdentifierType[],
    return: IdentifierType[],
};
function pathToFunctionParameter(path: babelTraverse.NodePath): ParameterType {
    return {
        identifiers: extractIdentifierReads(path),
    };
}

function extractReturnIdentifiers(path: babelTraverse.NodePath): IdentifierType[] {
    const argument = <babelTraverse.NodePath> path.get('argument');
    return extractIdentifierReads(argument);
}

export function resolveFunctionDeclaration(path: babelTraverse.NodePath): babelTraverse.NodePath {
    if (path.isIdentifier()) {
        // try to find declaration in scope
        const binding = path.scope.getOwnBinding(path.node.name);
        const declarationNotFound = !binding || !binding.path;
        if (declarationNotFound) {
            return path;
        }
        return resolveFunctionDeclaration(binding.path);
    }
    if (path.isExpressionStatement()) {
        const expression = <babelTraverse.NodePath> path.get('expression');
        return expression;
    }
    if (path.isVariableDeclarator()) {
        const init = <babelTraverse.NodePath> path.get('init');
        return init;
    }
    return path;
}

export function pathToFunctionDeclaration(path: babelTraverse.NodePath): FunctionDeclarationType {
    if (path.isObjectMethod() || path.isFunctionDeclaration()
        || path.isArrowFunctionExpression() || path.isFunctionExpression()) {
        const params = <babelTraverse.NodePath[]> path.get('params');
        const returnStatements = findAllChildren(path, path => path.isReturnStatement());
        let functionIdentifier = null;
        if (path.isObjectMethod()) {
            const key = <babelTraverse.NodePath> path.get('key');
            if (!key.isIdentifier()) {
                throw new Error('unexpected object method key type');
            }
            functionIdentifier = {
                destructured: false,
                parent: null,
                value: key.node.name,
            };
        } else if (path.isFunctionDeclaration()) {
            functionIdentifier = {
                destructured: false,
                parent: null,
                value: path.node.id.name,
            };
        }
        return {
            functionIdentifier,
            parametersByPosition: params.map(param => pathToFunctionParameter(param)),
            return: returnStatements.map(returnStatement => extractReturnIdentifiers(returnStatement))
                .filter(x => x)
                .reduce((prev, curr) => [...prev, ...curr], []),
        };
    }
    return null;
}