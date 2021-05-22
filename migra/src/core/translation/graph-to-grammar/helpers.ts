import {
    GraGraGraphNodeType,
} from '../../graph-grammars/ggx/graph-types';
import {
    HardcodedTypesType
} from '../module-net-types';

export function getNodeOrEdgeType(node: GraGraGraphNodeType, types: HardcodedTypesType): string {
    return node.attributes
        // node or edge node
        .find(attribute => attribute.type === types.gragra.attributes.nodeName
            || attribute.type === types.gragra.attributes.edgeName)
        .value.string;
}

export function makeNodeType(name: string): string {
    return `${name}_nodetype`;
}

export function makeEdgeType(name: string): string {
    return `${name}_edgetype`;
}
