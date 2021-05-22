import {
    setEquals,
    setIntersection,
} from '../../core/helpers/sets';
import {
    WarningType,
    equalWarnings,
} from '../../core/verification/warning';
import {
    VerifyAnalysisType,
} from '../commands/verify';

export enum WarningsComparisonEnum {
    // forall b \in B. b \in A
    ProperSuperset = 'ProperSuperset',
    // A = B
    Equal = 'Equal',
    // forall a \in A. a \in B
    ProperSubset = 'ProperSubset',
    // exists a \in A, b \in B. a \notin B, b \notin A
    Different = 'Different',
    // not exists ab. as \in A, ab \in B
    Disjunct = 'Disjunct',
}
export type WarningsComparisonType = {
    from: VerifyAnalysisType,
    to: VerifyAnalysisType,
    comparison: WarningsComparisonEnum,
};

function compareSets<T>(setA: T[], setB: T[], comparison: (a: T, b: T) => boolean): WarningsComparisonEnum {
    // equal
    if (setEquals(setA, setB, comparison)) {
        return WarningsComparisonEnum.Equal;
    }

    // empty cases
    if (0 === setA.length) {
        // B can't be empty, otherwise they'd be equal
        return WarningsComparisonEnum.ProperSubset;
    }
    if (0 === setB.length) {
        // A can't be empty, otherwise they'd be equal
        return WarningsComparisonEnum.ProperSuperset;
    }

    // neither is empty
    const intersection = setIntersection(setA, setB, comparison);
    if (0 === intersection.length) {
        return WarningsComparisonEnum.Disjunct;
    }

    // neither is empty and there is intersection
    if (intersection.length === setA.length) {
        return WarningsComparisonEnum.ProperSubset;
    }
    if (intersection.length === setB.length) {
        return WarningsComparisonEnum.ProperSuperset;
    }

    // intersection < A and intersection < B
    return WarningsComparisonEnum.Different;
}

export function compareWarnings(from: VerifyAnalysisType, to: VerifyAnalysisType): WarningsComparisonType {
    return {
        from,
        to,
        comparison: compareSets<WarningType>(from.results.extraWarnings.data, to.results.extraWarnings.data, equalWarnings),
    };
}