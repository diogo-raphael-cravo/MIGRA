import {
    CPXCriticalPairsType,
    CPXTableType,
} from '../graph-grammars/critical-pairs-cpx';
import { VerifierType } from './verifier';
import { GrammarType } from './grammar';

export type CriticalPairInterpretationType = {
    name: string,
    interpretation: string,
    nodes: string[],
    fromRule: string,
    toRule: string,
};

function makeInterpretationsTable(verifGrammar: GrammarType, table: CPXTableType, verifier: VerifierType): CriticalPairInterpretationType[] {
    return verifier.criticalPairInterpretations
        .map(interpretation => {
            if (table.type !== interpretation.criticalPairType) {
                return null;
            }
            return table.overlaps.map(overlap => {
                const fromRule = verifGrammar.rules
                    .find(rule => rule.name === overlap.fromRule);
                if (fromRule.pattern !== interpretation.fromRulePattern) {
                    return null;
                }

                const toRule = verifGrammar.rules
                    .find(rule => rule.name === overlap.toRule);
                if (toRule.pattern !== interpretation.toRulePattern) {
                    return null;
                }

                return {
                    name: interpretation.name,
                    nodes: overlap.criticalObjectTypes,
                    fromRule: overlap.fromRule,
                    toRule: overlap.toRule,
                    interpretation: interpretation.interpretation,
                };
            })
            .filter(x => null !== x);
        })
        .filter(x => null !== x)
        .reduce((prev, curr) => [...prev, ...curr], []);
}

export function makeInterpretations(verifGrammar: GrammarType, criticalPairs: CPXCriticalPairsType,
    verifier: VerifierType): CriticalPairInterpretationType[] {
    return Object.values(criticalPairs)
        .map(table => makeInterpretationsTable(verifGrammar, table, verifier))
        .reduce((prev, curr) => [...prev, ...curr], []);
}
