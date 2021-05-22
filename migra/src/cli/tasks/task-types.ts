
export enum TaskStatusEnum {
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    TIMED_OUT = 'timedout',
    IGNORED = 'ignored',
}
export type TaskRunType<T> = {
    options: Record<string, string>,
    status: TaskStatusEnum,
    duration: number,
    startTime: string,
    endTime: string,
    pid: number,
    task: TaskType<T>,
};
export type TaskType<T> = {
    name: string,
    command: string[],
    contents: T,
    workingDirectory: string,
    timeout: number,
    retry: boolean,
    override: boolean,
};