import * as Path from 'path';
import * as FS from 'fs';
import * as execa from 'execa';
import {
    awaitForEachArray,
} from '../helpers';
import {
    AsyncPool,
} from '../async-pool';
import { logger } from '../logger';
import {
    TaskRunType,
    TaskStatusEnum,
    TaskType,
} from './task-types';
import {
    readHistory,
    writeHistory,
    lastRunThisTask,
    succeeded,
} from './task-history';


function markTime(): string {
    return new Date().toISOString();
}
export function getStdoutLogPath(workingDirectory: string): string {
    return Path.join(workingDirectory, 'stdout-log.txt');
}
export function getStderrLogPath(workingDirectory: string): string {
    return Path.join(workingDirectory, 'stderr-log.txt');
}
export async function runTask<T>(task: TaskType<T>): Promise<TaskRunType<T>> {
    let status = null;
    const env: Record<string, string> = {
        LOG_LEVEL: 'trace',
    };
    const cwd: string = task.workingDirectory;
    const startTime: string = markTime();
    const stdoutWriteStream = FS.createWriteStream(getStdoutLogPath(task.workingDirectory), {
        flags: 'a',
        emitClose: true,
    });
    const stderrWriteStream = FS.createWriteStream(getStderrLogPath(task.workingDirectory), {
        flags: 'a',
        emitClose: true,
    });
    // se falhar nunca resolve
    const closeStdout = new Promise(resolve => stdoutWriteStream.on('close', resolve));
    const closeStderr = new Promise(resolve => stderrWriteStream.on('close', resolve));
    let timeoutHandler = null;
    let timedout = false;
    let pid: number;
    try {
        const promise: execa.ExecaChildProcess = execa(task.command[0], task.command.slice(1), {
            env,
        });
        pid = promise.pid;
        promise.stdout.pipe(stdoutWriteStream);
        promise.stderr.pipe(stderrWriteStream);
        timeoutHandler = setTimeout(() => {
            timedout = true;
            logger.info({
                workingDirectory: task.workingDirectory,
            }, 'a task has timed out');
            promise.kill('SIGINT', { forceKillAfterTimeout: 5000 });
        }, task.timeout);
        await promise;
        status = timedout ? TaskStatusEnum.TIMED_OUT : TaskStatusEnum.SUCCEEDED;
    } catch (error) {
        // logger.error({ error: error.message }, 'a task has failed');
        status = timedout ? TaskStatusEnum.TIMED_OUT : TaskStatusEnum.FAILED;
    }
    const endTime: string = markTime();
    try {
        await closeStdout;
    } catch {
        logger.error('failed to close stdout');
    }
    try {
        await closeStderr;
    } catch {
        logger.error('failed to close stderr');
    }
    if (null !== timeoutHandler) {
        clearTimeout(timeoutHandler);
    }
    const duration: number = new Date(endTime).getTime() - new Date(startTime).getTime();
    return {
        status,
        options: {
            ...env,
            cwd,
        },
        startTime,
        endTime,
        duration,
        pid,
        task,
    };
}

export async function filterTasksSucceeded<T>(tasks: TaskType<T>[]): Promise<T[]> {
    const succeededTaskModules: T[] = [];
    await awaitForEachArray(tasks, async task => {
        const history = await readHistory(task.workingDirectory);
        const priorTaskRun = lastRunThisTask(history, task);
        const taskHasRunBefore = undefined !== priorTaskRun;
        const taskSucceededBefore = taskHasRunBefore  && TaskStatusEnum.SUCCEEDED === priorTaskRun.status;
        if (taskSucceededBefore) {
            succeededTaskModules.push(task.contents);
        }
    });
    return succeededTaskModules;
}

export async function runTaskArray<T>(tasks: TaskType<T>[], step: number): Promise<T[]> {
    const pool = new AsyncPool<TaskRunType<T>>(5, step);
    const succeededTaskModules: T[] = [];
    logger.info(`Running ${tasks.length} tasks.`);
    const twoPercent = Math.ceil(tasks.length / 50);
    let count = 0;
    await awaitForEachArray(tasks, async task => {
        const history = await readHistory(task.workingDirectory);
        logger.trace(`Task history length ${history.length} (just read)...`);
        let taskRun: TaskRunType<T>;
        const priorTaskRun = lastRunThisTask(history, task);
        const taskHasRunBefore = undefined !== priorTaskRun;
        const taskFailedBefore = taskHasRunBefore 
            && (TaskStatusEnum.FAILED === priorTaskRun.status || TaskStatusEnum.TIMED_OUT === priorTaskRun.status);
        const shouldRetry = taskFailedBefore && task.retry;
        const taskSucceededBefore = taskHasRunBefore  && TaskStatusEnum.SUCCEEDED === priorTaskRun.status;
        const shouldOverride = taskSucceededBefore && task.override;
        if (!taskHasRunBefore || shouldRetry || shouldOverride) {
            // must invoke runTask on exports to be able to stub with Sinon
            try {
                taskRun = await pool.run(() => exports.runTask(task));
                logger.trace(`Task ${task.name} status ${taskRun.status}...`);
            } catch (error) {
                taskRun = {
                    duration: 0,
                    startTime: markTime(),
                    endTime: markTime(),
                    pid: null,
                    options: null,
                    status: TaskStatusEnum.FAILED,
                    task,
                };
                logger.trace(`Task failed with exception ${task.name}...`);
            }
            logger.debug(`Done task ${task.name}...`);
        } else {
            taskRun = {
                duration: 0,
                startTime: markTime(),
                endTime: markTime(),
                pid: null,
                options: null,
                status: TaskStatusEnum.IGNORED,
                task,
            };
            logger.trace(`Task ignored ${task.name}...`);
        }
        logger.trace(`Task history length ${history.length} (after running)...`);
        history.push(taskRun);
        await writeHistory(task.workingDirectory, history);
        logger.trace(`Task history length ${history.length} (after writing)...`);
        if (succeeded(history)) {
            logger.trace(`Adding ${task.name} to succeeded...`);
            succeededTaskModules.push(task.contents);
        }
        count++;
        if (0 === count % twoPercent) {
            logger.info(`Finished ${count} tasks...`);
        }
        logger.debug(`Finished ${count} tasks...`);
    });
    pool.destroy();
    logger.info(`Finished all ${tasks.length} tasks.`);
    return succeededTaskModules;
}