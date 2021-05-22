import * as Sinon from 'sinon';
import {
    // need to destroy default pool to avoid warnings
    // normal execution would destroy this in main
    defaultPool,
} from '../async-pool';
import * as Logger from '../logger';
import {
    TaskType,
    TaskRunType,
    TaskStatusEnum,
} from './task-types';
import * as TaskHistory from './task-history';
import * as TaskRunner from './task-runner';

const seconds = 1000;
const minutes = 60 * seconds;
function decorateTask(task): TaskType<string> {
    return {
        command: 'ls',
        contents: task.name,
        name: '',
        timeout: 10 * minutes,
        workingDirectory: '',
        override: false,
        retry: false,
        ...task,
    };
}
function decorateTaskRun(taskRun): TaskRunType<string> {
    return {
        duration: 1,
        startTime: '',
        endTime: '',
        options: {},
        pid: 1,
        status: TaskStatusEnum.SUCCEEDED,
        task: null,
        ...taskRun,
    };
}

describe('task-runner', () => {
    const stubs: Sinon.SinonStub[] = [];
    beforeEach(() => {
        stubs.push(Sinon.stub(TaskHistory, 'readHistory').callsFake(async () => []));
        stubs.push(Sinon.stub(TaskHistory, 'writeHistory').resolves());
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const doNothing = () => {};
        stubs.push(Sinon.stub(Logger.logger, 'info').callsFake(doNothing));
        stubs.push(Sinon.stub(Logger.logger, 'error').callsFake(doNothing));
        stubs.push(Sinon.stub(Logger.logger, 'debug').callsFake(doNothing));
        stubs.push(Sinon.stub(Logger.logger, 'trace').callsFake(doNothing));
    });
    afterEach(() => {
        stubs.forEach(stub => stub.restore());
    });
    afterAll(() => {
        defaultPool.destroy();
    });
    it('runs all tasks handling status correctly', async () => {
        const tasks: TaskType<string>[] = [
            decorateTask({ name: '1' }),
            decorateTask({ name: '2' }),
            decorateTask({ name: '3' }),
            decorateTask({ name: '4' }),
            decorateTask({ name: '5' }),
            decorateTask({ name: '6' }),
            decorateTask({ name: '7' }),
            decorateTask({ name: '8' }),
            decorateTask({ name: '9' }),
            decorateTask({ name: '10' }),
        ];
        const runTaskStub = Sinon.stub(TaskRunner, 'runTask');
        stubs.push(runTaskStub);
        runTaskStub.onCall(0).resolves(decorateTaskRun({ task: tasks[0] }));
        runTaskStub.onCall(1).resolves(decorateTaskRun({ task: tasks[1] }));
        runTaskStub.onCall(2).resolves(decorateTaskRun({
            task: tasks[2],
            status: TaskStatusEnum.FAILED,
        }));
        runTaskStub.onCall(3).resolves(decorateTaskRun({ task: tasks[3] }));
        runTaskStub.onCall(4).resolves(decorateTaskRun({
            task: tasks[4],
            status: TaskStatusEnum.TIMED_OUT,
        }));
        runTaskStub.onCall(5).resolves(decorateTaskRun({ task: tasks[5] }));
        runTaskStub.onCall(6).rejects(decorateTaskRun({
            task: tasks[6],
            status: TaskStatusEnum.FAILED,
        }));
        runTaskStub.onCall(7).resolves(decorateTaskRun({ task: tasks[7] }));
        runTaskStub.onCall(8).resolves(decorateTaskRun({ task: tasks[8] }));
        runTaskStub.onCall(9).resolves(decorateTaskRun({ task: tasks[9] }));
        const succeeded = await TaskRunner.runTaskArray(tasks, 3);
        expect(runTaskStub.callCount).toBe(10);
        expect(succeeded).toStrictEqual([ '1', '2', '4', '6', '8', '9', '10' ]);
    });
    it('runs all tasks handling status correctly when all tasks reject', async () => {
        const tasks: TaskType<string>[] = [
            decorateTask({ name: '1' }),
            decorateTask({ name: '2' }),
            decorateTask({ name: '3' }),
            decorateTask({ name: '4' }),
            decorateTask({ name: '5' }),
            decorateTask({ name: '6' }),
            decorateTask({ name: '7' }),
            decorateTask({ name: '8' }),
            decorateTask({ name: '9' }),
            decorateTask({ name: '10' }),
        ];
        const runTaskStub = Sinon.stub(TaskRunner, 'runTask');
        stubs.push(runTaskStub);
        runTaskStub.onCall(0).rejects(decorateTaskRun({ task: tasks[0] }));
        runTaskStub.onCall(1).rejects(decorateTaskRun({ task: tasks[1] }));
        runTaskStub.onCall(2).rejects(decorateTaskRun({
            task: tasks[2],
            status: TaskStatusEnum.FAILED,
        }));
        runTaskStub.onCall(3).rejects(decorateTaskRun({ task: tasks[3] }));
        runTaskStub.onCall(4).rejects(decorateTaskRun({
            task: tasks[4],
            status: TaskStatusEnum.TIMED_OUT,
        }));
        runTaskStub.onCall(5).rejects(decorateTaskRun({ task: tasks[5] }));
        runTaskStub.onCall(6).rejects(decorateTaskRun({
            task: tasks[6],
            status: TaskStatusEnum.FAILED,
        }));
        runTaskStub.onCall(7).rejects(decorateTaskRun({ task: tasks[7] }));
        runTaskStub.onCall(8).rejects(decorateTaskRun({ task: tasks[8] }));
        runTaskStub.onCall(9).rejects(decorateTaskRun({ task: tasks[9] }));
        const succeeded = await TaskRunner.runTaskArray(tasks, 3);
        expect(runTaskStub.callCount).toBe(10);
        expect(succeeded).toStrictEqual([]);
    });
    it('runs a huge number of tasks and does not get stuck', async () => {
        const tasks: TaskType<string>[] = [];
        const runTaskStub = Sinon.stub(TaskRunner, 'runTask');
        for (let x = 0; x < 1000; x++) {
            tasks.push(decorateTask({
                name: `${x}`,
                command: 'test2',
            }));
            runTaskStub.onCall(x)
                .callsFake(async task =>
                    new Promise(resolve =>
                        setTimeout(() => resolve(decorateTaskRun({ task })), 1)));
        }
        stubs.push(runTaskStub);
        const succeeded = await TaskRunner.runTaskArray(tasks, 10);
        expect(runTaskStub.callCount).toBe(1000);
        expect(succeeded.length).toBe(1000);
    });
});