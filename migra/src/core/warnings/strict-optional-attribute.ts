import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

class StrictOptionalAttribute implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.STRICT_OPTIONAL_ATTRIBUTE;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.grammar.attributes
            .filter(attribute => undefined === experimentData.requireds.attributes
                .find(requiredAttribute => requiredAttribute === attribute))
            .map(attribute => ({
                id: 'strict-optional-attribute',
                type: this.type(),
                data: {
                    attribute,
                }
            }));
    }
}

export default new StrictOptionalAttribute();