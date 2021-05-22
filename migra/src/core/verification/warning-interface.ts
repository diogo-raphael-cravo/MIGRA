import { ExperimentData } from './experiment';

export enum WarningTypeEnum {
    UNREACHABLE_OPERATION = 'unreachable-operation',
    OPTIONAL_RULE = 'optional-rule',
    OPTIONAL_MODULE = 'optional-module',
    OPTIONAL_RESOURCE = 'optional-resource',
    OPTIONAL_ATTRIBUTE = 'optional-attribute',
    STRICT_OPTIONAL_ATTRIBUTE = 'strict-optional-attribute',
    DANGLING_RESOURCE = 'dangling-resource',
    OUTDATED_ATTRIBUTE = 'outdated-attribute',
    OUTDATED_ATTRIBUTE_RELAY = 'outdated-attribute-relay',
}

export type WarningType = {
    id: string,
    type: WarningTypeEnum,
    // data must be flat or I'll have to change comparison method
    data: { [key: string]: string },
    // debug is not part of warning comparison
    debug?: { [key: string]: unknown },
};

export interface WarningInterface {
    type(): WarningTypeEnum;
    apply(experimentData: ExperimentData): WarningType[];
}