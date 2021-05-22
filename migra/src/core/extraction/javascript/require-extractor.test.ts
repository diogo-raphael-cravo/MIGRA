import * as babelParser from '@babel/parser';
import {
    RequireType,
    extractRequires,
} from './require-extractor';

describe('extracts requires', () => {
    it('extracts simple require', () => {
        const program = `require('foobar')`;
        const node = babelParser.parse(program);
        const requires: RequireType[] = extractRequires(node);
        const expectedRequires: RequireType[] = [{
            identifier: null,
            required: 'foobar',
        }];
        expect(requires).toStrictEqual(expectedRequires);
    });
    describe('declarator', () => {
        it('extracts declarator', () => {
            const program = `const foobar = require('foobar')`;
            const node = babelParser.parse(program);
            const requires: RequireType[] = extractRequires(node);
            const expectedRequires: RequireType[] = [{
                identifier: {
                    destructured: false,
                    parent: null,
                    value: 'foobar',
                },
                required: 'foobar',
            }];
            expect(requires).toStrictEqual(expectedRequires);
        });
        it('extracts member expression object declarator', () => {
            const program = `const foo = { bar: require('foobar') }`;
            const node = babelParser.parse(program);
            const requires: RequireType[] = extractRequires(node);
            const expectedRequires: RequireType[] = [{
                identifier: {
                    destructured: false,
                    parent: {
                        destructured: false,
                        parent: null,
                        value: 'foo'
                    },
                    value: 'bar',
                },
                required: 'foobar',
            }];
            expect(requires).toStrictEqual(expectedRequires);
        });
        it.skip('extracts destructured member expression object declarator', () => {
            const program = `const { bar: foo } = { bar: require('foobar') }`;
            const node = babelParser.parse(program);
            const requires: RequireType[] = extractRequires(node);
            const expectedRequires: RequireType[] = [{
                identifier: {
                    destructured: true,
                    parent: null,
                    value: 'foo',
                },
                required: 'foobar',
            }];
            expect(requires).toStrictEqual(expectedRequires);
        });
        it.skip('extracts multiple destructured member expression', () => {
            const program = `const { foo, bar } = require('foobar')`;
            const node = babelParser.parse(program);
            const requires: RequireType[] = extractRequires(node);
            const expectedRequires: RequireType[] = [{
                identifier: {
                    destructured: true,
                    parent: null,
                    value: 'foo',
                },
                required: 'foobar',
            }, {
                identifier: {
                    destructured: true,
                    parent: null,
                    value: 'bar',
                },
                required: 'foobar',
            }];
            expect(requires).toStrictEqual(expectedRequires);
        });
    });
    describe('assignment', () => {
        it('extracts assignment', () => {
            const program = `foobar = require('foobar')`;
            const node = babelParser.parse(program);
            const requires: RequireType[] = extractRequires(node);
            const expectedRequires: RequireType[] = [{
                identifier: {
                    destructured: false,
                    parent: null,
                    value: 'foobar',
                },
                required: 'foobar',
            }];
            expect(requires).toStrictEqual(expectedRequires);
        });
        it('extracts member expression assignment', () => {
            const program = `foo.bar = require('foobar')`;
            const node = babelParser.parse(program);
            const requires: RequireType[] = extractRequires(node);
            const expectedRequires: RequireType[] = [{
                identifier: {
                    destructured: false,
                    parent: {
                        destructured: false,
                        parent: null,
                        value: 'foo'
                    },
                    value: 'bar',
                },
                required: 'foobar',
            }];
            expect(requires).toStrictEqual(expectedRequires);
        });
        it('extracts member expression object pattern assignment', () => {
            const program = `
            foo.bar = {
                baz: require('foobarbaz'),
                bar: require('foobarbar'),
            }
            `;
            const node = babelParser.parse(program);
            const requires: RequireType[] = extractRequires(node);
            const expectedRequires: RequireType[] = [{
                identifier: {
                    destructured: false,
                    parent: {
                        destructured: false,
                        parent: {
                            destructured: false,
                            parent: null,
                            value: 'foo'
                        },
                        value: 'bar',
                    },
                    value: 'baz',
                },
                required: 'foobarbaz',
            }, {
                identifier: {
                    destructured: false,
                    parent: {
                        destructured: false,
                        parent: {
                            destructured: false,
                            parent: null,
                            value: 'foo'
                        },
                        value: 'bar',
                    },
                    value: 'bar',
                },
                required: 'foobarbar',
            }];
            expect(requires).toStrictEqual(expectedRequires);
        });
        it.skip('extracts destructured member expression object pattern assignment', () => {
            const program = `{ bar: foo } = { bar: require('foobar') }`;
            const node = babelParser.parse(program);
            const requires: RequireType[] = extractRequires(node);
            const expectedRequires: RequireType[] = [{
                identifier: {
                    destructured: false,
                    parent: null,
                    value: 'foo',
                },
                required: 'foobar',
            }];
            expect(requires).toStrictEqual(expectedRequires);
        });
    });
});