import { WarningType } from './warning-interface';

export type RequirementType = {
    expected: boolean,
    warning: WarningType,
};

export type ModuleNetRequirementsType = {
    name: string,
    mainRequirements: RequirementType[],
    extraRequirements: RequirementType[],
};