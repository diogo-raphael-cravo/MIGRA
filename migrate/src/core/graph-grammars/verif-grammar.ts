import { deduplicate } from '../helpers/sets';
import { GraGra, GraGraRuleType, GraGraTypes } from './ggx/graph-types';
import {
    getEdgeTypeIDsWithName,
    makeIDMapEntry,
    getFullNames,
    getFullNamesByRole,
    NodeRolesEnum,
    IDMapEntryType,
} from './verif-grammar-id-map';

type VerifGrammarConfigurationRulePatternType = {
    name: string,
    regex: string,
};

export type VerifGrammarConfigurationType = {
    resourceEdgeName: string,
    attributeEdgeName: string,
    valueNodeName: string,
    modulesToIgnore: string[],
    rulePatterns: VerifGrammarConfigurationRulePatternType[],
};

export type PartialVerifGrammarRuleType = {
    name: string,
    pattern: string,
    contains: string[],
};

export type VerifGrammarRuleType = {
    name: string,
    pattern: string,
    contains: {
        modules: string[],
        resources: string[],
        attributes: string[],
    },
};

export type VerifGrammarType = {
    modules: string[],
    resources: string[],
    attributes: string[],
    rules: VerifGrammarRuleType[],
    idMap: IDMapEntryType[],
};

export function toVerifGrammarRule(graGraRule: GraGraRuleType,
    configuration: VerifGrammarConfigurationType): PartialVerifGrammarRuleType {
    const patternMatches = configuration.rulePatterns
        .filter(rulePattern => null !== graGraRule.name.match(rulePattern.regex));
    if (!patternMatches || patternMatches.length === 0) {
        throw new Error(`Missing rule pattern for rule ${graGraRule.name}`);
    }
    let longest = 0;
    const pattern = patternMatches.reduce((prev, patternCandidate) => {
        const match = graGraRule.name.match(patternCandidate.regex);
        if (longest < match[0].length) {
            longest = match.length;
            return patternCandidate;
        }
        return prev;
    }, patternMatches[0]);
    return {
        name: graGraRule.name,
        pattern: pattern.name,
        contains: graGraRule.graphs.reduce((prev, currentGraph) => prev
            .concat(currentGraph.nodes.map(node => node.type)), []),
    };
}

function getGraphNodeType(graGraTypes: GraGraTypes, nodeGraphID: string) {
    const graphNodeType = graGraTypes.typeGraph.nodes
        .find(graphNode => graphNode.ID === nodeGraphID);
    if (!graphNodeType) {
        throw new Error(`Type graph is missing node with ID ${nodeGraphID}.`);
    }
    return graphNodeType.type;
}

type EdgeNodesRelationType = {
    edgeID: string,
    sourceNodeID: string,
    targetNodeID: string,
};

function makeGraphCollection(graGraTypes: GraGraTypes): EdgeNodesRelationType[] {
    return graGraTypes.edges
        .reduce((prev, edgeType) => {
            const typeGraphEdgesOfEdgeType = graGraTypes.typeGraph.edges
                .filter(typeGraphEdge => typeGraphEdge.type === edgeType.ID);
            const graphCollectionThisEdge = typeGraphEdgesOfEdgeType.map(typeGraphEdge => {
                const sourceNodeID = getGraphNodeType(graGraTypes, typeGraphEdge.source);
                const targetNodeID = getGraphNodeType(graGraTypes, typeGraphEdge.target);
                return {
                    edgeID: edgeType.ID,
                    sourceNodeID,
                    targetNodeID,
                };
            });
            return prev.concat(graphCollectionThisEdge);
        }, []);
}

function getModuleIDs(gragra: GraGra, otherIDs: string[]): string[] {
    return gragra.types.nodes
        .map(nodeType => nodeType.ID)
        .filter(nodeTypeID => !otherIDs
            .find(otherNode => otherNode === nodeTypeID));
}

function getSourceNodeIDs(graphCollection: EdgeNodesRelationType[], edgeIDs: string[]): string[] {
    return graphCollection
        .reduce((prev, entry) => {
            const entryInEdgeIDs = edgeIDs.find(edgeID => entry.edgeID === edgeID);
            if (entryInEdgeIDs) {
                return prev.concat([entry.sourceNodeID]);
            }
            return prev;
        }, []);
}

function getFirstTargetID(graphCollection: EdgeNodesRelationType[], edgeIDs: string[], sourceID: string): string {
    const entry = graphCollection
        .find(entry => edgeIDs
            .find(edgeID => entry.edgeID === edgeID)
            && entry.sourceNodeID === sourceID);
    if (!entry) {
        return null;
    }
    return entry.targetNodeID;
}

function getLowerLevelIDs(graphCollection: EdgeNodesRelationType[], graGraTypes: GraGraTypes,
    configEdgeName: string): string[] {
    if (!configEdgeName) {
        return [];
    }
    const edgeIDs = getEdgeTypeIDsWithName(graGraTypes, configEdgeName);
    if (null === edgeIDs) {
        return [];
    }
    return getSourceNodeIDs(graphCollection, edgeIDs);
}

function makeLowerLevel(graphCollection: EdgeNodesRelationType[], graGraTypes: GraGraTypes, lowerLevelIDs: string[],
    idMap: IDMapEntryType[], configEdgeName: string, role: NodeRolesEnum) {
    return [
        ...idMap,
        ...lowerLevelIDs.map(id => {
            const EdgeIDsToUpperLevel = getEdgeTypeIDsWithName(graGraTypes, configEdgeName);
            const upperLevelID = getFirstTargetID(graphCollection, EdgeIDsToUpperLevel, id);
            return makeIDMapEntry(graGraTypes, id, role, upperLevelID, idMap);
        }),
    ];
}

export function toVerifGrammar(gragra: GraGra, configuration: VerifGrammarConfigurationType): VerifGrammarType {
    const graphCollection = makeGraphCollection(gragra.types);

    const {
        resourceEdgeName,
        attributeEdgeName,
    } = configuration;

    const resourceIDs: string[] = getLowerLevelIDs(graphCollection, gragra.types, resourceEdgeName);
    const attributeIDs: string[] = getLowerLevelIDs(graphCollection, gragra.types, attributeEdgeName);
    const moduleIDs: string[] = getModuleIDs(gragra, [...resourceIDs, ...attributeIDs]);

    let idMap: IDMapEntryType[] = moduleIDs
        .map(id => makeIDMapEntry(gragra.types, id, NodeRolesEnum.MODULE));
    idMap = makeLowerLevel(graphCollection, gragra.types, resourceIDs,
        idMap, resourceEdgeName, NodeRolesEnum.RESOURCE);
    idMap = makeLowerLevel(graphCollection, gragra.types, attributeIDs,
        idMap, attributeEdgeName, NodeRolesEnum.ATTRIBUTE);

    const rules = gragra.rules
        .map(rule => toVerifGrammarRule(rule, configuration))
        .map(rule => ({
            ...rule,
            contains: {
                modules: deduplicate(getFullNamesByRole(rule.contains, idMap, NodeRolesEnum.MODULE))
                    .filter(moduleName => !configuration.modulesToIgnore
                        .find(toIgnore => toIgnore === moduleName)),
                resources: deduplicate(getFullNamesByRole(rule.contains, idMap, NodeRolesEnum.RESOURCE)),
                attributes: deduplicate(getFullNamesByRole(rule.contains, idMap, NodeRolesEnum.ATTRIBUTE)),
            },
        }));
    return {
        idMap,
        rules,
        modules: getFullNames(moduleIDs, idMap)
            .filter(moduleName => !configuration.modulesToIgnore
                .find(toIgnore => toIgnore === moduleName)),
        resources: getFullNames(resourceIDs, idMap),
        attributes: getFullNames(attributeIDs, idMap),
    };
}