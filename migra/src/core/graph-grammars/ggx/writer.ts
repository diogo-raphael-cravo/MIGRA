import * as xml2js from 'xml2js';

import {
    GraGraMorphismType,
    GraGraRuleType,
    GraGraGraphType,
    GraGraTypes,
    GraGra,
    GraGraApplConditionType,
    GraGraTaggedValueType,
    GraGraNodeEdgeTypeType,
    GraGraAttrTypeType,
    GraGraGraphNodeType,
    GraGraAttributeType,
    GraGraGraphEdgeType
} from './graph-types';
import {
    XmlMorphismType,
    XmlRuleType,
    XmlGraphType,
    XmlTypesType,
    XmlGraGraType,
    XmlApplConditionType,
    XmlTaggedValueType,
    XmlNodeEdgeTypeType,
    XmlAttrTypeType,
    XmlGraphNodeType,
    XmlAttributeType,
    XmlGraphEdgeType
} from './xml-types';

export function writeMorphism(grammar: GraGraMorphismType): XmlMorphismType {
    return {
        $: {
            name: grammar.name,
        },
        Mapping: grammar.mappings.map(mapping => ({
            $: {
                image: mapping.image,
                orig: mapping.orig,
            },
        })),
    };
}

export function writeApplCondition(grammar: GraGraApplConditionType): XmlApplConditionType {
    return {
        NAC: grammar.nacs.map(nac => ({
            Graph: writeGraph(nac.graph),
            Morphism: writeMorphism(nac.morphism),
        })),
    };
}

export function writeRules(grammar: GraGraRuleType[]) : XmlRuleType[] {
    return grammar.map(rule => {
        const writtenRule: XmlRuleType = {
            $: {
                ID: rule.ID,
                name: rule.name,
            },
            Graph: rule.graphs.map(graph => writeGraph(graph)),
            Morphism: writeMorphism(rule.morphism),
        };
        if (rule.applCondition && rule.applCondition.nacs
            && rule.applCondition.nacs.length > 0) {
            writtenRule.ApplCondition = writeApplCondition(rule.applCondition);
        }
        if (rule.taggedValues && rule.taggedValues.length > 0) {
            writtenRule.TaggedValue = rule.taggedValues
                .map(taggedValue => writeTaggedValues(taggedValue));
        }
        if ('false' === rule.enabled || 'true' === rule.enabled) {
            writtenRule.$.enabled = rule.enabled;
        }
        return writtenRule;
    });
}

export function writeAttribute(grammar: GraGraAttributeType): XmlAttributeType {
    const attribute: XmlAttributeType = {
        $: {
            type: grammar.type,
            constant: grammar.constant,
            variable: grammar.variable,
        },
        Value: {},
    };
    if (grammar.value.string) {
        attribute.Value.string = grammar.value.string;
    }
    if (grammar.value.boolean) {
        attribute.Value.boolean = grammar.value.boolean;
    }
    if (grammar.value.java) {
        attribute.Value.java = {
            $: {
                class: grammar.value.java.class,
                version: grammar.value.java.version,
            },
            string: grammar.value.java.string,
        };
    }
    return attribute;
}

export function writeNode(grammar: GraGraGraphNodeType): XmlGraphNodeType {
    return {
        $: {
            ID: grammar.ID,
            type: grammar.type,
        },
        Attribute: grammar.attributes
            .map(attribute => writeAttribute(attribute)),
    };
}

export function writeEdge(grammar: GraGraGraphEdgeType): XmlGraphEdgeType {
    return {
        $: {
            ID: grammar.ID,
            source: grammar.source,
            target: grammar.target,
            type: grammar.type,
        },
        Attribute: grammar.attributes
            .map(attribute => writeAttribute(attribute)),
    };
}

export function writeGraph(grammar: GraGraGraphType): XmlGraphType {
    return {
        $: {
            ID: grammar.ID,
            kind: grammar.kind,
            name: grammar.name,
        },
        Node: grammar.nodes.map(node => writeNode(node)),
        Edge: grammar.edges.map(edge => writeEdge(edge)),
    };
}

export function writeAttrType(grammar: GraGraAttrTypeType): XmlAttrTypeType {
    return {
        $: {
            ID: grammar.ID,
            attrname: grammar.attrname,
            typename: grammar.typename,
            visible: grammar.visible,
        },
    };
}

export function writeNodeEdgeTypeType(grammar: GraGraNodeEdgeTypeType): XmlNodeEdgeTypeType {
    return {
        $: {
            ID: grammar.ID,
            name: grammar.name,
        },
        AttrType: grammar.attrTypes.map(attrType => writeAttrType(attrType)),
    };
}

export function writeTypes(grammar: GraGraTypes): XmlTypesType {
    return {
        NodeType: grammar.nodes.map(node => writeNodeEdgeTypeType(node)),
        EdgeType: grammar.edges.map(edge => writeNodeEdgeTypeType(edge)),
        Graph: [writeGraph(grammar.typeGraph)],
    };
}

export function writeTaggedValues(grammar: GraGraTaggedValueType): XmlTaggedValueType {
    return {
        $: {
            Tag: grammar.tag,
            TagValue: grammar.tagValue,
        },
        TaggedValue: grammar.taggedValues
            .map(taggedValue => writeTaggedValues(taggedValue)),
    };
}

export function writeGraphTransformationSystem(grammar: GraGra): XmlGraGraType {
    return {
        $: {
            ID: `${grammar.name}_GraphTransformationSystem_ID`,
            name: grammar.name,
        },
        TaggedValue: grammar.taggedValues.map(taggedValue => writeTaggedValues(taggedValue)),
        Types: writeTypes(grammar.types),
        Graph: grammar.graphs.map(graph => writeGraph(graph)),
        Rule: writeRules(grammar.rules),
    };
}

export function writeGrammar(grammar: GraGra): string {
    const graGra: XmlGraGraType = writeGraphTransformationSystem(grammar);

    const builder = new xml2js.Builder();
    return builder.buildObject({
        Document: {
            $: {
                version: grammar.version,
            },
            GraphTransformationSystem: graGra,
        }
    });
}