import {
    fullSimplify,
    simplify,
    transitiveClosure,
} from './simplifier';
import {
    MappingType,
    ExtractedOperationType,
} from './types';

describe('simplifier', () => {
    describe('simplify', () => {
        it('does nothing when nothing needs to be done', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [],
                generated: [],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            const expected: ExtractedOperationType = extracted;
            expect(simplify(extracted)).toStrictEqual(expected);
        });
        it('removes self arrows with wide mapping paths', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.local-0', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                }],
                required: ['foo.local-0', 'foo.par-2'],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-2',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                }],
                required: ['foo.par-2'],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                mappings: [{
                    fromId: 'foo.par-2',
                    toId: 'foo.return-2',
                }, {
                    fromId: 'foo.par-0',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-0',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-1',
                }],
            };
            expect(simplify(extracted)).toStrictEqual(expected);
        });
        it('removes self arrows with long mapping paths', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.local-2', 'foo.return-0'],
                }],
                required: ['foo.local-2'],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.local-1',
                }, {
                    fromId: 'foo.local-1',
                    toId: 'foo.local-2',
                }, {
                    fromId: 'foo.local-2',
                    toId: 'foo.return-0',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.return-0',
                }],
            };
            expect(simplify(extracted)).toStrictEqual(expected);
        });
        it('removes locals without corresponding parameters', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                }],
                required: [
                    'foo.local-0',
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                    'foo.local-0',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.local-0',
                    toId: 'foo.return-0',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(simplify(extracted)).toStrictEqual(expected);
        });
        it('removes chains of locals without corresponding parameters', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.return-0'],
                }],
                required: [
                    'foo.local-0',
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                    'foo.local-0',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.local-0',
                    toId: 'foo.local-1',
                }, {
                    fromId: 'foo.local-1',
                    toId: 'foo.return-0',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(simplify(extracted)).toStrictEqual(expected);
        });
        it('removes locals without corresponding returns', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                }],
                required: [
                    'foo.local-0',
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                    'foo.local-0',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(simplify(extracted)).toStrictEqual(expected);
        });
        it('removes chains of locals without corresponding returns', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.return-0'],
                }],
                required: [
                    'foo.local-0',
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                    'foo.local-0',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.local-1',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(simplify(extracted)).toStrictEqual(expected);
        });
        it('is the example we have in the dissertation', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.local-0', 'foo.return-0', 'foo.return-1'],
                }],
                required: [
                    'foo.par-0', // used in declarator init
                    'foo.local-0', // used in return
                    'foo.par-1', // used in return
                    'foo.par-2', // used in return
                ],
                generated: ['foo', 'foo.local-0'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-1',
                }],
            };

            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1'],
                }],
                required: [
                    'foo.par-0', // used in declarator init
                    'foo.par-1', // used in return
                    'foo.par-2', // used in return
                ],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1'],
                mappings: [{
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-0',
                    toId: 'foo.return-0',
                }],
            };
            expect(simplify(extracted)).toStrictEqual(expected);
        });
        it('throws when parameters are targets of mappings', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                }],
                required: [],
                generated: [],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.local-0',
                    toId: 'foo.par-0',
                }],
            };
            expect(() => simplify(extracted))
                .toThrow('parameter should not be target of mapping');
        });
        it('throws when returns are sources of mappings', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                }],
                required: [],
                generated: [],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.return-0',
                    toId: 'foo.local-0',
                }],
            };
            expect(() => simplify(extracted))
                .toThrow('return should not be source of mapping');
        });
        it('throws when locals have self loops', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.local-2', 'foo.return-0'],
                }],
                required: ['foo.local-2'],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.local-1',
                }, {
                    fromId: 'foo.local-1',
                    toId: 'foo.local-2',
                }, {
                    fromId: 'foo.local-2',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-1',
                    toId: 'foo.local-1',
                }, {
                    fromId: 'foo.local-2',
                    toId: 'foo.local-2',
                }],
            };
            expect(() => simplify(extracted))
                .toThrow('cannot simplify local self loops');
        });
        it('throws when parameters have self loops', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0'],
                }],
                required: [],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: [],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.par-0',
                }],
            };
            expect(() => simplify(extracted))
                .toThrow('cannot simplify parameter self loops');
        });
        it('throws when returns have self loops', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.return-0'],
                }],
                required: [],
                generated: ['foo'],
                parameters: [],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.return-0',
                    toId: 'foo.return-0',
                }],
            };
            expect(() => simplify(extracted))
                .toThrow('cannot simplify return self loops');
        });
    });
    describe('transitiveClosure', () => {
        it('computes closure of long chains', () => {
            /**
             * a -> b -> c
             */
            const mappings: MappingType[] = [{
                fromId: 'a',
                toId: 'b'
            }, {
                fromId: 'b',
                toId: 'c'
            }];
            expect(transitiveClosure('c', mappings))
                .toStrictEqual([]);
            expect(transitiveClosure('b', mappings))
                .toStrictEqual(['c']);
            expect(transitiveClosure('a', mappings))
                .toStrictEqual(['b', 'c']);
        });
        it('computes closure of wide chains', () => {
            /**
             * a -> b -> c
             *        -> f
             *   -> d -> e
             *        -> g
             */
            const mappings: MappingType[] = [{
                fromId: 'a',
                toId: 'b'
            }, {
                fromId: 'b',
                toId: 'c'
            }, {
                fromId: 'b',
                toId: 'f'
            }, {
                fromId: 'a',
                toId: 'd'
            }, {
                fromId: 'd',
                toId: 'e'
            }, {
                fromId: 'd',
                toId: 'g'
            }];
            expect(transitiveClosure('a', mappings))
                .toStrictEqual(['b', 'd', 'c', 'f', 'e', 'g']);
            expect(transitiveClosure('b', mappings))
                .toStrictEqual(['c', 'f']);
            expect(transitiveClosure('c', mappings))
                .toStrictEqual([]);
            expect(transitiveClosure('f', mappings))
                .toStrictEqual([]);
            expect(transitiveClosure('d', mappings))
                .toStrictEqual(['e', 'g']);
            expect(transitiveClosure('e', mappings))
                .toStrictEqual([]);
            expect(transitiveClosure('g', mappings))
                .toStrictEqual([]);
        });
        it('ignores loops of all kinds, but always filters out initial node', () => {
            /**
             * a -> a
             * c -> a
             * d -> b
             * a -> b -> c
             *        -> f
             *   -> d -> e
             *        -> g
             */
            const mappings: MappingType[] = [{
                fromId: 'a',
                toId: 'a'
            }, {
                fromId: 'c',
                toId: 'a'
            }, {
                fromId: 'd',
                toId: 'b'
            }, {
                fromId: 'a',
                toId: 'b'
            }, {
                fromId: 'b',
                toId: 'c'
            }, {
                fromId: 'b',
                toId: 'f'
            }, {
                fromId: 'a',
                toId: 'd'
            }, {
                fromId: 'd',
                toId: 'e'
            }, {
                fromId: 'd',
                toId: 'g'
            }];
            expect(transitiveClosure('a', mappings))
                .toStrictEqual(['b', 'd', 'c', 'f', 'e', 'g']);
            expect(transitiveClosure('b', mappings))
                .toStrictEqual(['c', 'f', 'a', 'd', 'e', 'g']);
            expect(transitiveClosure('c', mappings))
                .toStrictEqual(['a', 'b', 'd', 'f', 'e', 'g']);
            expect(transitiveClosure('f', mappings))
                .toStrictEqual([]);
            expect(transitiveClosure('d', mappings))
                .toStrictEqual(['b', 'e', 'g', 'c', 'f', 'a']);
            expect(transitiveClosure('e', mappings))
                .toStrictEqual([]);
            expect(transitiveClosure('g', mappings))
                .toStrictEqual([]);
        });
    });
    describe('fullSimplify', () => {
        it('does nothing when nothing needs to be done', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [],
                generated: [],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            const expected: ExtractedOperationType = extracted;
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('removes self arrows with wide mapping paths', () => {
            /**
             * par-0 -> local-0  -> return-0
             * par-1 ->          -> return-1
             * par-2 -> return-2
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.local-0', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                }],
                required: ['foo.local-0', 'foo.par-2'],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.return-1',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-2',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                }],
                required: ['foo.par-2', 'foo.par-0', 'foo.par-1'],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('removes self arrows with long mapping paths', () => {
            /**
             * par-0 -> local-0 -> local-1 -> local-2 -> return-0
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.local-2', 'foo.return-0'],
                }],
                required: ['foo.local-2'],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.local-1',
                }, {
                    fromId: 'foo.local-1',
                    toId: 'foo.local-2',
                }, {
                    fromId: 'foo.local-2',
                    toId: 'foo.return-0',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: ['foo.par-0'],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('removes locals without corresponding parameters', () => {
            /**
             * local-0 -> return-0
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                }],
                required: [
                    'foo.local-0',
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                    'foo.local-0',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.local-0',
                    toId: 'foo.return-0',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('removes chains of locals without corresponding parameters', () => {
            /**
             * local-0 > local-1 -> return-0
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.return-0'],
                }],
                required: [
                    'foo.local-0',
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                    'foo.local-0',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.local-0',
                    toId: 'foo.local-1',
                }, {
                    fromId: 'foo.local-1',
                    toId: 'foo.return-0',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('removes locals without corresponding returns', () => {
            /**
             * par-0 -> local-0
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                }],
                required: [
                    'foo.local-0',
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                    'foo.local-0',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('removes chains of locals without corresponding returns', () => {
            /**
             * par-0 -> local-0 -> local-1
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.return-0'],
                }],
                required: [
                    'foo.local-0',
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                    'foo.local-0',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.local-1',
                }],
            };
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [
                    'foo.par-0',
                ],
                generated: [
                    'foo',
                ],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('is the example we have in the dissertation', () => {
            /**
             * par-0 -> local-0 -> return-0
             * par-1 -> return-0
             * par-2 -> return-1
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.local-0', 'foo.return-0', 'foo.return-1'],
                }],
                required: [
                    'foo.par-0', // used in declarator init
                    'foo.local-0', // used in return
                    'foo.par-1', // used in return
                    'foo.par-2', // used in return
                ],
                generated: ['foo', 'foo.local-0'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-1',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.par-2',
                    toId: 'foo.return-1',
                }],
            };

            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.par-1', 'foo.par-2', 'foo.return-0', 'foo.return-1'],
                }],
                required: [
                    'foo.par-0', // used in declarator init
                    'foo.par-1', // used in return
                    'foo.par-2', // used in return
                ],
                generated: ['foo'],
                parameters: ['foo.par-0', 'foo.par-1', 'foo.par-2'],
                returns: ['foo.return-0', 'foo.return-1'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('does not throw when parameters are targets of mappings', () => {
            /**
             * local-0 -> par-0
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                }],
                required: [],
                generated: [],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.local-0',
                    toId: 'foo.par-0',
                }],
            };
            
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [],
                generated: [],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('does not throw when returns are sources of mappings', () => {
            /**
             * return-0 -> local-0
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                }],
                required: [],
                generated: [],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.return-0',
                    toId: 'foo.local-0',
                }],
            };
            
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: [],
                generated: [],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('does not throw when locals have self loops', () => {
            /**
             * local-0 -> local-0
             * local-1 -> local-1
             * local-2 -> local-2
             * par-0 -> local-0 -> local-1 -> local-2 -> return-0
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.local-2', 'foo.return-0'],
                }],
                required: ['foo.local-2'],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.local-1',
                }, {
                    fromId: 'foo.local-1',
                    toId: 'foo.local-2',
                }, {
                    fromId: 'foo.local-2',
                    toId: 'foo.return-0',
                }, {
                    fromId: 'foo.local-0',
                    toId: 'foo.local-0',
                }, {
                    fromId: 'foo.local-1',
                    toId: 'foo.local-1',
                }, {
                    fromId: 'foo.local-2',
                    toId: 'foo.local-2',
                }],
            };
            
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0', 'foo.return-0'],
                }],
                required: ['foo.par-0'],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('does not throw when parameters have self loops', () => {
            /**
             * par-0 -> par-0
             */
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0'],
                }],
                required: [],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: [],
                mappings: [{
                    fromId: 'foo.par-0',
                    toId: 'foo.par-0',
                }],
            };
            
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.par-0'],
                }],
                required: [],
                generated: ['foo'],
                parameters: ['foo.par-0'],
                returns: [],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
        it('does not throw when returns have self loops', () => {
            const extracted: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.return-0'],
                }],
                required: [],
                generated: ['foo'],
                parameters: [],
                returns: ['foo.return-0'],
                mappings: [{
                    fromId: 'foo.return-0',
                    toId: 'foo.return-0',
                }],
            };
            
            const expected: ExtractedOperationType = {
                name: 'foo',
                resources: [{
                    id: 'foo',
                    attributes: ['foo.return-0'],
                }],
                required: [],
                generated: ['foo'],
                parameters: [],
                returns: ['foo.return-0'],
                mappings: [],
            };
            expect(fullSimplify(extracted)).toStrictEqual(expected);
        });
    });
});
