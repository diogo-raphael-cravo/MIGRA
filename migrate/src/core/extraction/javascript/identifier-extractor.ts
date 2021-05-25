import * as babelTraverse from '@babel/traverse';
import * as babelTypes from '@babel/types';
import {
    VariableDeclarator,
    ObjectPattern,
    Identifier,
    AssignmentExpression,
} from '@babel/types';
import { traverseFromRoot } from '../compilers/babel-helpers';

export type IdentifierType = {
    destructured: boolean,
    value: string,
    parent: IdentifierType,
};

export function getFullName(identifier: IdentifierType, joinString = '.'): string {
    if (null === identifier) {
        return '';
    }
    if (null === identifier.parent) {
        return identifier.value;
    }
    return `${getFullName(identifier.parent, joinString)}${joinString}${identifier.value}`;
}

export function getTopParent(identifier: IdentifierType): IdentifierType {
    if (null === identifier.parent) {
        return identifier;
    }
    return getTopParent(identifier.parent);
}

export function removeTopParent(identifier: IdentifierType): IdentifierType {
    if (null === identifier) {
        return null;
    }
    if (null === identifier.parent) {
        // remove parent
        return null;
    }
    return {
        ...identifier,
        parent: removeTopParent(identifier.parent),
    };
}

export function append(parent: IdentifierType, child: IdentifierType): IdentifierType {
    if (null === child) {
        return parent;
    }
    getTopParent(child).parent = parent;
    return child;
}

/**
 * babel traverse procura os nós de dentro
 * identifier não tem nó dentro, não visita a si mesmo
 */
type IdentifierWritesStateType = {
    ignoreObjectPropertyKey: boolean,
    ignoreObjectPropertyValue: boolean,
};
export function extractIdentifierWrites<T>(rootPath: babelTraverse.NodePath<T>,
    state: IdentifierWritesStateType = {
        ignoreObjectPropertyKey: false,
        ignoreObjectPropertyValue: false,
    }): IdentifierType[] {
    const identifiers: IdentifierType[] = [];
    const opts: babelTraverse.Visitor = {
        CallExpression: {
            enter(path) {
                path.skip();
            },
        },
        Identifier: {
            enter(path) {
                const identifier: Identifier = <Identifier> path.node;
                identifiers.push({
                    destructured: false,
                    value: identifier.name,
                    parent: null,
                });
            }
        },
        AssignmentExpression: {
            enter(path) {
                const assignment: AssignmentExpression = <AssignmentExpression> path.node;
                const leftIdentifiers = extractIdentifierWrites(<babelTraverse.NodePath> path.get('left'), {
                    ignoreObjectPropertyKey: true,
                    ignoreObjectPropertyValue: false,
                });
                if (1 !== leftIdentifiers.length) {
                    throw new Error('unexpected assignment expression left identifier length');
                }
                const leftIdentifier: IdentifierType = leftIdentifiers[0];
                
                if (babelTypes.isAssignmentExpression(assignment.right)
                    || babelTypes.isObjectExpression(assignment.right)) {
                    const rightIdentifiers = extractIdentifierWrites(<babelTraverse.NodePath> path.get('right'), {
                        ignoreObjectPropertyKey: false,
                        ignoreObjectPropertyValue: true,
                    });
                    if (babelTypes.isObjectExpression(assignment.right)) {
                        rightIdentifiers.map(id => {
                            getTopParent(id).parent = leftIdentifier;
                            return id;
                        });
                    }
                    identifiers.push(...rightIdentifiers);
                }
                if (!babelTypes.isObjectExpression(assignment.right)) {
                    identifiers.push(leftIdentifier);
                }
                path.skip();
            },
        },
        ObjectPattern: {
            enter(path) {
                path.skip();
                const objectPattern: ObjectPattern = <ObjectPattern> path.node;
                //  stop walking and make recursive call if necessary
                 objectPattern.properties.forEach((_, i) => {
                    const propertyIdentifiers = extractIdentifierWrites(<babelTraverse.NodePath> path.get(`properties.${i}`), state);
                    // { a: b + c }
                    if (1 === propertyIdentifiers.length) {
                        const identifier: IdentifierType = propertyIdentifiers[0];
                        identifiers.push(identifier);
                    } else {
                        throw new Error('unexpected number of identifiers');
                    }
                    // else { 'a': 1 }
                    // else { [a + b]: 1 }
                });
            },
        },
        ObjectProperty: {
            enter(path) {
                // ignore bar, extract foo
                // { bar: foo } in the following, where 'bar' is key and 'foo' is value
                // const { bar: foo } = { bar: require('foobar') }
                if (!state.ignoreObjectPropertyKey) {
                    identifiers.push(...extractIdentifierWrites(<babelTraverse.NodePath> path.get('key'), state));
                }
                if (!state.ignoreObjectPropertyValue) {
                    identifiers.push(...extractIdentifierWrites(<babelTraverse.NodePath> path.get('value'), state));
                }
                path.skip();
            }
        },
        VariableDeclarator: {
            enter(path) {
                const declarator: VariableDeclarator = <VariableDeclarator> path.node;
                const idIdentifiers = extractIdentifierWrites(<babelTraverse.NodePath> path.get('id'), {
                    ignoreObjectPropertyKey: true,
                    ignoreObjectPropertyValue: false,
                });
                idIdentifiers.forEach(idIdentifier => {
                    if (babelTypes.isObjectPattern(declarator.id)) {
                        // object pattern determines names, no matter init
                        identifiers.push(idIdentifier);
                    } else {
                        if (babelTypes.isAssignmentExpression(declarator.init)
                            || babelTypes.isObjectExpression(declarator.init)) {
                            const initIdentifiers = extractIdentifierWrites(<babelTraverse.NodePath> path.get('init'), {
                                ignoreObjectPropertyKey: false,
                                ignoreObjectPropertyValue: true,
                            });
                            if (babelTypes.isObjectExpression(declarator.init)) {
                                initIdentifiers.map(id => {
                                    getTopParent(id).parent = idIdentifier;
                                    return id;
                                });
                            }
                            identifiers.push(...initIdentifiers);
                        }
                        if (!babelTypes.isObjectExpression(declarator.init)) {
                            identifiers.push(idIdentifier);
                        }
                    }
                });
                path.skip();
            }
        },
        MemberExpression: {
            enter(path) {
                path.skip();
                // stop walking and make recursive call if necessary
                let parent: IdentifierType;
                const object = extractIdentifierWrites(path.get('object'), state);
                if (object.length === 0) {
                    parent = null;
                } else if (object.length === 1) {
                    // foo.bar, parent is 'foo'
                    parent = object[0];
                } else {
                    // `${foo}${bar}`.foobar, parent is ['foo', 'bar']
                    identifiers.push(...object);
                    return;
                }

                let value: string;
                const property = extractIdentifierWrites(path.get('property'), state);
                if (property.length === 0) {
                    value = null;
                } else if (property.length === 1) {
                    // foo.bar, value is 'bar'
                    value = property[0].value;
                } else {
                    throw new Error('Error extracting identifiers from member expression object');
                }

                if (null === value) {
                    if (null === parent) {
                        // 'string'[4], no identifiers
                        return;
                    }
                    // foobar[4], return 'foobar', ignore [4]
                    identifiers.push(parent);
                    return;
                }
                // foo.bar, value is 'bar', parent is 'foo'
                identifiers.push({
                    destructured: false,
                    value,
                    parent,
                });
            }
        }
    };
    traverseFromRoot(rootPath, opts, state);
    return identifiers;
}
export function extractIdentifierReads(path: babelTraverse.NodePath): IdentifierType[] {
    const identifiers: IdentifierType[] = [];
    const opts: babelTraverse.Visitor = {
        ArrowFunctionExpression: {
            enter(path) {
                path.skip();
            },
        },
        CallExpression: {
            enter(path) {
                path.skip();
            },
        },
        Identifier: {
            enter(path) {
                const identifier: Identifier = <Identifier> path.node;
                if ('undefined' === identifier.name) {
                    return;
                }
                identifiers.push({
                    destructured: false,
                    value: identifier.name,
                    parent: null,
                });
            }
        },
        MemberExpression: {
            enter(path) {
                path.skip();
                // stop walking and make recursive call if necessary
                let parent: IdentifierType;
                const object = extractIdentifierWrites(path.get('object'));
                if (object.length === 0) {
                    parent = null;
                } else if (object.length === 1) {
                    // foo.bar, parent is 'foo'
                    parent = object[0];
                } else {
                    // `${foo}${bar}`.foobar, parent is ['foo', 'bar']
                    identifiers.push(...object);
                    return;
                }

                let value: string;
                const property = extractIdentifierWrites(path.get('property'));
                if (property.length === 0) {
                    value = null;
                } else if (property.length === 1) {
                    // foo.bar, value is 'bar'
                    value = property[0].value;
                } else {
                    throw new Error('Error extracting identifiers from member expression object');
                }

                if (null === value) {
                    if (null === parent) {
                        // 'string'[4], no identifiers
                        return;
                    }
                    // foobar[4], return 'foobar', ignore [4]
                    identifiers.push(parent);
                    return;
                }
                // foo.bar, value is 'bar', parent is 'foo'
                identifiers.push({
                    destructured: false,
                    value,
                    parent,
                });
            }
        }
    };
    traverseFromRoot(path, opts);
    return identifiers;
}

// function same(a: IdentifierType, b: IdentifierType): boolean {
//     if (null === a.parent && null === b.parent) {
//         return a.destructured === b.destructured && a.value === b.value;
//     }
//     if (null === a.parent || null === b.parent) {
//         return false;
//     }
//     return same(a.parent, b.parent);
// }

// export function resolve(_identifier: IdentifierType, _ancestors: acorn.Node[]): acorn.Node {
//     return null;
    // if (0 === ancestors.length) {
    //     return null;
    // }
    // const scope = ancestors[0];
    // const nodes: acorn.Node[] = []
    // if (PROGRAM_TYPE === scope.type) {
    //     const program: AcornProgram = <AcornProgram> scope;
    //     nodes.push(...program.body);
    // }
    // let resolved;
    // nodes.find(node => {
    //     if (VARIABLE_DECLARATION_TYPE === node.type) {
    //         const declaration: AcornVariableDeclaration = <AcornVariableDeclaration> node;
    //         return declaration.declarations.find(thisDeclaration => {
    //             if (VARIABLE_DECLARATOR_TYPE === thisDeclaration.type) {
    //                 const declarator: AcornVariableDeclarator = <AcornVariableDeclarator> thisDeclaration;
    //                 const identifiers: IdentifierType[] = extractIdentifierWrites(declarator.id);
    //                 if (identifiers[0] && same(identifiers[0], identifier)) {
    //                     resolved = declarator.init;
    //                 }
    //             }
    //             return undefined;
    //         });
    //     } else if (FUNCTION_DECLARATION_TYPE === node.type) {
    //         const functionDeclaration: AcornFunctionDeclaration = <AcornFunctionDeclaration> node;
    //         const identifiers: IdentifierType[] = extractIdentifierReads(functionDeclaration.id);
    //         if (identifiers[0] && same(identifiers[0], identifier)) {
    //             resolved = functionDeclaration;
    //         }
    //     }
    //     return undefined;
    // });
    // if (undefined === resolved) {
    //     return resolve(identifier, ancestors.slice(1));
    // }
    // return resolved;
// }