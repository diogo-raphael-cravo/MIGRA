import { RuleType } from './rules';
import { HardcodedTypesType } from '../translation/module-net-types';

type RuleDecoratePropertiesType = {
    // whether or not this rule requires something to run by construction
    reachableByConstruction: boolean,
    // whether or not a counterpart for this rule exists in the model, true = mock, false = real
    mock: boolean,
    mapsToOperation: boolean,
    requiredByDefault: boolean,
};

type RulePatternType = {
    name: string,
    regex: string,
    decorateProperties: RuleDecoratePropertiesType,
};

type CriticalPairInterpretationConfigType = {
    criticalPairType: string,
    fromRulePattern: string,
    toRulePattern: string,
    interpretation: string,
    name: string,
};

export type VerifierType = {
    name: string,
    resourceEdgeName: string,
    attributeEdgeName: string,
    valueNodeName: string,
    modulesToIgnore: string[],
    criticalPairInterpretations: CriticalPairInterpretationConfigType[],
    rulePatterns: RulePatternType[],
    translation: HardcodedTypesType,
};

function getRulePatternByPattern(verifier: VerifierType, rulePatternName: string): RuleDecoratePropertiesType {
    if (undefined === rulePatternName) {
        return undefined;
    }
    const rulePattern = verifier.rulePatterns
        .find(pattern => pattern.name === rulePatternName);
    if (undefined === rulePattern) {
        throw new Error(`verifier ${verifier.name} does not have rule pattern ${rulePatternName}`);
    }
    return rulePattern.decorateProperties;
}

type RuleToDecorateType = {
    name: string,
    pattern: string,
    // properties to be decorated are optional
    reachableByConstruction?: boolean,
    mock?: boolean,
    requiredByDefault?: boolean,
    mapsToOperation?: string,
    contains: {
        modules: string[],
        resources: string[],
        attributes: string[],
    },
};

export function decorateRules(rules: RuleToDecorateType[], verifier: VerifierType): RuleType[] {
    return rules.map(rule => Object.assign({},
        getRulePatternByPattern(verifier, rule.pattern), rule));
}