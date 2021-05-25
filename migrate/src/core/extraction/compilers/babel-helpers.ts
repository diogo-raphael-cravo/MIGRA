import * as babelTraverse from '@babel/traverse';

const IGNORE_CALLBACK = {
    enter(path) {
        path.skip();
    },
};
const IGNORED_TYPES_VISITOR: babelTraverse.Visitor = {
    // We ignore classes, thus ignoring 10 node types
    // Class: IGNORE_CALLBACK, // causes out of heap space TODO: investigate
    ClassBody: IGNORE_CALLBACK,
    ClassMethod: IGNORE_CALLBACK,
    ClassPrivateMethod: IGNORE_CALLBACK,
    ClassProperty: IGNORE_CALLBACK,
    ClassPrivateProperty: IGNORE_CALLBACK,
    StaticBlock: IGNORE_CALLBACK,
    ClassDeclaration: IGNORE_CALLBACK,
    ClassExpression: IGNORE_CALLBACK,
    MetaProperty: IGNORE_CALLBACK,
    
    // We ignore other node types more commonly used in the context of classes
    Super: IGNORE_CALLBACK,
    ThisExpression: IGNORE_CALLBACK,
    PrivateName: IGNORE_CALLBACK,
    NewExpression: IGNORE_CALLBACK,
    
    // We ignore seldom used keywords
    WithStatement: IGNORE_CALLBACK,
    YieldExpression: IGNORE_CALLBACK,
    
    // We ignore latest features and seldom used syntaxes
    SequenceExpression: IGNORE_CALLBACK,
    RecordExpression: IGNORE_CALLBACK,
    TupleExpression: IGNORE_CALLBACK,
    ArgumentPlaceholder: IGNORE_CALLBACK,
    OptionalMemberExpression: IGNORE_CALLBACK,
    OptionalCallExpression: IGNORE_CALLBACK,
    DoExpression: IGNORE_CALLBACK,
    BindExpression: IGNORE_CALLBACK,
    
    // We ignore syntaxes that have empty meaning for our purposes
    DebuggerStatement: IGNORE_CALLBACK,
    EmptyStatement: IGNORE_CALLBACK,
    LabeledStatement: IGNORE_CALLBACK,
    BreakStatement: IGNORE_CALLBACK,
    ContinueStatement: IGNORE_CALLBACK,
    Decorator: IGNORE_CALLBACK,
    Directive: IGNORE_CALLBACK,
    DirectiveLiteral: IGNORE_CALLBACK,
    InterpreterDirective: IGNORE_CALLBACK,
    
    // We ignore import/export syntaxes and consider just require and module as the keywords
    // to import external modules and export internal structures
    // ModuleDeclaration: IGNORE_CALLBACK, // causes out of heap space TODO: investigate
    // ModuleSpecifier: IGNORE_CALLBACK,  // causes out of heap space TODO: investigate
    Import: IGNORE_CALLBACK,
    ImportDeclaration: IGNORE_CALLBACK,
    ImportSpecifier: IGNORE_CALLBACK,
    ImportDefaultSpecifier: IGNORE_CALLBACK,
    ImportNamespaceSpecifier: IGNORE_CALLBACK,
    ImportAttribute: IGNORE_CALLBACK,
    ExportNamedDeclaration: IGNORE_CALLBACK,
    ExportSpecifier: IGNORE_CALLBACK,
    ExportDefaultDeclaration: IGNORE_CALLBACK,
    ExportAllDeclaration: IGNORE_CALLBACK,

    // We ignore even more syntaxes to simplify the AST further
    ObjectPattern: IGNORE_CALLBACK,
    ArrayPattern: IGNORE_CALLBACK,
    RestElement: IGNORE_CALLBACK,
    AssignmentPattern: IGNORE_CALLBACK,
};
export function findFirstChild(path: babelTraverse.NodePath,
    condition: (candidate: babelTraverse.NodePath) => boolean): babelTraverse.NodePath {
    let child = null;
    path.traverse({
        ...IGNORED_TYPES_VISITOR,
        enter(candidatePath) {
            if (condition(candidatePath)) {
                child = candidatePath;
                candidatePath.stop();
            }
        }
    });
    return child;
}

export function findLastChild(path: babelTraverse.NodePath,
    condition: (candidate: babelTraverse.NodePath) => boolean): babelTraverse.NodePath {
    return findAllChildren(path, condition).reverse()[0];
}

export function findAllChildren(path: babelTraverse.NodePath,
    condition: (candidate: babelTraverse.NodePath) => boolean): babelTraverse.NodePath[] {
    const children = [];
    path.traverse({
        ...IGNORED_TYPES_VISITOR,
        enter(candidatePath) {
            if (condition(candidatePath)) {
                children.push(candidatePath);
            }
        }
    });
    return children;
}

export function getPath(node): babelTraverse.NodePath {
    let path;
    babelTraverse.default(node, {
        Program(thisPath) {
            path = thisPath;
        }
    });
    if (!path) {
        throw new Error('cannot get path');
    }
    return path;
}

// Source: https://github.com/babel/babel/issues/11051
export function traverseFromRoot(pathOrNode, visitor, state = {}) {
    const isNode = !pathOrNode.traverse;
    const path = isNode ? getPath(pathOrNode) : pathOrNode;
    const filteredVisitor = {
        // ignored must come first
        // some types are still used, such as ObjectPattern
        ...IGNORED_TYPES_VISITOR,
        ...visitor,
    };
    // @ts-ignore 
    visitor = babelTraverse.default.visitors.explode(filteredVisitor);
    if (visitor[path.type] && visitor[path.type].enter) {
        visitor[path.type].enter[0].call(state, path, state);
    }
    if (!path.shouldSkip) {
        path.traverse(visitor, state);
    }
    if (visitor[path.type] && visitor[path.type].exit) visitor[path.type].exit[0].call(state, path, state);
}