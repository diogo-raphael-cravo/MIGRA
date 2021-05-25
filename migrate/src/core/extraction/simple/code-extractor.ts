import * as babel from '@babel/core';
import * as t from '@babel/types';
import {
    ResourceType,
} from "../../translation/module-net-types";
import {
    TRAVERSED_TYPES,
    isSkipped,
    isTraversedNewScope,
    ExtractedOperationType,
    SourceExportedItemType,
} from './types';
import {
    ScopeTable,
    ScopeTableEntry,
    pushEntry,
    pushEntryToRoot,
    pushScope,
    popScope,
    getEntryByName,
} from '../compilers/scope-table';
import { deduplicateOp } from './simplifier';
import { getNames } from './name-resolver';

function addAttributeToResource(name: string, resource: ResourceType): string {
    const attributeName = `${resource.id}.${name}`;
    resource.attributes.push(attributeName);
    return attributeName;
}

function handleFunction(functionPath: babel.NodePath<t.FunctionDeclaration> | babel.NodePath<t.ArrowFunctionExpression>,
    functionResource: ResourceType,
    extractedOperation: ExtractedOperationType,
    scopeTable: ScopeTable<t.Node>): void {
    functionPath.node.params.forEach((param, index) => {
        const attribute = addAttributeToResource(`par-${index}`, functionResource);
        extractedOperation.parameters.push(attribute);
        
        // push to scope
        let name: string;
        if (TRAVERSED_TYPES.Identifier === param.type) {
            const paramId: t.Identifier = <t.Identifier> param;
            name = paramId.name;
        } else {
            throw new Error(`unexpected param type ${param.type}`);
        }
        const scopeEntry: ScopeTableEntry<t.Node> = {
            name,
            alias: attribute,
            node: param,
        };
        pushEntry(scopeEntry, scopeTable);
    });
}

function handleForInOfStatement(node: t.ForInStatement | t.ForOfStatement,
    functionResource: ResourceType,
    extractedOperation: ExtractedOperationType,
    scopeTable: ScopeTable<t.Node>,
    nextLocal: () => string): void {
    const left = node.left;
    // push to scope
    let name: string;
    if (TRAVERSED_TYPES.Identifier === left.type) {
        const leftId: t.Identifier = <t.Identifier> left;
        name = leftId.name;
    } else if (TRAVERSED_TYPES.VariableDeclaration === left.type) {
        const leftDeclaration: t.VariableDeclaration = <t.VariableDeclaration> left;
        // declarations of for ins have just a single declarator
        if (1 !== leftDeclaration.declarations.length) {
            throw new Error(`unexpected for in/of declaration count ${leftDeclaration.declarations.length}`);
        }
        const declarator = leftDeclaration.declarations[0];
        // declarators of for ins do not have inits
        if (declarator.init) {
            throw new Error('unexpected for in/of declarator init');
        }
        if (TRAVERSED_TYPES.Identifier === declarator.id.type) {
            const declaratorId: t.Identifier = <t.Identifier> declarator.id;
            name = declaratorId.name;
        } else {
            throw new Error(`unexpected for in/of declarator id type ${declarator.id.type}`);
        }
    } else {
        throw new Error(`unexpected for in/of left type ${left.type}`);
    }
    const localAttribute = addAttributeToResource(nextLocal(), functionResource);
    const scopeEntry: ScopeTableEntry<t.Node> = {
        name,
        alias: localAttribute,
        node,
    };
    pushEntry(scopeEntry, scopeTable);

    
    const right = node.right;
    if (!right) {
        return;
    }
    
    // declared is generated when there's init
    extractedOperation.generated.push(localAttribute);

    const initializerNames: string[] = [];
    try {
        const names = getNames(right, scopeTable);
        initializerNames.push(...names);
    } catch (error) {
        throw new Error(`unexpected for in/of right type, error: ${error.message}`);
    }
    initializerNames.forEach(initName => {
        const entry = getEntryByName(initName, scopeTable);
        if (!entry) {
            // getNames filters out when not in scope, so this will never happen
            return;
            // throw new Error(`variable declarator init references unknown name ${initName}`);
        }

        // used is required
        extractedOperation.required.push(entry.alias);
        extractedOperation.mappings.push({
            fromId: entry.alias,
            toId: localAttribute,
        });
    });
}

function handleVariableDeclarator(node: t.VariableDeclarator,
    functionResource: ResourceType,
    extractedOperation: ExtractedOperationType,
    scopeTable: ScopeTable<t.Node>,
    nextLocal: () => string): void {
    const id = node.id;
    // push to scope
    let name: string;
    if (TRAVERSED_TYPES.Identifier === id.type) {
        const idId: t.Identifier = <t.Identifier> id;
        name = idId.name;
    } else {
        throw new Error(`unexpected declarator id type ${id.type}`);
    }
    const localAttribute = addAttributeToResource(nextLocal(), functionResource);
    const scopeEntry: ScopeTableEntry<t.Node> = {
        name,
        alias: localAttribute,
        node,
    };
    pushEntry(scopeEntry, scopeTable);

    
    const init = node.init;
    if (!init) {
        return;
    }
    
    // declared is generated when there's init
    extractedOperation.generated.push(localAttribute);

    const initializerNames: string[] = [];
    try {
        const names = getNames(init, scopeTable);
        initializerNames.push(...names);
    } catch (error) {
        throw new Error(`unexpected declarator init type, error: ${error.message}`);
    }
    initializerNames.forEach(initName => {
        const entry = getEntryByName(initName, scopeTable);
        if (!entry) {
            // getNames filters out when not in scope, so this will never happen
            return;
            // throw new Error(`variable declarator init references unknown name ${initName}`);
        }

        // used is required
        extractedOperation.required.push(entry.alias);
        extractedOperation.mappings.push({
            fromId: entry.alias,
            toId: localAttribute,
        });
    });
}

function handleAssignmentExpression(node: t.AssignmentExpression,
    functionResource: ResourceType,
    extractedOperation: ExtractedOperationType,
    scopeTable: ScopeTable<t.Node>,
    nextLocal: () => string): void {
    const left = node.left;
    // push to scope
    let name: string;
    if (TRAVERSED_TYPES.Identifier === left.type) {
        const idId: t.Identifier = <t.Identifier> left;
        name = idId.name;
    } else {
        throw new Error(`unexpected assignment left type ${left.type}`);
    }

    /**
     * assumes two things:
     *   - analysed code is strict mode
     *   - analysed code works
     * the above means the left handside must have been declared
     * otherwise there would be an exception (strict mode), which would cause code not to work
     */
    const entry = getEntryByName(name, scopeTable);
    let localAttribute: string;
    if (entry) {
        // if it was declared locally (it is in scope), we don't have to add it to scope
        localAttribute = entry.alias;
    } else {
        // if it was not declared locally, we assume it as declared globally and add it to top scope 
        localAttribute = addAttributeToResource(nextLocal(), functionResource);
        const scopeEntry: ScopeTableEntry<t.Node> = {
            name,
            alias: localAttribute,
            node,
        };
        pushEntryToRoot(scopeEntry, scopeTable);
    }
    
    
    const right = node.right;
    if (!right) {
        return;
    }
    
    // declared is generated when there's init
    extractedOperation.generated.push(localAttribute);

    const rightNames: string[] = [];
    try {
        const names = getNames(right, scopeTable);
        rightNames.push(...names);
    } catch (error) {
        throw new Error(`unexpected assignment right type, error: ${error.message}`);
    }
    rightNames.forEach(rightName => {
        const entry = getEntryByName(rightName, scopeTable);
        if (!entry) {
            // getNames filters out when not in scope, so this will never happen
            return;
            // throw new Error(`assignment right references unknown name ${rightName}`);
        }

        // used is required
        extractedOperation.required.push(entry.alias);
        extractedOperation.mappings.push({
            fromId: entry.alias,
            toId: localAttribute,
        });
    });
}

function handleReturnStatement(path: babel.NodePath<t.ReturnStatement>,
    functionResource: ResourceType,
    extractedOperation: ExtractedOperationType,
    scopeTable: ScopeTable<t.Node>,
    nextReturn: () => string): void {
    if (!path.node.argument) {
        return;
    }
    const argument = path.node.argument;
    const returnAttribute = addAttributeToResource(nextReturn(), functionResource);
    extractedOperation.returns.push(returnAttribute);
    // if (isTraversedLiteral(argument.type)) {
    // generated because it returns a literal

    // for now always generated because we cannot transfer between attributes of the same module
    extractedOperation.generated.push(returnAttribute);
    //     return;
    // }
    const argumentNames = [];
    try {
        const names = getNames(argument, scopeTable);
        argumentNames.push(...names);
    } catch (error) {
        throw new Error(`unexpected return argument type, error ${error.message}`);
    }
    argumentNames.forEach(argId => {
        const entry = getEntryByName(argId, scopeTable);
        if (!entry) {
            // getNames filters out when not in scope, so this will never happen
            return;
            // throw new Error(`return references unknown name ${argId.name}`);
        }
    
        // this name is necessary because it is used (in a return)
        extractedOperation.required.push(entry.alias);
    
        extractedOperation.mappings.push({
            fromId: entry.alias,
            toId: returnAttribute,
        });
    });
}
function handleReturn(argument: t.Expression,
    functionResource: ResourceType,
    extractedOperation: ExtractedOperationType,
    scopeTable: ScopeTable<t.Node>,
    nextReturn: () => string): void {
    if (!argument) {
        return;
    }
    const returnAttribute = addAttributeToResource(nextReturn(), functionResource);
    extractedOperation.returns.push(returnAttribute);
    // if (isTraversedLiteral(argument.type)) {
    // generated because it returns a literal

    // for now always generated because we cannot transfer between attributes of the same module
    extractedOperation.generated.push(returnAttribute);
    //     return;
    // }
    const argumentNames = [];
    try {
        const names = getNames(argument, scopeTable);
        argumentNames.push(...names);
    } catch (error) {
        throw new Error(`unexpected return argument type, error ${error.message}`);
    }
    argumentNames.forEach(argId => {
        const entry = getEntryByName(argId, scopeTable);
        if (!entry) {
            // getNames filters out when not in scope, so this will never happen
            return;
            // throw new Error(`return references unknown name ${argId.name}`);
        }
    
        // this name is necessary because it is used (in a return)
        extractedOperation.required.push(entry.alias);
    
        extractedOperation.mappings.push({
            fromId: entry.alias,
            toId: returnAttribute,
        });
    });
}

function handleExpressionInStatement(node: t.Node,
    functionResource: ResourceType,
    extractedOperation: ExtractedOperationType,
    scopeTable: ScopeTable<t.Node>,
    nextLocal: () => string): void {
    let nodeToExtract = node;
    if (!nodeToExtract) {
        return;
    }

    // handle declarations
    // declarations must be handled fist, because they can be referenced later
    if (TRAVERSED_TYPES.VariableDeclaration === nodeToExtract.type) {
        const declaration = <t.VariableDeclaration> nodeToExtract;
        declaration.declarations.forEach(thisDeclaration => {
            handleVariableDeclarator(thisDeclaration, functionResource, extractedOperation, scopeTable, nextLocal);
        });
        // variable declarations return 'undefined'
        return;
    } else if (TRAVERSED_TYPES.AssignmentExpression === nodeToExtract.type) {
        const assignment = <t.AssignmentExpression> nodeToExtract;
        handleAssignmentExpression(assignment, functionResource, extractedOperation, scopeTable, nextLocal);
        // assignment expressions return their right handside, so this is the value used
        nodeToExtract = assignment.right;
        if (!nodeToExtract) {
            return;
        }
    }
    const expressionNames = [];
    try {
        const names = getNames(nodeToExtract, scopeTable);
        expressionNames.push(...names);
    } catch (error) {
        throw new Error(`unexpected expression in statement type, error ${error.message}`);
    }
    expressionNames.forEach(name => {
        const entry = getEntryByName(name, scopeTable);
        if (!entry) {
            // getNames filters out when not in scope, so this will never happen
            return;
        }
    
        // this name is necessary because it is used
        extractedOperation.required.push(entry.alias);
    });
}

function extractCodeFunction(name: string, functionType: t.Function, root: babel.ParseResult): ExtractedOperationType {
    const extractedOperation: ExtractedOperationType = {
        name: name,
        resources: [],
        required: [],
        generated: [],
        parameters: [],
        returns: [],
        mappings: [],
    };

    // add function resource
    const functionResource: ResourceType = {
        id: name,
        attributes: [],
    };
    extractedOperation.resources.push(functionResource);
    extractedOperation.generated.push(functionResource.id);
    
    // local and return names
    let returnCounter = 0;
    function nextReturn(): string {
        const ret = `return-${returnCounter}`;
        returnCounter++;
        return ret;
    }
    let localCounter = 0;
    function nextLocal(): string {
        const local = `local-${localCounter}`;
        localCounter++;
        return local;
    }

    // create scope
    let scopeTable: ScopeTable<t.Node> = pushScope(functionType);

    if (TRAVERSED_TYPES.BlockStatement !== functionType.body.type) {
        // could still be an expression we can handle
        try {
            babel.traverse(root, {
                enter(path) {
                    if (isSkipped(path.type)) {
                        path.skip();
                        return;
                    }
                    if (isTraversedNewScope(path.node.type)) {
                        scopeTable = pushScope(functionType, scopeTable);
                    }
                },
                // do not pop scope, we'll use it after traverse
                // exit(path) {
                //     if (isTraversedNewScope(path.node.type)) {
                //         scopeTable = popScope(scopeTable);
                //     }
                // },
                [TRAVERSED_TYPES.ArrowFunctionExpression](path: babel.NodePath<t.ArrowFunctionExpression>) {
                    handleFunction(path, functionResource, extractedOperation, scopeTable);
                },
            });
            handleReturn(<t.Expression> functionType.body, functionResource, extractedOperation, scopeTable, nextReturn);
            return extractedOperation;
        } catch (error) {
            throw new Error(`unsupported function body type ${functionType.body.type}, error: ${error.message}`);
        }
    }
    const functionBody: t.BlockStatement = <t.BlockStatement> functionType.body;
    if (0 === functionBody.body.length) {
        return extractedOperation;
    }

    // traverse function body
    // should only traverse root function
    let traversedThisFunction = false;
    babel.traverse(root, {
        enter(path) {
            if (isSkipped(path.type)) {
                path.skip();
                return;
            }
            if (isTraversedNewScope(path.node.type)) {
                scopeTable = pushScope(functionType, scopeTable);
            }
        },
        exit(path) {
            if (isTraversedNewScope(path.node.type)) {
                scopeTable = popScope(scopeTable);
            }
        },
        [TRAVERSED_TYPES.ObjectMethod](path: babel.NodePath<t.ObjectMethod>) {
            // root object methods are converted into function declarations before reaching this point
            // if it gets here, then it's a nested object method, which we don't want to parse
            path.skip();
        },
        [TRAVERSED_TYPES.FunctionDeclaration](path: babel.NodePath<t.FunctionDeclaration>) {
            if (!traversedThisFunction) {
                handleFunction(path, functionResource, extractedOperation, scopeTable);
                traversedThisFunction = true;
            } else {
                path.skip();
            }
        },
        [TRAVERSED_TYPES.ArrowFunctionExpression](path: babel.NodePath<t.ArrowFunctionExpression>) {
            if (!traversedThisFunction) {
                handleFunction(path, functionResource, extractedOperation, scopeTable);
                traversedThisFunction = true;
            } else {
                path.skip();
            }
        },
        [TRAVERSED_TYPES.VariableDeclarator](path: babel.NodePath<t.VariableDeclarator>) {
            handleVariableDeclarator(path.node, functionResource, extractedOperation, scopeTable, nextLocal);
        },
        [TRAVERSED_TYPES.AssignmentExpression](path: babel.NodePath<t.AssignmentExpression>) {
            handleAssignmentExpression(path.node, functionResource, extractedOperation, scopeTable, nextLocal);
        },
        [TRAVERSED_TYPES.ReturnStatement](path: babel.NodePath<t.ReturnStatement>) {
            handleReturnStatement(path, functionResource, extractedOperation, scopeTable, nextReturn);
        },

        // statements
        // will process expressions, ignoring left handside of assignment expressions
        [TRAVERSED_TYPES.SwitchStatement](path: babel.NodePath<t.SwitchStatement>) {
            handleExpressionInStatement(path.node.discriminant, functionResource, extractedOperation, scopeTable, nextLocal);
            path.node.cases.forEach(thisCase => handleExpressionInStatement(thisCase.test, functionResource, extractedOperation, scopeTable, nextLocal));
            path.skipKey('discriminant');
        },
        [TRAVERSED_TYPES.ForStatement](path: babel.NodePath<t.ForStatement>) {
            // init must come first, because it may be reference in test and update
            handleExpressionInStatement(path.node.init, functionResource, extractedOperation, scopeTable, nextLocal);
            handleExpressionInStatement(path.node.test, functionResource, extractedOperation, scopeTable, nextLocal);
            handleExpressionInStatement(path.node.update, functionResource, extractedOperation, scopeTable, nextLocal);
            path.skipKey('init');
            path.skipKey('test');
            path.skipKey('update');
        },
        [TRAVERSED_TYPES.ThrowStatement](path: babel.NodePath<t.ThrowStatement>) {
            handleExpressionInStatement(path.node.argument, functionResource, extractedOperation, scopeTable, nextLocal);
            path.skipKey('argument');
        },
        [TRAVERSED_TYPES.WhileStatement](path: babel.NodePath<t.WhileStatement>) {
            handleExpressionInStatement(path.node.test, functionResource, extractedOperation, scopeTable, nextLocal);
            path.skipKey('test');
        },
        [TRAVERSED_TYPES.DoWhileStatement](path: babel.NodePath<t.DoWhileStatement>) {
            handleExpressionInStatement(path.node.test, functionResource, extractedOperation, scopeTable, nextLocal);
            path.skipKey('test');
        },
        [TRAVERSED_TYPES.ExpressionStatement](path: babel.NodePath<t.ExpressionStatement>) {
            if (!traversedThisFunction) {
                // () => {}
                // arrow functions are inside expression statements, we ignore these statements
                // but only for the root function
                return;
            }
            handleExpressionInStatement(path.node.expression, functionResource, extractedOperation, scopeTable, nextLocal);
            path.skipKey('expression');
        },
        [TRAVERSED_TYPES.ForInStatement](path: babel.NodePath<t.ForInStatement>) {
            handleForInOfStatement(path.node, functionResource, extractedOperation, scopeTable, nextLocal);
            path.skipKey('left');
            path.skipKey('right');
        },
        [TRAVERSED_TYPES.ForOfStatement](path: babel.NodePath<t.ForOfStatement>) {
            handleForInOfStatement(path.node, functionResource, extractedOperation, scopeTable, nextLocal);
            path.skipKey('left');
            path.skipKey('right');
        },
        [TRAVERSED_TYPES.IfStatement](path: babel.NodePath<t.IfStatement>) {
            handleExpressionInStatement(path.node.test, functionResource, extractedOperation, scopeTable, nextLocal);
            path.skipKey('test');
        },
        [TRAVERSED_TYPES.CatchClause](path: babel.NodePath<t.CatchClause>) {
            const param = path.node.param;
            if (param && TRAVERSED_TYPES.Identifier === param.type) {
                const idId: t.Identifier = <t.Identifier> param;
                name = idId.name;
                const localAttribute = addAttributeToResource(nextLocal(), functionResource);
                const scopeEntry: ScopeTableEntry<t.Node> = {
                    name,
                    alias: localAttribute,
                    node: param,
                };
                pushEntry(scopeEntry, scopeTable);
                extractedOperation.generated.push(scopeEntry.alias);
            }
            path.skipKey('param');
        },
    });

    return deduplicateOp(extractedOperation);
}

export function extract(exported: SourceExportedItemType): ExtractedOperationType {
    const parsedRoot: babel.ParseResult = babel.parseSync(exported.code);
    if (!parsedRoot) {
        throw new Error(`could not parse ${exported.name}`);
    }

    let parsedProgram: t.Program;
    if (TRAVERSED_TYPES.Program === parsedRoot.type) {
        parsedProgram = <t.Program> parsedRoot;
    } else if (TRAVERSED_TYPES.File === parsedRoot.type) {
        const parsedFile: t.File = <t.File> parsedRoot;
        parsedProgram = parsedFile.program;
    } else {
        throw new Error(`unexpected root type ${parsedRoot.type}`);
    }

    const body = parsedProgram.body;
    if (0 === body.length) {
        throw new Error('empty body');
    }
    if (1 < body.length) {
        throw new Error(`body length ${body.length} is greater than one`);
    }

    // is it a function? a constant?
    const programBody = body[0];
    if (TRAVERSED_TYPES.FunctionDeclaration === programBody.type) {
        const functionType: t.Function = <t.Function> programBody;
        return extractCodeFunction(exported.name, functionType, parsedRoot);
    }
    if (TRAVERSED_TYPES.ExpressionStatement === programBody.type
        && TRAVERSED_TYPES.ArrowFunctionExpression === (<t.ExpressionStatement> programBody).expression.type) {
        const functionType: t.Function = <t.Function> (<t.ExpressionStatement> programBody).expression;
        return extractCodeFunction(exported.name, functionType, parsedRoot);
    }
    throw new Error(`unexpected program body type ${programBody.type}`);
}
