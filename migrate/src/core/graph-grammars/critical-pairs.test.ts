import { CriticalPairs, PairEnum } from './critical-pairs';

describe('critical-pairs', () => {
    it('transposes a table', () => {
        const table = {
            type: PairEnum.PRODUCE_USE_DEPENDENCY,
            transposed: false,
            pairs: {
                A: {
                    B: 1,
                },
                B: {},
            }
        };
        const transposed = {
            type: PairEnum.PRODUCE_USE_DEPENDENCY,
            transposed: true,
            pairs: {
                A: {},
                B: {
                    A: 1,
                },
            }
        };
        expect(CriticalPairs.transpose(table)).toEqual(transposed);
    });
    it('removes self-loops', () => {
        const table = {
            type: PairEnum.PRODUCE_USE_DEPENDENCY,
            transposed: false,
            pairs: {
                A: {
                    A: 1,
                    B: 1,
                },
                B: {
                    A: 1,
                    B: 1,
                },
            }
        };
        const expected = {
            type: PairEnum.PRODUCE_USE_DEPENDENCY,
            transposed: false,
            pairs: {
                A: {
                    B: 1,
                },
                B: {
                    A: 1,
                },
            }
        };
        expect(CriticalPairs.removeSelfLoops(table)).toEqual(expected);
    });
});