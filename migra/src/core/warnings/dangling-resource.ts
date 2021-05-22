import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

function filterResources(experimentData: ExperimentData, nodes: string[]): string[] {
    return nodes.filter(node => undefined !== experimentData.grammar
        .resources.find(resource => node === resource));
}

class DanglingResource implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.DANGLING_RESOURCE;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.interpretations
            .map(interpretation => {
                if (interpretation.interpretation !== 'dangling-resource') {
                    return null;
                }
                return filterResources(experimentData, interpretation.nodes)
                    .map(resource => ({
                        id: 'dangling-resource',
                        type: this.type(),
                        data: {
                            resource,
                        },
                        debug: {
                            interpretation,
                        }
                    }));
            })
            .filter(x => null !== x)
            .reduce((prev, curr) => [...prev, ...curr], []);
    }
}

export default new DanglingResource();