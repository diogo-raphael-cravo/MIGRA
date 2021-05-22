import * as Path from 'path';
import * as SimpleStatistics from 'simple-statistics';
import {
    access,
    ensureDirectory,
    readFileIgnore,
    awaitForEachArray,
    writeJSON,
    writeFile,
} from '../helpers';
import { logger } from '../logger';
import {
    getStdoutLogPath,
    getStderrLogPath,
    runTaskArray,
} from '../tasks/task-runner';
import {
    readHistory,
    lastRunThisTask,
    lastRunByTaskName,
    getStatusRun,
} from '../tasks/task-history';
import {
    TaskStatusEnum,
    TaskType,
    TaskRunType,
} from '../tasks/task-types';
import { getCodeStatisticsFromFolder } from '../command-helpers/code-statistics';
import {
    compareWarnings,
    WarningsComparisonType,
    WarningsComparisonEnum,
} from '../command-helpers/warning-statistics';
import {
    readGrammar,
} from '../command-helpers/read-grammar';
import { ALL_MODULES } from '../experiment/modules';
import {
    PHASES,
    ExperimentType,
    SingleExperimentType,
    EXPERIMENT_TASKS,
    TASKS,
    init,
    nextPhase,
    PhasesEnum,
    getSucceededExperimentsTask,
} from '../experiment/experiment-phases';
import {
    getExperimentsFolder,
    getIndividualVersionFolder,
    getInstallFolder,
    getModuleFolderName,
    getModulesFolder,
    getSourcesFolder,
    getTranslationFolder,
    getVersionsFolder,
    getWorkingFolder,
    getIndividualVersionModuleFolder,
    getExperimentAnalysisFile,
    getExperimentVerificationGrammar,
} from '../experiment/experiment-folders';
import { VerifyAnalysisType } from './verify';
import { TypesErrorsEnum } from './types';
import { ModuleNetType } from '../../core/translation/module-net-types';
import { PairEnum } from '../../core/graph-grammars/critical-pairs';
import { WarningTypeEnum } from '../../core/verification/warning-interface';

/**
 * this experiment invokes 'process.exit(0)',
 * causing analysis program to exit without error
 */
const EXPERIMENT_FAILED_PROCESS_EXIT = 'esm';
function failedDueToProcessExit(name: string): boolean {
    return EXPERIMENT_FAILED_PROCESS_EXIT === name;
}
/**
 * these experiments have versions that disagree completelly
 * on function names, and translation is not able to translate
 * module nets without operations, leading to failures
 */
const EXPERIMENTS_FAILED_NO_OPERATIONS = [
    'detect-port',
    'fast-glob',
    'gulp-imagemin',
    'gulp-minify-css',
    'gzip-size',
    'left-pad',
    'nock',
    'pretty-bytes',
    'socket.io',
    'touch',
    'update-notifier',
];
function failedDueToNoOperations(name: string): boolean {
    return undefined !== EXPERIMENTS_FAILED_NO_OPERATIONS
        .find(failed => failed === name);
}

async function getAnalysis(resolvedExperimentsPath: string, name: string, version: string): Promise<VerifyAnalysisType> {
    const vFile = getExperimentAnalysisFile(resolvedExperimentsPath, name, version, 'verif3');
    const vFileText = await readFileIgnore(vFile);
    return JSON.parse(vFileText);
}
type TaskResultType = {
    name: string,
    quantity: {
        total: number,
        succeeded: number,
        failed: number,
        timedout: number,
    },
    workingDirectory: {
        succeeded: string[],
        failed: string[],
        timedout: string[],
    },
    actualWorkingDirectory: {
        succeeded: string[],
        failed: string[],
        timedout: string[],
    },
};
type AllTasksResultsType = Record<string, TaskResultType>;
function accumulateTaskResultTask<T>(taskWorkingDirectory: string,
    current: AllTasksResultsType,
    taskRun: TaskRunType<T>): void {
    if (!taskRun) {
        return;
    }
    if (!current[taskRun.task.name]) {
        current[taskRun.task.name] = {
            name: taskRun.task.name,
            quantity: {
                total: 0,
                succeeded: 0,
                failed: 0,
                timedout: 0,
            },
            workingDirectory: {
                succeeded: [],
                failed: [],
                timedout: [],
            },
            actualWorkingDirectory: {
                succeeded: [],
                failed: [],
                timedout: [],
            },
        };
    }
    const thisTask = current[taskRun.task.name];
    thisTask.quantity.total += 1;
    const thisTaskStatus = taskRun.status;
    thisTask.quantity[thisTaskStatus] += 1;
    thisTask.workingDirectory[thisTaskStatus].push(taskRun.task.workingDirectory);
    thisTask.workingDirectory[thisTaskStatus].sort();
    thisTask.actualWorkingDirectory[thisTaskStatus].push(taskWorkingDirectory);
    thisTask.actualWorkingDirectory[thisTaskStatus].sort();
}
async function accumulateTaskResult(taskWorkingDirectory: string, current: AllTasksResultsType): Promise<void> {
    const history = await readHistory(taskWorkingDirectory);
    const statusRun = getStatusRun(history);
    accumulateTaskResultTask(taskWorkingDirectory, current, statusRun);
}
async function accumulateTaskResultAllTasks(taskWorkingDirectory: string,
    current: AllTasksResultsType,
    taskNames: string[]): Promise<void> {
    await awaitForEachArray(taskNames, async taskName => {
        const history = await readHistory(taskWorkingDirectory);
        const statusRun = lastRunThisTask(history, {
            name: taskName,

            workingDirectory: null,
            contents: null,
            command: null,
            timeout: null,
            retry: null,
            override: null,
        });
        accumulateTaskResultTask(taskWorkingDirectory, current, statusRun);
    });
}

type WarningStatisticsEntryType = {
    v2ToV3: WarningsComparisonType,
    v2ToV1: WarningsComparisonType,
};
type FrequencyType = {
    v2ToV3: WarningsComparisonEnum,
    v2ToV1: WarningsComparisonEnum,
    quantity: number,
    names: string[],
};
type WarningStatisticsType = {
    quantity: {
        total: number,
        succeeded: number,
        failed: number,
    },
    names: {
        succeeded: string[],
        failed: string[],
    },
    frequencies: {
        succeeded: FrequencyType[],
        failed: FrequencyType[],
    },
    evidence: {
        succeeded: WarningStatisticsEntryType[],
        failed: WarningStatisticsEntryType[],
    },
};
const statistics: WarningStatisticsType = {
    quantity: {
        total: 0,
        succeeded: 0,
        failed: 0,
    },
    frequencies: {
        succeeded: [],
        failed: [],
    },
    names: {
        succeeded: [],
        failed: [],
    },
    evidence: {
        succeeded: [],
        failed: [],
    },
};
function searchFrequenciesByModuleName(name: string, frequency: FrequencyType[]): FrequencyType {
    return frequency.find(thisFrequency =>
        undefined !== thisFrequency.names.find(thisName => thisName === name));
}
function searchStatisticsByModuleName(name: string, statistics: WarningStatisticsType): FrequencyType {
    return searchFrequenciesByModuleName(name, statistics.frequencies.failed)
        || searchFrequenciesByModuleName(name, statistics.frequencies.succeeded);
}


const seconds = 1000;
const minutes = 60 * seconds;

async function run(experimentsPath: string, tmpDirPath: string, verifiersDirPath: string): Promise<void> {
    init(experimentsPath);
    const resolvedExperimentsPath = Path.resolve(experimentsPath);
    logger.info({
        experimentsPath,
        tmpDirPath,
        PHASES,
    }, 'Processing new experiment');

    try {
        await access(resolvedExperimentsPath);
        logger.info(`Folder ${resolvedExperimentsPath} already exists`);
        // return;
    } catch (err) {}

    logger.info('Creating experiments folder');
    await ensureDirectory(resolvedExperimentsPath);

    await nextPhase({ phase: PhasesEnum.versions,
        remaining: async () => {
            logger.info('Reading to-download.json');
            const versionsFolder = getVersionsFolder(resolvedExperimentsPath);
            const resolvedToDownloadPath = Path.join(versionsFolder, 'to-download.json');
            const modulesText = await readFileIgnore(resolvedToDownloadPath);
            logger.info(resolvedToDownloadPath);
            const experiments: ExperimentType = JSON.parse(modulesText);
            if (!experiments || experiments.length === 0) {
                logger.error('Exiting due to lack of modules to process.');
                return [];
            }
            logger.info(`Initializing ${experiments.length} experiment folders.`);
            await awaitForEachArray(experiments, async module => {
                const sourcesFolder = getSourcesFolder(resolvedExperimentsPath, module.name);
                await ensureDirectory(sourcesFolder);
                await writeJSON(sourcesFolder, 'to-download', [module]);
            });
            return experiments;
        },
        code: async () => {
            logger.info(`Querying module versions of ${ALL_MODULES.length} modules`
            + ' in NPM if not queried and succeeded before');
            const versionsFolder = getVersionsFolder(resolvedExperimentsPath);
            
            logger.info('Writing modules.json');
            await ensureDirectory(versionsFolder);
            await writeJSON(versionsFolder, 'modules', ALL_MODULES);

            logger.info('Running versions command');
            const tasks: TaskType<SingleExperimentType>[] = [{
                name: TASKS.versions,
                workingDirectory: versionsFolder,
                contents: null,
                command: [
                    'node',
                    'src/main.js',
                    'versions',
                    versionsFolder,
                ],
                timeout: 60 * minutes,
                // if already run and failed before, try again this time
                retry: true,
                override: false,
            }];
            const versionTaskRun = await runTaskArray(tasks, 1);
            if (!versionTaskRun || versionTaskRun.length === 0) {
                logger.error('failed to run versions!');
            }
        },
    });

    await nextPhase({ phase: PhasesEnum.download,
        remaining: TASKS.download,
        code: async (_, remainingExperiments) => {
            const tasks: TaskType<SingleExperimentType>[] = remainingExperiments.map(module => ({
                name: TASKS.download,
                workingDirectory: getWorkingFolder(resolvedExperimentsPath, module.name),
                contents: module,
                command: [
                    'node',
                    'src/main.js',
                    'download-sources',
                    getSourcesFolder(resolvedExperimentsPath, module.name),
                    tmpDirPath,
                ],
                timeout: 10 * minutes,
                // if already run and failed before, try again this time
                retry: false,
                override: false,
            }));
            logger.info(`Downloading ${remainingExperiments.length} experiments.`);
            await runTaskArray(tasks, 10);
        },
    });

    await nextPhase({ phase: PhasesEnum.types,
        remaining: TASKS.types,
        code: async (_, remainingExperiments) => {
            const tasks: TaskType<SingleExperimentType>[] = remainingExperiments.map(module => ({
                name: TASKS.types,
                workingDirectory: getWorkingFolder(resolvedExperimentsPath, module.name),
                contents: module,
                command: [
                    'node',
                    'src/main.js',
                    'types',
                    getSourcesFolder(resolvedExperimentsPath, module.name),
                ],
                timeout: 10 * minutes,
                // if already run and failed before, try again this time
                retry: false,
                override: false,
            }));
            logger.info(`Extracting types of ${remainingExperiments.length} experiments.`);
            await runTaskArray(tasks, 10);
        
            const typesAllExperiments = {
                total: {},
                totalUnique: {},
                modules: {},
                typesPresentIn: {},
                typesAbsentIn: {},
            };
            const experimentsThatSucceeded = [];
            await awaitForEachArray(remainingExperiments, async experiment => {
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, experiment.name);
                const history = await readHistory(workingDirectory);
                const statusRun = lastRunThisTask(history, {
                    name: 'types',
                    workingDirectory,
        
                    contents: null,
                    command: null,
                    timeout: null,
                    retry: null,
                    override: null,
                });
                if (undefined === statusRun) {
                    logger.error({ task: 'types', workingDirectory },
                        'could not find task, maybe this experiment failed before reaching this task');
                }
                if (null === statusRun || undefined === statusRun
                    || TaskStatusEnum.FAILED === statusRun.status
                    || TaskStatusEnum.TIMED_OUT === statusRun.status) {
                    return;
                }
                experimentsThatSucceeded.push(experiment);
            });
            const allSources = [];
            const allTypes = [];
            await awaitForEachArray(experimentsThatSucceeded, async experiment => {
                const sourcesDirectory = getSourcesFolder(resolvedExperimentsPath, experiment.name);
                const typesFile = Path.join(sourcesDirectory, 'types.json');
                const types = await readFileIgnore(typesFile);
                try {
                    const typesJSON = JSON.parse(types);
                    typesAllExperiments.modules = {
                        ...typesAllExperiments.modules,
                        ...typesJSON,
                    };
                    
                    allSources.push(...Object.keys(typesJSON));
                    Object.keys(typesJSON).forEach(thisSource => {
                        const typesThisSource = typesJSON[thisSource];
                        Object.keys(typesThisSource).forEach(typeName => {
                            if (0 === typesThisSource[typeName]) {
                                if (!typesAllExperiments.total[typeName]) {
                                    typesAllExperiments.total[typeName] = 0;
                                }
                                if (!typesAllExperiments.totalUnique[typeName]) {
                                    typesAllExperiments.totalUnique[typeName] = 0;
                                }
                                return;
                            }
                            if (typesAllExperiments.total[typeName]) {
                                typesAllExperiments.total[typeName] += typesThisSource[typeName];
                                typesAllExperiments.totalUnique[typeName] += 1;
                                typesAllExperiments.typesPresentIn[typeName].push(thisSource);
                                typesAllExperiments.typesPresentIn[typeName].sort();
                            } else {
                                allTypes.push(typeName);
                                typesAllExperiments.total[typeName] = typesThisSource[typeName];
                                typesAllExperiments.totalUnique[typeName] = 1;
                                typesAllExperiments.typesPresentIn[typeName] = [thisSource];
                            }
                        });
                    });
                } catch (error) {
                    logger.error({ experiment }, 'error parsing types.json for this experiment');
                    return;
                }
            });
            allTypes.forEach(type => {
                typesAllExperiments.typesAbsentIn[type] = allSources
                    .filter(source => !typesAllExperiments.typesPresentIn[type]
                        .find(sourceType => sourceType === source));
                typesAllExperiments.typesAbsentIn[type].sort();
            });
            await writeJSON(resolvedExperimentsPath, 'types', typesAllExperiments);
            logger.info(`Leaving types with ${remainingExperiments.length} experiments.`);
        },
    });

    await nextPhase({ phase: PhasesEnum.install,
        // makes it so remaining are the experiments that passes "types" phase
        remaining: TASKS.types,
        code: async (_, remainingExperiments) => {
            let dependencies = {};
            logger.info(`Adding dependencies of ${remainingExperiments.length} projects to package.json.`);
            await awaitForEachArray(remainingExperiments, async module => {
                const sourcesFolder = getSourcesFolder(resolvedExperimentsPath, module.name);
                async function getDependencies(version) {
                    const thisPackageJsonPath = Path.join(sourcesFolder, getModuleFolderName(module.name, version), 'package.json');
                    const thisPackageJsonText = await readFileIgnore(thisPackageJsonPath);
                    try {
                        const thisPackageJson = JSON.parse(thisPackageJsonText);
                        dependencies = {
                            ...dependencies,
                            ...thisPackageJson.dependencies,
                        };
                    } catch (error) {
                        logger.error(`Error parsing package.json of ${module.name}@${version}`);
                    }
                }
                await getDependencies(module.versions[0]);
                await getDependencies(module.versions[1]);
                await getDependencies(module.versions[2]);
            });
    
            logger.info(`Found ${Object.keys(dependencies).length} dependencies`);
            const DEPENDENCIES_THAT_CAUSE_ERRORS = [
                'fsevents',
            ];
            const allowedDependencies = {};
            Object.keys(dependencies).forEach(dep => {
                const allowed = undefined === DEPENDENCIES_THAT_CAUSE_ERRORS.find(notAllowed => dep === notAllowed);
                if (allowed) {
                    allowedDependencies[dep] = dependencies[dep];
                }
            });
            logger.info(`Found ${Object.keys(allowedDependencies).length} dependencies that can be installed`);
        
            logger.info('Creating package.json');
            const packageJson = {
                name: 'all-dependencies',
                version: '1.0.0',
                description: 'this contains all dependencies of all experiments',
                scripts: {
                  test: 'echo \"Error: no test specified\" && exit 1',
                },
                author: '',
                license: 'ISC',
                dependencies: {
                    ...allowedDependencies,
                },
            };
    
            logger.info('Writing package.json');
            const installFolder = getInstallFolder(resolvedExperimentsPath);
            await ensureDirectory(installFolder);
            await writeJSON(installFolder, 'package', packageJson);
    
            logger.info('Running install task');
            const targetFolder = Path.join(resolvedExperimentsPath, 'node_modules');
            await ensureDirectory(targetFolder);
            const tasks: TaskType<SingleExperimentType>[] = [{
                name: TASKS.install,
                workingDirectory: installFolder,
                contents: null,
                command: [
                    'node',
                    'src/main.js',
                    'installation',
                    installFolder,
                    targetFolder,
                ],
                timeout: 60 * minutes,
                // if already run and failed before, try again this time
                retry: false,
                override: false,
            }];
            const installTaskRun = await runTaskArray(tasks, 1);
            if (!installTaskRun || installTaskRun.length === 0) {
                logger.error('failed to run install task!');
            }
        },
    });

    await nextPhase({ phase: PhasesEnum.simpleExtraction,
        remaining: TASKS.simpleExtraction,
        code: async (_, remainingExperiments) => {
            logger.info(`Extracting module nets of ${remainingExperiments.length} experiments (simple approach).`);
            const tasks: TaskType<SingleExperimentType>[] = remainingExperiments.map(module => {
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, module.name);
                const sourcesFolder = getSourcesFolder(resolvedExperimentsPath, module.name);
                const v1Sources = Path.join(sourcesFolder, getModuleFolderName(module.name, module.versions[0]));
                const v2Sources = Path.join(sourcesFolder, getModuleFolderName(module.name, module.versions[1]));
                const v3Sources = Path.join(sourcesFolder, getModuleFolderName(module.name, module.versions[2]));
                return {
                    name: TASKS.simpleExtraction,
                    workingDirectory,
                    contents: module,
                    command: [
                        'node',
                        'src/main.js',
                        'simple-extract',
                        getModulesFolder(resolvedExperimentsPath, module.name),
                        v1Sources,
                        v2Sources,
                        v3Sources,
                    ],
                    timeout: 10 * minutes,
                    // if already run before, do not run again
                    retry: false,
                    override: false,
                };
            });
            await runTaskArray(tasks, 10);
        },
    });

    await nextPhase({ phase: PhasesEnum.translation,
        remaining: TASKS.translation,
        code: async (_, remainingExperiments) => {
            logger.info(`Initializing ${remainingExperiments.length} translation folders.`);
            await awaitForEachArray(remainingExperiments, async module => {
                await awaitForEachArray(module.versions, async version => {
                    const translationFolder = getTranslationFolder(resolvedExperimentsPath, module.name, version, 'verif3');
                    await ensureDirectory(translationFolder);
                });
            });
        
    
            logger.info(`Translating ${remainingExperiments.length} module nets.`);
            const tasks: TaskType<SingleExperimentType>[] = remainingExperiments.map(module => {
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, module.name);
                return {
                    name: TASKS.translation,
                    workingDirectory,
                    contents: module,
                    command: [
                        'node',
                        'src/main.js',
                        'translate',
                        verifiersDirPath,
                        getExperimentsFolder(resolvedExperimentsPath, module.name),
                        getModulesFolder(resolvedExperimentsPath, module.name),
                    ],
                    timeout: 10 * minutes,
                    // if already run before, do not run again
                    retry: false,
                    override: false,
                };
            });
        
            // this is cpu intensive, running two at a time will cause starvation
            // and consequently will cause timeout of two tasks
            await runTaskArray(tasks, 1);
        },
    });

    await nextPhase({ phase: PhasesEnum.criticalPairs,
        remaining: TASKS.criticalPairs,
        code: async (_, remainingExperiments) => {
            logger.info(`Generating critical pairs for ${remainingExperiments.length} verification grammars.`);
            const tasks: TaskType<SingleExperimentType>[] = remainingExperiments.map(module => {
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, module.name);
                return {
                    name: TASKS.criticalPairs,
                    workingDirectory,
                    contents: module,
                    command: [
                        'node',
                        'src/main.js',
                        'critical-pairs',
                        tmpDirPath,
                        verifiersDirPath,
                        getExperimentsFolder(resolvedExperimentsPath, module.name),
                    ],
                    timeout: 1 * minutes,
                    // if already run before, do not run again
                    retry: false,
                    override: false,
                };
            });
            // this is cpu intensive, running two at a time will cause starvation
            // and consequently will cause timeout of two tasks
            await runTaskArray(tasks, 1);
        },
    });

    await nextPhase({ phase: PhasesEnum.verify,
        remaining: TASKS.verify,
        code: async (_, remainingExperiments) => {
            logger.info(`Verifying ${remainingExperiments.length} grammars.`);
            const tasks: TaskType<SingleExperimentType>[] = remainingExperiments.map(module => {
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, module.name);
                return {
                    name: TASKS.verify,
                    workingDirectory,
                    contents: module,
                    command: [
                        'node',
                        'src/main.js',
                        'verify',
                        verifiersDirPath,
                        getModulesFolder(resolvedExperimentsPath, module.name),
                        getExperimentsFolder(resolvedExperimentsPath, module.name),
                        getExperimentsFolder(resolvedExperimentsPath, module.name),
                    ],
                    timeout: 10 * minutes,
                    // if already run before, do not run again
                    retry: false,
                    override: false,
                };
            });
            await runTaskArray(tasks, 10);
        },
    });

    await nextPhase({ phase: PhasesEnum.warningsStatistics,
        // makes it so "remaining" are the experiments that passed "verify" phase
        remaining: TASKS.verify,
        code: async (_, remainingExperiments) => {
            logger.info(`Computing warning statistics for ${remainingExperiments.length} experiments.`);
            let count = 0;
            function addFrequency(v2ToV3: WarningsComparisonEnum, v2ToV1: WarningsComparisonEnum, name: string, succeeded: boolean): void {
                const array = succeeded ? statistics.frequencies.succeeded : statistics.frequencies.failed;
                const frequency = array.find(freq => freq.v2ToV1 === v2ToV1 && freq.v2ToV3 === v2ToV3);
                if (undefined === frequency) {
                    array.push({
                        v2ToV1,
                        v2ToV3,
                        quantity: 1,
                        names: [name],
                    });
                    return;
                }
                frequency.quantity++;
                frequency.names.push(name);
                frequency.names.sort();
            }
            const twoPercent = Math.ceil(remainingExperiments.length / 50);
            await awaitForEachArray(remainingExperiments, async experiment => {
                const v1Version = experiment.versions[0];
                const v2Version = experiment.versions[1];
                const v3Version = experiment.versions[2];
                const v1Experiment = await getAnalysis(resolvedExperimentsPath, experiment.name, v1Version);
                const v2Experiment = await getAnalysis(resolvedExperimentsPath, experiment.name, v2Version);
                const v3Experiment = await getAnalysis(resolvedExperimentsPath, experiment.name, v3Version);
                
                const v2ToV3: WarningsComparisonType = compareWarnings(v2Experiment, v3Experiment);
                const v2ToV1: WarningsComparisonType = compareWarnings(v2Experiment, v1Experiment);
                const v2ToV3Succeeded = WarningsComparisonEnum.Equal === v2ToV3.comparison
                    || WarningsComparisonEnum.ProperSuperset === v2ToV3.comparison;
                const v2ToV1Succeeded = WarningsComparisonEnum.Equal === v2ToV1.comparison
                    || WarningsComparisonEnum.ProperSubset === v2ToV1.comparison;
                const succeeded = v2ToV3Succeeded && v2ToV1Succeeded;
                statistics.quantity.total += 1;
                addFrequency(v2ToV3.comparison, v2ToV1.comparison, experiment.name, succeeded);
                if (succeeded) {
                    statistics.quantity.succeeded += 1;
                    statistics.names.succeeded.push(experiment.name);
                    statistics.evidence.succeeded.push({
                        v2ToV3,
                        v2ToV1,
                    });
                } else {
                    statistics.quantity.failed += 1;
                    statistics.names.failed.push(experiment.name);
                    statistics.evidence.failed.push({
                        v2ToV3,
                        v2ToV1,
                    });
                }

                count++;
                if (0 === count % twoPercent) {
                    logger.info(`Finished ${count} tasks...`);
                }
            });
            statistics.names.succeeded.sort();
            statistics.names.failed.sort();
            await writeJSON(resolvedExperimentsPath, 'warnings-statistics', statistics);
        },
    });

    await nextPhase({ phase: PhasesEnum.codeStatistics,
        // makes it so "remaining" are the experiments that passed "verify" phase
        remaining: TASKS.verify,
        code: async (allExperiments) => {
            logger.info(`Computing code statistics for ${allExperiments.length} experiments.`);
            const experimentsThatSucceeded = await getSucceededExperimentsTask(allExperiments, resolvedExperimentsPath, TASKS.download);
            const typesHistograms = {
                program: ['Program'],
                identifier: ['Identifier'],
                statements: [
                    'WhileStatement',
                    'BreakStatement',
                    'ExpressionStatement',
                    'ForInStatement',
                    'SwitchStatement',
                    'BlockStatement',
                    'ContinueStatement',
                    'ReturnStatement',
                    'EmptyStatement',
                    'IfStatement',
                    'DoWhileStatement',
                    'ForOfStatement',
                    'LabeledStatement',
                    'ThrowStatement',
                    'DebuggerStatement',
                    'ForStatement',
                    'WithStatement',
                    'TryStatement',
                ],
                expressions: [
                    'MemberExpression',
                    'AssignmentExpression',
                    'CallExpression',
                    'SequenceExpression',
                    'ArrowFunctionExpression',
                    'BinaryExpression',
                    'UnaryExpression',
                    'LogicalExpression',
                    'ObjectExpression',
                    'FunctionExpression',
                    'NewExpression',
                    'ArrayExpression',
                    'ConditionalExpression',
                    'AwaitExpression',
                    'ClassExpression',
                    'ThisExpression',
                    'YieldExpression',
                    'TaggedTemplateExpression',
                    'UpdateExpression',
                ],
                literals: [
                    'StringLiteral',
                    'TemplateLiteral',
                    'NumericLiteral',
                    'BooleanLiteral',
                    'NullLiteral',
                    'RegExpLiteral',
                    'DirectiveLiteral',
                    'BigIntLiteral',
                ],
                declarations: [
                    'VariableDeclaration',
                    'VariableDeclarator',
                    'FunctionDeclaration',
                ],
                classes: [
                    'ClassBody',
                    'ClassMethod',
                    'ClassDeclaration',
                    'MetaProperty',
                ],
                others: [
                    'SwitchCase',
                    'TemplateElement',
                    'ObjectPattern',
                    'AssignmentPattern',
                    'SpreadElement',
                    'ObjectMethod',
                    'ObjectProperty',
                    'ArrayPattern',
                    'RestElement',
                    'Super',
                    'Directive',
                    'Import',
                    'CatchClause',
                ],
            };
            let count = 0;
            const statistics = [];
            const twoPercent = Math.ceil(experimentsThatSucceeded.length / 50);
            logger.info(`Computing code statistics for ${experimentsThatSucceeded.length} downloaded experiments.`);
            await awaitForEachArray(experimentsThatSucceeded, async experiment => {
                const typesFile = Path.join(getSourcesFolder(resolvedExperimentsPath, experiment.name), 'types.json');
                const types = await readFileIgnore(typesFile);
                const typesJSON = JSON.parse(types);
                const promises = experiment.versions
                    .map(version => {
                        const stats = {};
                        Object.keys(typesHistograms).forEach(key => stats[key] = 0);
                        const folder = getIndividualVersionFolder(resolvedExperimentsPath, experiment.name, version);
                        const moduleFolder = getModuleFolderName(experiment.name, version);
                        const typesThisModuleVersion = typesJSON[moduleFolder];
                        if (typesThisModuleVersion) {
                            Object.keys(typesHistograms).forEach(key => {
                                typesHistograms[key].forEach(type => {
                                    const occurrencesThisType = typesThisModuleVersion[type] || 0;
                                    stats[key] += occurrencesThisType;
                                });
                            });
                        }
                        return getCodeStatisticsFromFolder(folder, experiment.name, version)
                            .then(codeStats => ({
                                ...stats,
                                ...codeStats,
                            }));
                    });
                const stats = await Promise.all(promises);
                statistics.push(...stats);
                count++;
                if (0 === count % twoPercent) {
                    logger.info(`Finished ${count} tasks...`);
                }
            });
            logger.info(`Found ${statistics.length} statistics`);
            await writeJSON(resolvedExperimentsPath, 'statistics', statistics);
        },
    });

    await nextPhase({ phase: PhasesEnum.logs,
        // makes it so remaining are the experiments that passes "verify" phase
        remaining: TASKS.verify,
        code: async (allExperiments) => {
            const singleStatusFilename = 'results-last-task-status-per-experiment.json';
            logger.info(`Generating ${singleStatusFilename} of ${allExperiments.length} experiments`);
            const results: AllTasksResultsType = {};
            await awaitForEachArray(allExperiments, async experiment => {
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, experiment.name);
                await accumulateTaskResult(workingDirectory, results);
            });
            logger.info('Generating accumulated log files');
            const stdoutLogs: Record<string, string> = {};
            const stderrLogs: Record<string, string> = {};
            await awaitForEachArray(Object.keys(results), async taskName => {
                const failedThisTask = results[taskName].actualWorkingDirectory.failed;
                await awaitForEachArray(failedThisTask, async failedWorkingFolder => {
                    const SEPARATOR = '================================================'.split('=').join('- ');

                    const stdoutPath: string = getStdoutLogPath(failedWorkingFolder);
                    const stdoutLogsThisFolder = await readFileIgnore(stdoutPath);
                    if (!stdoutLogs[taskName]) {
                        stdoutLogs[taskName] = '';
                    }
                    stdoutLogs[taskName] += [
                        SEPARATOR,
                        `file: ${stdoutPath}`,
                        stdoutLogsThisFolder,
                    ].join('\n');

                    const stderrPath = getStderrLogPath(failedWorkingFolder);
                    const stderrLogsThisFolder = await readFileIgnore(stderrPath);
                    if (!stderrLogs[taskName]) {
                        stderrLogs[taskName] = '';
                    }
                    stderrLogs[taskName] += [
                        SEPARATOR,
                        `file: ${stderrPath}`,
                        stderrLogsThisFolder,
                    ].join('\n');
                });
            });

            logger.info('Writing stdout logs');
            await awaitForEachArray(Object.keys(stdoutLogs), async taskName => {
                const logFileName = Path.join(resolvedExperimentsPath, `accumulated-stdout-failed-at-${taskName}`);
                logger.info(`Writing file ${logFileName}`);
                await writeFile(logFileName, stdoutLogs[taskName], 'utf-8');
            });
            logger.info('Writing stderr logs');
            await awaitForEachArray(Object.keys(stderrLogs), async taskName => {
                const logFileName = Path.join(resolvedExperimentsPath, `accumulated-stderr-failed-at-${taskName}`);
                logger.info(`Writing file ${logFileName}`);
                await writeFile(logFileName, stderrLogs[taskName], 'utf-8');
            });
        },
    });

    await nextPhase({ phase: PhasesEnum.taskStatistics,
        // makes it so remaining are the experiments that passes "verify" phase
        remaining: TASKS.verify,
        code: async (allExperiments) => {
            const allTasks = Object.values(EXPERIMENT_TASKS);

            const singleStatusFilename = 'results-last-task-status-per-experiment.json';
            logger.info(`Generating ${singleStatusFilename} of ${allExperiments.length} experiments`);
            const results: AllTasksResultsType = {};
            await awaitForEachArray(allExperiments, async experiment => {
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, experiment.name);
                await accumulateTaskResult(workingDirectory, results);
            });
            // adjust sorting
            const sortedResults: AllTasksResultsType = {};
            allTasks.forEach(task => {
                sortedResults[task] = results[task];
            });
            logger.info(`Writing ${singleStatusFilename}`);
            await writeJSON(resolvedExperimentsPath, singleStatusFilename, sortedResults);

            const allStatusFilename = 'results-all-task-status-per-experiment.json';
            logger.info({ allTasks }, `Generating ${allStatusFilename} of ${allExperiments.length} experiments`);
            const accumulatedResults: AllTasksResultsType = {};
            await awaitForEachArray(allExperiments, async experiment => {
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, experiment.name);
                await accumulateTaskResultAllTasks(workingDirectory, accumulatedResults, allTasks);
            });
            // adjust sorting
            const sortedAccumulatedResults: AllTasksResultsType = {};
            allTasks.forEach(task => {
                sortedAccumulatedResults[task] = accumulatedResults[task];
            });
            logger.info(`Writing ${allStatusFilename}`);
            await writeJSON(resolvedExperimentsPath, allStatusFilename, sortedAccumulatedResults);
        },
    });

    await nextPhase({ phase: PhasesEnum.summary,
        remaining: TASKS.verify,
        code: async (allExperiments) => {
            enum ResultCodes {
                // TODO: remover
                TBD =                           'LEMBRAR DE ANALISAR ESTE AQUI',
                // latex special characters must be escaped
                VERSION =                       'VERSN',

                DOWNLOAD =                      'DOWND',
                
                TYPES_NOT_SCRIPTS =             'TYPMD',
                TYPES_PARSE =                   'TYPPA',
                TYPES_LACKING_IDENTIFIER =      'TYPID',
                TYPES_LACKING_FUNCTION =        'TYPFN',
                
                EXTRACTION_PROCESS_EXIT =         'EXTPE',
                EXTRACTION_MISSING_DEPENDENCY =   'EXTDE',
                EXTRACTION_ASSIGN_LEFT =          'EXTAL',
                EXTRACTION_ASSIGN_RIGHT =         'EXTAR',
                EXTRACTION_PARAM_TYPE =           'EXTPT',
                EXTRACTION_EXPR_IN_STAT_TYPE =    'EXTES',
                EXTRACTION_UNEXPECTED_DECL_ID =   'EXTDI',
                EXTRACTION_UNEXPECTED_DECL_IN =   'EXTDN',
                EXTRACTION_UNEXPECTED_RET_ARG =   'EXTRA',

                EXTRACTION_SYNTAX_ERROR =         'EXTSE',
                EXTRACTION_EMPTY_INTERFACE =      'EXTEI',
                EXTRACTION_EMPTY_BODY =           'EXTEB',
                EXTRACTION_BROWSER_ONLY =         'EXTBO',
                EXTRACTION_CIRCULAR_INTERFACE =   'EXTCI',
                EXTRACTION_MISSING_FILE =         'EXTMF',
                EXTRACTION_THROWS_INTENTIONALLY = 'EXTTI',
                EXTRACTION_THROWS_UNKNOWN =       'EXTTU',

                TRANSLATION_NO_OPERATION =      'TRNOP',
                TRANSLATION_TIMEOUT =           'TRTMO',
                
                CRITICAL_PAIRS_OOM =            'CPOOM',
                CRITICAL_PAIRS_TIMEOUT =        'CPTMO',
                
                /**
                    ProperSuperset = 'ProperSuperset',
                    Equal = 'Equal',
                    ProperSubset = 'ProperSubset',
                    Different = 'Different',
                    Disjunct = 'Disjunct',
                 */
                WARNINGS_SUPERSET_SUPERSET =    'WARPP',
                WARNINGS_SUPERSET_EQUAL =       'WARPE',
                WARNINGS_SUPERSET_SUBSET =      'WARPB',
                WARNINGS_SUPERSET_DIFFERENT =   'WARPF',
                WARNINGS_SUPERSET_DISJUNCT =    'WARPJ',

                WARNINGS_EQUAL_SUPERSET =       'WAREP',
                WARNINGS_EQUAL_EQUAL =          'WAREE',
                WARNINGS_EQUAL_SUBSET =         'WAREB',
                WARNINGS_EQUAL_DIFFERENT =      'WAREF',
                WARNINGS_EQUAL_DISJUNCT =       'WAREJ',

                WARNINGS_SUBSET_SUPERSET =      'WARBP',
                WARNINGS_SUBSET_EQUAL =         'WARBE',
                WARNINGS_SUBSET_SUBSET =        'WARBB',
                WARNINGS_SUBSET_DIFFERENT =     'WARBF',
                WARNINGS_SUBSET_DISJUNCT =      'WARBJ',

                WARNINGS_DIFFERENT_SUPERSET =   'WARFP',
                WARNINGS_DIFFERENT_EQUAL =      'WARFE',
                WARNINGS_DIFFERENT_SUBSET =     'WARFB',
                WARNINGS_DIFFERENT_DIFFERENT =  'WARFF',
                WARNINGS_DIFFERENT_DISJUNCT =   'WARFJ',

                WARNINGS_DISJUNCT_SUPERSET =    'WARJP',
                WARNINGS_DISJUNCT_EQUAL =       'WARJE',
                WARNINGS_DISJUNCT_SUBSET =      'WARJB',
                WARNINGS_DISJUNCT_DIFFERENT =   'WARJF',
                WARNINGS_DISJUNCT_DISJUNCT =    'WARJJ',
            }
            type SummaryEntryType = {
                name: string,
                versions: string[],
                result: ResultCodes,
                time: string,
            };
            const warningsStatisticsText: string = await readFileIgnore(Path.join(resolvedExperimentsPath, 'warnings-statistics.json'));
            const warningStatistics: WarningStatisticsType = JSON.parse(warningsStatisticsText);
            const summary: SummaryEntryType[] = await awaitForEachArray(allExperiments, async experiment => {
                const NOT_AVAILABLE = 'NA';
                const name = experiment.name;

                // VERSION
                if (0 === experiment.versions.length) {
                    return {
                        name,
                        versions: [NOT_AVAILABLE, NOT_AVAILABLE, NOT_AVAILABLE],
                        result: ResultCodes.VERSION,
                        time: NOT_AVAILABLE,
                    };
                }

                // read history
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, experiment.name);
                let history: TaskRunType<ExperimentType>[];
                try {
                    history = await readHistory(workingDirectory);
                } catch (error) {
                    throw new Error(`missing task history for ${experiment.name}`);
                }
                const versions = experiment.versions;

                // DOWNLOAD
                const downloadTask = lastRunByTaskName(history, TASKS.download);
                if (TaskStatusEnum.FAILED === downloadTask.status) {
                    return {
                        name,
                        versions,
                        result: ResultCodes.DOWNLOAD,
                        time: NOT_AVAILABLE,
                    };
                }

                // read stdout logs
                const stdoutPath: string = getStdoutLogPath(workingDirectory);
                const stdoutLogs = await readFileIgnore(stdoutPath);
                function hasLogLine(logLine: string): boolean {
                    return -1 !== stdoutLogs.indexOf(logLine);
                }
                // TYPES_NOT_SCRIPTS
                // TYPES_PARSE
                // TYPES_LACKING_PROGRAM
                // TYPES_LACKING_IDENTIFIER
                // TYPES_LACKING_FUNCTION
                const typesTask = lastRunByTaskName(history, TASKS.types);
                if (TaskStatusEnum.FAILED === typesTask.status) {
                    let result: ResultCodes = ResultCodes.TBD;
                    if (hasLogLine(TypesErrorsEnum.ERROR_NOT_SCRIPTS)) {
                        result = ResultCodes.TYPES_NOT_SCRIPTS;
                    } else if (hasLogLine(TypesErrorsEnum.ERROR_PARSING)
                        || hasLogLine(TypesErrorsEnum.ERROR_PARSE_RETURN_OUTSIDE_FUNCTION)
                        || hasLogLine(TypesErrorsEnum.ERROR_PARSE_UNEXPECTED_TOKEN)
                        || hasLogLine(TypesErrorsEnum.ERROR_PARSE_MISSING_SEMICOLON)
                        || hasLogLine(TypesErrorsEnum.ERROR_PARSE_UNEXPECTED_CHARACTER)
                        || hasLogLine(TypesErrorsEnum.ERROR_PARSE_UNEXPECTED_KEYWORD)
                        || hasLogLine(TypesErrorsEnum.ERROR_PARSE_UNTERMINATED_STRING_CONSTANT)) {
                        result = ResultCodes.TYPES_PARSE;
                    } else if (hasLogLine(TypesErrorsEnum.ERROR_LACKING_IDENTIFIER)) {
                        result = ResultCodes.TYPES_LACKING_IDENTIFIER;
                    } else if (hasLogLine(TypesErrorsEnum.ERROR_LACKING_FUNCTION)) {
                        result = ResultCodes.TYPES_LACKING_FUNCTION;
                    }
                    return {
                        name,
                        versions,
                        result,
                        time: NOT_AVAILABLE,
                    };
                }

                // time it took to run
                let time = 0;
                function parseTime(ms: number): string {
                    const date = new Date(ms);
                    const objDate = {
                        minutes: date.getMinutes(),
                        seconds: date.getSeconds(),
                        ms: date.getMilliseconds(),
                    };
                    if (0 === objDate.minutes) {
                        if (0 === objDate.seconds) {
                            return `${objDate.ms}`;
                        }
                        return `${objDate.seconds}:${objDate.ms}`;
                    }
                    return `${objDate.minutes}:${objDate.seconds}:${objDate.ms}`;
                }

                // EXTRACTION
                enum ExtactionErrorsEnum {
                    // missing dependency
                    MISSING_DEPENDENCY = 'error: "Cannot find module',
                    // 0.5.x, whereas we have 3.3.3
                    BAD_WINSTON_VERSION = 'TypeError: winston.Logger is not a constructor',
                    // ^2.1.0, whereas we have 3.1.20
                    BAD_NANOID_VERSION = `Package subpath './random' is not defined by \\"exports\\"`,
                    
                    // unexpected types
                    UNEXPECTED_PARAM_TYPE = 'unexpected param type',
                    UNEXPECTED_ASSIGNMENT_LEFT_TYPE = 'unexpected assignment left type',
                    UNEXPECTED_ASSIGNMENT_RIGHT_TYPE = 'unexpected assignment right type',
                    UNEXPECTED_EXPRESSION_IN_STATATEMENT = 'unexpected expression in statement type, error unexpected type',
                    UNEXPECTED_DECLARATOR_ID_TYPE = 'unexpected declarator id type',
                    UNEXPECTED_DECLARATOR_INIT_TYPE = 'unexpected declarator init type',
                    UNEXPECTED_RETURN_ARGUMENT_TYPE = 'unexpected return argument type',

                    // SyntaxErrors
                    SYNTAX_ERROR_UNEXPECTED_TOKEN = 'SyntaxError: unknown: Unexpected token',
                    SYNTAX_ERROR_MISSING_SEMICOLON = 'SyntaxError: unknown: Missing semicolon',
                    SYNTAX_ERROR_LEGACY_OCTAL = 'SyntaxError: unknown: Legacy octal literals are not allowed in strict mode',
                    SYNTAX_ERROR_DELETE_LOCAL = 'SyntaxError: unknown: Deleting local variable in strict mode',

                    // empty interface
                    EMPTY_INTERFACE = 'empty interface',
                    EMPTY_FUNCTION_BODY = 'empty body',
                    
                    // Browser only
                    BROWSER_ONLY_DOCUMENT = 'document is not defined',
                    BROWSER_ONLY_WINDOW = 'window is not defined',
                    BROWSER_ONLY_NAVIGATOR = 'navigator is not defined',
                    
                    // circular interfaces - we have to fix
                    CIRCULAR_INTERFACE = 'RangeError: Maximum call stack size exceeded',

                    // missing files
                    COULD_NOT_FIND_BINDINGS = 'Could not locate the bindings file',
                    COULD_NOT_FIND_TYPES = 'ENOENT: no such file or directory',

                    // program throws intentionally when main is loaded dynamically
                    THROWS_USE_BABEL_CORE = 'Use the `@babel/core` package instead of `@babel/cli`.',
                    THROWS_ELECTRON_FAILED_TO_INSTALL = 'Electron failed to install correctly, please delete node_modules/electron and try installing again',
                    THROWS_UNSUPPORTED_ENVIRONMENT = 'Node Sass does not yet support your current environment',
                    THROWS_JEST_PLUGINS = 'Error: \\njest-watch-typeahead includes two watch plugins',

                    // program throws when main is loaded dinamically due to bugs
                    THROWS_OBJECT_AS_NULL = 'Cannot convert undefined or null to object',
                    THROWS_PATH_EXISTS_SYNC = 'TypeError: path.existsSync is not a function',
                    THROWS_BAD_ARGUMENT_TYPE = 'TypeError [ERR_INVALID_ARG_TYPE]: The \\"path\\" argument must be of type string. Received an instance of Object',
                    THROWS_ES_MODULE = 'Must use import to load ES Module',
                    THROWS_EVENT_EMITTER = 'TypeError: process.EventEmitter is not a constructor',
                    THROWS_UNSHIFT_UNDEFINED = `TypeError: Cannot read property 'unshift' of undefined`,
                    THROWS_TMPDIR_NOT_A_FUNCTION = 'TypeError: os.tmpDir is not a function',
                    THROWS_PRIMORDIALS = 'ReferenceError: primordials is not defined',
                }
                const extractionTask = lastRunByTaskName(history, TASKS.simpleExtraction);
                time += extractionTask.duration;
                if (TaskStatusEnum.FAILED === extractionTask.status) {
                    let result: ResultCodes = ResultCodes.TBD;
                    if (hasLogLine(ExtactionErrorsEnum.MISSING_DEPENDENCY)
                        || hasLogLine(ExtactionErrorsEnum.BAD_WINSTON_VERSION)
                        || hasLogLine(ExtactionErrorsEnum.BAD_NANOID_VERSION)) {
                        result = ResultCodes.EXTRACTION_MISSING_DEPENDENCY;
                    } else if (hasLogLine(ExtactionErrorsEnum.UNEXPECTED_ASSIGNMENT_LEFT_TYPE)) {
                        result = ResultCodes.EXTRACTION_ASSIGN_LEFT;
                    } else if (hasLogLine(ExtactionErrorsEnum.UNEXPECTED_ASSIGNMENT_RIGHT_TYPE)) {
                        result = ResultCodes.EXTRACTION_ASSIGN_RIGHT;
                    } else if (hasLogLine(ExtactionErrorsEnum.UNEXPECTED_PARAM_TYPE)) {
                        result = ResultCodes.EXTRACTION_PARAM_TYPE;
                    } else if (hasLogLine(ExtactionErrorsEnum.UNEXPECTED_EXPRESSION_IN_STATATEMENT)) {
                        result = ResultCodes.EXTRACTION_EXPR_IN_STAT_TYPE;
                    } else if (hasLogLine(ExtactionErrorsEnum.UNEXPECTED_DECLARATOR_ID_TYPE)) {
                        result = ResultCodes.EXTRACTION_UNEXPECTED_DECL_ID;
                    } else if (hasLogLine(ExtactionErrorsEnum.UNEXPECTED_DECLARATOR_INIT_TYPE)) {
                        result = ResultCodes.EXTRACTION_UNEXPECTED_DECL_IN;
                    } else if (hasLogLine(ExtactionErrorsEnum.UNEXPECTED_RETURN_ARGUMENT_TYPE)) {
                        result = ResultCodes.EXTRACTION_UNEXPECTED_RET_ARG;
                    } else if (hasLogLine(ExtactionErrorsEnum.SYNTAX_ERROR_UNEXPECTED_TOKEN)
                        || hasLogLine(ExtactionErrorsEnum.SYNTAX_ERROR_MISSING_SEMICOLON)
                        || hasLogLine(ExtactionErrorsEnum.SYNTAX_ERROR_LEGACY_OCTAL)
                        || hasLogLine(ExtactionErrorsEnum.SYNTAX_ERROR_DELETE_LOCAL)) {
                        result = ResultCodes.EXTRACTION_SYNTAX_ERROR;
                    } else if (hasLogLine(ExtactionErrorsEnum.EMPTY_INTERFACE)) {
                        result = ResultCodes.EXTRACTION_EMPTY_INTERFACE;
                    } else if (hasLogLine(ExtactionErrorsEnum.EMPTY_FUNCTION_BODY)) {
                        result = ResultCodes.EXTRACTION_EMPTY_BODY;
                    } else if (hasLogLine(ExtactionErrorsEnum.BROWSER_ONLY_DOCUMENT)
                        || hasLogLine(ExtactionErrorsEnum.BROWSER_ONLY_WINDOW)
                        || hasLogLine(ExtactionErrorsEnum.BROWSER_ONLY_NAVIGATOR)) {
                        result = ResultCodes.EXTRACTION_BROWSER_ONLY;
                    } else if (hasLogLine(ExtactionErrorsEnum.CIRCULAR_INTERFACE)) {
                        result = ResultCodes.EXTRACTION_CIRCULAR_INTERFACE;
                    } else if (hasLogLine(ExtactionErrorsEnum.COULD_NOT_FIND_BINDINGS)
                        || hasLogLine(ExtactionErrorsEnum.COULD_NOT_FIND_TYPES)) {
                        result = ResultCodes.EXTRACTION_MISSING_FILE;
                    } else if (hasLogLine(ExtactionErrorsEnum.THROWS_USE_BABEL_CORE)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_ELECTRON_FAILED_TO_INSTALL)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_UNSUPPORTED_ENVIRONMENT)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_JEST_PLUGINS)) {
                        result = ResultCodes.EXTRACTION_THROWS_INTENTIONALLY;
                    } else if (hasLogLine(ExtactionErrorsEnum.THROWS_OBJECT_AS_NULL)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_PATH_EXISTS_SYNC)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_BAD_ARGUMENT_TYPE)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_ES_MODULE)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_EVENT_EMITTER)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_UNSHIFT_UNDEFINED)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_TMPDIR_NOT_A_FUNCTION)
                        || hasLogLine(ExtactionErrorsEnum.THROWS_PRIMORDIALS)) {
                        result = ResultCodes.EXTRACTION_THROWS_UNKNOWN;
                    }
                    return {
                        name,
                        versions,
                        result,
                        time: parseTime(time),
                    };
                } else if (failedDueToProcessExit(name)) {
                    // marked as succeeded, not failed
                    // but still it has failed although silently
                    return {
                        name,
                        versions,
                        result: ResultCodes.EXTRACTION_PROCESS_EXIT,
                        time: parseTime(time),
                    };
                }

                // TRANSLATION_NO_OPERATION
                // TRANSLATION_TIMEOUT
                const translationTask = lastRunByTaskName(history, TASKS.translation);
                time += translationTask.duration;
                if (TaskStatusEnum.SUCCEEDED !== translationTask.status) {
                    let result: ResultCodes = ResultCodes.TBD;
                    if (TaskStatusEnum.FAILED === translationTask.status
                        && failedDueToNoOperations(name)) {
                        result = ResultCodes.TRANSLATION_NO_OPERATION;
                    } else if (TaskStatusEnum.TIMED_OUT === translationTask.status) {
                        result = ResultCodes.TRANSLATION_TIMEOUT;
                    }
                    return {
                        name,
                        versions,
                        result,
                        time: parseTime(time),
                    };
                }

                // CRITICAL_PAIRS_OOM
                // CRITICAL_PAIRS_TIMEOUT
                const criticalPairsTask = lastRunByTaskName(history, TASKS.criticalPairs);
                time += criticalPairsTask.duration;
                if (TaskStatusEnum.SUCCEEDED !== criticalPairsTask.status) {
                    let result: ResultCodes = ResultCodes.TBD;
                    if (TaskStatusEnum.FAILED === criticalPairsTask.status
                        && hasLogLine('Killed')) {
                        result = ResultCodes.CRITICAL_PAIRS_OOM;
                    } else if (TaskStatusEnum.TIMED_OUT === criticalPairsTask.status) {
                        result = ResultCodes.CRITICAL_PAIRS_TIMEOUT;
                    }
                    return {
                        name,
                        versions,
                        result,
                        time: parseTime(time),
                    };
                }

                // WARNINGS_SUPERSET_SUPERSET
                // WARNINGS_SUPERSET_EQUAL
                // WARNINGS_SUPERSET_SUBSET
                // WARNINGS_SUPERSET_DIFFERENT
                // WARNINGS_SUPERSET_DISJUNCT
                const verifyTask = lastRunByTaskName(history, TASKS.verify);
                time += verifyTask.duration;
                const frequency = searchStatisticsByModuleName(name, warningStatistics);
                if (!frequency) {
                    throw new Error('not implemented');
                }
                function getName(comparison: WarningsComparisonEnum): string {
                    switch (comparison) {
                        case WarningsComparisonEnum.ProperSuperset: return 'SUPERSET';
                        case WarningsComparisonEnum.Equal: return 'EQUAL';
                        case WarningsComparisonEnum.ProperSubset: return 'SUBSET';
                        case WarningsComparisonEnum.Different: return 'DIFFERENT';
                        case WarningsComparisonEnum.Disjunct: return 'DISJUNCT';
                    }
                }
                const resultCode = `WARNINGS_${getName(frequency.v2ToV1)}_${getName(frequency.v2ToV3)}`;
                const result: ResultCodes = ResultCodes[resultCode];
                return {
                    name,
                    versions,
                    result,
                    time: parseTime(time),
                };
            });
            summary.sort((a, b) => a.name.localeCompare(b.name));
            const summaryFilename = 'summary';
            logger.info(`Writing ${summaryFilename}.json`);
            await writeJSON(resolvedExperimentsPath, summaryFilename, summary);


            const header = [
                '\\footnotesize',
                '\\begin{longtable}[c]{ c c c c }',
                '\\caption{Results of experiments for all 1012 evaluation individuals.\\label{individuals:results}}\\\\',
                '',
                '\\hline',
                '\\multicolumn{4}{| c |}{Begin of Table}\\\\',
                '\\hline',
                'NPM Module & $V^1,\\ V^2,\\ V^3$ & Result & Time (m:s:ms)\\\\',
                '\\hline',
                '\\endfirsthead',
                '',
                '\\hline',
                '\\multicolumn{4}{| c |}{Continuation of Table \\ref{individuals:results}}\\\\',
                '\\hline',
                'NPM Module & $V^1,\\ V^2,\\ V^3$ & Result & Time (m:s:ms)\\\\',
                '\\hline',
                '\\endhead',
                '',
                '\\hline',
                '\\endfoot',
                '',
                '\\hline',
                '\\multicolumn{4}{| c |}{End of Table \\ref{individuals:results}}\\\\',
                '\\hline\\hline',
                '\\endlastfoot',
            ].join('\n');
            const footer = [
                '\\end{longtable}',
                '\\normalsize',
            ].join('\n');
            const content = summary
                .map(entry => [
                        `${entry.name.replace(/_/g, '\\_')}`,
                        `${entry.versions[0]}, ${entry.versions[1]}, ${entry.versions[2]}`,
                        `${entry.result}`,
                        `${entry.time} \\\\`,
                    ].join(' & '))
                .join('\n');
            const summaryTexText = [
                header,
                content,
                footer,
            ].join('\n');
            const summaryTexFilename = 'summary.tex';
            logger.info(`Writing ${summaryTexFilename}`);
            await writeFile(Path.join(resolvedExperimentsPath, summaryTexFilename), summaryTexText, 'utf-8');
        },
    });

    await nextPhase({ phase: PhasesEnum.performanceStatistics,
        remaining: TASKS.verify,
        code: async (allExperiments) => {
            type PerformanceStatisticsEntryType = {
                name: string,
                values: number[],
                sum?: string,
                min?: string,
                max?: string,
                average?: string,
                median?: string,
                mode?: string,
            };
            const performanceStatistics: Record<string, PerformanceStatisticsEntryType> = {
                // module net
                moduleNetModules: {
                    name: 'modules',
                    values: [],
                },
                moduleNetResources: {
                    name: 'resources',
                    values: [],
                },
                moduleNetAttributes: {
                    name: 'attributes',
                    values: [],
                },
                moduleNetOperations: {
                    name: 'operations',
                    values: [],
                },
                moduleNetResourceEdges: {
                    name: 'resource edges',
                    values: [],
                },
                moduleNetAttributeEdges: {
                    name: 'attribute edges',
                    values: [],
                },

                // translation
                verificationGrammarNodeTypes: {
                    name: 'node types',
                    values: [],
                },
                verificationGrammarEdgeTypes: {
                    name: 'edge types',
                    values: [],
                },
                verificationGrammarRules: {
                    name: 'rules',
                    values: [],
                },

                // critical pairs
                criticalPairsDeleteUseConflict: {
                    name: 'delete-use conflict',
                    values: [],
                },
                criticalPairsProduceDanglingConflict: {
                    name: 'produce-dangling conflict',
                    values: [],
                },
                criticalPairsProduceForbidConflict: {
                    name: 'produce-forbid conflict',
                    values: [],
                },
                criticalPairsProduceUseDependency: {
                    name: 'produce-use dependency',
                    values: [],
                },
                criticalPairsRemoveDanglingDependency: {
                    name: 'remove-dangling dependency',
                    values: [],
                },
                criticalPairsDeleteForbidDependency: {
                    name: 'delete-forbid dependency',
                    values: [],
                },
                criticalPairsChangeUseDependency: {
                    name: 'change-use dependency',
                    values: [],
                },
                criticalPairsChangeForbidDependency: {
                    name: 'change-forbid dependency',
                    values: [],
                },
                criticalPairsChangeUseConflict: {
                    name: 'change-use conflict',
                    values: [],
                },
                criticalPairsChangeForbidConflict: {
                    name: 'change-forbid conflict',
                    values: [],
                },
                criticalPairsDeliverDelete: {
                    name: 'deliver-delete',
                    values: [],
                },
                criticalPairsDeleteDangling: {
                    name: 'delete-dangling',
                    values: [],
                },

                // warnings
                warningsUnreachableOperation: {
                    name: 'unreachable operation',
                    values: [],
                },
                warningsOptionalRule:  {
                    name: 'optional rule',
                    values: [],
                },
                warningsOptionalModule:  {
                    name: 'optional module',
                    values: [],
                },
                warningsOptionalResource:  {
                    name: 'optional resource',
                    values: [],
                },
                warningsOptionalAttribute:  {
                    name: 'optional attribute',
                    values: [],
                },
                warningsDanglingResource:  {
                    name: 'dangling resource',
                    values: [],
                },
                warningsOutdatedAttributeRelay:  {
                    name: 'outdated attribute relay',
                    values: [],
                },
                warningsOutdatedAttribute:  {
                    name: 'outdated attribute',
                    values: [],
                },
                warningsStrictOptionalAttribute:  {
                    name: 'strict optional attribute',
                    values: [],
                },
            };
            function makePerformanceStatisticsEntry(entry: PerformanceStatisticsEntryType): void {
                entry.sum = SimpleStatistics.sum(entry.values).toFixed(0);
                entry.min = SimpleStatistics.min(entry.values).toFixed(0);
                entry.max = SimpleStatistics.max(entry.values).toFixed(0);
                entry.average = SimpleStatistics.average(entry.values).toFixed(2);
                entry.median = SimpleStatistics.median(entry.values).toFixed(0);
                entry.mode = SimpleStatistics.mode(entry.values).toFixed(0);
            }
            function makePerformanceStatistics(stats: Record<string, PerformanceStatisticsEntryType>): void {
                Object.values(stats).forEach(entry => makePerformanceStatisticsEntry(entry));
            }
            await awaitForEachArray(allExperiments, async experiment => {
                // version
                if (0 === experiment.versions.length
                    // esm fails during extraction, we need at least extraction for this
                    || 'esm' === experiment.name) {
                    return;
                }

                // read history
                const workingDirectory = getWorkingFolder(resolvedExperimentsPath, experiment.name);
                let history: TaskRunType<ExperimentType>[];
                try {
                    history = await readHistory(workingDirectory);
                } catch (error) {
                    throw new Error(`missing task history for ${experiment.name}`);
                }

                // extraction
                const extractionTask = lastRunByTaskName(history, TASKS.simpleExtraction);
                if (extractionTask && TaskStatusEnum.SUCCEEDED === extractionTask.status) {
                    async function collectExtractionStatistics(version: string): Promise<void> {
                        const moduleNetPath = getIndividualVersionModuleFolder(resolvedExperimentsPath, experiment.name, version);
                        const moduleNetText = await readFileIgnore(moduleNetPath);
                        const moduleNet: ModuleNetType = JSON.parse(moduleNetText);

                        if (null === moduleNet) {
                            throw new Error(`missing module net for ${experiment.name}@${version}`);
                        }

                        // modules
                        const moduleCount = moduleNet.nodes.length;
                        performanceStatistics.moduleNetModules.values.push(moduleCount);
                        // if (2 < moduleCount) {
                        //     logger.info(`${experiment.name}@${version} has ${moduleCount} modules`);
                        // }

                        // resources
                        const resourceCount = moduleNet.nodes
                            .reduce((prev, curr) => prev + curr.resources.length, 0);
                        performanceStatistics.moduleNetResources.values.push(resourceCount);

                        // attributes
                        const attributeCount = moduleNet.nodes
                            .reduce((prev, curr) => prev + curr.resources
                                .reduce((prev, curr) => prev + curr.attributes.length, 0), 0);
                        performanceStatistics.moduleNetAttributes.values.push(attributeCount);

                        // operations
                        const operationCount = moduleNet.edges.length;
                        performanceStatistics.moduleNetOperations.values.push(operationCount);
                        // if (2 < operationCount) {
                        //     logger.info(`${experiment.name}@${version} has ${operationCount} operations`);
                        // }

                        // resource edges
                        const resourceEdgeCount = moduleNet.edges
                            .reduce((prev, curr) => prev + curr.graph.edges.length, 0);
                        performanceStatistics.moduleNetResourceEdges.values.push(resourceEdgeCount);

                        // attribute edges
                        const attributeEdgeCount = moduleNet.edges
                            .reduce((prev, curr) => prev + curr.graph.edges
                                .reduce((prev, curr) => prev + curr.attributeMapping.length, 0), 0);
                        performanceStatistics.moduleNetAttributeEdges.values.push(attributeEdgeCount);
                    }
                    await Promise.all([
                        collectExtractionStatistics(experiment.versions[0]),
                        collectExtractionStatistics(experiment.versions[1]),
                        collectExtractionStatistics(experiment.versions[2]),
                    ]);
                }

                // translation
                const translationTask = lastRunByTaskName(history, TASKS.translation);
                if (translationTask && TaskStatusEnum.SUCCEEDED === translationTask.status) {
                    async function collectTranslationStatistics(version: string): Promise<void> {
                        const ggxPath = getExperimentVerificationGrammar(resolvedExperimentsPath, experiment.name, version, 'verif3');
                        const verificationGrammar = await readGrammar(ggxPath);

                        performanceStatistics.verificationGrammarNodeTypes.values.push(verificationGrammar.types.nodes.length);
                        performanceStatistics.verificationGrammarEdgeTypes.values.push(verificationGrammar.types.edges.length);
                        performanceStatistics.verificationGrammarRules.values.push(verificationGrammar.rules.length);
                    }
                    await Promise.all([
                        collectTranslationStatistics(experiment.versions[0]),
                        collectTranslationStatistics(experiment.versions[1]),
                        collectTranslationStatistics(experiment.versions[2]),
                    ]);
                }

                // critical pairs
                const criticalPairsTask = lastRunByTaskName(history, TASKS.criticalPairs);
                if (criticalPairsTask && TaskStatusEnum.SUCCEEDED === criticalPairsTask.status) {
                    async function collectCriticalPairsStatistics(version: string): Promise<void> {
                        const analysis = await getAnalysis(resolvedExperimentsPath, experiment.name, version);
                        let isZero = true;
                        function count(pairType: PairEnum): number {
                            const length = analysis.report.data.criticalPairs[pairType].overlaps.length;
                            if (0 < length) {
                                isZero = false;
                            }
                            return length;
                        }
                        function push(property: string, pairType: PairEnum): void {
                            performanceStatistics[property].values.push(count(pairType));
                        }

                        push('criticalPairsDeleteUseConflict', PairEnum.DELETE_USE_CONFLICT);
                        push('criticalPairsProduceDanglingConflict', PairEnum.PRODUCE_DANGLING_CONFLICT);
                        push('criticalPairsProduceForbidConflict', PairEnum.PRODUCE_FORBID_CONFLICT);
                        push('criticalPairsProduceUseDependency', PairEnum.PRODUCE_USE_DEPENDENCY);
                        push('criticalPairsRemoveDanglingDependency', PairEnum.REMOVE_DANGLING_DEPENDENCY);
                        push('criticalPairsDeleteForbidDependency', PairEnum.DELETE_FORBID_DEPENDENCY);
                        push('criticalPairsChangeUseDependency', PairEnum.CHANGE_USE_DEPENDENCY);
                        push('criticalPairsChangeForbidDependency', PairEnum.CHANGE_FORBID_DEPENDENCY);
                        push('criticalPairsChangeUseConflict', PairEnum.CHANGE_USE_CONFLICT);
                        push('criticalPairsChangeForbidConflict', PairEnum.CHANGE_FORBID_CONFLICT);
                        push('criticalPairsDeliverDelete', PairEnum.DELIVER_DELETE);
                        push('criticalPairsDeleteDangling', PairEnum.DELETE_DANGLING);
                        if (isZero) {
                            logger.info(`${experiment.name}@${version} has zero critical pairs`);
                        }
                    }
                    await Promise.all([
                        collectCriticalPairsStatistics(experiment.versions[0]),
                        collectCriticalPairsStatistics(experiment.versions[1]),
                        collectCriticalPairsStatistics(experiment.versions[2]),
                    ]);
                }

                const verifyTask = lastRunByTaskName(history, TASKS.verify);
                if (verifyTask && TaskStatusEnum.SUCCEEDED === verifyTask.status) {
                    async function collectVerifyStatistics(version: string): Promise<void> {
                        const analysis = await getAnalysis(resolvedExperimentsPath, experiment.name, version);
                        function count(warningType: WarningTypeEnum): number {
                            return analysis.results.extraWarnings.data
                                .filter(warning => warning.type === warningType)
                                .length;
                        }
                        function push(property: string, warningType: WarningTypeEnum): void {
                            performanceStatistics[property].values.push(count(warningType));
                        }

                        push('warningsUnreachableOperation', WarningTypeEnum.UNREACHABLE_OPERATION);
                        push('warningsOptionalRule', WarningTypeEnum.OPTIONAL_RULE);
                        push('warningsOptionalModule', WarningTypeEnum.OPTIONAL_MODULE);
                        push('warningsOptionalResource', WarningTypeEnum.OPTIONAL_RESOURCE);
                        push('warningsOptionalAttribute', WarningTypeEnum.OPTIONAL_ATTRIBUTE);
                        push('warningsDanglingResource', WarningTypeEnum.DANGLING_RESOURCE);
                        push('warningsOutdatedAttributeRelay', WarningTypeEnum.OUTDATED_ATTRIBUTE_RELAY);
                        push('warningsOutdatedAttribute', WarningTypeEnum.OUTDATED_ATTRIBUTE);
                        push('warningsStrictOptionalAttribute', WarningTypeEnum.STRICT_OPTIONAL_ATTRIBUTE);
                    }
                    await Promise.all([
                        collectVerifyStatistics(experiment.versions[0]),
                        collectVerifyStatistics(experiment.versions[1]),
                        collectVerifyStatistics(experiment.versions[2]),
                    ]);
                }
            });

            makePerformanceStatistics(performanceStatistics);
            const performanceStatisticsFilename = 'performance-statistics';
            logger.info(`Writing ${performanceStatisticsFilename}.json`);
            await writeJSON(resolvedExperimentsPath, performanceStatisticsFilename, performanceStatistics);

            const header = [
                '\\begin{table}[h!]',
                '\\centering',
                '\\begin{tabular}{ c | c c c c c c }',
                'Name & Sum & Min & Max & Avg & Median & Mode \\\\',
                '\\hline\\hline',
            ].join('\n');
            const footer = [
                '\\end{tabular}',
                '\\caption{Statistics of extracted module nets, verification grammars and critical pairs.\\label{casestudy:mns-vgs-cps}}',
                '\\end{table}',
            ].join('\n');
            const content = Object.values(performanceStatistics)
                .map(entry => {
                    if ('0' === entry.sum) {
                        return null;
                    }
                    return [
                        `${entry.name.replace(/_/g, '\\_')}`,
                        `${entry.sum}`,
                        `${entry.min}`,
                        `${entry.max}`,
                        `${entry.average}`,
                        `${entry.median}`,
                        `${entry.mode} \\\\`,
                    ].join(' & ');
                })
                .filter(x => null !== x)
                .join('\n');
            const performanceStatisticsTexText = [
                header,
                content,
                footer,
            ].join('\n');
            const performanceStatisticsTexFilename = 'performance-statistics.tex';
            logger.info(`Writing ${performanceStatisticsTexFilename}`);
            await writeFile(Path.join(resolvedExperimentsPath, performanceStatisticsTexFilename), performanceStatisticsTexText, 'utf-8');
        },
    });
}

export async function experiment(experimentsPath: string, tmpDirPath: string, verifiersDirPath: string): Promise<void> {
    process.setMaxListeners(1000);
    try {
        await run(experimentsPath, tmpDirPath, verifiersDirPath);
    } catch (error) {
        logger.error({
            error,
            message: error.message,
            stack: error.stack,
        }, 'something went wrong');
    } finally {
        logger.info('finishing experiment');
    }
}