import {
    init,
    quit,
} from './cli/graceful-shutdown';
import { verify } from './cli/commands/verify';
import { criticalPairs } from './cli/commands/critical-pairs';
import { convertCpxJson } from './cli/commands/convert-cpx-json';
import { translate } from './cli/commands/translate';
import { downloadSources } from './cli/commands/download-sources';
import { types } from './cli/commands/types';
import { view } from './cli/commands/view';
import { versions } from './cli/commands/versions';
import { install } from './cli/commands/install';
import { extract } from './cli/commands/extract';
import { simpleExtract } from './cli/commands/simple-extract';
import { experiment } from './cli/commands/experiment';
import { logger } from './cli/logger';
import { defaultPool } from './cli/async-pool';
import {
    EXPERIMENTS_DIR,
    MODULE_NETS_DIR,
    SOURCES_DIR,
    VERIFIERS_DIR,
    TMP_DIR,
    RESULTS_DIR,
} from './cli/config';

enum CommandsEnum {
    HELP = 'help',
    EXPERIMENT = 'experiment',
    VERSIONS = 'versions',
    TYPES = 'types',
    VIEW = 'view',
    INSTALLATION = 'installation',
    EXTRACT = 'extract',
    VERIFY = 'verify',
    CRITICAL_PAIRS = 'critical-pairs',
    CONVERT_CPX_JSON = 'convert-cpx-json',
    TRANSLATE = 'translate',
    DOWNLOAD_SOURCES = 'download-sources',
    SIMPLE_EXTRACT = 'simple-extract',
}

function parseCommand(commandString: string): CommandsEnum {
    if (!commandString) {
        logger.debug('null');
        return null;
    }
    const command: CommandsEnum = commandString as CommandsEnum;
    if (!Object.values(CommandsEnum).find(x => x === command)) {
        return null;
    }
    return command;
}

async function handleCommand(command: CommandsEnum, args: string[]): Promise<void> {
    if (command === null) {
        return;
    }

    if (command === CommandsEnum.HELP) {
        console.log(`
Available commands:
    - ${CommandsEnum.VERSIONS} <sources>[default=${SOURCES_DIR}]: reads file <sources>/modules.json, queries npm for versions of those modules and writes to <sources>/to-download.json
    - ${CommandsEnum.TYPES} <sources>[default=${SOURCES_DIR}]: extracts types from all folders in <sources> and saves them <sources>/types.json
    - ${CommandsEnum.DOWNLOAD_SOURCES} <sources>[default=${SOURCES_DIR}] <tmp>[default=${TMP_DIR}]: downloads npm modules listed in <sources>/to-download.json and saves .js files and package.json into <sources>, using <tmp> to store module files temporarily
    - ${CommandsEnum.INSTALLATION} <installation> <target>: runs "npm install" in <install> and copies node_modules to <target>
    - ${CommandsEnum.EXTRACT} <sources>[default=${SOURCES_DIR}] <modules>[default=${MODULE_NETS_DIR}]: extracts module nets from <sources> and saves them to <modules>
    - ${CommandsEnum.SIMPLE_EXTRACT} <modules>[default=${MODULE_NETS_DIR}] <v1> <v2> <v3>: extracts module nets from <v1>, <v2> and <v3> extracting a client from <v2> and using it in <v1> and <v3>, and saves them to <modules>
    - ${CommandsEnum.VIEW} <modules>[default=${MODULE_NETS_DIR}]: creates views for module nets and saves them to <modules>
    - ${CommandsEnum.TRANSLATE} <verifiers>[default=${VERIFIERS_DIR}] <experiments>[default=${EXPERIMENTS_DIR}] <modules>[default=${MODULE_NETS_DIR}]: translates module nets from <modules> folder into experiments and saves them to <experiments> folder using verifiers from <verifiers>
    - ${CommandsEnum.CRITICAL_PAIRS} <tmp>[default=${TMP_DIR}] <verifiers>[default=${VERIFIERS_DIR}] <experiments>[default=${EXPERIMENTS_DIR}]: produces critical pairs files for experiments in <experiments> folder, using <tmp> as temporary folder and verifier information from <verifiers>
    - ${CommandsEnum.VERIFY} <verifiers>[default=${VERIFIERS_DIR}] <modules>[default=${MODULE_NETS_DIR}] <experiments>[default=${EXPERIMENTS_DIR}] <results>[default=${RESULTS_DIR}]: verifies experiments in <experiments> folder using verifier configurations from <verifiers> folder, matching against requirements in <modules> folder and saving results to <results>
    - ${CommandsEnum.EXPERIMENT} <results> <tmp>[default=${TMP_DIR}] <verifiers>[default=${VERIFIERS_DIR}]: runs all of the other steps saving results to <results>, verifiers from <verifiers> and saving temporary files to <tmp>
    - ${CommandsEnum.CONVERT_CPX_JSON} <verifiers>[default=${VERIFIERS_DIR}] <experiments>[default=${EXPERIMENTS_DIR}]: converts existing .cpx files in <experiments> folder to analysis.json files using verifier information from <verifiers>
`);
        return;
    }

    logger.debug({ args }, 'args');

    if (command === CommandsEnum.EXPERIMENT) {
        return experiment(args[0], args[1] || TMP_DIR, args[2] || VERIFIERS_DIR);
    }

    if (command === CommandsEnum.VERSIONS) {
        return versions(args[0] || SOURCES_DIR);
    }

    if (command === CommandsEnum.VIEW) {
        return view(args[0] || MODULE_NETS_DIR);
    }

    if (command === CommandsEnum.INSTALLATION) {
        return install(args[0], args[1]);
    }

    if (command === CommandsEnum.EXTRACT) {
        return extract(args[0] || SOURCES_DIR, args[1] || MODULE_NETS_DIR);
    }

    if (command === CommandsEnum.SIMPLE_EXTRACT) {
        return simpleExtract(args[0] || MODULE_NETS_DIR, args[1], args[2], args[3]);
    }

    if (command === CommandsEnum.CRITICAL_PAIRS) {
        return criticalPairs(args[0] || TMP_DIR, args[1] || VERIFIERS_DIR, args[2] || EXPERIMENTS_DIR);
    }

    if (command === CommandsEnum.CONVERT_CPX_JSON) {
        return convertCpxJson(args[0] || VERIFIERS_DIR, args[1] || EXPERIMENTS_DIR);
    }

    if (command === CommandsEnum.VERIFY) {
        return verify(args[0] || VERIFIERS_DIR, args[1] || MODULE_NETS_DIR,
            args[2] || EXPERIMENTS_DIR, args[3] || RESULTS_DIR);
    }

    if (command === CommandsEnum.TRANSLATE) {
        return translate(args[0] || VERIFIERS_DIR, args[1] || EXPERIMENTS_DIR, args[2] || MODULE_NETS_DIR);
    }

    if (command === CommandsEnum.DOWNLOAD_SOURCES) {
        return downloadSources(args[0] || SOURCES_DIR, args[1] || TMP_DIR);
    }

    if (command === CommandsEnum.TYPES) {
        return types(args[0] || SOURCES_DIR);
    }

    logger.error({ command }, 'unknown command');
}

enum ErrorCodeEnum {
    UNKNOWN_ERROR = 1,
}

async function run(): Promise<void> {
    const command = parseCommand(process.argv.length > 1 && process.argv[2]);
    logger.info({ command }, 'received command');
    init();

    let exitCode = 0;
    try {
        await handleCommand(command, process.argv.slice(3));
    } catch (error) {
        logger.error({
            error,
            message: error?.message,
            code: error?.code,
            stdout: error?.stdout,
            stderr: error?.stderr,
        }, 'failed to run command');
        exitCode = error.cliErrorCode || ErrorCodeEnum.UNKNOWN_ERROR;
    }

    defaultPool.destroy();
    logger.info({ exitCode }, 'exiting');
    quit(exitCode);
}
run();