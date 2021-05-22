


export type ScopeTableEntry<T> = {
    // name of this entry, as referenced in code
    name: string,
    // alias given to this entry for processing
    alias: string,
    // actual AST node
    node: T,
};

export type ScopeTable<T> = {
    // all names defined in this entry are valid in scope
    // and all of its inner scopes
    scopeNode: T,
    entries: ScopeTableEntry<T>[],
    parentScope: ScopeTable<T>,
};

function makeScopeTable<T>(scopeNode: T): ScopeTable<T> {
    return {
        scopeNode,
        entries: [],
        parentScope: null,
    };
}

export function pushScope<T>(scopeNode: T, scopeTable: ScopeTable<T> = null): ScopeTable<T> {
    const newScope = makeScopeTable(scopeNode);
    newScope.parentScope = scopeTable;
    return newScope;
}

export function popScope<T>(scopeTable: ScopeTable<T>): ScopeTable<T> {
    if (null === scopeTable) {
        return null;
    }
    return scopeTable.parentScope;
}

export function pushEntry<T>(entry: ScopeTableEntry<T>, scopeTable: ScopeTable<T>): void {
    scopeTable.entries.push(entry);
}

export function pushEntryToRoot<T>(entry: ScopeTableEntry<T>, scopeTable: ScopeTable<T>): void {
    if (null === scopeTable.parentScope) {
        scopeTable.entries.push(entry);
        return;
    }
    pushEntryToRoot(entry, scopeTable.parentScope);
}

function findEntry<T>(finder: (entry: ScopeTableEntry<T>) => boolean, scopeTable: ScopeTable<T>): ScopeTableEntry<T> {
    if (null === scopeTable) {
        return null;
    }
    const entry = scopeTable.entries
        .find(candidate => finder(candidate));
    if (undefined !== entry) {
        return entry;
    }
    return findEntry(finder, popScope(scopeTable));
}
export function getEntryByName<T>(name: string, scopeTable: ScopeTable<T>): ScopeTableEntry<T> {
    return findEntry(entry => name === entry.name, scopeTable);
}

export function getEntryByAlias<T>(alias: string, scopeTable: ScopeTable<T>): ScopeTableEntry<T> {
    return findEntry(entry => alias === entry.alias, scopeTable);
}
