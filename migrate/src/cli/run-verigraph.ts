import { CriticalPairsType } from '../core/graph-grammars/critical-pairs';
import CriticalPairsVerigraphCLI from '../core/graph-grammars/critical-pairs-parser-cli';
import {
    DockerImageType,
    queueContainer,
} from './docker-runner';

const VerigraphDockerImage: DockerImageType = {
    containerName: 'VerigraphAnalysis',
    imageName: 'verigraph',
    imageVersion: '754ec08',
    volumePath: '/host',
};

export async function VerigraphAnalysis(ruleNames: string[], grammarPath: string): Promise<CriticalPairsType> {
    const result = await queueContainer(VerigraphDockerImage, [{
        entryName: 'COMMAND',
        entryValue: [
            'analysis',
            // '--all-matches', // all matches creates too many matches
            '--verbose',
            `/host${grammarPath}`
        ].join('\ '),
    }]);
    return CriticalPairsVerigraphCLI.parseTables(ruleNames, result.stdout);
}

export async function VerigraphAnalysisSaveOutput(grammarPath: string, outputPath: string): Promise<void> {
    await queueContainer(VerigraphDockerImage, [{
        entryName: 'COMMAND',
        entryValue: [
            'analysis',
            '--output-file',
            `/host${outputPath}`,
            // '--all-matches', // all matches creates too many matches
            '--verbose',
            `/host${grammarPath}`
        ].join('\ '),
    }]);
}