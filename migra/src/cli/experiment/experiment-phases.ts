import * as Path from 'path';
import {
    awaitForEachArray,
} from '../helpers';
import { logger } from '../logger';
import { ToDownloadEntry } from '../to-download';
import { ALL_MODULES } from '../experiment/modules';
import { getWorkingFolder } from './experiment-folders';
import {
    readHistory,
    lastRunThisTask,
} from '../tasks/task-history';
import {
    TaskStatusEnum,
    TaskRunType,
} from '../tasks/task-types';

export type SingleExperimentType = ToDownloadEntry;
export type ExperimentType = SingleExperimentType[];


// tasks that run just once
export const SINGLE_TASKS = {
    versions: 'versions',
    install: 'install',
};
// tasks that run once per experiment
// sorting affects order of report in TaskStatistics
export const EXPERIMENT_TASKS = {
    download: 'download-sources',
    types: 'types',
    extraction: 'extract',
    simpleExtraction: 'simple-extract',
    translation: 'translate',
    criticalPairs: 'critical-pairs',
    verify: 'verify',
};
export const TASKS = {
    ...SINGLE_TASKS,
    ...EXPERIMENT_TASKS,
};

export enum PhasesEnum {
    // versions
    versions = 'Versions',
    
    // download
    download = 'Download',
    
    // types
    types = 'Types',
    
    // install
    install = 'Install',

    // extraction
    extraction = 'Extraction',
    simpleExtraction = 'SimpleExtraction',
    
    // translation
    translation = 'Translation',
    
    // critical pairs
    criticalPairs = 'CriticalPairs',
    
    // verify
    verify = 'Verify',
    
    // results
    logs = 'Logs',
    warningsStatistics = 'WarningsStatistics',
    codeStatistics = 'CodeStatistics',
    taskStatistics = 'TaskStatistics',
    summary = 'Summary',
    performanceStatistics = 'PerformanceStatistics',
}
export const PHASES: Record<PhasesEnum, boolean> = {
    // versions
    [PhasesEnum.versions]: false,

    // download
    [PhasesEnum.download]: false,
    
    // types
    [PhasesEnum.types]: false,
    
    // install
    [PhasesEnum.install]: false,

    // extraction
    [PhasesEnum.extraction]: false,
    [PhasesEnum.simpleExtraction]: false,
    
    // translation
    [PhasesEnum.translation]: false,
    
    // critical pairs
    [PhasesEnum.criticalPairs]: false,
    
    // verify
    [PhasesEnum.verify]: true,
    
    // results
    [PhasesEnum.logs]: true,
    [PhasesEnum.warningsStatistics]: true,
    [PhasesEnum.codeStatistics]: true,
    [PhasesEnum.taskStatistics]: true,
    [PhasesEnum.summary]: true,
    [PhasesEnum.performanceStatistics]: true,
};

export async function getSucceededExperimentsTask(allExperiments: ExperimentType,
    resolvedExperimentsPath: string,
    taskName: string): Promise<ExperimentType> {
    if (null === taskName) {
        return [];
    }
    const remainingExperiments: ExperimentType = [];
    await awaitForEachArray(allExperiments, async experiment => {
        const workingDirectory = getWorkingFolder(resolvedExperimentsPath, experiment.name);
        let history: TaskRunType<unknown>[];
        try {
            history = await readHistory(workingDirectory);
        } catch (error) {
            // no task history
            return;
        }
        const statusRun = lastRunThisTask(history, {
            name: taskName,

            workingDirectory: null,
            contents: null,
            command: null,
            timeout: null,
            retry: null,
            override: null,
        });
        if (null === statusRun || undefined === statusRun
            || TaskStatusEnum.FAILED === statusRun.status
            || TaskStatusEnum.TIMED_OUT === statusRun.status) {
            return;
        }
        remainingExperiments.push(experiment);
    });
    return remainingExperiments;
}

const allExperiments: ExperimentType = ALL_MODULES.map(name => ({
    name,
    versions: [],
}));
let remainingExperiments: ExperimentType = [...allExperiments];
let resolvedExperimentsPath: string;

export function init(experimentsPath: string): void {
    resolvedExperimentsPath = Path.resolve(experimentsPath);
}

type PhaseType = {
    phase: PhasesEnum,
    code: (allExperiments: ExperimentType, remainingExperiments: ExperimentType) => Promise<void>,
    // remaining are the experiments that will be relayed as "remainingExperiments" to the next phase
    // if remaining is a string: remaining is a task name and in this case it is used to find all experiments that succeeded this task
    // if remaining is a function: remaining returns the experiments that succeeded this phase
    // at the end of the phase, it will fill allExperiments with the information provided by remaining, matching by name
    remaining: string | (() => Promise<ExperimentType>),
};
export async function nextPhase(phase: PhaseType): Promise<void> {
    const phaseName = phase.phase.toString();
    logger.info(`>>> Begin ${phaseName} phase with remaining ${remainingExperiments.length} experiments`);

    if (PHASES[phase.phase]) {
        logger.info(`Running phase ${phaseName}`);
        await phase.code(allExperiments, remainingExperiments);
    } else {
        logger.info(`Ignoring phase ${phaseName}`);
    }

    // determine next experiments
    if (typeof phase.remaining === 'function') {
        remainingExperiments = await phase.remaining();
    } else if (phase.remaining) {
        remainingExperiments = await getSucceededExperimentsTask(allExperiments, resolvedExperimentsPath, phase.remaining);
    } else {
        throw new Error('cannot determine next experiments!');
    }

    allExperiments.forEach(experiment => {
        const matchingRemaining = remainingExperiments.find(({ name }) => name === experiment.name);
        if (undefined === matchingRemaining) {
            return;
        }
        experiment.versions = matchingRemaining.versions;
    });

    logger.info(`>>> End ${phaseName} phase with remaining ${remainingExperiments.length} experiments`);
    logger.info('');
}