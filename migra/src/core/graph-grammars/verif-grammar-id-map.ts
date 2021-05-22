import { GraGraTypes } from './ggx/graph-types';

export enum NodeRolesEnum {
    MODULE = 'module',
    RESOURCE = 'resource',
    ATTRIBUTE = 'attribute',
}

export type IDMapEntryType = {
    ID: string,
    name: string,
    fullName: string,
    role: NodeRolesEnum,
    upperLevelID?: string,
};

/**
 * E1_AB%:[EDGE]:
 * to
 * E1_AB
 */
function sanitizeName(name: string): string {
    return name.split('%').slice(0, 1).join('');
}

export function getEdgeTypeIDsWithName(graGraTypes: GraGraTypes, edgeTypeName: string): string[] {
    const edgeTypes = graGraTypes.edges
        .filter(edgeType => sanitizeName(edgeType.name) === edgeTypeName);
    if (edgeTypes.length === 0) {
        return null;
    }
    return edgeTypes.map(edgeType => edgeType.ID);
}

export function getNodeTypeName(graGraTypes: GraGraTypes, nodeTypeID: string): string {
    const nodeType = graGraTypes.nodes
        .find(nodeType => nodeType.ID === nodeTypeID);
    if (!nodeType) {
        throw new Error(`Grammar is missing node type with ID ${nodeTypeID}.`);
    }
    return sanitizeName(nodeType.name);
}

export function getEntry(ID: string, IDMap: IDMapEntryType[]): IDMapEntryType {
    const entryWithID = IDMap.find(entry => entry.ID === ID);
    if (!entryWithID) {
        throw new Error(`Missing entry with ID ${entryWithID}`);
    }
    return entryWithID;
}

export function getFullNames(IDs: string[], IDMap: IDMapEntryType[]): string[] {
    return IDs.map(ID => getEntry(ID, IDMap))
        .map(entry => entry.fullName);
}

export function getFullNamesByRole(IDs: string[], IDMap: IDMapEntryType[], role: NodeRolesEnum): string[] {
    return IDs.map(ID => getEntry(ID, IDMap))
        .filter(entry => entry.role === role)
        .map(entry => entry.fullName);
}

// if upperLevelID is given, make sure IDMap has upperLevelID
export function makeIDMapEntry(graGraTypes: GraGraTypes, ID: string, role: NodeRolesEnum,
    upperLevelID?: string, IDMap?: IDMapEntryType[]): IDMapEntryType {
    const name = getNodeTypeName(graGraTypes, ID);
    if (!upperLevelID) {
        return {
            ID,
            name,
            role,
            fullName: name,
        };
    }
    return {
        ID,
        name,
        role,
        upperLevelID,
        fullName: `${getEntry(upperLevelID, IDMap).fullName}.${name}`,
    };
}