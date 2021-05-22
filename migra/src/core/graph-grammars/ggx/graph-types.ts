export type GraGraMappingType = {
    image: string,
    orig: string,
};

export type GraGraMorphismType = {
    name: string,
    source?: string,
    mappings: GraGraMappingType[],
};

export type GraGraNACType = {
    graph: GraGraGraphType,
    morphism: GraGraMorphismType,
};

export type GraGraApplConditionType = {
    nacs: GraGraNACType[],
};

export type GraGraRuleType = {
    ID: string,
    name: string,
    enabled?: string,
    graphs: GraGraGraphType[],
    morphism: GraGraMorphismType,
    applCondition?: GraGraApplConditionType,
    taggedValues: GraGraTaggedValueType[],
};

export type GraGraAttrTypeType = {
    ID: string,
    attrname: string,
    typename: string,
    visible: string,
};

export type GraGraNodeEdgeTypeType = {
    ID: string,
    name: string,
    attrTypes: GraGraAttrTypeType[],
};

export enum GraGraGraphTypesEnum {
    TYPE_GRAPH = 'TG',
    LHS_GRAPH = 'LHS',
    RHS_GRAPH = 'RHS',
    GRAPH = 'GRAPH',
    HOST = 'HOST',
    NAC = 'NAC',
}

export type GraGraAttributeType = {
    type: string,
    variable?: string,
    constant?: string,
    value: {
        string?: string,
        boolean?: string,
        java?: {
            class: string,
            version: string,
            string: string,
        },
    },
};

export type GraGraGraphNodeType = {
    ID: string,
    type: string,
    attributes: GraGraAttributeType[],
};

export type GraGraGraphEdgeType = {
    ID: string,
    source: string,
    target: string,
    type: string,
    attributes: GraGraAttributeType[],
};

export type GraGraGraphType = {
    ID: string,
    kind: string,
    name: string,
    nodes: GraGraGraphNodeType[],
    edges: GraGraGraphEdgeType[],
};

export type GraGraTypes = {
    nodes: GraGraNodeEdgeTypeType[],
    edges: GraGraNodeEdgeTypeType[],
    typeGraph: GraGraGraphType,
};

export type GraGraTaggedValueType = {
    tag: string,
    tagValue: string,
    taggedValues: GraGraTaggedValueType[],
};

export type GraGra = {
    version: string,
    name: string,
    taggedValues: GraGraTaggedValueType[],
    graphs: GraGraGraphType[],
    types: GraGraTypes,
    rules: GraGraRuleType[],
};