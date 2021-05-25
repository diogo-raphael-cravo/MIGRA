import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

class OptionalModule implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.OPTIONAL_MODULE;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.optionals.modules
            .map(module => ({
                id: 'optional-module',
                type: this.type(),
                data: {
                    module,
                }
            }));
    }
}

export default new OptionalModule();