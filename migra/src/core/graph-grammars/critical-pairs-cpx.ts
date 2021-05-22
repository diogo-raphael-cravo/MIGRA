import {
    TableType,
    PairEnum,
    TablePairType,
    TablePairValueType,
} from './critical-pairs';
import {
    GraGraCPX,
    GraGraContainer,
    GraGraContainerRule,
    GraGraOverlappingPairType,
} from './cpx/parser';
import {
    GraGraGraphType,
    GraGraMorphismType,
    GraGraGraphNodeType,
} from './ggx/graph-types';
import {
    IDMapEntryType,
    getEntry,
    getFullNames,
} from './verif-grammar-id-map';

export type InformationRelayNodeType = {
    nodeType: string,
    inSourceRule: boolean,
    inTargetRule: boolean,
};

export type InformationRelayType = {
    fromType: InformationRelayNodeType,
    toType: InformationRelayNodeType,
};

export type OverlapType = {
    name: string,
    fromRule: string,
    toRule: string,
    criticalObjectTypes: string[],
    informationRelay: InformationRelayType[],
};

export type CPXCriticalPairsType = {
    [ key in PairEnum ]?: CPXTableType
};

export type CPXTableType = {
    overlaps: OverlapType[],
} & TableType;

export class CPXParserError extends Error {}

function parseName(name: string): PairEnum {
    switch(name) {
        case 'delete-use':
            return PairEnum.DELETE_USE_CONFLICT;
        case 'produce-dangling':
            return PairEnum.PRODUCE_DANGLING_CONFLICT;
        case 'produce-forbid':
            return PairEnum.PRODUCE_FORBID_CONFLICT;
        case 'produce-use':
            return PairEnum.PRODUCE_USE_DEPENDENCY;
        case 'remove-dangling':
            return PairEnum.REMOVE_DANGLING_DEPENDENCY;
        case 'delete-forbid':
            return PairEnum.DELETE_FORBID_DEPENDENCY;
        case 'deliver-delete':
            return PairEnum.DELIVER_DELETE;
        case 'delete-dangling':
            return PairEnum.DELETE_DANGLING;
        default:
            throw new CPXParserError(`cannot parseName ${name}`);
    }
}

// ( 1 ) produce-use-verigraph-dependency
function getRulePair(graphName: string) {
    const names = graphName.split(')')[1].split('-');
    const pairName = `${names[0]}-${names[1]}`;
    return parseName(pairName.trim());
}

function makePair(criticalPairs: CPXCriticalPairsType, rule: GraGraContainerRule, overlapType: PairEnum) : CPXCriticalPairsType{
    const hasPairThisRule = criticalPairs[overlapType]
    .pairs[rule.R1];
    if (!hasPairThisRule) {
        criticalPairs[overlapType].pairs[rule.R1] = {};
    }
    const hasPairBothRules = criticalPairs[overlapType].pairs[rule.R1][rule.R2];
    if (!hasPairBothRules) {
        criticalPairs[overlapType].pairs[rule.R1][rule.R2] = 0;
    }
    criticalPairs[overlapType].pairs[rule.R1][rule.R2] += 1;
    return criticalPairs;
}

function nodeTypeInMorphism(morphism: GraGraMorphismType, nodeID: string): boolean {
    return undefined !== morphism.mappings.find(({ image }) => image === nodeID);
}

function getCriticalObjectNodes(overlap: GraGraOverlappingPairType): string[] {
    return overlap.graph.nodes.filter(node => 
        nodeTypeInMorphism(overlap.morphisms[0], node.ID)
            && nodeTypeInMorphism(overlap.morphisms[1], node.ID))
        .map(({ type }) => type);
}

/**
 * Finds all sets {A,B,C} such that:
 *    A   B   C
 *    /\ / \ /\
 *      \ | /
 *        V
 */
function getNodeConnectionsToValue(graph: GraGraGraphType, valueNodeID: string): GraGraGraphNodeType[] {
    return graph.edges.filter(({ source }) => source === valueNodeID)
        .map(({ target }) => graph.nodes.find(({ ID }) => ID === target));
}

function getValueNodes(graph: GraGraGraphType, valueNodeType: string): string[] {
    return graph.nodes.filter(({ type }) => type === valueNodeType)
        .map(({ ID }) => ID);
}

function makeInformationRelayNodeType(node: GraGraGraphNodeType, sourceMorphism: GraGraMorphismType,
    targetMorphism: GraGraMorphismType): InformationRelayNodeType {
    return {
        nodeType: node.type,
        inSourceRule: nodeTypeInMorphism(sourceMorphism, node.ID),
        inTargetRule: nodeTypeInMorphism(targetMorphism, node.ID),
    };
}

function getAllSubSetsOfTwo<T>(array: T[]): T[][] {
    if (array.length <= 2) {
        return [array];
    }
    const head = array[0];
    const tail = array.slice(1);
    const subSetsOfTwoFirstElement: T[][] = tail.map(x => [head, x]);
    return subSetsOfTwoFirstElement.concat(getAllSubSetsOfTwo(tail));
}

/**
 *    | source   | target    | output                   
 * -----------------------------------------------------
 * S1 | X_1      | X_2       | no relay                 X
 * S1 | X_2      | X_1       | no relay                 X
 *------------------------------------------------------
 * S2 | X_1      | X_1, X_2  | error, unknown case      X
 * S2 | X_2      | X_1, X_2  | error, unknown case      X
 *------------------------------------------------------
 * S3 | X_1, X_2 | X_1       | X_2 -> X_1               
 * S3 | X_1, X_2 | X_2       | X_1 -> X_2               
 *------------------------------------------------------
 * S4 | X_1, X_2 | X_1, X_2  | error, unknown case      X
 *------------------------------------------------------
 * S5 | X_1      | X_1       | no relay                 X
 * S5 | X_2      | X_2       | no relay                 X
 *------------------------------------------------------
 * S6 | -        | -         | no relay                 X
 *------------------------------------------------------
 * S7 | X_1      | -         | no relay                 X
 * S7 | X_2      | -         | no relay                 X
 * S7 | -        | X_1       | no relay                 X
 * S7 | -        | X_2       | no relay                 X
 *------------------------------------------------------
 * S8 | X_1, X_2 | -         | no relay                 X
 * S8 | -        | X_1, X_2  | no relay                 X
 */
function S1(X1: InformationRelayNodeType, X2: InformationRelayNodeType): boolean {
    return X1.inSourceRule && !X1.inTargetRule
        && !X2.inSourceRule && X2.inTargetRule;
}
function S2(X1: InformationRelayNodeType, X2: InformationRelayNodeType): boolean {
    return X1.inSourceRule && X1.inTargetRule
        && !X2.inSourceRule && X2.inTargetRule;
}
function S3(X1: InformationRelayNodeType, X2: InformationRelayNodeType): boolean {
    return X1.inSourceRule && X1.inTargetRule
        && X2.inSourceRule && !X2.inTargetRule;
}
function S4(X1: InformationRelayNodeType, X2: InformationRelayNodeType): boolean {
    return X1.inSourceRule && X1.inTargetRule
        && X2.inSourceRule && X2.inTargetRule;
}
function S8(X1: InformationRelayNodeType, X2: InformationRelayNodeType): boolean {
    return X1.inSourceRule && !X1.inTargetRule
        && X2.inSourceRule && !X2.inTargetRule;
}
function makeInformationRelays(graph: GraGraGraphType, sourceMorphism: GraGraMorphismType,
    targetMorphism: GraGraMorphismType, valueNodeType: string): InformationRelayType[] {
    let connectedNodes: GraGraGraphNodeType[][] = getValueNodes(graph, valueNodeType)
        .map(valueNodeID => getNodeConnectionsToValue(graph, valueNodeID));
    connectedNodes = connectedNodes.reduce((prev: GraGraGraphNodeType[][], curr: GraGraGraphNodeType[]) => {
        if (curr.length <= 2) {
            return prev.concat([curr]);
        }
        const subsetsOfTwo: GraGraGraphNodeType[][] = getAllSubSetsOfTwo<GraGraGraphNodeType>(curr);
        return prev.concat(subsetsOfTwo);
    }, []);
    return connectedNodes.map(nodesForValueNodeID => {
        if (nodesForValueNodeID.length > 2) {
            throw new CPXParserError(`Found ${nodesForValueNodeID.length} nodes connected to same value, graph name ${graph.name}.`);
        }
        if (nodesForValueNodeID.length < 2) {
            // S5, S6, S7
            return null;
        }
        // we have exactly two nodes
        const firstNode = nodesForValueNodeID[0];
        const secondNode = nodesForValueNodeID[1];
        const firstNodeRelay = makeInformationRelayNodeType(firstNode, sourceMorphism, targetMorphism);
        const secondNodeRelay = makeInformationRelayNodeType(secondNode, sourceMorphism, targetMorphism);

        if (S8(firstNodeRelay, secondNodeRelay) || S8(secondNodeRelay, firstNodeRelay)) {
            return null;
        }

        if (S1(firstNodeRelay, secondNodeRelay) || S1(secondNodeRelay, firstNodeRelay)) {
            return null;
        }

        if (S2(firstNodeRelay, secondNodeRelay)) {
            return {
                fromType: firstNodeRelay,
                toType: secondNodeRelay,
            };
        }
        
        if (S2(secondNodeRelay, firstNodeRelay)) {
            return {
                fromType: secondNodeRelay,
                toType: firstNodeRelay,
            };
        }

        if (S4(firstNodeRelay, secondNodeRelay)) {
            throw new CPXParserError(`Found S4, graph name ${graph.name}.`);
        }

        if (S3(firstNodeRelay, secondNodeRelay)) {
            return {
                fromType: secondNodeRelay,
                toType: firstNodeRelay,
            };
        }
        if (S3(secondNodeRelay, firstNodeRelay)) {
            return {
                fromType: firstNodeRelay,
                toType: secondNodeRelay,
            };
        }
        throw new CPXParserError(`Found unknown case, graph name ${graph.name}.`);
    })
    .filter(x => null !== x);
}

function parseContainer(criticalPairs: CPXCriticalPairsType, container: GraGraContainer, valueNode?: IDMapEntryType): CPXCriticalPairsType {
    container.Rules.forEach(rule => {
        if (rule.R1 === rule.R2) {
            // ignore self loops
            return;
        }
        rule.overlappingPairs.forEach(overlap => {
            if (!overlap.graph) {
                return;
            }
            const overlapType = getRulePair(overlap.graph.name);
            criticalPairs = makePair(criticalPairs, rule, overlapType);
            let informationRelay = [];

            if (valueNode && PairEnum.PRODUCE_USE_DEPENDENCY === overlapType) {
                // information relay only exists between produce-use dependencies
                const sourceMorphism = overlap.morphisms[0];
                const targetMorphism = overlap.morphisms[1];
                informationRelay = [
                    ...informationRelay,
                    ...makeInformationRelays(overlap.graph, sourceMorphism, targetMorphism, valueNode.ID),
                ];
            }
            criticalPairs[overlapType].overlaps.push({
                name: overlap.graph.name,
                fromRule: rule.R1,
                toRule: rule.R2,
                criticalObjectTypes: getCriticalObjectNodes(overlap),
                informationRelay,
            });
        });
    });
    return criticalPairs;
}

function overwriteTypesForFullnames(overlap: OverlapType, idMap: IDMapEntryType[]): OverlapType {
    const criticalObjectTypes = getFullNames(overlap.criticalObjectTypes, idMap);
    const informationRelay = overlap.informationRelay
        .map(({ fromType, toType }) => ({
            fromType: {
                ...fromType,
                nodeType: getEntry(fromType.nodeType, idMap).fullName,
            },
            toType: {
                ...toType,
                nodeType: getEntry(toType.nodeType, idMap).fullName,
            },
        }));
    return {
        ...overlap,
        criticalObjectTypes,
        informationRelay,
    };
}

export function toCriticalPairs(cpx: GraGraCPX, idMap: IDMapEntryType[], valueNode?: IDMapEntryType): CPXCriticalPairsType {
    let tables = [
        PairEnum.DELETE_USE_CONFLICT,
        PairEnum.PRODUCE_DANGLING_CONFLICT,
        PairEnum.PRODUCE_FORBID_CONFLICT,
        PairEnum.PRODUCE_USE_DEPENDENCY,
        PairEnum.REMOVE_DANGLING_DEPENDENCY,
        PairEnum.DELETE_FORBID_DEPENDENCY,
        PairEnum.DELIVER_DELETE,
        PairEnum.DELETE_DANGLING,
    ].reduce((prev, curr) => ({
        ...prev,
        [curr]: {
            type: curr,
            transposed: false,
            pairs: cpx.grammar.rules.reduce((prev, rule) => {
                prev[rule.ID] = {};
                return prev;
            }, {}),
            overlaps: [],
        }
    }), {});
    tables = parseContainer(tables, cpx.conflictContainer, valueNode);
    tables = parseContainer(tables, cpx.dependencyContainer, valueNode);
    Object.keys(tables).forEach(type => {
        tables[type].overlaps = tables[type].overlaps
            .map((overlap: OverlapType) => overwriteTypesForFullnames(overlap, idMap));
    });
    return tables;
}

function mergePairValues(p1: TablePairValueType, p2: TablePairValueType): TablePairValueType {
    const merged = {};
    Object.keys(p1).map(p1Key => {
        if (!p2[p1Key]) {
            merged[p1Key] = p1[p1Key];
            return;
        }
        merged[p1Key] = p1[p1Key] + p2[p1Key];
    });
    Object.keys(p2).map(p2Key => {
        if (!p1[p2Key]) {
            merged[p2Key] = p2[p2Key];
        }
    });
    return merged;
}
function mergePairs(p1: TablePairType, p2: TablePairType): TablePairType {
    const merged = {};
    Object.keys(p1).map(p1Key => {
        if (!p2[p1Key]) {
            merged[p1Key] = p1[p1Key];
            return;
        }
        merged[p1Key] = mergePairValues(p1[p1Key], p2[p1Key]);
    });
    Object.keys(p2).map(p2Key => {
        if (!p1[p2Key]) {
            merged[p2Key] = p2[p2Key];
        }
    });
    return merged;
}
export function merge(criticalPairs: CPXCriticalPairsType[]): CPXCriticalPairsType {
    const all = [
        PairEnum.DELETE_USE_CONFLICT,
        PairEnum.PRODUCE_DANGLING_CONFLICT,
        PairEnum.PRODUCE_FORBID_CONFLICT,
        PairEnum.PRODUCE_USE_DEPENDENCY,
        PairEnum.REMOVE_DANGLING_DEPENDENCY,
        PairEnum.DELETE_FORBID_DEPENDENCY,
        PairEnum.CHANGE_USE_DEPENDENCY,
        PairEnum.CHANGE_FORBID_DEPENDENCY,
        PairEnum.CHANGE_USE_CONFLICT,
        PairEnum.CHANGE_FORBID_CONFLICT,
        PairEnum.DELIVER_DELETE,
        PairEnum.DELETE_DANGLING,
    ];
    const merged = {};
    all.forEach(type => {
        const pairsThisType = criticalPairs.filter(pair => pair[type])
            .map(pair => pair[type]);
        const mergedTable: CPXTableType = {
            type,
            transposed: false,
            pairs: pairsThisType.map(pair => pair.pairs)
                .reduce((prev, curr) => mergePairs(prev, curr), {}),
            overlaps: pairsThisType.map(pair => pair.overlaps)
                .reduce((prev, curr) => [...prev, ...curr], []),
        };
        merged[type] = mergedTable;
    });
    return merged;
}
