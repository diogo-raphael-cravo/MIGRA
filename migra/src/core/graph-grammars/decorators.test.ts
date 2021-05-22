import {
    GraGra,
    GraGraRuleType,
    GraGraMorphismType,
    GraGraGraphType,
    GraGraGraphNodeType,
    GraGraGraphEdgeType,
    GraGraNodeEdgeTypeType,
    GraGraTypes,
    GraGraGraphTypesEnum,
} from './ggx/graph-types';
import { VerifGrammarConfigurationType } from './verif-grammar';
import {
    GraGraCPX,
    GraGraCPAOptions,
    GraGraContainer,
} from './cpx/parser';
import {
    IDMapEntryType,
    NodeRolesEnum,
} from './verif-grammar-id-map';

export function decorateIDMapEntry(entry: Record<string, unknown>) : IDMapEntryType {
    return {
        ID: '',
        fullName: '',
        name: '',
        role: NodeRolesEnum.MODULE,
        ...entry,
    };
}

export function decorateContainer(container: Record<string, unknown>): GraGraContainer {
    return {
        RuleSet: [],
        RuleSet2: [],
        Rules: [],
        kind: '',
        ...container,
    };
}

export function decorateCpaOptions(cpa: Record<string, unknown>): GraGraCPAOptions {
    return {
        complete: false,
        consistent: false,
        directlyStrictConfluent: false,
        directlyStrictConfluentUpToIso: false,
        essential: false,
        ignoreSameMatch: false,
        ignoreSameRule: false,
        maxBoundOfCriticCause: 0,
        namedObject: false,
        strongAttrCheck: false,
        ...cpa,
    };
}

export function decorateGraGraCPX(cpx: Record<string, unknown>): GraGraCPX {
    return {
        grammar: decorateGrammar({}),
        cpaOptions: decorateCpaOptions({}),
        conflictContainer: decorateContainer({}),
        dependencyContainer: decorateContainer({}),
        ...cpx,
    };
}

export function decorateTypes(types: Record<string, unknown>): GraGraTypes {
    return {
        nodes: decorateTypeGraphNodes([]),
        edges: decorateTypeGraphEdges([]),
        typeGraph: decorateGraph({}),
        ...types,
    };
}

export function decorateMorphism(morphism: Record<string, unknown>): GraGraMorphismType {
    return {
        name: '',
        source: '',
        mappings: [],
        ...morphism,
    };
}

export function decorateConfiguration(configuration: Record<string, unknown>): VerifGrammarConfigurationType {
    return {
        resourceEdgeName: '',
        attributeEdgeName: '',
        valueNodeName: '',
        rulePatterns: [],
        modulesToIgnore: [],
        ...configuration,
    };
}

export function decorateTypeGraphNodes(typeGraphNodes: Record<string, unknown>[]): GraGraNodeEdgeTypeType[] {
    return typeGraphNodes.map(x => ({
        ID: '',
        name: '',
        attrTypes: [],
        ...x,
    }));
}

export function decorateTypeGraphEdges(typeGraphEdges: Record<string, unknown>[]): GraGraNodeEdgeTypeType[] {
    return typeGraphEdges.map(x => ({
        ID: '',
        name: '',
        attrTypes: [],
        ...x,
    }));
}

export function decorateGraph(typeGraph: Record<string, unknown>): GraGraGraphType {
    return {
        ID: '',
        kind: GraGraGraphTypesEnum.TYPE_GRAPH,
        name: '',
        nodes: [],
        edges: [],
        ...typeGraph,
    };
}

export function decorateNodesOrEdges(nodesOrEdges: Record<string, unknown>[]): (GraGraGraphNodeType | GraGraGraphEdgeType)[] {
    return nodesOrEdges.map(x => ({
        ID: '',
        source: '',
        target: '',
        type: '',
        attributes: [],
        ...x,
    }));
}

export function decorateGrammar(grammar: Record<string, unknown>): GraGra {
    return {
        version: '',
        name: '',
        graphs: [],
        types: {
            nodes: [],
            edges: [],
            typeGraph: decorateGraph({}),
        },
        rules: [],
        taggedValues: [],
        ...grammar,
    };
}

export function decorateRule(rule: Record<string, unknown>): GraGraRuleType {
    return {
        ID: '',
        name: '',
        graphs: [],
        morphism: {
            name: '',
            mappings: [],
        },
        taggedValues: [],
        ...rule,
    };
}