import * as xml2js from 'xml2js';

import {
    GraGraMappingType,
    GraGraMorphismType,
    GraGraRuleType,
    GraGraGraphTypesEnum,
    GraGraGraphType,
    GraGraTypes,
    GraGra,
    GraGraApplConditionType,
    GraGraTaggedValueType,
    GraGraAttrTypeType,
    GraGraNodeEdgeTypeType,
    GraGraGraphNodeType,
    GraGraGraphEdgeType,
    GraGraAttributeType
} from './graph-types';
import {
    XmlMorphismType,
    XmlRuleType,
    XmlGraphType,
    XmlTypesType,
    XmlGraGraType,
    XmlApplConditionType,
    XmlTaggedValueType,
    XmlAttrTypeType,
    XmlNodeEdgeTypeType,
    XmlGraphNodeType,
    XmlGraphEdgeType,
    XmlAttributeType
} from './xml-types';

export function parseMorphism(parsedXml: XmlMorphismType): GraGraMorphismType {
    let mappings: GraGraMappingType[] = [];
    if (parsedXml.Mapping) {
        mappings = parsedXml.Mapping.map(mapping => ({
            orig: mapping.$.orig,
            image: mapping.$.image,
        }));
    }
    const morphism: GraGraMorphismType = {
        name: parsedXml.$.name,
        mappings,
    };
    if (parsedXml.$.source) {
        return {
            source: parsedXml.$.source,
            ...morphism,
        };
    }
    return morphism;
}

export function parseApplCondition(parsedXml: XmlApplConditionType): GraGraApplConditionType {
    return {
        nacs: parsedXml.NAC.map(nac => ({
            graph: parseGraph(nac.Graph[0]),
            morphism: parseMorphism(nac.Morphism[0]),
        })),
    };
}

export function parseRules(parsedXml: XmlRuleType[]) : GraGraRuleType[] {
    return parsedXml.map(rule => {
        const parsedRule: GraGraRuleType = {
            ID: rule.$.ID,
            name: rule.$.name,
            graphs: rule.Graph.map(graphXml => parseGraph(graphXml)),
            morphism: parseMorphism(rule.Morphism[0]),
            taggedValues: [],
        };
        if (rule.ApplCondition && rule.ApplCondition[0]) {
            parsedRule.applCondition = parseApplCondition(rule.ApplCondition[0]);
        }
        if (rule.TaggedValue && rule.TaggedValue.length > 0) {
            parsedRule.taggedValues = rule.TaggedValue
                .map(taggedValue => parseTaggedValues(taggedValue));
        }
        if ('true' === rule.$.enabled || 'false' === rule.$.enabled) {
            parsedRule.enabled = rule.$.enabled;
        }
        return parsedRule;
    });
}

export function parseAttribute(parsedXml: XmlAttributeType): GraGraAttributeType {
    const attribute: GraGraAttributeType = {
        type: parsedXml.$.type,
        value: {},
    };
    if (parsedXml.Value[0].string && parsedXml.Value[0].string[0]) {
        attribute.value.string = parsedXml.Value[0].string[0];
    }
    if (parsedXml.Value[0].boolean && parsedXml.Value[0].boolean[0]) {
        attribute.value.boolean = parsedXml.Value[0].boolean[0];
    }
    if (parsedXml.$.constant) {
        attribute.constant = parsedXml.$.constant;
    }
    if (parsedXml.$.variable) {
        attribute.variable = parsedXml.$.variable;
    }
    if (parsedXml.Value[0].java && parsedXml.Value[0].java[0]) {
        attribute.value.java = {
            class: parsedXml.Value[0].java[0].$.class,
            version: parsedXml.Value[0].java[0].$.version,
            string: parsedXml.Value[0].java[0].string[0],
        };
    }
    return attribute;
}

export function parseNode(parsedXml: XmlGraphNodeType): GraGraGraphNodeType {
    const attributes = [];
    if (parsedXml.Attribute) {
        attributes.push(...parsedXml.Attribute
            .map(attribute => parseAttribute(attribute)));
    }
    return {
        ID: parsedXml.$.ID,
        type: parsedXml.$.type,
        attributes,
    };
}

export function parseEdge(parsedXml: XmlGraphEdgeType): GraGraGraphEdgeType {
    const attributes = [];
    if (parsedXml.Attribute) {
        attributes.push(...parsedXml.Attribute
            .map(attribute => parseAttribute(attribute)));
    }
    return {
        ID: parsedXml.$.ID,
        source: parsedXml.$.source,
        target: parsedXml.$.target,
        type: parsedXml.$.type,
        attributes,
    };
}

export function parseGraph(parsedXml: XmlGraphType): GraGraGraphType {
    let edges = [];
    if (parsedXml.Edge) {
        edges = parsedXml.Edge.map(edge => parseEdge(edge));
    }
    let nodes = [];
    if (parsedXml.Node) {
        nodes = parsedXml.Node.map(node => parseNode(node));
    }
    return {
        ID: parsedXml.$.ID,
        kind: parsedXml.$.kind,
        name: parsedXml.$.name,
        nodes,
        edges,
    };
}

export function parseAttrType(parsedXml: XmlAttrTypeType): GraGraAttrTypeType {
    return {
        ID: parsedXml.$.ID,
        attrname: parsedXml.$.attrname,
        typename: parsedXml.$.typename,
        visible: parsedXml.$.visible,
    };
}

export function parseNodeEdgeType(parsedXml: XmlNodeEdgeTypeType): GraGraNodeEdgeTypeType {
    const attrTypes = [];
    if (parsedXml.AttrType) {
        attrTypes.push(...parsedXml.AttrType
            .map(attrType => parseAttrType(attrType)));
    }
    return {
        ID: parsedXml.$.ID,
        name: parsedXml.$.name,
        attrTypes,
    };
}

export function parseTypes(parsedXml: XmlTypesType): GraGraTypes {
    return {
        nodes: parsedXml.NodeType.map(node => parseNodeEdgeType(node)),
        edges: parsedXml.EdgeType.map(edge => parseNodeEdgeType(edge)),
        typeGraph: parseGraph(parsedXml.Graph
            .find(x => x.$.kind === GraGraGraphTypesEnum.TYPE_GRAPH)),
    };
}

export function parseTaggedValues(parsedXml: XmlTaggedValueType): GraGraTaggedValueType {
    const taggedValue = {
        tag: parsedXml.$.Tag,
        tagValue: parsedXml.$.TagValue,
        taggedValues: [],
    };
    if (!parsedXml.TaggedValue) {
        return taggedValue;
    }
    taggedValue.taggedValues.push(...parsedXml.TaggedValue
        .map(taggedValue => parseTaggedValues(taggedValue)));
    return taggedValue;
}

export function parseGraphTransformationSystem(parsedXml: XmlGraGraType): GraGra {
    const parsedGraphTransformationSystem = parsedXml;
    if (!parsedGraphTransformationSystem) {
        throw new Error('Document.GraphTransformationSystem tag is not an array');
    }
    if (!parsedGraphTransformationSystem.Types) {
        throw new Error('Missing Document.GraphTransformationSystem.Types tag');
    }
    if (!parsedGraphTransformationSystem.Rule) {
        throw new Error('Missing Document.GraphTransformationSystem.Rule tag');
    }
    let parsedGraphs = [];
    if (parsedGraphTransformationSystem.Graph) {
        parsedGraphs = parsedGraphTransformationSystem.Graph;
    }
    let parsedTaggedValues = [];
    if (parsedGraphTransformationSystem.TaggedValue) {
        parsedTaggedValues = parsedGraphTransformationSystem.TaggedValue;
    }

    const parsedTypes = parsedGraphTransformationSystem.Types[0];
    if (!parsedTypes) {
        throw new Error('Document.GraphTransformationSystem.Types tag is not an array');
    }

    const parsedRule = parsedGraphTransformationSystem.Rule;
    
    return {
        version: '',
        name: parsedXml.$.name,
        taggedValues: parsedTaggedValues.map(taggedValue => parseTaggedValues(taggedValue)),
        graphs: parsedGraphs.map(graph => parseGraph(graph)),
        types: parseTypes(parsedTypes),
        rules: parseRules(parsedRule),
    };
}

export async function parseXml(xml: string): Promise<GraGra> {
    const parsed = await xml2js.parseStringPromise(xml);
    if (!parsed.Document) {
        throw new Error('Missing Document tag');
    }
    const parsedDocument = parsed.Document;
    if (!parsedDocument.GraphTransformationSystem) {
        throw new Error('Missing Document.GraphTransformationSystem tag');
    }
    const parsedGraphTransformationSystem = parsedDocument.GraphTransformationSystem[0];
    return {
        ...parseGraphTransformationSystem(parsedGraphTransformationSystem),
        version: parsedDocument.$.version,
    };
}