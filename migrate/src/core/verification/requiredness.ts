import { RuleType } from './rules';
import { PairEnum } from '../graph-grammars/critical-pairs';
import { CPXCriticalPairsType, OverlapType } from '../graph-grammars/critical-pairs-cpx';
import { OptionalsType } from './optionality';
import { GrammarType } from './grammar';
import { deduplicate } from '../helpers/sets';

/**
 * @param criticalPairs MUST NOT contain self-loops
 */
export function getPathsToRule(rule: RuleType, rules: RuleType[], criticalPairs: CPXCriticalPairsType, backwardsPath: OverlapType[] = []): OverlapType[][] {
    if (!criticalPairs[PairEnum.PRODUCE_USE_DEPENDENCY]) {
        throw new Error('missing produce use dependencies');
    }

    const backToSameRule = undefined !== backwardsPath.find(ruleSeen => ruleSeen.toRule === rule.name);
    if (backToSameRule) {
        return [backwardsPath];
    }

    const dependencies = criticalPairs[PairEnum.PRODUCE_USE_DEPENDENCY];
    const ruleOverlaps = dependencies.overlaps.filter(overlap => overlap.toRule === rule.name);
    if (ruleOverlaps.length === 0) {
        return [backwardsPath];
    }
    return ruleOverlaps.reduce((prev, overlap) => {
        const fromRule = rules.find(rule => overlap.fromRule === rule.name);
        const paths = getPathsToRule(fromRule, rules, criticalPairs, [...backwardsPath, overlap]);
        return [...prev, ...paths];
    }, []);
}

function inArray(array: string[], name: string): boolean {
    return undefined !== array.find(x => x === name);
}

function getRequiredsPath(path: OverlapType[], startingPoint: OptionalsType) {
    return path.reduce((prev, overlap) => {
        const relays = overlap.informationRelay;
        const optsThisOverlay: OptionalsType = {
            attributes: [],
            modules: [],
            resources: [],
            rules: [overlap.fromRule],
        };
        relays.forEach(relay => {
            if (inArray(prev.attributes, relay.toType.nodeType)) {
                optsThisOverlay.attributes.push(relay.fromType.nodeType);
            }
        });
        return {
            attributes: deduplicate(prev.attributes.concat(optsThisOverlay.attributes)),
            modules: [],
            resources: [],
            rules: deduplicate(prev.rules.concat(optsThisOverlay.rules)),
        };
    }, startingPoint);
}

export function getRequireds(grammar: GrammarType, requiredRules: RuleType[], criticalPairs: CPXCriticalPairsType): OptionalsType {
    const pathsToProcess: OverlapType[][] = requiredRules
        .reduce((prev, thisRule) =>  [...prev, ...getPathsToRule(thisRule, grammar.rules, criticalPairs)], [])
        .filter(x => x.length > 0);
    return pathsToProcess.reduce((prev, thisPath) => {
        const requiredRule = grammar.rules.find(rule => thisPath[0].toRule === rule.name);
        const startingPoint: OptionalsType = {
            attributes: requiredRule.contains.attributes,
            modules: [],
            resources: [],
            rules: [thisPath[0].toRule],
        };
        const requiredsThisPath = getRequiredsPath(thisPath, startingPoint);
        return {
            attributes: deduplicate(prev.attributes.concat(requiredsThisPath.attributes)),
            modules: [],
            resources: [],
            rules: deduplicate(prev.rules.concat(requiredsThisPath.rules)),
        };
    }, {
        attributes: [],
        modules: [],
        resources: [],
        rules: [],
    });
}