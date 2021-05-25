export enum PairEnum {
    DELETE_USE_CONFLICT = 'DELETE_USE_CONFLICT',
    PRODUCE_DANGLING_CONFLICT = 'PRODUCE_DANGLING_CONFLICT',
    PRODUCE_FORBID_CONFLICT = 'PRODUCE_FORBID_CONFLICT',
    PRODUCE_USE_DEPENDENCY = 'PRODUCE_USE_DEPENDENCY',
    REMOVE_DANGLING_DEPENDENCY = 'REMOVE_DANGLING_DEPENDENCY',
    DELETE_FORBID_DEPENDENCY = 'DELETE_FORBID_DEPENDENCY',

    // attributes
    CHANGE_USE_DEPENDENCY = 'CHANGE_USE_DEPENDENCY',
    CHANGE_FORBID_DEPENDENCY = 'CHANGE_FORBID_DEPENDENCY',
    CHANGE_USE_CONFLICT = 'CHANGE_USE_CONFLICT',
    CHANGE_FORBID_CONFLICT = 'CHANGE_FORBID_CONFLICT',

    // unknown
    DELIVER_DELETE = 'DELIVER_DELETE',
    DELETE_DANGLING = 'DELETE_DANGLING',
}

export function isDependency(pair: PairEnum): boolean {
    return pair === PairEnum.PRODUCE_USE_DEPENDENCY
        || pair === PairEnum.REMOVE_DANGLING_DEPENDENCY
        || pair === PairEnum.DELETE_FORBID_DEPENDENCY
        || pair === PairEnum.CHANGE_USE_DEPENDENCY
        || pair === PairEnum.CHANGE_FORBID_DEPENDENCY;
}

export function isConflict(pair: PairEnum): boolean {
    return pair === PairEnum.DELETE_USE_CONFLICT
        || pair === PairEnum.PRODUCE_DANGLING_CONFLICT
        || pair === PairEnum.PRODUCE_FORBID_CONFLICT
        || pair === PairEnum.CHANGE_USE_CONFLICT
        || pair === PairEnum.CHANGE_FORBID_CONFLICT;
}

export type CriticalPairsType = {
    [ key in PairEnum ]?: TableType
}


export type TablePairValueType = { [key: string]: number };
export type TablePairType = { [key: string]: TablePairValueType };

export type TableType = {
    type: PairEnum,
    transposed: boolean,
    pairs: TablePairType,
}

export class ParserError extends Error {}

export interface CriticalPairsParserInterface {
    parseName(name: string): PairEnum;
    parseSingleTable(ruleNames: string[], verigraphOutput: string): TableType;
    parseTables(ruleNames: string[], verigraphOutput: string): CriticalPairsType;
}

export class CriticalPairs {
    public static getTransposed(table: TableType): TableType {
        if (!table.transposed) {
            return CriticalPairs.transpose(table);
        }
        return table;
    }

    public static transpose(table: TableType): TableType {
        const transposedPairs = {};
        Object.keys(table.pairs).forEach(lineKey => {
            transposedPairs[lineKey] = {};
        });
        Object.keys(table.pairs).forEach(lineKey => {
            Object.keys(table.pairs[lineKey]).forEach(lineCell => {
                transposedPairs[lineCell][lineKey] = table.pairs[lineKey][lineCell];
            });
        });
        return {
            type: table.type,
            transposed: true,
            pairs: transposedPairs,
        };
    }

    public static removeSelfLoops(table: TableType): TableType {
        const noSelfLoopsPairs = {};
        Object.keys(table.pairs).forEach(lineKey => {
            noSelfLoopsPairs[lineKey] = {};
            Object.keys(table.pairs[lineKey]).forEach(lineCell => {
                if (lineCell !== lineKey) {
                    noSelfLoopsPairs[lineKey][lineCell] = table.pairs[lineKey][lineCell];
                }
            });
        });
        return {
            type: table.type,
            transposed: table.transposed,
            pairs: noSelfLoopsPairs,
        };
    }

    public static removeSelfLoopsPairs(criticalPairs: CriticalPairsType): CriticalPairsType {
        const noSelfLoopsPairs = {};
        Object.keys(criticalPairs).forEach(lineKey => {
            noSelfLoopsPairs[lineKey] = CriticalPairs.removeSelfLoops(criticalPairs[lineKey]);
        });
        return noSelfLoopsPairs;
    }
}