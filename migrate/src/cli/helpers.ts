import * as Path from 'path';
import * as FS from 'fs';
import { logger } from './logger';

export const writeFile = FS.promises.writeFile;
const readFile = FS.promises.readFile;

export const copyFile = FS.promises.copyFile;
export const access = FS.promises.access;
export const mkdir = FS.promises.mkdir;
export const readdir = FS.promises.readdir;
export const rmdir = FS.promises.rmdir;

export async function ensureDirectory(path: string): Promise<void> {
    try {
        await FS.promises.lstat(path);
        return; // file / directory exists
    } catch(err) {}
    // file / directory does not exist
    try {
        await FS.promises.mkdir(path);
        return; // directory created
    } catch(err) {
        // need to create parent structure first
        await ensureDirectory(Path.dirname(path));
        try {
            await FS.promises.mkdir(path);
            return; // file / directory exists, some other execution line must have created it
        } catch(err) {}
    }
}

export async function applyPredicateToDirectory(directory: string, predicate: (filename: string) => Promise<void>): Promise<void> {
    const files = await FS.promises.readdir(directory);
    const promises = files.map(file => {
        const path = Path.join(directory, file);
        return FS.promises.lstat(path).then(stat => {
            if (stat.isFile()) { // consider changing to !stat.isDirectory()
                return predicate(path);
            }
            return applyPredicateToDirectory(path, predicate);
        });
    });
    await Promise.all(promises);
}

async function copyFileByRegex(fromPath: string, toPath: string, extensions: string[]): Promise<void> {
    const filename = Path.basename(fromPath);
    if (undefined !== extensions.find(ext => Path.extname(filename) === ext)) {
        await ensureDirectory(Path.dirname(toPath));
        await FS.promises.copyFile(fromPath, toPath);
    }
}

export async function copyDirectoryByRegex(fromPath: string, toPath: string, extensions: string[], basePath: string = fromPath): Promise<void> {
    const files = await FS.promises.readdir(fromPath);
    const promises = files.map(file => {
        const path = Path.join(fromPath, file);
        return FS.promises.lstat(path).then(stat => {
            if (stat.isFile()) { // consider changing to !stat.isDirectory()
                return copyFileByRegex(path, Path.join(toPath, Path.relative(basePath, path)), extensions);
            }
            return copyDirectoryByRegex(path, toPath, extensions, basePath);
        });
    });
    await Promise.all(promises);
}

async function myCopyFile(fromPath: string, toPath: string): Promise<void> {
    await ensureDirectory(Path.dirname(toPath));
    await FS.promises.copyFile(fromPath, toPath);
}

export async function copyDirectory(fromPath: string, toPath: string, basePath: string = fromPath): Promise<void> {
    const files = await FS.promises.readdir(fromPath);
    const promises = files.map(file => {
        const path = Path.join(fromPath, file);
        return FS.promises.lstat(path).then(stat => {
            if (!stat.isDirectory()) {
                return myCopyFile(path, Path.join(toPath, Path.relative(basePath, path)));
            }
            return copyDirectory(path, toPath, basePath);
        });
    });
    await Promise.all(promises);
}

export async function readFileIgnore(filePath: string): Promise<string> {
    try {
        const text = await readFile(filePath, { encoding: 'utf-8' });
        return text;
    } catch {
        logger.debug(`missing file ${filePath}`);
        return null;
    }
}

export async function awaitForEachArray<T,U>(array: T[], promise: (item: T, position: number) => Promise<U>): Promise<U[]> {
    const promises = array.map(promise);
    const results = await Promise.all(promises);
    return results.filter(x => null !== x);
}

export type Dictionary<T> = {
    [key: string]: T,
};

export async function awaitForEachDictionary<T,U>(array: T[], promise: (T) => Promise<U>, getKey: (T) => string): Promise<Dictionary<U>> {
    const promises = array.map(promise);
    const results = await Promise.all(promises);
    return results.reduce((prev, curr) => {
        if (null !== curr) {
            prev[getKey(curr)] = curr;
        }
        return prev;
    }, {});
}

export async function writeJSON<T>(targetDir: string, fileName:string, json: T): Promise<void> {
    const targetFile = Path.join(targetDir, `${fileName}.json`);
    logger.debug(`writing file ${targetFile}`);
    await writeFile(targetFile, JSON.stringify(json, null, 2));
}

export function deepCopy<T>(anyObject: T): T {
    return JSON.parse(JSON.stringify(anyObject));
}