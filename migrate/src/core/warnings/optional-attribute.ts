import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

class OptionalAttribute implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.OPTIONAL_ATTRIBUTE;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.optionals.attributes
            .map(attribute => ({
                id: 'optional-attribute',
                type: this.type(),
                data: {
                    attribute,
                }
            }));
    }
}

export default new OptionalAttribute();