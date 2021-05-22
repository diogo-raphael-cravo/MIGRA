import * as babelTraverse from '@babel/traverse';
import {
    File,
} from '@babel/types';
import { traverseFromRoot } from '../compilers/babel-helpers';
import {
    IdentifierType,
    extractIdentifierReads,
    extractIdentifierWrites,
} from './identifier-extractor';

export type ArgumentType = {
    identifiers: IdentifierType[],
};
export type FunctionCallType = {
    path: babelTraverse.NodePath,
    functionIdentifier: IdentifierType,
    argumentsByPosition: ArgumentType[],
    assignedTo: IdentifierType[],
};

function extractArgument(path: babelTraverse.NodePath): ArgumentType {
    return {
        identifiers: extractIdentifierReads(path),
    };
}

function extractIdentifierName(path: babelTraverse.NodePath): string {
    if (path.isIdentifier()) {
        return path.node.name;
    }
    // throw new Error(`unexpected type ${path.type}`);
    return 'unknownfunctionname';
}

function extractFunctionName(path: babelTraverse.NodePath): IdentifierType {
    if (path.isIdentifier()) {
        return {
            destructured: false,
            parent: null,
            value: extractIdentifierName(path),
        };
    }
    if (path.isMemberExpression()) {
        return {
            destructured: false,
            parent: extractFunctionName(<babelTraverse.NodePath> path.get('object')),
            value: extractIdentifierName(<babelTraverse.NodePath> path.get('property')),
        };
    }
    if (path.isNewExpression()) {
        return {
            destructured: false,
            parent: null,
            value: extractIdentifierName(<babelTraverse.NodePath> path.get('callee')),
        };
    }
    if (path.isRegExpLiteral()) {
        return {
            destructured: false,
            parent: null,
            value: path.node.pattern,
        };
    }
    throw new Error(`unexpected type ${path.type}`);
} 

function extractAssignments(path: babelTraverse.NodePath): IdentifierType[] {
    const reachedTopLevel = !path || path.isObjectMethod();
    if (reachedTopLevel) {
        return [];
    }
    const pathProvidedAsArgument = path.isCallExpression();
    if (pathProvidedAsArgument) {
        return [];
    }
    if (path.isVariableDeclaration()) {
        return extractIdentifierWrites(path);
    }
    if (path.isAssignmentExpression()) {
        return extractIdentifierWrites(path);
    }
    return extractAssignments(path.parentPath);
}

export function extractFunctionCalls(rootPath: File): FunctionCallType[] {
    const functionCalls: FunctionCallType[] = [];
    const state = {};
    const opts: babelTraverse.Visitor = {
        NewExpression: {
            enter(path) {
                const functionIdentifier: IdentifierType = extractFunctionName(<babelTraverse.NodePath> path.get('callee'));
                const thisCall: FunctionCallType = {
                    path: <babelTraverse.NodePath> path,
                    argumentsByPosition: path.get('arguments').map(argument => extractArgument(<babelTraverse.NodePath> argument)),
                    functionIdentifier,
                    assignedTo: extractAssignments(<babelTraverse.NodePath> path.parentPath),
                };
                functionCalls.push(thisCall);
            },
        },
        CallExpression: {
            enter(path) {
                // if callee is expression, just forget this one
                if (path.get('callee').isCallExpression()) {
                    // foo()(), forget "()"
                    return;
                }
                if (path.get('callee').isMemberExpression()) {
                    const object = <babelTraverse.NodePath> path.get('callee').get('object');
                    if (object.isCallExpression()) {
                        // foo.bar().baz(), forget ".baz()"
                        return;
                    }
                    if (object.isTemplateLiteral()) {
                        // `foo${bar}`.trim(), forget ".trim()"
                        return;
                    }
                }
                const functionIdentifier: IdentifierType = extractFunctionName(<babelTraverse.NodePath> path.get('callee'));
                const thisCall: FunctionCallType = {
                    path: <babelTraverse.NodePath> path,
                    argumentsByPosition: path.get('arguments').map(argument => extractArgument(<babelTraverse.NodePath> argument)),
                    functionIdentifier,
                    assignedTo: extractAssignments(<babelTraverse.NodePath> path.parentPath),
                };
                functionCalls.push(thisCall);
            },
        },
    };
    traverseFromRoot(rootPath, opts, state);
    return functionCalls;
}