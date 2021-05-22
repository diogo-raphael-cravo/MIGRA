import {
    GraGraMorphismType,
    GraGraRuleType,
    GraGraGraphType,
    GraGraTypes,
    GraGra,
    GraGraGraphNodeType,
} from './graph-types';

export enum IteratorNodeTypeEnum {
    GRAPH_ID,
    GRAPH_NODE_ID,
    GRAPH_NODE_TYPE,
    GRAPH_EDGE_ID,
    GRAPH_EDGE_SOURCE,
    GRAPH_EDGE_TARGET,
    GRAPH_EDGE_TYPE,
    MORPHISM_MAPPING_IMAGE,
    MORPHISM_MAPPING_ORIG,
    MORPHISM_MAPPING_SOURCE,
    RULE_ID,
    TYPES_NODE_ID,
    TYPES_EDGE_ID,
}

export function iterateOverGraphRename(graph: GraGraGraphType,
    apply: (name: string, type: IteratorNodeTypeEnum) => string): GraGraGraphType {
    return {
        ...graph,
        ID: apply(graph.ID, IteratorNodeTypeEnum.GRAPH_ID),
        nodes: graph.nodes.map(node => ({
            ...node,
            ID: apply(node.ID, IteratorNodeTypeEnum.GRAPH_NODE_ID),
            type: apply(node.type, IteratorNodeTypeEnum.GRAPH_NODE_TYPE),
        })),
        edges: graph.edges.map(edge => ({
            ...edge,
            ID: apply(edge.ID, IteratorNodeTypeEnum.GRAPH_EDGE_ID),
            source: apply(edge.source, IteratorNodeTypeEnum.GRAPH_EDGE_SOURCE),
            target: apply(edge.target, IteratorNodeTypeEnum.GRAPH_EDGE_TARGET),
            type: apply(edge.type, IteratorNodeTypeEnum.GRAPH_EDGE_TYPE),
        })),
    };
}
function iterateOverMorphismRename(morphism: GraGraMorphismType,
    apply: (name: string, type: IteratorNodeTypeEnum) => string): GraGraMorphismType {
    const reindexedMorphism = {
        ...morphism,
        mappings: morphism.mappings.map(mapping => ({
            image: apply(mapping.image, IteratorNodeTypeEnum.MORPHISM_MAPPING_IMAGE),
            orig: apply(mapping.orig, IteratorNodeTypeEnum.MORPHISM_MAPPING_ORIG),
        })),
    };
    if (morphism.source) {
        reindexedMorphism.source = apply(morphism.source, IteratorNodeTypeEnum.MORPHISM_MAPPING_SOURCE);
    }
    return reindexedMorphism;
}
function iterateOverRuleRename(rule: GraGraRuleType,
    apply: (name: string, type: IteratorNodeTypeEnum) => string): GraGraRuleType {
    const reindexedRule: GraGraRuleType = {
        ...rule,
        ID: apply(rule.ID, IteratorNodeTypeEnum.RULE_ID),
        graphs: rule.graphs.map(graph => iterateOverGraphRename(graph, apply)),
        morphism: iterateOverMorphismRename(rule.morphism, apply),
    };
    if (rule.applCondition) {
        reindexedRule.applCondition = {
            nacs: rule.applCondition.nacs.map(nac => ({
                graph: iterateOverGraphRename(nac.graph, apply),
                morphism: iterateOverMorphismRename(nac.morphism, apply),
            })),
        };
    }
    return reindexedRule;
}
function iterateOverTypesRename(type: GraGraTypes,
    apply: (name: string, type: IteratorNodeTypeEnum) => string): GraGraTypes {
    return {
        nodes: type.nodes.map(node => ({
            ...node,
            ID: apply(node.ID, IteratorNodeTypeEnum.TYPES_NODE_ID),
        })),
        edges: type.edges.map(edge => ({
            ...edge,
            ID: apply(edge.ID, IteratorNodeTypeEnum.TYPES_EDGE_ID),
        })),
        typeGraph: iterateOverGraphRename(type.typeGraph, apply),
    };
}
export function iterateOverGrammarRename(grammar: GraGra,
    apply: (name: string, type: IteratorNodeTypeEnum) => string): GraGra {
    return {
        ...grammar,
        graphs: grammar.graphs.map(graph => iterateOverGraphRename(graph, apply)),
        rules: grammar.rules.map(rule => iterateOverRuleRename(rule, apply)),
        types: iterateOverTypesRename(grammar.types, apply),
    };
}
function getNode(id: string, graph: GraGraGraphType): GraGraGraphNodeType {
    return graph.nodes.find(node => id === node.ID);
}
export function retypeEdges(graph: GraGraGraphType, types: string[] = []): GraGraGraphType {
    return {
        ...graph,
        edges: graph.edges
        .map(edge => {
            const source = getNode(edge.source, graph);
            const target = getNode(edge.target, graph);
            const newType = `${edge.type}-${source.type}-${target.type}`;
            types.push(newType);
            return {
                ...edge,
                type: newType,
            };
        }),
    };
}