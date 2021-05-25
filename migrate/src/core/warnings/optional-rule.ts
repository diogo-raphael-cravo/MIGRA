import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

class OptionalRule implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.OPTIONAL_RULE;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.optionals.rules
            .map(rule => ({
                id: 'optional-rule',
                type: this.type(),
                data: {
                    rule,
                }
            }));
    }
}

export default new OptionalRule();