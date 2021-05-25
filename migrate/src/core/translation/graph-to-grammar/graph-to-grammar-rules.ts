import { id as generateId } from '../../helpers/uuid';
import { deduplicate } from '../../helpers/sets';
import {
    GraGraGraphType,
    GraGraGraphTypesEnum,
    GraGraGraphNodeType,
    GraGraGraphEdgeType,
    GraGraRuleType,
    GraGraMorphismType,
    GraGraMappingType,
} from '../../graph-grammars/ggx/graph-types';
import {
    HardcodedTypesType
} from '../module-net-types';
import {
    getNodeOrEdgeType,
    makeEdgeType,
    makeNodeType,
} from './helpers';

function nodeToNode(node: GraGraGraphNodeType, types: HardcodedTypesType, idMapping: Record<string, string>): GraGraGraphNodeType {
    const IDAttribute = node.attributes
        .find(attribute => attribute.type === types.gragra.attributes.id);
    const idInMapping = idMapping[node.ID];
    let id;
    if (idInMapping) {
        id = idInMapping;
    } else {
        id = IDAttribute ? IDAttribute.value.string : generateId();
        idMapping[node.ID] = id;
    }
    return {
        ID: id,
        type: makeNodeType(getNodeOrEdgeType(node, types)),
        attributes: [],
    };
}

function nodeToEdge(node: GraGraGraphNodeType, source: string, target: string, types: HardcodedTypesType, idMapping: Record<string, string>): GraGraGraphEdgeType {
    const idInMapping = idMapping[node.ID];
    let id;
    if (idInMapping) {
        id = idInMapping;
    } else {
        id = generateId();
        idMapping[node.ID] = id;
    }
    return {
        ID: id,
        type: makeEdgeType(getNodeOrEdgeType(node, types)),
        source,
        target,
        attributes: [],
    };
}

function getNodesInGraph(graphNode: GraGraGraphNodeType, graph: GraGraGraphType, type: string): GraGraGraphNodeType[] {
    return graph.edges
        .filter(edge => edge.type === type && edge.target === graphNode.ID)
        .map(edge => graph.nodes.find(node => node.ID === edge.source));
}

function getSource(nodes: GraGraGraphNodeType[], edgeNode: GraGraGraphNodeType,
    graph: GraGraGraphType, types: HardcodedTypesType): GraGraGraphNodeType {
    const sourceNodes: GraGraGraphNodeType[] = graph.edges
        .filter(thisEdge => thisEdge.type === types.gragra.edges.source
            && thisEdge.source === edgeNode.ID)
        .map(sourceEdge => nodes.find(node => node.ID === sourceEdge.target));
    if (sourceNodes.length === 0 || !sourceNodes[0]) {
        throw new Error(`missing source node for edge node ${edgeNode.ID}`);
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
    if (targetNodes.length === 0 || !targetNodes[0]) {
        throw new Error(`missing target node for edge node ${edgeNode.ID}`);
    }
    if (targetNodes.length > 1) {
        throw new Error('more than one target');
    }
    return targetNodes[0];
}

type GraphTranslationNodeEntryType = {
    from: GraGraGraphNodeType,
    to: GraGraGraphNodeType,
};
type GraphTranslationEdgeEntryType = {
    from: GraGraGraphNodeType,
    to: GraGraGraphEdgeType,
};
type GraphTranslationType = {
    nodes: GraphTranslationNodeEntryType[],
    edges: GraphTranslationEdgeEntryType[],
};
function graphNodeToGraphTranslation(graphNode: GraGraGraphNodeType, graph: GraGraGraphType,
    types: HardcodedTypesType, idMapping: Record<string, string>): GraphTranslationType {
    const nodesInGraph: GraGraGraphNodeType[] = getNodesInGraph(graphNode, graph, types.gragra.edges.in);
    const nodeNodes = nodesInGraph.filter(node => node.type === types.gragra.nodes.node);
    const edgeNodes = nodesInGraph.filter(edge => edge.type === types.gragra.nodes.edge);
    return {
        nodes: nodeNodes.map(node => ({
            from: node,
            to: nodeToNode(node, types, idMapping),
        })),
        edges: edgeNodes.map(edge => {
            const source = getSource(nodeNodes, edge, graph, types);
            const target = getTarget(nodeNodes, edge, graph, types);
            return {
                from: edge,
                to: nodeToEdge(edge, nodeToNode(source, types, idMapping).ID, nodeToNode(target, types, idMapping).ID, types, idMapping),
            };
        }),
    };
}

function graphNodeToGraph(graphNode: GraGraGraphNodeType, name: string, type: GraGraGraphTypesEnum,
    graph: GraGraGraphType, types: HardcodedTypesType, idMapping: Record<string, string>): GraGraGraphType {
    const nodesInGraph: GraGraGraphNodeType[] = getNodesInGraph(graphNode, graph, types.gragra.edges.in);
    const nodeNodes = nodesInGraph.filter(node => node.type === types.gragra.nodes.node);
    const edgeNodes = nodesInGraph.filter(edge => edge.type === types.gragra.nodes.edge);
    return {
        ID: name,
        kind: type,
        name,
        // nodes that have attribute id may have same id, must deduplicate to make sure
        // we only have one node of each id
        nodes: deduplicate(nodeNodes.map(node => nodeToNode(node, types, idMapping)), (a, b) => a.ID === b.ID),
        edges: edgeNodes.map(edge => {
            const source = getSource(nodeNodes, edge, graph, types);
            try {
                getTarget(nodeNodes, edge, graph, types);
            } catch (err) {
                console.log(' in graph ', graphNode.ID);
            }
            const target = getTarget(nodeNodes, edge, graph, types);
            return nodeToEdge(edge, nodeToNode(source, types, idMapping).ID, nodeToNode(target, types, idMapping).ID, types, idMapping);
        }),
    };
}

function prefix(name: string, graph: GraGraGraphType): string {
    return `${graph.name}_${name}_ID`;
}

function prefixGraphIDs(graph: GraGraGraphType): GraGraGraphType {
    return {
        ...graph,
        nodes: graph.nodes.map(node => ({
            ...node,
            ID: prefix(node.ID, graph),
        })),
        edges: graph.edges.map(edge => ({
            ...edge,
            ID: prefix(edge.ID, graph),
            source: prefix(edge.source, graph),
            target: prefix(edge.target, graph),
        })),
    };
}

function makeMorphism(morphismName: string, sourceNode: GraGraGraphNodeType, sourceGraph: GraGraGraphType, 
    targetNode: GraGraGraphNodeType, targetGraph: GraGraGraphType,
    graph: GraGraGraphType, types: HardcodedTypesType, idMapping: Record<string, string>): GraGraMorphismType {
    const lhsTranslation: GraphTranslationType = graphNodeToGraphTranslation(sourceNode, graph, types, idMapping);
    const rhsTranslation: GraphTranslationType = graphNodeToGraphTranslation(targetNode, graph, types, idMapping);
    const nodesInBoth: GraGraMappingType[] = lhsTranslation.nodes
        .map(lhsNode => {
            const image = rhsTranslation.nodes.find(rhsNode => lhsNode.from.ID === rhsNode.from.ID);
            if (!image) {
                return null;
            }
            return {
                orig: lhsNode.to.ID,
                image: image.to.ID,
            };
        })
        .filter(x => null !== x);
    const edgesInBoth: GraGraMappingType[] = lhsTranslation.edges
        .map(lhsEdge => {
            const image = rhsTranslation.edges.find(rhsEdge => lhsEdge.from.ID === rhsEdge.from.ID);
            if (!image) {
                return null;
            }
            return {
                orig: lhsEdge.to.ID,
                image: image.to.ID,
            };
        })
        .filter(x => null !== x);
    return {
        name: morphismName, // morphism name is the actual rule name displayed by AGG
        mappings: [
            ...nodesInBoth.map(node => ({
                orig: prefix(node.orig, sourceGraph),
                image: prefix(node.image, targetGraph),
            })),
            ...edgesInBoth.map(edge => ({
                orig: prefix(edge.orig, sourceGraph),
                image: prefix(edge.image, targetGraph),
            }))
        ],
    };
}

function nodeToRule(ruleNode: GraGraGraphNodeType, graph: GraGraGraphType, types: HardcodedTypesType): GraGraRuleType {
    const idMapping: Record<string, string> = {};
    const lhsNode: GraGraGraphNodeType = getNodesInGraph(ruleNode, graph, types.gragra.edges.lhs)[0];
    if (!lhsNode) {
        throw new Error(`missing lhs for rule ${ruleNode.ID}`);
    }
    const lhsGraph: GraGraGraphType = graphNodeToGraph(lhsNode, `${ruleNode.ID}_${lhsNode.ID}`,
        GraGraGraphTypesEnum.LHS_GRAPH, graph, types, idMapping);
    
    const rhsNode: GraGraGraphNodeType = getNodesInGraph(ruleNode, graph, types.gragra.edges.rhs)[0];
    if (!rhsNode) {
        throw new Error(`missing rhs for rule ${ruleNode.ID}`);
    }
    const rhsGraph: GraGraGraphType = graphNodeToGraph(rhsNode, `${ruleNode.ID}_${rhsNode.ID}`,
        GraGraGraphTypesEnum.RHS_GRAPH, graph, types, idMapping);

    const ruleName = ruleNode.attributes[0].value.string;
    const rule: GraGraRuleType = {
        ID: ruleNode.ID,
        name: ruleName,
        graphs: [
            prefixGraphIDs(lhsGraph),
            prefixGraphIDs(rhsGraph),
        ],
        morphism: makeMorphism(ruleName, lhsNode, lhsGraph, rhsNode, rhsGraph, graph, types, idMapping),
        taggedValues: [],
    };
    
    const nacNodes: GraGraGraphNodeType[] = getNodesInGraph(ruleNode, graph, types.gragra.edges.nac);
    if (!nacNodes || nacNodes.length === 0) {
        return rule;
    }
    rule.applCondition = {
        nacs: [],
    };
    nacNodes.forEach(nacNode => {
        const nacGraph: GraGraGraphType = graphNodeToGraph(nacNode, `${ruleNode.ID}_${nacNode.ID}`,
            GraGraGraphTypesEnum.NAC, graph, types, idMapping);
        rule.applCondition.nacs.push({
            graph: prefixGraphIDs(nacGraph),
            morphism: makeMorphism(generateId(), lhsNode, lhsGraph, nacNode, nacGraph, graph, types, idMapping),
        });
    });
    return rule;
}

export function graphToRules(graph: GraGraGraphType, types: HardcodedTypesType): GraGraRuleType[] {
    return graph.nodes.map(node => {
        if (node.type !== types.gragra.nodes.rule) {
            return null;
        }
        return nodeToRule(node, graph, types);
    })
    .filter(node => null !== node);
}