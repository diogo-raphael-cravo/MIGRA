
export type SetType<T> = {
    length: number,
    data: T[],
};

export function setUnion<T>(set1: SetType<T>, set2: SetType<T>): SetType<T> {
    const setUnion = set1.data.concat(set2.data);
    return {
        length: setUnion.length,
        data: setUnion,
    };
}

export function setEquals<T>(set1: T[], set2: T[], comparison: (a: T, b: T) => boolean): boolean {
    return set1.length === set2.length && set1.length === setIntersection(set1, set2, comparison).length;
}

export function setIntersection<T>(set1: T[], set2: T[], comparison: (a: T, b: T) => boolean): SetType<T> {
    const setDifference = set1.filter(set1Warning => set2
        .find(set2Warning => comparison(set1Warning, set2Warning)));
    return {
        length: setDifference.length,
        data: setDifference,
    };
}

export function setDifference<T>(set1: T[], set2: T[], comparison: (a: T, b: T) => boolean): SetType<T> {
    const setDifference = set1.filter(set1Warning => !set2
        .find(set2Warning => comparison(set1Warning, set2Warning)));
    return {
        length: setDifference.length,
        data: setDifference,
    };
}

function equalsComparison<T>(a: T, b: T): boolean {
    return a === b;
}

export function deduplicate<T>(set: T[], comparison: (a: T, b: T) => boolean = equalsComparison): T[] {
    return set.reduce((prev, curr) => {
        if (prev.find(x => comparison(x, curr))) {
            return prev;
        }
        return [...prev, curr];
    }, []);
}