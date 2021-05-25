import PQueue from 'p-queue';
import { logger } from './logger';

export class AsyncPool<T> {
    timeout: number;
    capacity: number;
    count: number;
    queue: PQueue;
    constructor(timeout: number, capacity: number) {
        this.timeout = timeout;
        this.capacity = capacity;
        this.count = 0;
        this.queue = new PQueue({
            concurrency: capacity,
        });
        // from the documentation: https://github.com/sindresorhus/p-queue#timeout
        this.queue.on('active', () => {
            logger.debug(`Working on item #${this.count++}.  Size: ${this.queue.size}  Pending: ${this.queue.pending}`);
        });
        this.queue.on('idle', () => {
            logger.debug(`Queue is idle.  Size: ${this.queue.size}  Pending: ${this.queue.pending}`);
        });
        this.queue.on('add', () => {
            logger.debug(`Task is added.  Size: ${this.queue.size}  Pending: ${this.queue.pending}`);
        });
        this.queue.on('next', () => {
            logger.debug(`Task is completed.  Size: ${this.queue.size}  Pending: ${this.queue.pending}`);
        });
    }

    destroy(): void {
        if (0 < this.queue.size || 0 < this.queue.pending) {
            logger.error({
                size: this.queue.size,
                pending: this.queue.pending,
                count: this.count,
            },'destroying a queue that is not empty!');
        }
    }

    async run(asyncFunction: () => Promise<T>): Promise<T> {
        return this.queue.add(asyncFunction);
    }
}
export const defaultPool = new AsyncPool<any>(5, 5);