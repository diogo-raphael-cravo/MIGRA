import {
    MappingType,
    ExtractedOperationType,
} from './types';
import { deduplicate } from '../../helpers/sets';

export function deduplicateOp(extractedOperation: ExtractedOperationType): ExtractedOperationType {
    return {
        name: extractedOperation.name,
        resources: extractedOperation.resources
            .map(({ id, attributes }) => ({
                id,
                attributes: deduplicate(attributes),
            })),
        required: deduplicate(extractedOperation.required),
        generated: deduplicate(extractedOperation.generated),
        parameters: deduplicate(extractedOperation.parameters),
        returns: deduplicate(extractedOperation.returns),
        mappings: deduplicate(extractedOperation.mappings,
            (a, b) => a.fromId === b.fromId && a.toId === b.toId),
    };
}

function isParameterIn(name: string, extractedOperation: ExtractedOperationType): boolean {
    return undefined !== extractedOperation.parameters
        .find(parName => parName === name);
}

function isReturnIn(name: string, extractedOperation: ExtractedOperationType): boolean {
    return undefined !== extractedOperation.returns
        .find(returnName => returnName === name);
}

// function isGeneratedIn(name: string, extractedOperation: ExtractedOperationType): boolean {
//     return undefined !== extractedOperation.generated
//         .find(generatedName => generatedName === name);
// }

function isRequiredIn(name: string, extractedOperation: ExtractedOperationType): boolean {
    return undefined !== extractedOperation.required
        .find(requiredName => requiredName === name);
}

function isInMapping(name: string, mapping: MappingType): boolean {
    return mapping.fromId === name || mapping.toId === name;
}

function isConnectedToParameterAsTarget(name: string, extractedOperation: ExtractedOperationType): boolean {
    return  undefined !== extractedOperation.mappings
        .find(({ fromId, toId }) => isParameterIn(fromId, extractedOperation) && name === toId);
}

function hasSelfLoopParameters(extractedOperation: ExtractedOperationType): boolean {
    return undefined !== extractedOperation.mappings.find(({ fromId, toId }) =>
        isParameterIn(fromId, extractedOperation) && isParameterIn(toId, extractedOperation));
}

function hasSelfLoopReturns(extractedOperation: ExtractedOperationType): boolean {
    return undefined !== extractedOperation.mappings.find(({ fromId, toId }) =>
        isReturnIn(fromId, extractedOperation) && isReturnIn(toId, extractedOperation));
}

function hasSelfLoopLocals(extractedOperation: ExtractedOperationType): boolean {
    return undefined !== extractedOperation.mappings.find(({ fromId, toId }) =>
        !isReturnIn(fromId, extractedOperation) && !isParameterIn(fromId, extractedOperation) && fromId === toId);
}

function isSourceOfMapping(name: string, extractedOperation: ExtractedOperationType): boolean {
    return undefined !== extractedOperation.mappings
        .find(({ fromId }) => name === fromId);
}

function isTargetOfMapping(name: string, extractedOperation: ExtractedOperationType): boolean {
    return undefined !== extractedOperation.mappings
        .find(({ toId }) => name === toId);
}

function hasTargetParameter(extractedOperation: ExtractedOperationType): boolean {
    return extractedOperation.resources.reduce((prev, resource) => prev ||
        undefined !== resource.attributes.find(attribute =>
            isParameterIn(attribute, extractedOperation)
            && isTargetOfMapping(attribute, extractedOperation)), false);
}

function hasSourceReturn(extractedOperation: ExtractedOperationType): boolean {
    return extractedOperation.resources.reduce((prev, resource) => prev ||
        undefined !== resource.attributes.find(attribute =>
            isReturnIn(attribute, extractedOperation)
            && isSourceOfMapping(attribute, extractedOperation)), false);
}

function glue(toGlue: string, extOp: ExtractedOperationType): void {
    // source must be parameter
    const sources = extOp.mappings
        .filter(({ toId }) => toId === toGlue)
        .map(({ fromId }) => fromId);

    // target must be return
    const targets = extOp.mappings
        .filter(({ fromId }) => fromId === toGlue)
        .map(({ toId }) => toId);

    // glue ends together
    sources.forEach(fromId =>
        targets.forEach(toId => {
            extOp.mappings.push({ fromId, toId });
        }));
}

function remove(toRemove: string, extOp: ExtractedOperationType): ExtractedOperationType {
    if (isParameterIn(toRemove, extOp) || isReturnIn(toRemove, extOp)) {
        throw new Error('trying to remove a parameter or return!');
    }

    const simplified: ExtractedOperationType = {
        name: extOp.name,
        resources: [],
        required: [],
        generated: [],
        parameters: extOp.parameters,
        returns: extOp.returns,
        mappings: [],
    };

    // // source must be parameter
    // const sources = extOp.mappings
    //     .filter(({ toId }) => toId === toRemove)
    //     .map(({ fromId }) => fromId);

    // // target must be return
    // const targets = extOp.mappings
    //     .filter(({ fromId }) => fromId === toRemove)
    //     .map(({ toId }) => toId);

    // // make its sources required
    // if (isRequiredIn(toRemove, extOp)) {
    //     extOp.required.push(...sources);
    // }

    // // make its targets generated
    // if (isGeneratedIn(toRemove, extOp)) {
    //     extOp.generated.push(...targets);
    // }

    // remove from resources
    simplified.resources = extOp.resources.map(resource => ({
        id: resource.id,
        attributes: resource.attributes.filter(attribute => attribute !== toRemove),
    }));

    // remove from mappings
    const remainingMappings = extOp.mappings
        .filter(mapping => !isInMapping(toRemove, mapping));
    simplified.mappings.push(...remainingMappings);

    // remove from generated
    const remainingGenerated = extOp.generated
        .filter(generated => generated !== toRemove);
    simplified.generated.push(...remainingGenerated);

    // remove from required
    const remainingRequired = extOp.required
        .filter(required => required !== toRemove);
    simplified.required.push(...remainingRequired);

    return simplified;
}

/**
 * Current module net does not support arrows between resources of same module.
 * This removes such arrows, resources and attributes, leaving just parameters and returns.
 * @param extOp 
 */
export function simplify(extOp: ExtractedOperationType): ExtractedOperationType {
    if (hasSelfLoopParameters(extOp)) {
        throw new Error('cannot simplify parameter self loops');
    }
    
    if (hasSelfLoopReturns(extOp)) {
        throw new Error('cannot simplify return self loops');
    }

    if (hasSelfLoopLocals(extOp)) {
        throw new Error('cannot simplify local self loops');
    }

    if (hasTargetParameter(extOp)) {
        throw new Error('parameter should not be target of mapping');
    }

    if (hasSourceReturn(extOp)) {
        throw new Error('return should not be source of mapping');
    }

    const locals: string[] = extOp.resources.reduce((prev, resource) => {
        const localsThisResource = resource.attributes
            .filter(attribute => !isParameterIn(attribute, extOp) && !isReturnIn(attribute, extOp));
        return prev.concat(localsThisResource);
    }, []);

    const toRemoveThisRecursion: string[] = locals
        .filter(local => isConnectedToParameterAsTarget(local, extOp));
    let simplified: ExtractedOperationType = extOp;
    // if connected to parameter, glue ends back
    if (0 < toRemoveThisRecursion.length) {
        toRemoveThisRecursion.forEach(removeThis => {
            glue(removeThis, simplified);
            simplified = remove(removeThis, simplified);
        });
        return simplify(simplified);
    }

    // remove all remaining locals
    locals.forEach(removeThis => {
        simplified = remove(removeThis, simplified);
    });
    return deduplicateOp(simplified);
}

export function transitiveClosure(name: string, mappings: MappingType[], first: boolean = true): string[] {
    if (0 === mappings.length) {
        return [];
    }
    const mappingsFromThisName = mappings.filter(({ fromId }) => fromId === name);
    const immediateClosure = mappingsFromThisName.map(({ toId }) => toId);
    const remainingMappings = mappings.filter(({ fromId }) => fromId !== name);
    return deduplicate([
        ...immediateClosure,
        ...immediateClosure
            .map(toId => transitiveClosure(toId, remainingMappings, false))
            .reduce((prev, curr) => [...prev, ...curr], []),
    ]).filter(toId => !first || (first && toId !== name));
}

/**
 * Current module net does not support arrows between resources of same module.
 * This removes such arrows, resources and attributes, leaving just parameters and returns.
 * The approach we use here never throws exceptions, this it is a "full" implementation.
 * @param extOp 
 */
export function fullSimplify(extOp: ExtractedOperationType): ExtractedOperationType {
    let simplified: ExtractedOperationType = extOp;
    extOp.parameters.forEach(parameter => {
        const transitiveClosureThisParameter = transitiveClosure(parameter, extOp.mappings);
        const hasRequired = transitiveClosureThisParameter.some(closure => isRequiredIn(closure, extOp));
        if (hasRequired) {
            simplified.required.push(parameter);
        }
    });
    const locals: string[] = extOp.resources.reduce((prev, resource) => {
        const localsThisResource = resource.attributes
            .filter(attribute => !isParameterIn(attribute, extOp) && !isReturnIn(attribute, extOp));
        return prev.concat(localsThisResource);
    }, []);
    locals.forEach(removeThis => {
        simplified = remove(removeThis, simplified);
    });
    simplified.mappings = [];
    return deduplicateOp(simplified);
}












