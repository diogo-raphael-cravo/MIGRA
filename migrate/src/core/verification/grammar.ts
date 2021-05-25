import { RuleType } from './rules';
import { deduplicate } from '../helpers/sets';

export type GrammarType = {
    modules: string[],
    resources: string[],
    attributes: string[],
    rules: RuleType[],
};

export function merge(grammars: GrammarType[]): GrammarType {
    return {
        modules: deduplicate(grammars
            .reduce((prev, curr) => prev.concat(curr.modules), [])),
        resources: deduplicate(grammars
            .reduce((prev, curr) => prev.concat(curr.resources), [])),
        attributes: deduplicate(grammars
            .reduce((prev, curr) => prev.concat(curr.attributes), [])),
        rules: grammars.reduce((prev, curr) => prev.concat(curr.rules), []),
    };
}