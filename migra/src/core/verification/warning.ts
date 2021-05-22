import { ExperimentData } from './experiment';
import { WarningType, WarningTypeEnum, WarningInterface } from './warning-interface';
import Warnings from '../warnings';
import { deduplicate } from '../helpers/sets';

export { WarningType };

export const ALL_WARNINGS: WarningTypeEnum[] = Object.values(WarningTypeEnum);

function compareKeys(d1: WarningType['data'], d2: WarningType['data']): boolean {
    return Object.keys(d1).reduce((prev, current) => {
        return prev && d1[current] === d2[current];
    }, true);
}

export function equalWarnings(w1: WarningType, w2: WarningType): boolean {
    return w1.type === w2.type
        && compareKeys(w1.data, w2.data)
        && compareKeys(w2.data, w1.data);
}

function findWarning(warningType: WarningTypeEnum): WarningInterface {
    const warning = Warnings.find(warning => warning.type() === warningType);
    if (!warning) {
        throw new Error(`Unknown warning type ${warningType}`);
    }
    return warning;
}

export function makeWarnings(experimentData: ExperimentData, warningTypes: WarningTypeEnum[]): WarningType[] {
    const allWarnings: WarningType[] = warningTypes.reduce((prev, warningType) =>
        [...prev, ...findWarning(warningType).apply(experimentData)], []);
    return deduplicate<WarningType>(allWarnings, equalWarnings);
}