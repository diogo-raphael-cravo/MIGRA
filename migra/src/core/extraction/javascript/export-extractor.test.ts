import * as babelParser from '@babel/parser';
import {
    File,
} from '@babel/types';
import {
    extractExports,
    ExportType,
} from './export-extractor';

function parse(program: string): File {
    return babelParser.parse(program);
}

describe('export-extractor', () => {
    it('extracts simple exports', () => {
        const program = `
        module.exports = '1';
        `;
        const node = parse(program);
        const exports: ExportType[] = extractExports(node);
        expect(exports.length).toBe(1);
        expect(exports[0].assignee).toBe(null);
        expect(exports[0].export.isLiteral()).toBeTruthy();
    });
    it('extracts member expression exports', () => {
        const program = `
        module.exports.a = '1';
        module.exports.b = '2';
        `;
        const node = parse(program);
        const exports: ExportType[] = extractExports(node);
        expect(exports.length).toBe(2);
        expect(exports[0].assignee).toStrictEqual({
            name: 'a',
            parent: null,
        });
        expect(exports[0].export.isLiteral()).toBeTruthy();
        expect(exports[1].assignee).toStrictEqual({
            name: 'b',
            parent: null,
        });
        expect(exports[1].export.isLiteral()).toBeTruthy();
    });
    it('extracts object expression exports', () => {
        const program = `
        module.exports = {
            a: '1',
            foo() {},
            bar: () => {},
            baz: function foobar() {},
        };
        `;
        const node = parse(program);
        const exports: ExportType[] = extractExports(node);
        expect(exports.length).toBe(4);
        
        expect(exports[0].assignee).toStrictEqual({
            name: 'a',
            parent: null,
        });
        expect(exports[0].export.isLiteral()).toBeTruthy();
        
        expect(exports[1].assignee).toStrictEqual({
            name: 'foo',
            parent: null,
        });
        expect(exports[1].export.isObjectMethod()).toBeTruthy();

        expect(exports[2].assignee).toStrictEqual({
            name: 'bar',
            parent: null,
        });
        expect(exports[2].export.isArrowFunctionExpression()).toBeTruthy();

        expect(exports[3].assignee).toStrictEqual({
            name: 'baz',
            parent: null,
        });
        expect(exports[3].export.isFunctionExpression()).toBeTruthy();
    });
});