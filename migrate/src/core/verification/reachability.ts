import { RuleType } from './rules';
import { CriticalPairs, PairEnum, CriticalPairsType } from '../graph-grammars/critical-pairs';

type HistoryEntryType = {
    ruleName: string,
    reachable?: boolean,
};

export default class Reachability {
    private static findRules(ruleNames: string[], rules: RuleType[]): RuleType[] {
        return rules.filter(rule => ruleNames.find(name => name === rule.name));
    }

    private static getExistingPairs(pairs: { [key: string]: number }): string[] {
        const existingPairs = [];
        Object.keys(pairs).forEach(key => {
            if (pairs[key]) {
                existingPairs.push(key);
            }
        });
        return existingPairs;
    }

    /**
     * @param criticalPairs MUST NOT contain self-loops
     */
    public static isReachable(rule: RuleType, rules: RuleType[], criticalPairs: CriticalPairsType, rulesSeen: HistoryEntryType[] = []): boolean {
        const ruleInRules = rules.find(current => current.name === rule.name);
        if (!ruleInRules) {
            throw new Error('rule not in rules array');
        }

        if (!criticalPairs[PairEnum.PRODUCE_USE_DEPENDENCY]) {
            throw new Error('missing produce use dependencies');
        }

        if (!criticalPairs[PairEnum.PRODUCE_FORBID_CONFLICT]) {
            throw new Error('missing produce forbid conflicts');
        }

        const thisRuleHistory = rulesSeen.find(ruleSeen => ruleSeen.ruleName === rule.name);
        if (thisRuleHistory) {
            if (thisRuleHistory.reachable !== undefined) {
                return thisRuleHistory.reachable;
            }
            // this is an isolated cycle, must be reachable
            return true;
        }

        const transposedProduceUse = CriticalPairs.getTransposed(criticalPairs[PairEnum.PRODUCE_USE_DEPENDENCY]);
        const dependencies = Reachability.getExistingPairs(transposedProduceUse.pairs[rule.name]);
        if (0 === dependencies.length) {
            return true;
        }

        const unrByConsDependencies = Reachability.findRules(dependencies, rules)
            .filter(rule => !rule.reachableByConstruction);
        const rByConsMockDependencies = Reachability.findRules(dependencies, rules)
            .filter(rule => rule.mock);
        if (0 === unrByConsDependencies.length
            && 0 === rByConsMockDependencies.length) {
            return true;
        }

        const produceForbid = criticalPairs[PairEnum.PRODUCE_FORBID_CONFLICT];
        const unmetRequirements = rByConsMockDependencies.filter(rByConsMockDep => {
            /**
             * keep "r-by-cons-mock" only if we don't find triangles:
             * 
             * r-by-cons-mock ---dp1---> unr-by-cons
             *            \               /\
             *             \con          /dp2
             *              \/          /
             *           unr-by-cons-real
             */
            // we already have "dp1"

            // try to find "con"
            const conToRByConsMock = Reachability.getExistingPairs(produceForbid.pairs[rByConsMockDep.name]);
            if (0 === conToRByConsMock.length) {
                // did not find "con"
                return true;
            }

            // try to find "dp2" among those with "con"
            const unrByConsReal = dependencies.filter(dep => {
                return conToRByConsMock.find(x => x === dep);
            });
            if (0 === unrByConsReal.length) {
                // did not find "dp2"
                return true;
            }

            // we did find a triangle, requirement is met
            return false;
        });
        if (0 < unmetRequirements.length) {
            // TODO: raise which requirements have not been met
            return false;
        }

        const newHistory = rulesSeen.concat({
            ruleName: rule.name,
        });
        return unrByConsDependencies.reduce((prev, unrByConsDep) => {
            const reachableThis = Reachability.isReachable(unrByConsDep, rules, criticalPairs, newHistory);
            newHistory.push({
                ruleName: unrByConsDep.name,
                reachable: reachableThis,
            });
            return prev && reachableThis;
        }, true);
    }
}