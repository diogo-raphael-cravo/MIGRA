import {
    ResourceType,
} from "../../translation/module-net-types";

export const TRAVERSED_LITERAL_TYPES = {
    RegExpLiteral: 'RegExpLiteral',
    NullLiteral: 'NullLiteral',
    StringLiteral: 'StringLiteral',
    BooleanLiteral: 'BooleanLiteral',
    NumericLiteral: 'NumericLiteral',
    BigIntLiteral: 'BigIntLiteral',
    DecimalLiteral: 'DecimalLiteral',
};
export const TRAVERSED_NEW_SCOPE_TYPES  = {
    Program: 'Program',
    BlockStatement: 'BlockStatement',
    
    // functions
    FunctionDeclaration: 'FunctionDeclaration',
    ArrowFunctionExpression: 'ArrowFunctionExpression',
    FunctionExpression: 'FunctionExpression',

    // statements
    TryStatement: 'TryStatement',
    CatchClause: 'CatchClause',
    WhileStatement: 'WhileStatement',
    DoWhileStatement: 'DoWhileStatement',
    ForStatement: 'ForStatement',
    ForInStatement: 'ForInStatement',
    ForOfStatement: 'ForOfStatement',
    IfStatement: 'IfStatement',
    SwitchStatement: 'SwitchStatement',
    SwitchCase: 'SwitchCase',
};
export const TRAVERSED_TYPES = {
    // File is not declared in the spec, but it is traversed
    File: 'File',

    // Types declared in the spec we traverse
    Identifier: 'Identifier',
    ...TRAVERSED_LITERAL_TYPES,
    ...TRAVERSED_NEW_SCOPE_TYPES,
    ExpressionStatement: 'ExpressionStatement',
    ReturnStatement: 'ReturnStatement',
    ThrowStatement: 'ThrowStatement',
    VariableDeclaration: 'VariableDeclaration',
    VariableDeclarator: 'VariableDeclarator',
    AwaitExpression: 'AwaitExpression',
    ArrayExpression: 'ArrayExpression',
    ObjectExpression: 'ObjectExpression',
    ObjectProperty: 'ObjectProperty',
    ObjectMethod: 'ObjectMethod',
    UnaryExpression: 'UnaryExpression',
    UpdateExpression: 'UpdateExpression',
    BinaryExpression: 'BinaryExpression',
    AssignmentExpression: 'AssignmentExpression',
    LogicalExpression: 'LogicalExpression',
    SpreadElement: 'SpreadElement',
    MemberExpression: 'MemberExpression',
    ConditionalExpression: 'ConditionalExpression',
    CallExpression: 'CallExpression',
    TemplateLiteral: 'TemplateLiteral',
    TemplateElement: 'TemplateElement',
};
export const SKIPPED_TYPES = {
    // ignored types
    EmptyStatement: 'EmptyStatement',
    DebuggerStatement: 'DebuggerStatement',
    WithStatement: 'WithStatement',
    LabeledStatement: 'LabeledStatement',
    BreakStatement: 'BreakStatement',
    ContinueStatement: 'ContinueStatement',
    Directive: 'Directive',
    DirectiveLiteral: 'DirectiveLiteral',
    Super: 'Super',
    Import: 'Import',
    ThisExpression: 'ThisExpression',
    YieldExpression: 'YieldExpression',
    NewExpression: 'NewExpression',
    SequenceExpression: 'SequenceExpression',
    TaggedTemplateExpression: 'TaggedTemplateExpression',
    ObjectPattern: 'ObjectPattern',
    ArrayPattern: 'ArrayPattern',
    RestElement: 'RestElement',
    AssignmentPattern: 'AssignmentPattern',
    ClassBody: 'ClassBody',
    ClassMethod: 'ClassMethod',
    ClassDeclaration: 'ClassDeclaration',
    ClassExpression: 'ClassExpression',
    MetaProperty: 'MetaProperty',

    // absent types
    Node: 'Node',
    SourceLocation: 'SourceLocation',
    Position: 'Position',
    PrivateName: 'PrivateName',
    Literal: 'Literal',
    Function: 'Function',
    Statement: 'Statement',
    Declaration: 'Declaration',
    Decorator: 'Decorator',
    InterpreterDirective: 'InterpreterDirective',
    Expression: 'Expression',
    ObjectMember: 'ObjectMember',
    RecordExpression: 'RecordExpression',
    TupleExpression: 'TupleExpression',
    UnaryOperator: 'UnaryOperator',
    UpdateOperator: 'UpdateOperator',
    BinaryOperator: 'BinaryOperator',
    AssignmentOperator: 'AssignmentOperator',
    LogicalOperator: 'LogicalOperator',
    ArgumentPlaceholder: 'ArgumentPlaceholder',
    OptionalMemberExpression: 'OptionalMemberExpression',
    BindExpression: 'BindExpression',
    PipelineBody: 'PipelineBody',
    PipelineBareFunctionBody: 'PipelineBareFunctionBody',
    PipelineBareConstructorBody: 'PipelineBareConstructorBody',
    PipelineBareAwaitedFunctionBody: 'PipelineBareAwaitedFunctionBody',
    PipelineTopicBody: 'PipelineTopicBody',
    OptionalCallExpression: 'OptionalCallExpression',
    ParenthesizedExpression: 'ParenthesizedExpression',
    DoExpression: 'DoExpression',
    Pattern: 'Pattern',
    AssignmentProperty: 'AssignmentProperty',
    Class: 'Class',
    ClassPrivateMethod: 'ClassPrivateMethod',
    ClassProperty: 'ClassProperty',
    ClassPrivateProperty: 'ClassPrivateProperty',
    StaticBlock: 'StaticBlock',
    ModuleDeclaration: 'ModuleDeclaration',
    ModuleSpecifier: 'ModuleSpecifier',
    ImportDeclaration: 'ImportDeclaration',
    ImportSpecifier: 'ImportSpecifier',
    ImportDefaultSpecifier: 'ImportDefaultSpecifier',
    ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
    ImportAttribute: 'ImportAttribute',
    ExportNamedDeclaration: 'ExportNamedDeclaration',
    ExportSpecifier: 'ExportSpecifier',
    OptFunctionDeclaration: 'OptFunctionDeclaration',
    OptClassDeclaration: 'OptClassDeclaration',
    ExportDefaultDeclaration: 'ExportDefaultDeclaration',
    ExportAllDeclaration: 'ExportAllDeclaration',
};
export function isTraversed(typeName: string): boolean {
    return isInList(typeName, TRAVERSED_TYPES);
}
export function isTraversedLiteral(typeName: string): boolean {
    return isInList(typeName, TRAVERSED_LITERAL_TYPES);
}
export function isTraversedNewScope(typeName: string): boolean {
    return isInList(typeName, TRAVERSED_NEW_SCOPE_TYPES);
}
export function isSkipped(typeName: string): boolean {
    return isInList(typeName, SKIPPED_TYPES);
}
function isInList(typeName: string, typeList: Record<string, string>): boolean {
    return undefined !== Object.values(typeList)
        .find(typeInList => typeInList === typeName);
}

export type MappingType = {
    fromId: string,
    toId: string,
};
export type ExtractedOperationType = {
    name: string,
    resources: ResourceType[],
    required: string[],
    generated: string[],
    // parameter attributes of function resource, if present
    parameters: string[],
    // returned attributes of function resource, if present
    returns: string[],
    // mappings from attribute to attribute in a function
    mappings: MappingType[],
};

export type SourceExportedItemType = {
    name: string,
    code: string,
};
export type SourceInterfaceType = SourceExportedItemType[];