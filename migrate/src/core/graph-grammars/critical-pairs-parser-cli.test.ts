import { PairEnum } from './critical-pairs';
import CriticalPairsVerigraphCLI from './critical-pairs-parser-cli';

describe('critical-pairs-verigraph-cli', () => {
    it('parses a verigraph critical pairs output table', () => {
        const ruleNames = [ '1', '2', 'a', '4', '5', '6'];
        const verigraphOutput = 'Delete-Use:\n'
            + '( 1 0 0 0 0 0 )\n'
            + '( 0 3 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 1 1 2 4 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 1 )\n';
        const table = CriticalPairsVerigraphCLI.parseSingleTable(ruleNames, verigraphOutput);
        expect(table.type).toBe(PairEnum.DELETE_USE_CONFLICT);
        expect(table.transposed).toBe(false);
        expect(table.pairs['1']['1']).toBe(1);
        expect(table.pairs['2']['2']).toBe(3);
        expect(table.pairs['4']['1']).toBe(1);
        expect(table.pairs['4']['2']).toBe(1);
        expect(table.pairs['4']['a']).toBe(2);
        expect(table.pairs['4']['4']).toBe(4);
        expect(table.pairs['6']['6']).toBe(1);
    });
    it('parses verigraph output', () => {
        const ruleNames = [ '1', '2', 'a', '4', '5', '6'];
        const verigraphOutput = 'number of cores: 8\n\n'
            + 'Non-injective matches allowed.\n\n'
            + 'Analyzing the graph grammar...\n\n'
            + 'Delete-Use:\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 3 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 1 1 2 4 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n\n'
            + 'Produce-Dangling:\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n\n'
            + 'Produce-Forbid:\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 5 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 1 0 0 0 0 )\n\n'
            + 'Conflicts:\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 8 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 1 1 2 4 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 1 0 0 0 0 )\n\n'
            + 'Produce-Use:\n'
            + '( 0 3 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 2 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 1 1 1 1 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n\n'
            + 'Remove-Dangling:\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n\n'
            + 'Delete-Forbid:\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n\n'
            + 'Dependencies:\n'
            + '( 0 3 0 0 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 0 0 0 2 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n'
            + '( 1 1 1 1 0 0 )\n'
            + '( 0 0 0 0 0 0 )\n\n\n\n'
            + 'Critical Pair Analysis done!\n';
        const tables = CriticalPairsVerigraphCLI.parseTables(ruleNames, verigraphOutput);
        expect(tables[PairEnum.DELETE_USE_CONFLICT]).toBeDefined();
        expect(tables[PairEnum.PRODUCE_DANGLING_CONFLICT]).toBeDefined();
        expect(tables[PairEnum.PRODUCE_FORBID_CONFLICT]).toBeDefined();
        expect(tables[PairEnum.PRODUCE_USE_DEPENDENCY]).toBeDefined();
        expect(tables[PairEnum.REMOVE_DANGLING_DEPENDENCY]).toBeDefined();
        expect(tables[PairEnum.DELETE_FORBID_DEPENDENCY]).toBeDefined();
    });
});