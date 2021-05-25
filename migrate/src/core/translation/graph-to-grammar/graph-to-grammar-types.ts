import { deduplicate } from '../../helpers/sets';
import {
    GraGraGraphType,
    GraGraTypes,
    GraGraGraphTypesEnum,
    GraGraGraphNodeType,
    GraGraNodeEdgeTypeType,
} from '../../graph-grammars/ggx/graph-types';
import {
    HardcodedTypesType
} from '../module-net-types';
import {
    getNodeOrEdgeType,
    makeEdgeType,
    makeNodeType,
} from './helpers';

function nodeToNodeType(node: GraGraGraphNodeType, types: HardcodedTypesType): GraGraNodeEdgeTypeType {
    return {
        ID: makeNodeType(getNodeOrEdgeType(node, types)),
        name: getNodeOrEdgeType(node, types),
        attrTypes: [],
    };
}

function nodeToEdgeType(node: GraGraGraphNodeType, types: HardcodedTypesType): GraGraNodeEdgeTypeType {
    return {
        ID: makeEdgeType(getNodeOrEdgeType(node, types)),
        name: getNodeOrEdgeType(node, types),
        attrTypes: [],
    };
}

function compare(a: GraGraNodeEdgeTypeType, b: GraGraNodeEdgeTypeType): boolean {
    return a.ID === b.ID && a.name === b.name;
}

function getSource(nodes: GraGraGraphNodeType[], edgeNode: GraGraGraphNodeType,
    graph: GraGraGraphType, types: HardcodedTypesType): GraGraGraphNodeType {
    const sourceNodes: GraGraGraphNodeType[] = graph.edges
        .filter(thisEdge => thisEdge.type === types.gragra.edges.source
            && thisEdge.source === edgeNode.ID)
        .map(sourceEdge => nodes.find(node => node.ID === sourceEdge.target));
    if (sourceNodes.length === 0) {
        throw new Error('missing source');
    }
    if (sourceNodes.length > 1) {
        throw new Error('more than one source');
    }
    return sourceNodes[0];
}

function getTarget(nodes: GraGraGraphNodeType[], edgeNode: GraGraGraphNodeType,
    graph: GraGraGraphType, types: HardcodedTypesType): GraGraGraphNodeType {
    const targetNodes: GraGraGraphNodeType[] = graph.edges
        .filter(thisEdge => thisEdge.type === types.gragra.edges.target
            && thisEdge.source === edgeNode.ID)
        .map(sourceEdge => nodes.find(node => node.ID === sourceEdge.target));
    if (targetNodes.length === 0) {
        throw new Error('missing target');
    }
    if (targetNodes.length > 1) {
        throw new Error('more than one target');
    }
    return targetNodes[0];
}

function makeTypeGraphNodeId(nodeType: string): string {
    return `${nodeType}_typegraphid`;
}
export function graphToTypes(graph: GraGraGraphType, typeNames: HardcodedTypesType): GraGraTypes {
    const nodesInGraph: GraGraGraphNodeType[] = graph.nodes;
    const nodeNodes = nodesInGraph.filter(node => node.type === typeNames.gragra.nodes.node);
    const edgeNodes = nodesInGraph.filter(edge => edge.type === typeNames.gragra.nodes.edge);
    const typeGraph: GraGraGraphType = {
        ID: 'TypeGraph',
        name: 'TypeGraph',
        kind: GraGraGraphTypesEnum.TYPE_GRAPH,
        // I) type graph IDs are generated, its nodes and edges
        // are not in the translated grammar host graph
        // types of type graph nodes and edges are IDs of NodeTypes and EdgeTypes
        // II) need to deduplicate due to multiple instances of same type
        nodes: deduplicate(nodeNodes
            .map(node => {
                const nodeType = nodeToNodeType(node, typeNames);
                return {
                    ID: makeTypeGraphNodeId(nodeType.name),
                    type: nodeType.ID,
                    attributes: [],
                };
            }), (a, b) => a.ID === b.ID),
        edges: deduplicate(edgeNodes
            .map(edge => {
                const edgeType = nodeToEdgeType(edge, typeNames);
                const source = getSource(nodeNodes, edge, graph, typeNames);
                const target = getTarget(nodeNodes, edge, graph, typeNames);
                const sourceId = makeTypeGraphNodeId(getNodeOrEdgeType(source, typeNames));
                const targetId = makeTypeGraphNodeId(getNodeOrEdgeType(target, typeNames));
                return {
                    ID: `${edgeType.ID}-${sourceId}-${targetId}_typegraphid`,
                    // source and target IDs are the "types" of the edge source and target nodes
                    source: sourceId,
                    target: targetId,
                    type: edgeType.ID,
                    attributes: [],
                };
            }), (a, b) => a.ID === b.ID),
    };
    return {
        // there may be multiple nodes/edges of the same type
        // thus we have to deduplicate this list
        edges: deduplicate(edgeNodes
            .map(edge => nodeToEdgeType(edge, typeNames)), compare),
        nodes: deduplicate(nodeNodes
            .map(node => nodeToNodeType(node, typeNames)), compare),
        typeGraph,
    };
}
