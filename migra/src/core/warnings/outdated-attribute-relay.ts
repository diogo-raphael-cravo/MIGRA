import { WarningType, WarningInterface, WarningTypeEnum } from '../verification/warning-interface';
import { ExperimentData } from '../verification/experiment';

function filterAttributes(experimentData: ExperimentData, node: string): string {
    const attribute = experimentData.grammar
        .attributes.find(resource => node === resource);
    if(undefined === attribute) {
        return null;
    }
    return attribute;
}

class OutdatedAttributeRelay implements WarningInterface {
    type(): WarningTypeEnum {
        return WarningTypeEnum.OUTDATED_ATTRIBUTE_RELAY;
    }
    apply(experimentData: ExperimentData): WarningType[] {
        return experimentData.interpretationRelays
            .map(interpretation => {
                if (interpretation.interpretation !== 'outdated-attribute') {
                    return null;
                }
                const fromAttribute = filterAttributes(experimentData, interpretation.fromNode);
                if (null === fromAttribute) {
                    return null;
                }
                const toAttribute = filterAttributes(experimentData, interpretation.toNode);
                if (null === toAttribute) {
                    return null;
                }
                return {
                    id: 'outdated-attribute-relay',
                    type: this.type(),
                    data: {
                        name: interpretation.name,
                        fromAttribute,
                        toAttribute,
                    },
                    debug: {
                        interpretation,
                    }
                };
            })
            .filter(x => null !== x);
    }
}

export default new OutdatedAttributeRelay();