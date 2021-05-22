import {
    GraGraRuleType,
    GraGra,
} from './graph-types';

function addType(type: string, arrayToAdd: string[], arrayToIgnore: string[]): void {
    if (!arrayToAdd.find(x => x === type) && !arrayToIgnore.find(x => x === type)) {
        arrayToAdd.push(type);
    }
}
function getRuleTypes(rule: GraGraRuleType, typesToIgnore: string[]): string[] {
    const types: string[] = [];
    rule.graphs.forEach(graph => {
        graph.nodes.forEach(node => addType(node.type, types, typesToIgnore));
        graph.edges.forEach(edge => addType(edge.type, types, typesToIgnore));
    });
    if (rule.applCondition) {
        rule.applCondition.nacs.forEach(nac => {
            nac.graph.nodes.forEach(node => addType(node.type, types, typesToIgnore));
            nac.graph.edges.forEach(edge => addType(edge.type, types, typesToIgnore));
        });
    }
    return types;
}

type RuleTypes = {
    rules: GraGraRuleType[],
    types: string[],
};
function getRuleType(ruleTypes: RuleTypes[], types: string[]): RuleTypes {
    return ruleTypes.find(thisRule => thisRule.types
        .some(ruleType => types.some(type => type === ruleType)));
}

/**
 * Splits a graph grammar based on node/edge types in rules.
 * Each grammar will have the minimum set of rules that
 * do not share node or edge types with rules of other grammars.
 */
export function split(grammar: GraGra, typesToIgnore: string[]): GraGra[] {
    const splitRules: RuleTypes[] = [];
    grammar.rules.map(rule => {
        const types = getRuleTypes(rule, typesToIgnore);
        const ruleTypesThisRule = getRuleType(splitRules, types);
        const foundRuleType = undefined !== ruleTypesThisRule;
        if (foundRuleType) {
            ruleTypesThisRule.rules.push(rule);
            types.forEach(type => addType(type, ruleTypesThisRule.types, typesToIgnore));
        } else {
            splitRules.push({
                rules: [rule],
                types,
            });
        }
    });
    return splitRules.map(({ rules }) => ({
        ...grammar,
        rules,
    }));
}