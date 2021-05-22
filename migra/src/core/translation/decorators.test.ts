import {
    HardcodedTypesType,
} from './module-net-types';

export function decorateHardcodedTypes(hardcodedTypes: Record<string, unknown>): HardcodedTypesType {
    return {
        moduleNet: {
            attributes: {
                moduleName: '',
                resourceName: '',
                resourceRequired: '',
                resourceGenerated: '',
                attributeName: '',
                attributeRequired: '',
                attributeGenerated: '',
                operationName: '',
            },
            nodes: {
                module: '',
                resource: '',
                attribute: '',
                operation: '',
                resourceEdge: '',
                attributeEdge: '',
            },
            edges: {
                edge: '',
                source: '',
                target: '',
                resourceOf: '',
                attributeOf: '',
            },
        },
        gragra: {
            attributes: {
                edgeName: '',
                nodeName: '',
                ruleName: '',
                id: '',
            },
            nodes: {
                node: '',
                edge: '',
                graph: '',
                rule: '',
                graphTransformationSystem: '',
            },
            edges: {
                in: '',
                lhs: '',
                nac: '',
                rhs: '',
                rule: '',
                source: '',
                target: '',
            }
        },
        ...hardcodedTypes,
    };
}