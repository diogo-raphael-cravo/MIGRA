import {
    CPXCriticalPairsType,
    CPXTableType,
} from '../graph-grammars/critical-pairs-cpx';
import { CriticalPairInterpretationType } from './critical-pair-interpretation';
import { deduplicate } from '../helpers/sets';

export type InterpretationRelayType = {
    name: string,
    interpretation: string,
    fromNode: string,
    toNode: string,
};

function makeInterpretationsTable(table: CPXTableType,
    interpretation: CriticalPairInterpretationType): InterpretationRelayType[] {
    return interpretation.nodes.map(node => {
        return table.overlaps.map(overlap => {
            return overlap.informationRelay.map(relay => {
                if (relay.toType.nodeType !== node) {
                    return null;
                }
                return {
                    name: interpretation.name,
                    interpretation: interpretation.interpretation,
                    fromNode: node,
                    toNode: relay.fromType.nodeType,
                };
            })
            .filter(x => null !== x);
        })
        .filter(x => null !== x)
        .reduce((prev, curr) => [...prev, ...curr], []);
    })
    .filter(x => null !== x)
    .reduce((prev, curr) => [...prev, ...curr], []);
}

export function makeInterpretationsRelays(criticalPairs: CPXCriticalPairsType,
    interpretations: CriticalPairInterpretationType[]): InterpretationRelayType[] {
    return deduplicate(Object.values(criticalPairs)
        .map(table => {
            return interpretations
                .map(interpretation => makeInterpretationsTable(table, interpretation))
                .reduce((prev, curr) => [...prev, ...curr], []);
        })
        .reduce((prev, curr) => [...prev, ...curr], []), (a: InterpretationRelayType, b: InterpretationRelayType) => {
            return a.fromNode === b.fromNode
                && a.interpretation === b.interpretation
                && a.name === b.name
                && a.toNode === b.toNode;
        });
}
