import {
    ModuleType
} from './module-net-types';

export function makeResourceOfID(resource: string): string {
    return `resource-of-${resource}`;
}
export function makeAttributeOfID(attribute: string): string {
    return `attribute-of-${attribute}`;
}

function booleanToString(boolean: boolean): string {
    if (boolean) {
        return 'true';
    }
    return 'false';
}
export function isRequired(module: ModuleType, resourceOrAttribute: string): string {
    return booleanToString(undefined !== module.required
        .find(x => x === resourceOrAttribute));
}
export function isGenerated(module: ModuleType, resourceOrAttribute: string): string {
    return booleanToString(undefined !== module.generated
        .find(x => x === resourceOrAttribute));
}