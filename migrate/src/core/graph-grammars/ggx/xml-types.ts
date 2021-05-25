export type XmlTaggedValueType = {
    $: { [key: string]: string },
    TaggedValue: XmlTaggedValueType[],
};

export type XmlGraGraType = {
    $: { [key: string]: string },
    TaggedValue?: XmlTaggedValueType[],
    Graph?: XmlGraphType[],
    Types: XmlTypesType,
    Rule: XmlRuleType[],
};

export type XmlTagType = {
    $: { [key: string]: string },
};

export type XmlAttrTypeType = {
    $: {
        ID: string,
        attrname: string,
        typename: string,
        visible: string,
    },
};

export type XmlNodeEdgeTypeType = {
    $: { [key: string]: string },
    AttrType: XmlAttrTypeType[],
};

export type XmlTypesType = {
    NodeType: XmlNodeEdgeTypeType[],
    EdgeType: XmlNodeEdgeTypeType[],
    Graph: XmlGraphType[],
};

export type XmlMorphismType = {
    $: { [key: string]: string },
    Mapping: XmlTagType[],
};

export type XmlNACType = {
    Graph: XmlGraphType,
    Morphism: XmlMorphismType,
};

export type XmlApplConditionType = {
    NAC: XmlNACType[],
};

export type XmlRuleType = {
    $: { [key: string]: string },
    Graph: XmlGraphType[],
    Morphism: XmlMorphismType,
    ApplCondition?: XmlApplConditionType,
    TaggedValue?: XmlTaggedValueType[],
};

export type XmlAttributeType = {
    $: {
        type: string,
        variable?: string,
        constant?: string,
    },
    Value: {
        string?: string,
        boolean?: string,
        java?: {
            $: {
                class: string,
                version: string,
            },
            string: string,
        }
    },
};

export type XmlGraphNodeType = {
    $: {
        ID: string,
        type: string,
    },
    Attribute: XmlAttributeType[],
};

export type XmlGraphEdgeType = {
    $: {
        ID: string,
        type: string,
        source: string,
        target: string,
    },
    Attribute: XmlAttributeType[],
};

export type XmlGraphType = {
    $: { [key: string]: string },
    Node: XmlGraphNodeType[],
    Edge: XmlGraphEdgeType[],
};