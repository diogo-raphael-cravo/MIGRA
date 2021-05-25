import {
    extract,
} from './code-extractor';
import {
    ExtractedOperationType,
} from './types';

describe('code-extractor', () => {
    describe('extract', () => {
        describe('simple identifiers', () => {
            it('extracts a simple function without parameters or return', () => {
                let extracted: ExtractedOperationType;
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: [],
                    }],
                    required: [],
                    generated: ['foo'],
                    parameters: [],
                    returns: [],
                    mappings: [],
                };
                
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo() {}
                    `,
                });
                expect(extracted).toStrictEqual(expected);
    
                // arrow function
                extracted = extract({
                    name: 'foo',
                    code: `
                    () => {}
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts a simple function with return', () => {
                let extracted: ExtractedOperationType;
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.return-0'],
                    }],
                    required: [],
                    generated: ['foo', 'foo.return-0'],
                    parameters: [],
                    returns: ['foo.return-0'],
                    mappings: [],
                };
    
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo() {
                        return 'foobar';
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
    
                // arrow function
                extracted = extract({
                    name: 'foo',
                    code: `
                    () => {
                        return 'foobar';
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts a simple function with parameters and return', () => {
                let extracted: ExtractedOperationType;
                
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.return-0'],
                    }],
                    required: ['foo.par-0'],
                    generated: ['foo', 'foo.return-0'],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        return bar;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
    
                // arrow function
                extracted = extract({
                    name: 'foo',
                    code: `
                    (bar) => {
                        return bar;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts a simple function with variable declarators', () => {
                let extracted: ExtractedOperationType;
                
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: ['foo.par-0', 'foo.local-0'],
                    generated: ['foo', 'foo.local-0', 'foo.return-0'],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-0',
                    }, {
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = bar;
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
    
                // arrow function
                extracted = extract({
                    name: 'foo',
                    code: `
                    (bar) => {
                        const baz = bar;
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts a simple function with assignment expressions', () => {
                let extracted: ExtractedOperationType;
                
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: ['foo.par-0', 'foo.local-0'],
                    generated: ['foo', 'foo.local-0', 'foo.return-0'],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-0',
                    }, {
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        baz = bar;
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
    
                // arrow function
                extracted = extract({
                    name: 'foo',
                    code: `
                    (bar) => {
                        baz = bar;
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts expressions', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.return-0'],
                    }],
                    required: ['foo.par-0'],
                    generated: ['foo', 'foo.return-0'],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.return-0',
                    }],
                };

                // arrow function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    (bar) => bar
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
        });
        describe('declarators', () => {
            it('extracts declarators with call expressions', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.par-0', // required because it is used in a call expression
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0', // generated because it receives a call expression
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-0',
                    }, {
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = foobar(bar);
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts declarators with arrow function expressions', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = () => 'bar';
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts declarators with conditional expressions', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.par-0',
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-0',
                    }, {
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = bar ? true : false;
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts declarators with string literals', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = 'bar'
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts declarators with array expressions', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = ['bar']
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts declarators ignoring this expressions', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = this
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts declarators ignoring new expressions', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = new Foobar('bar')
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts declarators ignoring object expressions', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = {}
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
        });
        describe('statements', () => {
            it('extracts switch statements and switch cases', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0', 'foo.return-1'],
                    }],
                    required: [
                        'foo.par-0',
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.return-0',
                        'foo.return-1',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0', 'foo.return-1'],
                    mappings: [],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        let baz;
                        switch(bar) {
                            case baz: return 1;
                            default: return 2;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts for statements', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.local-1', 'foo.return-0'],
                    }],
                    required: [
                        'foo.par-0',
                        'foo.local-0',
                        'foo.local-1',
                    ],
                    generated: [
                        'foo',
                        'foo.local-1',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-1'
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        let baz;
                        for(let foobar = bar; baz; foobar++) {
                            return 1;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts throw statements', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                    ],
                    parameters: ['foo.par-0'],
                    returns: [],
                    mappings: [],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        let baz;
                        throw baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts while statements', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        let baz;
                        while(baz) {
                            return 1;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts do while statements', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        let baz;
                        do {
                            return 1;
                        } while(baz);
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts expression statements', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0'],
                    }],
                    required: [
                        'foo.par-0',
                        'foo.local-0',
                    ],
                    generated: [
                        'foo',
                    ],
                    parameters: ['foo.par-0'],
                    returns: [],
                    mappings: [],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        let baz;
                        bar(baz);
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            // return statements are handled elsewhere
            // it('extracts return statements', () => {});
            it('extracts for in statements', () => {
                let extracted: ExtractedOperationType;
                
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.par-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-0'
                    }],
                };
    
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        for(foobar in bar) {
                            return 1;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);

                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        for(const foobar in bar) {
                            return 1;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts for of statements', () => {
                let extracted: ExtractedOperationType;
                
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: [
                        'foo.par-0',
                    ],
                    generated: [
                        'foo',
                        'foo.local-0',
                        'foo.return-0',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-0'
                    }],
                };
    
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        for(foobar of bar) {
                            return 1;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);

                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        for(const foobar of bar) {
                            return 1;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts if statements', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                    }],
                    required: [
                        'foo.par-0',
                    ],
                    generated: [
                        'foo',
                        'foo.return-0',
                        'foo.return-1',
                        'foo.return-2',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                    mappings: [],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        if (bar) {
                            return 1;
                        } else {
                            return 2;
                        }
                        if (true) {
                            return 3;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts try statements and catch clauses', () => {
                let extracted: ExtractedOperationType;
                
                let expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.return-0', 'foo.local-0', 'foo.return-1', 'foo.return-2'],
                    }],
                    required: [],
                    generated: [
                        'foo',
                        'foo.return-0',
                        'foo.local-0',
                        'foo.return-1',
                        'foo.return-2',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                    mappings: [],
                };
    
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        try {
                            return 1;
                        } catch(error) {
                            return 2;
                        } finally {
                            return 3;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
                
                expected = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.return-0', 'foo.return-1', 'foo.return-2'],
                    }],
                    required: [],
                    generated: [
                        'foo',
                        'foo.return-0',
                        'foo.return-1',
                        'foo.return-2',
                    ],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0', 'foo.return-1', 'foo.return-2'],
                    mappings: [],
                };
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        try {
                            return 1;
                        } catch {
                            return 2;
                        } finally {
                            return 3;
                        }
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            // blocks are just traversed
            // it('extracts block statements', () => {});
        });
        describe('nested structures', () => {
            // declarators or assignments in statements
            // assignment in for in right
            // redeclare name  - two locals
            // assign to existing name - single local
            it('extracts assignmenst to already declared names', () => {
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: ['foo.par-0', 'foo.local-0'],
                    generated: ['foo', 'foo.local-0', 'foo.return-0'],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-0',
                    }, {
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                const extracted: ExtractedOperationType = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = bar;
                        baz = 1;
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('extracts a simple function with variable declarators ignoring nested functions', () => {
                let extracted: ExtractedOperationType;
                
                const expected: ExtractedOperationType = {
                    name: 'foo',
                    resources: [{
                        id: 'foo',
                        attributes: ['foo.par-0', 'foo.local-0', 'foo.return-0'],
                    }],
                    required: ['foo.par-0', 'foo.local-0'],
                    generated: ['foo', 'foo.local-0', 'foo.return-0'],
                    parameters: ['foo.par-0'],
                    returns: ['foo.return-0'],
                    mappings: [{
                        fromId: 'foo.par-0',
                        toId: 'foo.local-0',
                    }, {
                        fromId: 'foo.local-0',
                        toId: 'foo.return-0',
                    }],
                };
    
                // function
                extracted = extract({
                    name: 'foo',
                    code: `
                    function foo(bar) {
                        const baz = bar;
                        function foobar(barbaz) {
                            const bazbar = barbaz;
                            return bazbar;
                        }
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
    
                // arrow function
                extracted = extract({
                    name: 'foo',
                    code: `
                    (bar) => {
                        const baz = bar;
                        (barbaz) => {
                            const bazbar = barbaz;
                            return bazbar;
                        }
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);    
                
                // object method
                extracted = extract({
                    name: 'foo',
                    code: `
                    (bar) => {
                        const baz = bar;
                        foo({
                            foobar(barbaz) {
                                const bazbar = barbaz;
                                return bazbar;
                            },
                        });
                        return baz;
                    }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
            it('is the example we have in the dissertation', () => {
                const expected: ExtractedOperationType = {
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
                    generated: ['foo', 'foo.local-0', 'foo.return-0', 'foo.return-1'],
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

                // function
                const extracted = extract({
                    name: 'foo',
                    code: `
                    function f(P1, P2, P3) {
                        const L1 = P1 * 2;
                        if (L1 < 5) {
                          return L1 + P2;
                        }
                        return P3;
                      }
                    `,
                });
                expect(extracted).toStrictEqual(expected);
            });
        });
    });
});
