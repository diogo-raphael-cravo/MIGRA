import * as uuid from 'uuid';
export function id(): string {
    return uuid.v4();
}