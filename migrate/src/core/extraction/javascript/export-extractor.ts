import * as babelTraverse from '@babel/traverse';
import {
    File,
} from '@babel/types';
import {
    traverseFromRoot,
} from '../compilers/babel-helpers';
import {
    IdentifierType,
} from './identifier-extractor';

export type ExportNameType = {
    name: string,
    parent: ExportNameType,
};

export function toIdentifier(exportName: ExportNameType): IdentifierType {
    if (null === exportName) {
        return null;
    }
    return {
        destructured: false,
        value: exportName.name,
        parent: toIdentifier(exportName.parent),
    };
}

export type ExportType = {
    assignee: ExportNameType,
    export: babelTraverse.NodePath,
};

function isModuleExports(path: babelTraverse.NodePath): boolean {
    const object = <babelTraverse.NodePath> path.get('object');
    const property = <babelTraverse.NodePath> path.get('property');
    if (object.isIdentifier() && property.isIdentifier()) {
        // module.exports = 1
        if ('module' === object.node.name && 'exports' === property.node.name) {
            return true;
        }
    }
    return false;
}

function getModuleExportsProperty(path: babelTraverse.NodePath): ExportNameType {
    if (isModuleExports(path)) {
        // id, id
        return null;
    }
    const object = <babelTraverse.NodePath> path.get('object');
    if (object.isMemberExpression()) {
        const parent: ExportNameType = getModuleExportsProperty(object);
        if (undefined === parent) {
            return undefined;
        }
        const property = <babelTraverse.NodePath> path.get('property');
        if (property.isIdentifier()) {
            // member, id
            return {
                name: property.node.name,
                parent,
            };
        }
    }
    return undefined;
}

function addPropertyLayer(objectExpression: babelTraverse.NodePath, parent: ExportNameType): ExportType[] {
    const properties = <babelTraverse.NodePath[]> objectExpression.get('properties');
    return properties.map((property) => {
        const key = <babelTraverse.NodePath> property.get('key');
        if (!key.isIdentifier()) {
            throw new Error('unexpected object expression property key type');
        }
        if (property.isObjectMethod()) {
            return {
                assignee: {
                    name: key.node.name,
                    parent,
                },
                export: property,
            };
        }
        const value = <babelTraverse.NodePath> property.get('value');
        return {
            assignee: {
                name: key.node.name,
                parent,
            },
            export: value,
        };
    });
}

export function extractExports(rootNode: File): ExportType[] {
    const exports: ExportType[] = [];
    const opts: babelTraverse.Visitor = {
        AssignmentExpression: {
            enter(path) {
                if (path.get('left').isMemberExpression()) {
                    const property: ExportNameType = getModuleExportsProperty(<babelTraverse.NodePath> path.get('left'));
                    if (undefined !== property) {
                        if (path.get('right').isObjectExpression()) {
                            exports.push(...addPropertyLayer(<babelTraverse.NodePath> path.get('right'), property));
                        } else {
                            const right = <babelTraverse.NodePath> path.get('right');
                            exports.push({
                                export: right,
                                assignee: property,
                            });
                        }
                    }
                }
            }
        }
    };
    // acornWalk.ancestor(module, {
    //     AssignmentExpression(assignment: AcornAssignmentExpression) {
    //         if (MEMBER_EXPRESSION_TYPE === assignment.left.type) {
    //             const left: AcornMemberExpression = <AcornMemberExpression> assignment.left;
    //             const property: ExportNameType = getModuleExportsProperty(left);
    //             if (undefined !== property) {
    //                 if (OBJECT_EXPRESSION_TYPE === assignment.right.type) {
    //                     const right: AcornObjectExpression = <AcornObjectExpression> assignment.right;
    //                     exports.push(...addPropertyLayer(right, property));
    //                 } else {
    //                     exports.push({
    //                         export: assignment.right,
    //                         assignee: property,
    //                     });
    //                 }
    //             }
    //         }
    //     },
    // });
    traverseFromRoot(rootNode, opts);
    return exports;
    // if ('MemberExpression' === memberExpression.object.type) {
    //     const object: AcornMemberExpression = <AcornMemberExpression> memberExpression.object;
    //     const property: AcornIdentifier = <AcornIdentifier> memberExpression.property;
    //     const moduleExportsProperty = getModuleExportsProperty(object);
    //     if (null === moduleExportsProperty) {
    //         return null;
    //     }
    //     return moduleExportsProperty.concat([property.name]);
    // }
    // console.log('type 6');
    // return null;
    // throw new Error(`unexpected type ${memberExpression.object.type}`);
}