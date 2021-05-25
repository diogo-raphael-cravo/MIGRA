import * as Path from 'path';
import {
    readFileIgnore,
    writeFile,
    readdir,
    awaitForEachArray,
} from '../helpers';
import { logger } from '../logger';
import {
    VIEW_TEMPLATE_FILE,
} from '../config';
import { parseModuleNet } from '../module-net-helpers';
import { ModuleNetType, ModuleType } from '../../core/translation/module-net-types';

function isGenerated(nodeId, inModule: ModuleType): boolean {
    return undefined !== inModule.generated.find(gen => gen === nodeId);
}
function isRequired(nodeId, inModule: ModuleType): boolean {
    return undefined !== inModule.required.find(gen => gen === nodeId);
}
function getOperationGraphNodeLevel(node: string, operationSource: string, operationTarget: string): number {
    let isSource = node.startsWith(operationSource);
    let isTarget = node.startsWith(operationTarget);
    if (isSource && isTarget) {
        isSource = operationSource.length > operationTarget.length;
        isTarget = operationTarget.length > operationSource.length;
    }
    if (isSource) {
        return 0;
    }
    if (isTarget) {
        return 1;
    }
    throw new Error(`we have a problem here ${node}, ${operationSource}, ${operationTarget}`);
}
function countOverlappingEdges(edges: {from: string, to: string}[],
    source: string, target: string): number {
    return edges.filter(edge => {
        if (edge.from !== source) {
            return false;
        }
        if (edge.to !== target) {
            return false;
        }
        return true;
    }).length;
}

const INSERT_NAME_MARKER = '<!-- insert name here -->';
const INSERT_MARKER = '// insert here';
function makeView(moduleNet: ModuleNetType, template: string): string {
    // moduleNetwork
    const moduleNetwork = {
        nodes: [],
        edges: [],
    };
    moduleNet.nodes.map(node => {
        moduleNetwork.nodes.push({
            id: node.id,
            label: node.id,
            type: 'module',
        });
    });
    moduleNet.edges.map(edge => {
        moduleNetwork.edges.push({
            from: edge.fromId,
            to: edge.toId,
            label: edge.id,
        });
    });

    // resourceNetwork
    const resourceNetwork = {
        nodes: [],
        edges: [],
    };
    moduleNet.nodes.map(node => {
        resourceNetwork.nodes.push({
            id: node.id,
            label: node.id,
            type: 'module',
            level: 0,
        });
        node.resources.map(resource => {
            resourceNetwork.edges.push({
                from: node.id,
                to: resource.id,
            });
            resourceNetwork.nodes.push({
                id: resource.id,
                label: resource.id,
                type: 'resource',
                generate: isGenerated(resource.id, node),
                require: isRequired(resource.id, node),
                level: 1,
            });
            resource.attributes.map(attributeId => {
                resourceNetwork.edges.push({
                    from: resource.id,
                    to: attributeId,
                });
                resourceNetwork.nodes.push({
                    id: attributeId,
                    label: attributeId,
                    type: 'attribute',
                    generate: isGenerated(attributeId, node),
                    require: isRequired(attributeId, node),
                    level: 2,
                });
            });
        });
    });
    
    // operationNetworks
    const operationNetworks = [];
    moduleNet.edges.map(edge => {
        const operationGraph = {
            hasEmpty: false,
            nodes: [],
            edges: [],
        };
        edge.graph.nodes.map(operationGraphNode => {
            operationGraph.nodes.push({
                id: operationGraphNode.id,
                label: operationGraphNode.id,
                type: 'resource',
                level: getOperationGraphNodeLevel(operationGraphNode.id, edge.fromId, edge.toId),
            });
        });
        const attributeGraphs = [];
        edge.graph.edges.map(operationGraphEdge => {
            const from = operationGraphEdge.fromId;
            const to = operationGraphEdge.toId;
            operationGraph.hasEmpty = null === from || null === to;
            const overlappingEdges = countOverlappingEdges(operationGraph.edges, from, to);
            operationGraph.edges.push({
                from,
                to,
                label: operationGraphEdge.id,
                smooth: {
                    enabled: true,
                    type: 'curvedCW',
                    roundness: (overlappingEdges + 1) * 0.2,
                },
            });
            const attributeGraph = {
                name: operationGraphEdge.id,
                graph: {
                    nodes: [],
                    edges: [],
                },
            };
            operationGraphEdge.attributeMapping.map(mapping => {
                attributeGraph.graph.edges.push({
                    from: mapping.fromId,
                    to: mapping.toId,
                });
                const nodes = attributeGraph.graph.nodes;
                if (undefined === nodes.find(node => mapping.fromId === node.id)) {
                    nodes.push({
                        id: mapping.fromId,
                        label: mapping.fromId,
                        type: 'attribute',
                        level: 0,
                    });
                }
                if (undefined === nodes.find(node => mapping.toId === node.id)) {
                    nodes.push({
                        id: mapping.toId,
                        label: mapping.toId,
                        type: 'attribute',
                        level: 1,
                    });
                }
            });
            attributeGraphs.push(attributeGraph);
        });
        operationNetworks.push({
            name: edge.id,
            operationGraph,
            attributeGraphs,
        });
    });
    // const operationNetworks = [{
    //     name: 'E1(A,B)',
    //     operationGraph: {
    //         nodes: [
    //             { id: 'A.R1', label: 'A.R1', type: 'resource', level: 0 },
    //             { id: 'B.R1', label: 'B.R1', type: 'resource', level: 1 },
    //         ],
    //         edges: [
    //             { from: 'A.R1', to: 'B.R1', label: 'I', smooth: { enabled: true, type: 'curvedCW', roundness: 0.2 } },
    //             { from: 'B.R1', to: 'A.R1', label: 'O', smooth: { enabled: true, type: 'curvedCW', roundness: 0.2 } },
    //         ],
    //     },
    //     attributeGraphs: [{
    //         name: 'input',
    //         graph: {
    //             nodes: [
    //                 { id: 'A.R1.a1', label: 'A.R1.a1', type: 'attribute', level: 0 },
    //                 { id: 'A.R1.a2', label: 'A.R1.a2', type: 'attribute', level: 0 },
    //                 { id: 'B.R1.b1', label: 'B.R1.b1', type: 'attribute', level: 1 },
    //                 { id: 'B.R1.b2', label: 'B.R1.b2', type: 'attribute', level: 1 },
    //             ],
    //             edges: [
    //                 { from: 'A.R1.a1', to: 'B.R1.b1' },
    //                 { from: 'A.R1.a2', to: 'B.R1.b2' },
    //             ],
    //         }
    //     }, {
    //         name: 'Output',
    //         graph: {
    //             nodes: [],
    //             edges: [],
    //         }
    //     }],
    // }, {
    //     name: 'E1(B,C)',
    //     operationGraph: {
    //         nodes: [
    //             { id: 'B.R1', label: 'B.R1', type: 'resource', level: 0 },
    //             { id: 'C.R1', label: 'C.R1', type: 'resource', level: 1 },
    //         ],
    //         edges: [
    //             { from: 'B.R1', to: 'C.R1', label: 'I', smooth: { enabled: true, type: 'curvedCW', roundness: 0.2 } },
    //             { from: 'C.R1', to: 'B.R1', label: 'O', smooth: { enabled: true, type: 'curvedCW', roundness: 0.2 } },
    //         ],
    //     },
    //     attributeGraphs: [{
    //         name: 'I',
    //         graph: {
    //             nodes: [],
    //             edges: [],
    //         }
    //     }, {
    //         name: 'O',
    //         graph: {
    //             nodes: [],
    //             edges: [],
    //         }
    //     }],
    // }];
    return template.replace(INSERT_NAME_MARKER, moduleNet.name)
        .replace(INSERT_MARKER, `const moduleNetwork = ${JSON.stringify(moduleNetwork, null, 2)};\n${INSERT_MARKER}`)
        .replace(INSERT_MARKER, `const resourceNetwork = ${JSON.stringify(resourceNetwork, null, 2)};\n${INSERT_MARKER}`)
        .replace(INSERT_MARKER, `const operationNetworks = ${JSON.stringify(operationNetworks, null, 2)};`);
}


async function viewModuleNet(moduleNetDir: string, moduleNetFolder: string): Promise<void> {
    const template = await readFileIgnore(VIEW_TEMPLATE_FILE);
    if (null === template) {
        logger.error('missing template file.');
        return;
    }

    const moduleNet = await parseModuleNet(moduleNetDir, moduleNetFolder);
    if (null === moduleNet) {
        logger.debug(`error parsing module net ${moduleNetFolder}.`);
        return;
    }

    const instancePath = Path.join(moduleNetDir, moduleNetFolder, 'view.html');
    try {
        await writeFile(instancePath, makeView(moduleNet, template));
        logger.info(`file ${instancePath} written successfully`);
    } catch (err) {
        logger.debug(err);
        logger.error(`failed to write file ${instancePath}`);
    }

    const mergedModuleNet = await parseModuleNet(moduleNetFolder, 'merged-module-net.json');
    if (null === mergedModuleNet) {
        logger.debug(`error parsing merged module net ${moduleNetFolder}.`);
        return;
    }

    const mergedInstancePath = Path.join(moduleNetDir, moduleNetFolder, 'merged-view.html');
    try {
        await writeFile(mergedInstancePath, makeView(mergedModuleNet, template));
        logger.info(`file ${mergedInstancePath} written successfully`);
    } catch (err) {
        logger.error(`failed to write file ${instancePath}`);
    }
}

export async function view(moduleNetDir: string): Promise<void> {
    logger.debug(`Creating module net views`);
    const moduleNetFolders = await readdir(moduleNetDir);
    await awaitForEachArray(moduleNetFolders,
        async moduleNetFolder => {
            try {
                await viewModuleNet(moduleNetDir, moduleNetFolder);
            } catch (error) {
                logger.error({
                    error: error.message,
                    stack: error.stack,
                }, `error processing module net ${moduleNetFolder}`);
            }
        });
}