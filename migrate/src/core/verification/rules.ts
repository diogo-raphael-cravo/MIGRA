


export type RuleType = {
    name: string,
    pattern: string,
     // whether or not this rule requires something to run by construction
    reachableByConstruction: boolean,
    // whether or not a counterpart for this rule exists in the model, true = mock, false = real
    mock: boolean,
    requiredByDefault: boolean,
    mapsToOperation?: string,
    contains: {
        modules: string[],
        resources: string[],
        attributes: string[]
    }
};