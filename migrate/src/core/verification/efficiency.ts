import { GrammarType } from './grammar';
import { CPXCriticalPairsType } from '../graph-grammars/critical-pairs-cpx';
import { isDependency, isConflict } from '../graph-grammars/critical-pairs';

export type EfficiencyType = {
    rules: number,
    dependencies: number,
    conflicts: number,
    uniqueDependencies: number,
    uniqueConflicts: number,
};

export function getEfficiency(verifGrammar: GrammarType, criticalPairs: CPXCriticalPairsType): EfficiencyType {
    const rules = verifGrammar.rules.length;
    const dependencies = Object.values(criticalPairs)
        .reduce((prev, curr) => {
            if (isDependency(curr.type)) {
                return prev + curr.overlaps.length;
            }
            return prev;
        }, 0);
    const conflicts = Object.values(criticalPairs)
        .reduce((prev, curr) => {
            if (isConflict(curr.type)) {
                return prev + curr.overlaps.length;
            }
            return prev;
        }, 0);
    const uniqueDependencies = Object.values(criticalPairs)
        .reduce((prev, curr) => {
            if (isDependency(curr.type)) {
                return prev + Object.values(curr.pairs)
                    .reduce((pairOriginPrev, pairOriginCurr) => {
                        const pairs = Object.values(pairOriginCurr)
                            .reduce((pairTargetPrev, pairTargetCurr) => {
                                if (pairTargetCurr) {
                                    return pairTargetPrev + 1;
                                }
                                return pairTargetPrev;
                            }, 0);
                        return pairOriginPrev + pairs;
                    }, 0);
            }
            return prev;
        }, 0);
    const uniqueConflicts = Object.values(criticalPairs)
        .reduce((prev, curr) => {
            if (isConflict(curr.type)) {
                return prev + Object.values(curr.pairs)
                    .reduce((pairOriginPrev, pairOriginCurr) => {
                        const pairs = Object.values(pairOriginCurr)
                            .reduce((pairTargetPrev, pairTargetCurr) => {
                                if (pairTargetCurr) {
                                    return pairTargetPrev + 1;
                                }
                                return pairTargetPrev;
                            }, 0);
                        return pairOriginPrev + pairs;
                    }, 0);
            }
            return prev;
        }, 0);
    return {
        rules,
        dependencies,
        conflicts,
        uniqueDependencies,
        uniqueConflicts,
    };
}