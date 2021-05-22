import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

type CallbackFunctionType = (string) => Promise<void>;
type CallbackType = {
    id: string,
    callback: CallbackFunctionType,
};
let callbacks: CallbackType[] = [];
let isShuttingDown = false;
let exitCode = 0;

export function shuttingDown(): boolean {
    return isShuttingDown;
}

function exit() {
    process.exit(exitCode);
}

export function quit(code: number): void {
    exitCode = code;
    if (!isShuttingDown) {
        exit();
    }
}

export function init(): void {
    const codes: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    codes.forEach(code => process.on(code, async () => {
        logger.debug(`shutdown due to ${code}, running ${callbacks.length} callbacks`);
        isShuttingDown = true;
        const promises = callbacks.map(cb => cb.callback(code));
        await Promise.all(promises);
        exit(); // no code means use exitCode
    }));
    process.on('uncaughtException', () => {
        logger.error('uncaughtException');
    });
    process.on('unhandledRejection', () => {
        logger.error('unhandledRejection');
    });
    process.on('exit', code => {
        logger.info({ code }, 'process exit event');
    });
    process.on('beforeExit', code => {
        logger.info({ code }, 'process beforeExit event');
    });
}

export function add(callback: CallbackFunctionType): string {
    const id = uuidv4();
    callbacks.push({
        id,
        callback,
    });
    return id;
}

export function remove(id: string): void {
    callbacks = callbacks.filter(callback => callback.id !== id);
}
