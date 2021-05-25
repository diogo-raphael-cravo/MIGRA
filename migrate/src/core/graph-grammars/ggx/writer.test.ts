import { writeGrammar } from './writer';

function makeExpectedXml(types, rules) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Document version="1.0">\n'
        + '    <GraphTransformationSystem ID="name_GraphTransformationSystem_ID" name="name">\n'
        + '<TaggedValue Tag="AttrHandler" TagValue="Java Expr">\n'
        + '    <TaggedValue Tag="Package" TagValue="java.lang"/>\n'
        + '    <TaggedValue Tag="Package" TagValue="java.util"/>\n'
        + '</TaggedValue>\n'
        + '<TaggedValue Tag="CSP" TagValue="true"/>\n'
        + '        <Types>\n'
        + types
        + '        </Types>\n'
        + '        <Graph ID="graph-id" kind="HOST" name="GRAPH"/>\n'
        + '        <Graph ID="graph-id-2" kind="HOST" name="GRAPH-2"/>\n'
        + rules
        + '    </GraphTransformationSystem>\n'
        + '</Document>\n';
}

const typesXml = '            <NodeType ID="N1" name="A%:[NODE]:">\n'
    + '<AttrType ID="I7" attrname="name" typename="String" visible="true"/>\n'
    + '<AttrType ID="I8" attrname="required" typename="boolean" visible="true"/>\n'
    + '</NodeType>\n'
    + '            <NodeType ID="N2" name="A1%:[NODE]:"/>\n'
    + '            <NodeType ID="N3" name="a1%:[NODE]:"/>\n'
    + '            <NodeType ID="N4" name="A1a1%:[NODE]:"/>\n'
    + '            <EdgeType ID="E1" name="resource-of%:[EDGE]:"/>\n'
    + '            <EdgeType ID="E2" name="E1_AB%:[EDGE]:"/>\n';

const ruleWithGraphXml = '            <Graph ID="LeftOf_1.GET.call-E1_AB" kind="LHS" name="LeftOf_1.GET.call-E1_AB">\n'
    + '                <Node ID="LeftOf_1.GET.call-E1_AB_N3" type="N5">\n'
    + '<Attribute type="I4" variable="true">\n'
    + '    <Value>\n'
    + '        <string>mn_name</string>\n'
    + '    </Value>\n'
    + '</Attribute>\n'
    + '<Attribute type="I5" constant="true">\n'
    + '    <Value>\n'
    + '        <boolean>true</boolean>\n'
    + '    </Value>\n'
    + '</Attribute>\n'
    + '<Attribute type="I21">\n'
    + '    <Value>\n'
    + '        <java class="java.beans.XMLDecoder" version="1.8.0_265">\n'
    + '            <string>"generate-"+name</string>\n'
    + '        </java>\n'
    + '    </Value>\n'
    + '</Attribute>\n'
    + '</Node>\n'
    + '                <Node ID="LeftOf_1.GET.call-E1_AB_N1" type="N1"/>\n'
    + '                <Edge ID="LeftOf_1.GET.call-E1_AB_E2"'
    + ' source="LeftOf_1.GET.call-E1_AB_N3" target="LeftOf_1.GET.call-E1_AB_N2" type="E1"/>\n'
    + '            </Graph>\n'
    + '            <Graph ID="RightOf_1.GET.call-E1_AB" kind="RHS" name="RightOf_1.GET.call-E1_AB">\n'
    + '                <Node ID="RightOf_1.GET.call-E1_AB_N3" type="N5"/>\n'
    + '                <Edge ID="RightOf_1.GET.call-E1_AB_E1"'
    + ' source="RightOf_1.GET.call-E1_AB_N1" target="RightOf_1.GET.call-E1_AB_N2" type="E3"/>\n'
    + '                <Edge ID="RightOf_1.GET.call-E1_AB_E2"'
    + ' source="RightOf_1.GET.call-E1_AB_N3" target="RightOf_1.GET.call-E1_AB_N2" type="E1"/>\n'
    + '            </Graph>\n'
    + '            <Morphism name="1.GET.call-E1_AB">\n'
    + '                <Mapping image="RightOf_1.GET.call-E1_AB_N3" orig="LeftOf_1.GET.call-E1_AB_N3"/>\n'
    + '                <Mapping image="RightOf_1.GET.call-E1_AB_N1" orig="LeftOf_1.GET.call-E1_AB_N1"/>\n'
    + '            </Morphism>\n';

const NACXml = '    <NAC>\n'
    + '        <Graph ID="I173" kind="NAC" name="translateOnce">\n'
    + '            <Node ID="I174" type="I2"/>\n'
    + '            <Node ID="I177" type="I39"/>\n'
    + '            <Edge ID="I182" source="I178" target="I177" type="I41"/>\n'
    + '            <Edge ID="I183" source="I174" target="I179" type="I24"/>\n'
    + '        </Graph>\n'
    + '        <Morphism name="translateOnce">\n'
    + '            <Mapping image="I174" orig="I155"/>\n'
    + '            <Mapping image="I177" orig="I158"/>\n'
    + '        </Morphism>\n'
    + '    </NAC>\n';

const rulesXml = '        <Rule ID="1.GET.call-E1_AB" name="1.GET.call-E1_AB" enabled="true">\n'
    + ruleWithGraphXml
    + '<ApplCondition>\n'
    + NACXml
    + NACXml
    + '</ApplCondition>\n'
    + '<TaggedValue Tag="layer" TagValue="5"/>\n'
    + '<TaggedValue Tag="priority" TagValue="2"/>\n'
    + '        </Rule>\n'
    + '        <Rule ID="2.GET.return-E1_AB" name="2.GET.return-E1_AB" enabled="false">\n'
    + ruleWithGraphXml
    + '        </Rule>\n'
    + '        <Rule ID="require-A.A1.a1" name="require-A.A1.a1" enabled="false">\n'
    + ruleWithGraphXml
    + '        </Rule>\n'
    + '        <Rule ID="generate-A.A1.a1" name="generate-A.A1.a1" enabled="false">\n'
    + ruleWithGraphXml
    + '        </Rule>\n'
    + '        <Rule ID="mockgenerate-A.A1.a1" name="mockgenerate-A.A1.a1">\n'
    + ruleWithGraphXml
    + '        </Rule>\n';

const graphXml = '        <Graph ID="TypeGraph" kind="TG" name="TypeGraph">\n'
    + '               <Node ID="TypeGraph_n5" type="N5"/>\n'
    + '               <Node ID="TypeGraph_n4" type="N4"/>\n'
    + '               <Node ID="TypeGraph_n2" type="N2"/>\n'
    + '               <Node ID="TypeGraph_n3" type="N3"/>\n'
    + '               <Node ID="TypeGraph_n1" type="N1"/>\n'
    + '               <Edge ID="TypeGraph_e4"'
    + ' source="TypeGraph_n3" target="TypeGraph_n2" type="E4"/>\n'
    + '               <Edge ID="TypeGraph_e3"'
    + ' source="TypeGraph_n1" target="TypeGraph_n2" type="E3"/>\n'
    + '               <Edge ID="TypeGraph_e2"'
    + ' source="TypeGraph_n4" target="TypeGraph_n1" type="E2"/>\n'
    + '               <Edge ID="TypeGraph_e1"'
    + ' source="TypeGraph_n5" target="TypeGraph_n2" type="E1"/>\n'
    + '           </Graph>\n';

const nac = {
    graph: {
        ID: 'I173',
        kind: 'NAC',
        name: 'translateOnce',
        nodes: [{
            ID: 'I174',
            type: 'I2',
            attributes: [],
        }, {
            ID: 'I177',
            type: 'I39',
            attributes: [],
        }],
        edges: [{
            ID: 'I182',
            type: 'I41',
            source: 'I178',
            target: 'I177',
            attributes: [],
        }, {
            ID: 'I183',
            type: 'I24',
            source: 'I174',
            target: 'I179',
            attributes: [],
        }],
    },
    morphism: {
        name: 'translateOnce',
        mappings: [{
            image: 'I174',
            orig: 'I155',
        }, {
            image: 'I177',
            orig: 'I158',
        }],
    }
};

const applCondition = {
    nacs: [
        nac,
        nac,
    ],
};

const ruleGraph = {
    graphs: [{
        ID: 'LeftOf_1.GET.call-E1_AB',
        kind: 'LHS',
        name: 'LeftOf_1.GET.call-E1_AB',
        nodes: [{
            ID: 'LeftOf_1.GET.call-E1_AB_N3',
            type: 'N5',
            attributes: [{
                type: 'I4',
                variable: 'true',
                value: {
                    string: 'mn_name',
                },
            }, {
                type: 'I5',
                constant: 'true',
                value: {
                    boolean: 'true',
                },
            }, {
                type: 'I21',
                value: {
                    java: {
                        class: 'java.beans.XMLDecoder',
                        version: '1.8.0_265',
                        string: '"generate-"+name',
                    },
                },
            }]
        }, {
            ID: 'LeftOf_1.GET.call-E1_AB_N1',
            type: 'N1',
            attributes: [],
        }],
        edges: [{
            ID: 'LeftOf_1.GET.call-E1_AB_E2',
            type: 'E1',
            source: 'LeftOf_1.GET.call-E1_AB_N3',
            target: 'LeftOf_1.GET.call-E1_AB_N2',
            attributes: [],
        }],
    }, {
        ID: 'RightOf_1.GET.call-E1_AB',
        kind: 'RHS',
        name: 'RightOf_1.GET.call-E1_AB',
        nodes: [{
            ID: 'RightOf_1.GET.call-E1_AB_N3',
            type: 'N5',
            attributes: [],
        }],
        edges: [{
            ID: 'RightOf_1.GET.call-E1_AB_E1',
            type: 'E3',
            source: 'RightOf_1.GET.call-E1_AB_N1',
            target: 'RightOf_1.GET.call-E1_AB_N2',
            attributes: [],
        }, {
            ID: 'RightOf_1.GET.call-E1_AB_E2',
            type: 'E1',
            source: 'RightOf_1.GET.call-E1_AB_N3',
            target: 'RightOf_1.GET.call-E1_AB_N2',
            attributes: [],
        }],
    }],
    morphism: {
        name: '1.GET.call-E1_AB',
        mappings: [{
            image: 'RightOf_1.GET.call-E1_AB_N3',
            orig: 'LeftOf_1.GET.call-E1_AB_N3',
        }, {
            image: 'RightOf_1.GET.call-E1_AB_N1',
            orig: 'LeftOf_1.GET.call-E1_AB_N1',
        }],
    },
};

const ruleTaggedValues = [{
    tag: 'layer',
    tagValue: '5',
    taggedValues: [],
}, {
    tag: 'priority',
    tagValue: '2',
    taggedValues: [],
}];

const grammarRules = [{
    ID: '1.GET.call-E1_AB',
    name: '1.GET.call-E1_AB',
    enabled: 'true',
    ...ruleGraph,
    applCondition,
    taggedValues: ruleTaggedValues,
}, {
    ID: '2.GET.return-E1_AB',
    name: '2.GET.return-E1_AB',
    enabled: 'false',
    ...ruleGraph,
    taggedValues: [],
}, {
    ID: 'require-A.A1.a1',
    name: 'require-A.A1.a1',
    enabled: 'false',
    ...ruleGraph,
    taggedValues: [],
}, {
    ID: 'generate-A.A1.a1',
    name: 'generate-A.A1.a1',
    enabled: 'false',
    ...ruleGraph,
    taggedValues: [],
}, {
    ID: 'mockgenerate-A.A1.a1',
    name: 'mockgenerate-A.A1.a1',
    ...ruleGraph,
    taggedValues: [],
}];

const grammarTypeGraph = {
    ID: 'TypeGraph',
    kind: 'TG',
    name: 'TypeGraph',
    nodes: [{
        ID: 'TypeGraph_n5',
        type: 'N5',
        attributes: [],
    }, {
        ID: 'TypeGraph_n4',
        type: 'N4',
        attributes: [],
    }, {
        ID: 'TypeGraph_n2',
        type: 'N2',
        attributes: [],
    }, {
        ID: 'TypeGraph_n3',
        type: 'N3',
        attributes: [],
    }, {
        ID: 'TypeGraph_n1',
        type: 'N1',
        attributes: [],
    }],
    edges: [{
        ID: 'TypeGraph_e4',
        type: 'E4',
        source: 'TypeGraph_n3',
        target: 'TypeGraph_n2',
        attributes: [],
    }, {
        ID: 'TypeGraph_e3',
        type: 'E3',
        source: 'TypeGraph_n1',
        target: 'TypeGraph_n2',
        attributes: [],
    }, {
        ID: 'TypeGraph_e2',
        type: 'E2',
        source: 'TypeGraph_n4',
        target: 'TypeGraph_n1',
        attributes: [],
    }, {
        ID: 'TypeGraph_e1',
        type: 'E1',
        source: 'TypeGraph_n5',
        target: 'TypeGraph_n2',
        attributes: [],
    }],
};

const grammarTypes = {
    nodes: [{
        ID: 'N1',
        name: 'A%:[NODE]:',
        attrTypes: [{
            ID: 'I7',
            attrname: 'name',
            typename: 'String',
            visible: 'true',
        }, {
            ID: 'I8',
            attrname: 'required',
            typename: 'boolean',
            visible: 'true',
        }],
    }, {
        ID: 'N2',
        name: 'A1%:[NODE]:',
        attrTypes: [],
    }, {
        ID: 'N3',
        name: 'a1%:[NODE]:',
        attrTypes: [],
    }, {
        ID: 'N4',
        name: 'A1a1%:[NODE]:',
        attrTypes: [],
    }],
    edges: [{
        ID: 'E1',
        name: 'resource-of%:[EDGE]:',
        attrTypes: [],
    }, {
        ID: 'E2',
        name: 'E1_AB%:[EDGE]:',
        attrTypes: [],
    }],
    typeGraph: grammarTypeGraph,
};

const grammarGraphs = [{
    ID: 'graph-id',
    kind: 'HOST',
    name: 'GRAPH',
    nodes: [],
    edges: [],
}, {
    ID: 'graph-id-2',
    kind: 'HOST',
    name: 'GRAPH-2',
    nodes: [],
    edges: [],
}];

const grammarTaggedValues = [{
    tag: 'AttrHandler',
    tagValue: 'Java Expr',
    taggedValues: [{
        tag: 'Package',
        tagValue: 'java.lang',
        taggedValues: [],
    }, {
        tag: 'Package',
        tagValue: 'java.util',
        taggedValues: [],
    }]
}, {
    tag: 'CSP',
    tagValue: 'true',
    taggedValues: [],
}];

function trim(xml: string): string {
    return xml.split('\n')
        .map(x => x.trim())
        .join('\n')
        .trim();
}

describe('ggx-writer', () => {
    it('writes ggx', () => {
        const actualXml = writeGrammar({
            version: '1.0',
            name: 'name',
            taggedValues: grammarTaggedValues,
            graphs: grammarGraphs,
            types: grammarTypes,
            rules: grammarRules,
        });
        expect(trim(actualXml))
            .toStrictEqual(trim(makeExpectedXml(typesXml + graphXml, rulesXml)));
    });
});