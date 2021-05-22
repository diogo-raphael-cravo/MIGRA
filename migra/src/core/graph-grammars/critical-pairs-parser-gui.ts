import { CriticalPairs, CriticalPairsParserInterface, CriticalPairsType, TableType, PairEnum, ParserError } from './critical-pairs';

class CriticalPairsVerigraphGUI extends CriticalPairs implements CriticalPairsParserInterface {
    public parseName(name: string): PairEnum {
        switch(name) {
            case 'Delete-Use:':
                return PairEnum.DELETE_USE_CONFLICT;
            case 'Produce-Dangling:':
                return PairEnum.PRODUCE_DANGLING_CONFLICT;
            case 'Produce-Forbid:':
                return PairEnum.PRODUCE_FORBID_CONFLICT;
            case 'Produce-Use:':
                return PairEnum.PRODUCE_USE_DEPENDENCY;
            case 'Remove-Dangling:':
                return PairEnum.REMOVE_DANGLING_DEPENDENCY;
            case 'Delete-Forbid:':
                return PairEnum.DELETE_FORBID_DEPENDENCY;
            default:
                throw new ParserError(`cannot parseName ${name}`);
        }
    }

    public parseSingleTable(ruleNames: string[], verigraphOutput: string): TableType {
        const unparsedLines = verigraphOutput.trim().split('\n');
        const pairs = {};
        unparsedLines.slice(2, unparsedLines.length - 1)
            .forEach((line, lineIndex) => {
                const currentLine = {};
                const unparsedLinePairs = line.split(' ')
                    .slice(1, ruleNames.length + 1);
                unparsedLinePairs.forEach((linePair, linePairIndex) => {
                    currentLine[ruleNames[linePairIndex]] = parseInt(linePair, 10);
                });
                pairs[ruleNames[lineIndex]] = currentLine;
        });
        return {
            type: this.parseName(unparsedLines[0]),
            transposed: false,
            pairs,
        };
    }

    public parseTables(ruleNames: string[], verigraphOutput: string): CriticalPairsType {
        return verigraphOutput.split('┘')
            .reduce((previous, unparsedTable, index) => {
                if (unparsedTable.trim().startsWith('Conflicts:')
                    || unparsedTable.trim().startsWith('Dependencies:')
                    || unparsedTable.trim().length === 0) {
                    return previous;
                }
                const table = this.parseSingleTable(ruleNames, unparsedTable);
                if (index === 2) {
                    previous[PairEnum.PRODUCE_FORBID_CONFLICT] = table;
                } else {
                    previous[table.type] = table;
                }
                return previous;
            }, {});
    }
}

export default new CriticalPairsVerigraphGUI();