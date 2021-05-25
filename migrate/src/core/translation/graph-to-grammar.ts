import { deduplicate } from '../helpers/sets';
import {
    iterateOverGrammarRename,
    iterateOverGraphRename,
    IteratorNodeTypeEnum,
} from '../graph-grammars/ggx/iterator';
import {
    GraGra,
    GraGraGraphType,
    GraGraGraphNodeType,
    GraGraGraphEdgeType,
    GraGraNodeEdgeTypeType,
    GraGraRuleType,
} from '../graph-grammars/ggx/graph-types';
import {
    HardcodedTypesType
} from './module-net-types';
import {
    graphToTypes,
} from './graph-to-grammar/graph-to-grammar-types';
import {
    graphToRules,
} from './graph-to-grammar/graph-to-grammar-rules';

export function graphGrammarNodeToGrammar(graph: GraGraGraphType, typeNames: HardcodedTypesType): GraGra {
    return {
        version: '1.0',
        name: 'Graph',
        taggedValues: [],
        graphs: [],
        types: graphToTypes(graph, typeNames),
        rules: graphToRules(graph, typeNames),
    };
}

export function graphToGrammars(graph: GraGraGraphType, types: HardcodedTypesType): GraGra[] {
    const graphTransformationSystems = graph.nodes
        .filter(node => node.type === types.gragra.nodes.graphTransformationSystem);
    if (!graphTransformationSystems || graphTransformationSystems.length === 0) {
        throw new Error('missing graph transformation system');
    }
    return graphTransformationSystems
        .map(() => graphGrammarNodeToGrammar(graph, types));
}

function removeReindex(id: string): string {
    return id.split('-').reverse().slice(1).reverse().join('-');
}
function compareNodeEdge(a: GraGraNodeEdgeTypeType, b: GraGraNodeEdgeTypeType): boolean {
    return removeReindex(a.ID) === removeReindex(b.ID)
        && removeReindex(a.name) === removeReindex(b.name);
}
function compareGraphNode(a: GraGraGraphNodeType, b: GraGraGraphNodeType): boolean {
    return removeReindex(a.ID) === removeReindex(b.ID)
        && removeReindex(a.type) === removeReindex(b.type);
}
function compareGraphEdge(a: GraGraGraphEdgeType, b: GraGraGraphEdgeType): boolean {
    return removeReindex(a.ID) === removeReindex(b.ID)
        && removeReindex(a.source) === removeReindex(b.source)
        && removeReindex(a.target) === removeReindex(b.target)
        && removeReindex(a.type) === removeReindex(b.type);
}
function compareRule(a: GraGraRuleType, b: GraGraRuleType): boolean {
    return a.name === b.name;
}

function reindex(suffix: string): (index: string) => string {
    return (index: string) => `${index}${suffix}`;
}
function removeIdTypeIndex(index: string, type: IteratorNodeTypeEnum): string {
    switch (type) {
        case IteratorNodeTypeEnum.GRAPH_NODE_TYPE:
        case IteratorNodeTypeEnum.GRAPH_EDGE_TYPE:
        case IteratorNodeTypeEnum.TYPES_NODE_ID:
        case IteratorNodeTypeEnum.TYPES_EDGE_ID:
            return removeReindex(index);
    }
    return index;
}
// type graph is split and merged, we have to rename it
// this does not apply to other graphs, because they are not split
function removeTypeGraphIndex(index: string, type: IteratorNodeTypeEnum): string {
    switch (type) {
        case IteratorNodeTypeEnum.GRAPH_NODE_ID:
        case IteratorNodeTypeEnum.GRAPH_EDGE_SOURCE:
        case IteratorNodeTypeEnum.GRAPH_EDGE_TARGET:
            return removeReindex(index);
    }
    return index;
}
export function merge(grammars: GraGra[]): GraGra {
    const reindexedGrammars = grammars.map((grammar, i) => iterateOverGrammarRename(grammar, reindex(`-${i}`)));
    const mergedGrammar = { ...reindexedGrammars[0] };
    reindexedGrammars.slice(1).forEach(grammar => {
        mergedGrammar.rules = deduplicate(mergedGrammar.rules.concat(grammar.rules), compareRule),
        mergedGrammar.types = {
            nodes: deduplicate(mergedGrammar.types.nodes.concat(grammar.types.nodes), compareNodeEdge),
            edges: deduplicate(mergedGrammar.types.edges.concat(grammar.types.edges), compareNodeEdge),
            typeGraph: {
                ...mergedGrammar.types.typeGraph,
                nodes: deduplicate(mergedGrammar.types.typeGraph.nodes.concat(grammar.types.typeGraph.nodes), compareGraphNode),
                edges: deduplicate(mergedGrammar.types.typeGraph.edges.concat(grammar.types.typeGraph.edges), compareGraphEdge),
            }
        };
    });
    // wherever there's a reference to a type, I need to update that reference, removing suffix
    // the problem with this is homonyms
    const mergedRenamedGrammar = iterateOverGrammarRename(mergedGrammar, removeIdTypeIndex);
    mergedRenamedGrammar.types.typeGraph = iterateOverGraphRename(mergedRenamedGrammar.types.typeGraph, removeTypeGraphIndex);
    return mergedRenamedGrammar;
}