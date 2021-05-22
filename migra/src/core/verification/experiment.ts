import { CriticalPairs } from '../graph-grammars/critical-pairs';
import { CPXCriticalPairsType } from '../graph-grammars/critical-pairs-cpx';
import Reachability from './reachability';
import { RuleType } from './rules';
import { OptionalsType, getOptionals } from './optionality';
import { CriticalPairInterpretationType } from './critical-pair-interpretation';
import { GrammarType } from './grammar';
import { VerifierType } from './verifier';
import { makeInterpretations } from './critical-pair-interpretation';
import { getRequireds } from './requiredness';
import { getEfficiency, EfficiencyType } from './efficiency';
import { makeInterpretationsRelays, InterpretationRelayType } from './interpretation-relay';

export type ExperimentData = {
    grammar: GrammarType,
    criticalPairs: CPXCriticalPairsType,
    reachableRules: RuleType[],
    optionals: OptionalsType,
    requireds: OptionalsType,
    interpretations: CriticalPairInterpretationType[],
    efficiency: EfficiencyType,
    interpretationRelays: InterpretationRelayType[],
};

export function extractExperimentData(verifGrammar: GrammarType, criticalPairs: CPXCriticalPairsType,
    verifier: VerifierType): ExperimentData {
    const noSelfLoopsCPs = CriticalPairs.removeSelfLoopsPairs(criticalPairs);

    const reachableRules = verifGrammar.rules.filter(rule => Reachability
        .isReachable(rule, verifGrammar.rules, noSelfLoopsCPs));
    const optionals = getOptionals(verifGrammar.rules, criticalPairs);

    // we're ok to cast, according to extractExperimentData signature
    const requiredRules = verifGrammar.rules.filter(rule => rule.requiredByDefault);
    const requireds = getRequireds(verifGrammar, requiredRules, criticalPairs);

    const interpretations = makeInterpretations(verifGrammar, criticalPairs, verifier);

    return {
        grammar: verifGrammar,
        criticalPairs,
        reachableRules,
        optionals,
        requireds,
        interpretations,
        efficiency: getEfficiency(verifGrammar, criticalPairs),
        interpretationRelays: makeInterpretationsRelays(criticalPairs, interpretations)
    };
}