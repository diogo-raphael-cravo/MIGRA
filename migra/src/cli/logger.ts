import * as Pino from 'pino';
import {
    LOG_LEVEL
} from './config';

export const logger = Pino({
    level: LOG_LEVEL,
    prettyPrint: true,
});