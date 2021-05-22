import * as Path from 'path';
import * as babelTraverse from '@babel/traverse';
import * as babelParser from '@babel/parser';
import {
    readdir,
    writeJSON,
    readFileIgnore,
    awaitForEachArray,
    applyPredicateToDirectory,
} from '../helpers';
import { logger } from '../logger';

export enum TypesErrorsEnum {
    // errors Babel logs
    ERROR_NOT_SCRIPTS = 'BABEL_PARSER_SOURCETYPE_MODULE_REQUIRED',
    ERROR_PARSE_RETURN_OUTSIDE_FUNCTION = `'return' outside of function`,
    ERROR_PARSE_UNEXPECTED_TOKEN = 'SyntaxError: Unexpected token',
    ERROR_PARSE_MISSING_SEMICOLON = 'SyntaxError: Missing semicolon',
    ERROR_PARSE_UNEXPECTED_CHARACTER = 'SyntaxError: Unexpected character',
    ERROR_PARSE_UNEXPECTED_KEYWORD = `SyntaxError: Unexpected keyword 'import'`,
    ERROR_PARSE_UNTERMINATED_STRING_CONSTANT = 'SyntaxError: Unterminated string constant',

    // errors we log
    ERROR_PARSING = 'something went wrong processing',
    ERROR_LACKING_PROGRAM = 'does not have a program',
    ERROR_LACKING_IDENTIFIER = 'does not have identifiers',
    ERROR_LACKING_FUNCTION = 'does not have function types',
}

type TypesType = Record<string, number>;
const PROGRAM_TYPE = 'Program';
const IDENTIFIER_TYPE = 'Identifier';
const FUNCTION_TYPES = [
    'Function',
    'FunctionDeclaration',
    'ArrowFunctionExpression',
    'FunctionExpression',
    'OptFunctionDeclaration',
];
const ALL_TYPES = [
    'Node',
    'SourceLocation',
    'Position',
    'Identifier',
    'PrivateName',
    'Literal',
    'RegExpLiteral',
    'NullLiteral',
    'StringLiteral',
    'BooleanLiteral',
    'NumericLiteral',
    'BigIntLiteral',
    'DecimalLiteral',
    'Program',
    'Function',
    'Statement',
    'ExpressionStatement',
    'BlockStatement',
    'EmptyStatement',
    'DebuggerStatement',
    'WithStatement',
    'ReturnStatement',
    'LabeledStatement',
    'BreakStatement',
    'ContinueStatement',
    'IfStatement',
    'SwitchStatement',
    'SwitchCase',
    'ThrowStatement',
    'TryStatement',
    'CatchClause',
    'WhileStatement',
    'DoWhileStatement',
    'ForStatement',
    'ForInStatement',
    'ForOfStatement',
    'Declaration',
    'FunctionDeclaration',
    'VariableDeclaration',
    'VariableDeclarator',
    'Decorator',
    'Directive',
    'DirectiveLiteral',
    'InterpreterDirective',
    'Expression',
    'Super',
    'Import',
    'ThisExpression',
    'ArrowFunctionExpression',
    'YieldExpression',
    'AwaitExpression',
    'ArrayExpression',
    'ObjectExpression',
    'ObjectMember',
    'ObjectProperty',
    'ObjectMethod',
    'RecordExpression',
    'TupleExpression',
    'FunctionExpression',
    'UnaryExpression',
    'UnaryOperator',
    'UpdateExpression',
    'UpdateOperator',
    'BinaryExpression',
    'BinaryOperator',
    'AssignmentExpression',
    'AssignmentOperator',
    'LogicalExpression',
    'LogicalOperator',
    'SpreadElement',
    'ArgumentPlaceholder',
    'MemberExpression',
    'OptionalMemberExpression',
    'BindExpression',
    'PipelineBody',
    'PipelineBody',
    'PipelineBareConstructorBody',
    'PipelineBareConstructorBody',
    'PipelineBareConstructorBody',
    'ConditionalExpression',
    'CallExpression',
    'OptionalCallExpression',
    'NewExpression',
    'SequenceExpression',
    'ParenthesizedExpression',
    'DoExpression',
    'TemplateLiteral',
    'TaggedTemplateExpression',
    'TemplateElement',
    'Pattern',
    'AssignmentProperty',
    'ObjectPattern',
    'ArrayPattern',
    'RestElement',
    'AssignmentPattern',
    'Class',
    'ClassBody',
    'ClassMethod',
    'ClassPrivateMethod',
    'ClassProperty',
    'ClassPrivateProperty',
    'StaticBlock',
    'ClassDeclaration',
    'ClassExpression',
    'MetaProperty',
    'ModuleDeclaration',
    'ModuleSpecifier',
    'ImportDeclaration',
    'ImportSpecifier',
    'ImportDefaultSpecifier',
    'ImportNamespaceSpecifier',
    'ImportAttribute',
    'ExportNamedDeclaration',
    'ExportSpecifier',
    'OptFunctionDeclaration',
    'OptClassDeclaration',
    'ExportDefaultDeclaration',
    'ExportAllDeclaration',
];
async function getTypes(folder: string, sourcesPath: string): Promise<TypesType> {
    logger.debug({ folder, sourcesPath }, 'get types');
    const sourceFolder = Path.join(sourcesPath, folder);
    if (folder.endsWith('.json')) {
        logger.debug({ folder }, 'ignoring .json folder');
        return {};
    }
    const types: TypesType = {};
    await applyPredicateToDirectory(sourceFolder, async filename => {
        if (filename.endsWith('.json')) {
            logger.debug({ filename }, 'ignoring .json file');
            return;
        }
        const text = await readFileIgnore(filename);
        try {
            const parsed = babelParser.parse(text);
            if (!parsed) {
                logger.error({ filename }, 'could not parse this file');
            }
            babelTraverse.default(parsed, {
                enter(path) {
                    if (types[path.type]) {
                        types[path.type] = types[path.type] + 1;
                    } else {
                        types[path.type] = 1;
                    }
                },
            });
        } catch (error) {
            logger.error({ filename, error }, 'error processing file');
            throw error;
        }
    });
    if (Object.keys(types).length === 0) {
        logger.error(`${TypesErrorsEnum.ERROR_NOT_SCRIPTS} ${folder}`);
        throw new Error('empty types for a module!');
    }
    if (!types[PROGRAM_TYPE]) {
        logger.error(`folder ${folder} ${TypesErrorsEnum.ERROR_LACKING_PROGRAM}`);
        throw new Error('no program types for a module!');
    }
    if (!types[IDENTIFIER_TYPE]) {
        logger.error(`folder ${folder} ${TypesErrorsEnum.ERROR_LACKING_IDENTIFIER}`);
        throw new Error('no identifier types for a module!');
    }
    const functions = Object.keys(types).filter(typeName =>
        FUNCTION_TYPES.find(functionType => functionType === typeName));
    if (functions.length === 0) {
        logger.error(`folder ${folder} ${TypesErrorsEnum.ERROR_LACKING_FUNCTION}`);
        throw new Error('no function types for a module!');
    }
    logger.info(`success processing source ${folder}`);
    ALL_TYPES.forEach(typeName => {
        if (!types[typeName]) {
            types[typeName] = 0;
        }
    });
    return types;
}

export async function types(sourcesPath: string): Promise<void> {
    logger.debug({ sourcesPath }, 'computing types');
    const sourceFolders = await readdir(sourcesPath);
    logger.debug({ sourceFolders }, 'sources folders');
    let failed = false;
    const allTypes: Record<string, TypesType> = {};
    await awaitForEachArray(sourceFolders,
        async sourceFolder => {
            try {
                const types = await getTypes(sourceFolder, sourcesPath);
                if (0 < Object.keys(types).length) {
                    allTypes[sourceFolder] = types;
                }
            } catch (error) {
                logger.error({
                    error: error.message,
                    stack: error.stack,
                }, `error processing source ${sourceFolder}`);
                failed = true;
            }
        });
    await writeJSON(sourcesPath, 'types', allTypes);
    if (failed) {
        throw new Error('task failed, check logs above');
    }
}