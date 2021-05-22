import { CriticalPairs, CriticalPairsParserInterface, CriticalPairsType, TableType, PairEnum, ParserError } from './critical-pairs';

class CriticalPairsVerigraphCLI extends CriticalPairs implements CriticalPairsParserInterface {
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
        unparsedLines.slice(1, unparsedLines.length)
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
        if (ruleNames.length === 0) {
            throw new Error('too few rules');
        }
        const sanitizedLines = verigraphOutput
            .split('\n')
            .map(x => x.trim())
            .filter(x => x)
            .filter(x => !x.startsWith('number of cores:')
                && !x.startsWith('Non-injective matches allowed.')
                && !x.startsWith('Analyzing the graph grammar...')
                && !x.startsWith('Critical Pair Analysis done!'));
        const linesInATable = ruleNames.length + 1;
        if (sanitizedLines.length % linesInATable !== 0) {
            throw new Error('either missing rules or unexpected verigraph output format');
        }
        const sanitizedTables = sanitizedLines
            .reduce((prev, sanitizedOutputLine, index) => {
                const newTable = (index % linesInATable) === 0;
                if (newTable) {
                    prev.push(sanitizedOutputLine);
                    return prev;
                }
                prev[prev.length - 1] = prev[prev.length - 1].concat(`\n${sanitizedOutputLine}`);
                return prev;
            }, []);
        return sanitizedTables
            .reduce((previous, unparsedTable) => {
                if (unparsedTable.startsWith('Conflicts:')
                    || unparsedTable.startsWith('Dependencies:')) {
                    return previous;
                }
                const table = this.parseSingleTable(ruleNames, unparsedTable);
                previous[table.type] = table;
                return previous;
            }, {});
    }
}

export default new CriticalPairsVerigraphCLI();