import * as Path from 'path';
import {
    readFileIgnore,
    writeJSON,
} from '../helpers';
import {
    TaskRunType,
    TaskType,
    TaskStatusEnum,
} from './task-types';
import { logger } from '../logger';

const TASK_HISTORY_FILENAME = 'task-history';

export async function readHistory<T>(workingDirectory: string): Promise<TaskRunType<T>[]> {
    const taskHistoryFilepath = Path.join(workingDirectory, `${TASK_HISTORY_FILENAME}.json`);
    logger.trace(`reading ${taskHistoryFilepath}`);
    const taskHistoryFile = await readFileIgnore(taskHistoryFilepath);
    logger.trace(`finished reading ${taskHistoryFilepath}`);
    try {
        let history = <TaskRunType<T>[]> JSON.parse(taskHistoryFile);
        if (null === history) {
            history = [];
        }
        return history;
    } catch (error) {
        error.message = `${error.message}\nFailed parsing ${taskHistoryFilepath}`;
        throw error;
    }
}

export async function writeHistory<T>(workingDirectory: string, history: TaskRunType<T>[]): Promise<void> {
    logger.trace(`writing ${TASK_HISTORY_FILENAME} to ${workingDirectory}`);
    await writeJSON(workingDirectory, TASK_HISTORY_FILENAME, history);
    logger.trace(`finished writing ${TASK_HISTORY_FILENAME} to ${workingDirectory}`);
}

function sameTask<T>(t1: TaskType<T>, t2: TaskType<T>): boolean {
    return t1.name === t2.name;
        // array comparison does not work like this
        // && t1.command === t2.command
        // consider uncommenting line below if folder won't be moved
        // && t1.workingDirectory === t2.workingDirectory;
}

export function lastRunThisTask<T>(history: TaskRunType<T>[], taskToFind: TaskType<T>): TaskRunType<T> {
    const reversedHistory = [...history].reverse();
    return reversedHistory
        .filter(task => TaskStatusEnum.IGNORED !== task.status)
        .find(thisTask => sameTask(taskToFind, thisTask.task));
}
export function lastRunByTaskName<T>(history: TaskRunType<T>[], nameToFind: string): TaskRunType<T> {
    return lastRunThisTask(history, {
        name: nameToFind,

        workingDirectory: null,
        contents: null,
        command: null,
        timeout: null,
        retry: null,
        override: null,
    });
}

export function getStatusRun<T>(history: TaskRunType<T>[]): TaskRunType<T> {
    if (0 === history.length) {
        return null;
    }
    const lastEntry: TaskRunType<T> = history.slice(-1)[0];
    if (TaskStatusEnum.IGNORED !== lastEntry.status) {
        return lastEntry;
    }
    return getStatusRun(history.slice(0, -1));
}

export function succeeded<T>(history: TaskRunType<T>[]): boolean {
    const statusRun = getStatusRun(history);
    if (null === statusRun) {
        return false;
    }
    const status = statusRun.status;
    return TaskStatusEnum.SUCCEEDED === status;
}