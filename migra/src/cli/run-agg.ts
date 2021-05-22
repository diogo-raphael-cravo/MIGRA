import {
    DockerImageType,
    queueContainer,
    PromiseSpawnType,
} from './docker-runner';

const AGGDockerImage: DockerImageType = {
    containerName: 'AGGTransform',
    imageName: 'agg-save',
    imageVersion: '0.0.2',
    volumePath: '/tmp/aggtmp',
};

enum AGGCommandEnum {
    SAVE = 'Save',
    TRANSFORM = 'Transform',
    TRANSFORM_LAYERED = 'TransformLayered',
}

export async function AGGLoadAndSave(sourcePath: string, targetPath: string): Promise<PromiseSpawnType> {
    return queueContainer(AGGDockerImage, [{
        entryName: 'COMMAND',
        entryValue: AGGCommandEnum.SAVE,
    }, {
        entryName: 'SOURCE',
        entryValue: sourcePath,
    }, {
        entryName: 'TARGET',
        entryValue: targetPath,
    }]);
}

export async function AGGTransform(sourcePath: string, targetPath: string): Promise<PromiseSpawnType> {
    return queueContainer(AGGDockerImage, [{
        entryName: 'COMMAND',
        entryValue: AGGCommandEnum.TRANSFORM_LAYERED,
    }, {
        entryName: 'SOURCE',
        entryValue: sourcePath,
    }, {
        entryName: 'TARGET',
        entryValue: targetPath,
    }]);
}