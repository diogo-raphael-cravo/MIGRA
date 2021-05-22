import * as xml2js from 'xml2js';
import {
    XmlGraphType,
    XmlMorphismType,
    XmlTagType,
} from '../ggx/xml-types';
import {
    GraGra,
    GraGraGraphType,
    GraGraMorphismType,
} from '../ggx/graph-types';
import {
    parseGraphTransformationSystem,
    parseGraph,
    parseMorphism,
} from '../ggx/parser';

export type GraGraCPAOptions = {
    complete: boolean,
    consistent: boolean,
    directlyStrictConfluent: boolean,
    directlyStrictConfluentUpToIso: boolean,
    essential: boolean,
    ignoreSameMatch: boolean,
    ignoreSameRule: boolean,
    maxBoundOfCriticCause: number,
    namedObject: boolean,
    strongAttrCheck: boolean,
};

export type GraGraOverlappingPairType = {
    graph: GraGraGraphType,
    morphisms: GraGraMorphismType[],
};

export type GraGraContainerRule = {
    R1: string,
    R2: string,
    overlappingPairs: GraGraOverlappingPairType[],
};

export type GraGraContainer = {
    kind: string,
    RuleSet: string[],
    RuleSet2: string[],
    Rules: GraGraContainerRule[],
};

export type GraGraCPX = {
    grammar: GraGra,
    cpaOptions: GraGraCPAOptions,
    conflictContainer: GraGraContainer,
    dependencyContainer: GraGraContainer,
};

function parseBoolean(parsedXml: string): boolean {
    if (parsedXml.toLowerCase() === 'true') {
        return true;
    }
    if (parsedXml.toLowerCase() === 'false') {
        return false;
    }
    throw new Error(`${parsedXml} is not a boolean`);
}

function parseCpaOptions(parsedXml: XmlTagType): GraGraCPAOptions {
    return {
        complete:
            parseBoolean(parsedXml.$.complete),
        consistent:
            parseBoolean(parsedXml.$.consistent),
        directlyStrictConfluent:
            parseBoolean(parsedXml.$.directlyStrictConfluent),
        directlyStrictConfluentUpToIso:
            parseBoolean(parsedXml.$.directlyStrictConfluentUpToIso),
        essential:
            parseBoolean(parsedXml.$.essential),
        ignoreSameMatch:
            parseBoolean(parsedXml.$.ignoreSameMatch),
        ignoreSameRule:
            parseBoolean(parsedXml.$.ignoreSameRule),
        maxBoundOfCriticCause:
            parseInt(parsedXml.$.maxBoundOfCriticCause, 10),
        namedObject:
            parseBoolean(parsedXml.$.namedObject),
        strongAttrCheck:
            parseBoolean(parsedXml.$.strongAttrCheck),
    };
}

export type XmlOverlappingPairType = {
    Graph: XmlGraphType,
    Morphism: XmlMorphismType[],
};

function parseOverlappingPair(parsedXml: XmlOverlappingPairType): GraGraOverlappingPairType {
    return {
        graph: parseGraph(parsedXml.Graph[0]),
        morphisms: parsedXml.Morphism
            .map(morphism => parseMorphism(morphism)),
    };
}

export type XmlRuleType = {
    $: { [key: string]: string },
    Rule: {
        $: { [key: string]: string },
        Overlapping_Pair: XmlOverlappingPairType[],
    }[],
};

function parseRule(parsedXml: XmlRuleType): GraGraContainerRule[] {
    return parsedXml.Rule.map(rule => ({
        R1: parsedXml.$.R1,
        R2: rule.$.R2,
        overlappingPairs: !rule.Overlapping_Pair ? [] : 
            rule.Overlapping_Pair.map(overlappingPair =>
                parseOverlappingPair(overlappingPair)),
    }));
}

function parseRuleSet(parsedXml: XmlTagType): string[] {
    return Object.keys(parsedXml.$)
        .map(key => parsedXml.$[key]);
}

export type XmlContainerType = {
    $: { [key: string]: string },
    RuleSet: XmlTagType[],
    RuleSet2: XmlTagType[],
    Rule: XmlRuleType[],
};

function parseContainer(parsedXml: XmlContainerType): GraGraContainer {
    return {
        kind: parsedXml.$.kind,
        RuleSet: parseRuleSet(parsedXml.RuleSet[0]),
        RuleSet2: parseRuleSet(parsedXml.RuleSet2[0]),
        Rules: parsedXml.Rule.map(rule => parseRule(rule))
            .reduce((prev, curr) => [...prev, ...curr], []),
    };
}

export async function parseXml(xml: string): Promise<GraGraCPX> {
    const parsed = await xml2js.parseStringPromise(xml);
    if (!parsed.Document) {
        throw new Error('Missing Document tag');
    }
    const parsedDocument = parsed.Document;
    if (!parsedDocument.CriticalPairs) {
        throw new Error('Missing Document.CriticalPairs tag');
    }
    const parsedCriticalPairs = parsedDocument.CriticalPairs[0];
    if (!parsedCriticalPairs.GraphTransformationSystem) {
        throw new Error('Missing Document.CriticalPairs.GraphTransformationSystem tag');
    }
    const parsedGraphTransformationSystem = parsedCriticalPairs.GraphTransformationSystem[0];
    const grammar = await parseGraphTransformationSystem(parsedGraphTransformationSystem);

    const parsedCpaOptions = parsedCriticalPairs.cpaOptions;
    if (!parsedCpaOptions) {
        throw new Error('Missing cpaOptions tag');
    }
    const cpaOptions = parseCpaOptions(parsedCpaOptions[0]);

    const parsedConflictContainer = parsedCriticalPairs.conflictContainer;
    if (!parsedConflictContainer || !parsedConflictContainer[0]) {
        throw new Error('Missing conflictContainer tag');
    }

    const parsedDependencyContainer = parsedCriticalPairs.dependencyContainer;
    if (!parsedDependencyContainer || !parsedDependencyContainer[0]) {
        throw new Error('Missing dependencyContainer tag');
    }

    return {
        grammar,
        cpaOptions,
        conflictContainer: parseContainer(parsedConflictContainer[0]),
        dependencyContainer: parseContainer(parsedDependencyContainer[0]),
    };
}