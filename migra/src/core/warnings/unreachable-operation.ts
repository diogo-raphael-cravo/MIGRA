import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

class UnreachableOperation implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.UNREACHABLE_OPERATION;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.grammar.rules
            .filter(rule => !rule.mock)
            .filter(rule => !experimentData
                .reachableRules.find(reachableRule => reachableRule === rule))
            .map(unreachableRule => ({
                id: 'unreachable-operation',
                type: this.type(),
                data: {
                    // TODO: use operation instead of rule
                    // operation: unreachableRule.mapsToOperation,
                    rule: unreachableRule.name,
                },
                debug: {
                    rule: unreachableRule.name,
                }
            }));
    }
}

export default new UnreachableOperation();