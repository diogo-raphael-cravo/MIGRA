import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

function filterAttributes(experimentData: ExperimentData, nodes: string[]): string[] {
    return nodes.filter(node => undefined !== experimentData.grammar
        .attributes.find(resource => node === resource));
}

class OutdatedAttribute implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.OUTDATED_ATTRIBUTE;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.interpretations
            .map(interpretation => {
                if (interpretation.interpretation !== 'outdated-attribute') {
                    return null;
                }
                return filterAttributes(experimentData, interpretation.nodes)
                    .map(attribute => ({
                        id: 'outdated-attribute',
                        type: this.type(),
                        data: {
                            attribute,
                            name: interpretation.name,
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

export default new OutdatedAttribute();