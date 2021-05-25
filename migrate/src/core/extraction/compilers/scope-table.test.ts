import {
    ScopeTable,
    ScopeTableEntry,
    pushScope,
    popScope,
    pushEntry,
    pushEntryToRoot,
    getEntryByName,
    getEntryByAlias,
} from './scope-table';

describe('scope-table', () => {
    describe('pushScope', () => {
        it('pushes a new scope to empty table', () => {
            const scopeTable: ScopeTable<string> = pushScope('node');
            expect(scopeTable.scopeNode).toStrictEqual('node');
        });
        it('pushes a new scope to existing table', () => {
            const scopeTable: ScopeTable<string> = pushScope('node');
            const newScopeTable: ScopeTable<string> = pushScope('new-node', scopeTable);
            expect(newScopeTable.scopeNode).toStrictEqual('new-node');
        });
    });
    describe('popScope', () => {
        it('pops scope from empty table', () => {
            const popScopeTable: ScopeTable<string> = popScope(null);
            expect(popScopeTable).toBeNull();
        });
        it('pops scope leaving empty table', () => {
            const popScopeTable: ScopeTable<string> = popScope(pushScope('node'));
            expect(popScopeTable).toBeNull();
        });
        it('pops top scope leaving other scopes', () => {
            const scopeTable: ScopeTable<string> = pushScope('child', pushScope('parent'));
            const popScopeTable: ScopeTable<string> = popScope(scopeTable);
            expect(popScopeTable.scopeNode).toStrictEqual('parent');
        });
    });
    describe('getEntryByName', () => {
        it('when entry is not there', () => {
            const scopeTable: ScopeTable<string> = pushScope('child', pushScope('parent'));
            const entryFound: ScopeTableEntry<string> = getEntryByName('name', scopeTable);
            expect(entryFound).toBeNull();
        });
        it('when entry is in current scope', () => {
            const scopeTable: ScopeTable<string> = pushScope('child', pushScope('parent'));
            const entry: ScopeTableEntry<string> = {
                alias: 'alias',
                name: 'name',
                node: 'node',
            };
            pushEntry(entry, scopeTable);
            const entryFound: ScopeTableEntry<string> = getEntryByName('name', scopeTable);
            expect(entryFound).toStrictEqual(entry);
        });
        it('when entry is in parent scope', () => {
            const parentScope = pushScope('parent');
            const entry: ScopeTableEntry<string> = {
                alias: 'alias',
                name: 'name',
                node: 'node',
            };
            pushEntry(entry, parentScope);
            const scopeTable: ScopeTable<string> = pushScope('child', parentScope);
            const entryFound: ScopeTableEntry<string> = getEntryByName('name', scopeTable);
            expect(entryFound).toStrictEqual(entry);
        });
    });
    describe('getEntryByAlias', () => {
        it('when entry is not there', () => {
            const scopeTable: ScopeTable<string> = pushScope('child', pushScope('parent'));
            const entryFound: ScopeTableEntry<string> = getEntryByAlias('alias', scopeTable);
            expect(entryFound).toBeNull();
        });
        it('when entry is in current scope', () => {
            const scopeTable: ScopeTable<string> = pushScope('child', pushScope('parent'));
            const entry: ScopeTableEntry<string> = {
                alias: 'alias',
                name: 'name',
                node: 'node',
            };
            pushEntry(entry, scopeTable);
            const entryFound: ScopeTableEntry<string> = getEntryByAlias('alias', scopeTable);
            expect(entryFound).toStrictEqual(entry);
        });
        it('when entry is in parent scope', () => {
            const parentScope = pushScope('parent');
            const entry: ScopeTableEntry<string> = {
                alias: 'alias',
                name: 'name',
                node: 'node',
            };
            pushEntry(entry, parentScope);
            const scopeTable: ScopeTable<string> = pushScope('child', parentScope);
            const entryFound: ScopeTableEntry<string> = getEntryByAlias('alias', scopeTable);
            expect(entryFound).toStrictEqual(entry);
        });
    });
    describe('pushEntryToRoot', () => {
        it('pushes entry to root scope', () => {
            const scopeTable: ScopeTable<string> = pushScope('child', pushScope('parent'));
            const entry: ScopeTableEntry<string> = {
                alias: 'alias',
                name: 'name',
                node: 'node',
            };
            pushEntryToRoot(entry, scopeTable);
            const entryFound: ScopeTableEntry<string> = getEntryByAlias('alias', scopeTable);
            expect(entryFound).toStrictEqual(entry);
        });
    });
});