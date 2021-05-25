import { RuleType } from './rules';
import { PairEnum, CriticalPairsType } from '../graph-grammars/critical-pairs';
import { deduplicate } from '../helpers/sets';

export type OptionalsType = {
    rules: string[],
    modules: string[],
    resources: string[],
    attributes: string[],
};

type HistoryEntryType = {
    ruleName: string,
    inRequiredPath?: boolean,
};

/**
 * @param criticalPairs MUST NOT contain self-loops
 */
export function inRequiredPath(rule: RuleType, rules: RuleType[], criticalPairs: CriticalPairsType, rulesSeen: HistoryEntryType[] = []): boolean {
    if (rule.requiredByDefault) {
        return true;
    }
    if (!criticalPairs[PairEnum.PRODUCE_USE_DEPENDENCY]) {
        throw new Error('missing produce use dependencies');
    }

    const thisRuleHistory = rulesSeen.find(ruleSeen => ruleSeen.ruleName === rule.name);
    if (thisRuleHistory) {
        if (thisRuleHistory.inRequiredPath !== undefined) {
            return thisRuleHistory.inRequiredPath;
        }
        // this is an isolated cycle, must not be required
        return false;
    }

    const dependencies = criticalPairs[PairEnum.PRODUCE_USE_DEPENDENCY];
    const newHistory = rulesSeen.concat({
        ruleName: rule.name,
    });
    return Object.keys(dependencies.pairs[rule.name])
        .reduce((prev, depRuleName) => {
            const pair = dependencies.pairs[rule.name][depRuleName];
            const depRule = rules.find(r => r.name === depRuleName);
            if (pair) {
                const inRequiredPathRule = inRequiredPath(depRule, rules, criticalPairs, newHistory);
                newHistory.push({
                    ruleName: depRule.name,
                    inRequiredPath: inRequiredPathRule,
                });
                return prev || inRequiredPathRule;
            }
            return prev;
        }, false);
}

function compareStrings(x: string, y: string): boolean {
    return x === y;
}

function inArray(array: string[]): (name: string) => boolean {
    return (name: string) => !array.find(x => compareStrings(x, name));
}

export function getOptionals(rules: RuleType[], criticalPairs: CriticalPairsType): OptionalsType {
    const allRules = rules.map(rule => rule.name);
    const allModules = rules.reduce((prev, rule) => [...prev, ...rule.contains.modules], []);
    const allResources = rules.reduce((prev, rule) => [...prev, ...rule.contains.resources], []);
    const allAttributes = rules.reduce((prev, rule) => [...prev, ...rule.contains.attributes], []);
    return rules.reduce((prev, current) => {
        if (inRequiredPath(current, rules, criticalPairs)) {
            const modules = current.contains.modules;
            const resources = current.contains.resources;
            const attributes = current.contains.attributes;
            return {
                rules: prev.rules.filter(rule => rule !== current.name),
                modules: prev.modules.filter(inArray(modules)),
                resources: prev.resources.filter(inArray(resources)),
                attributes: prev.attributes.filter(inArray(attributes)),
            };
        }
        return prev;
    }, {
        rules: deduplicate(allRules, compareStrings),
        modules: deduplicate(allModules, compareStrings),
        resources: deduplicate(allResources, compareStrings),
        attributes: deduplicate(allAttributes, compareStrings),
    });
}
