import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

class OptionalResource implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.OPTIONAL_RESOURCE;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.optionals.resources
            .map(resource => ({
                id: 'optional-resource',
                type: this.type(),
                data: {
                    resource,
                }
            }));
    }
}

export default new OptionalResource();