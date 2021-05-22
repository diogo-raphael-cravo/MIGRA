import { toVerifGrammar, toVerifGrammarRule } from './verif-grammar';
import {
    decorateConfiguration,
    decorateGrammar,
    decorateGraph,
    decorateNodesOrEdges,
    decorateRule,
    decorateTypeGraphEdges,
    decorateTypeGraphNodes,
} from './decorators.test';

describe('verif-grammar', () => {
    it('extracts modules', () => {
        const grammar = toVerifGrammar(decorateGrammar({
            types: {
                nodes: decorateNodesOrEdges([{
                    ID: 'module-ID',
                    name: 'module',
                }, {
                    ID: 'other-module-ID',
                    name: 'other-module',
                }]),
                edges: [],
                typeGraph: decorateGraph({
                    nodes: [],
                    edges: [],
                }),
            },
        }), decorateConfiguration({}));
        expect(grammar.modules).toStrictEqual(['module', 'other-module']);
        expect(grammar.resources).toStrictEqual([]);
        expect(grammar.attributes).toStrictEqual([]);
    });
    it('extracts resources', () => {
        const grammar = toVerifGrammar(decorateGrammar({
            types: {
                nodes: decorateNodesOrEdges([{
                    ID: 'module-ID',
                    name: 'module',
                }, {
                    ID: 'resource-ID',
                    name: 'resource',
                }]),
                edges: decorateNodesOrEdges([{
                    ID: 'edge-ID',
                    name: 'resource-of',
                }]),
                typeGraph: decorateGraph({
                    nodes: decorateTypeGraphNodes([{
                        ID: 'module-type-ID',
                        type: 'module-ID'
                    }, {
                        ID: 'resource-type-ID',
                        type: 'resource-ID'
                    }]),
                    edges: decorateTypeGraphEdges([{
                        source: 'resource-type-ID',
                        target: 'module-type-ID',
                        type: 'edge-ID',
                    }]),
                }),
            },
        }), decorateConfiguration({
            resourceEdgeName: 'resource-of',
        }));
        expect(grammar.modules).toStrictEqual(['module']);
        expect(grammar.resources).toStrictEqual(['module.resource']);
        expect(grammar.attributes).toStrictEqual([]);
    });
    it('extracts resources with same names', () => {
        const grammar = toVerifGrammar(decorateGrammar({
            types: {
                nodes: decorateNodesOrEdges([{
                    ID: 'module-A-ID',
                    name: 'module-A',
                }, {
                    ID: 'resource-A-ID',
                    name: 'resource',
                }, {
                    ID: 'module-B-ID',
                    name: 'module-B',
                }, {
                    ID: 'resource-B-ID',
                    name: 'resource',
                }]),
                edges: decorateNodesOrEdges([{
                    ID: 'edge-ID',
                    name: 'resource-of',
                }]),
                typeGraph: decorateGraph({
                    nodes: decorateTypeGraphNodes([{
                        ID: 'module-A-type-ID',
                        type: 'module-A-ID'
                    }, {
                        ID: 'resource-A-type-ID',
                        type: 'resource-A-ID'
                    }, {
                        ID: 'module-B-type-ID',
                        type: 'module-B-ID'
                    }, {
                        ID: 'resource-B-type-ID',
                        type: 'resource-B-ID'
                    }]),
                    edges: decorateTypeGraphEdges([{
                        source: 'resource-A-type-ID',
                        target: 'module-A-type-ID',
                        type: 'edge-ID',
                    }, {
                        source: 'resource-B-type-ID',
                        target: 'module-B-type-ID',
                        type: 'edge-ID',
                    }]),
                }),
            },
        }), decorateConfiguration({
            resourceEdgeName: 'resource-of',
        }));
        expect(grammar.modules).toStrictEqual([
            'module-A',
            'module-B',
        ]);
        expect(grammar.resources).toStrictEqual([
            'module-A.resource',
            'module-B.resource',
        ]);
        expect(grammar.attributes).toStrictEqual([]);
    });
    it('ignores edges which are not resource edges when extracting resources', () => {
        const grammar = toVerifGrammar(decorateGrammar({
            types: {
                nodes: decorateNodesOrEdges([{
                    ID: 'module-ID',
                    name: 'module',
                }, {
                    ID: 'resource-ID',
                    name: 'module-like-resource',
                }]),
                edges: decorateNodesOrEdges([{
                    ID: 'edge-ID',
                    name: 'some-other-edge',
                }]),
                typeGraph: decorateGraph({
                    nodes: decorateTypeGraphNodes([{
                        ID: 'module-type-ID',
                        type: 'module-ID'
                    }, {
                        ID: 'resource-type-ID',
                        type: 'resource-ID'
                    }]),
                    edges: decorateTypeGraphEdges([{
                        source: 'resource-type-ID',
                        target: 'module-type-ID',
                        type: 'edge-ID',
                    }]),
                }),
            },
        }), decorateConfiguration({
            resourceEdgeName: 'resource-of',
        }));
        expect(grammar.modules).toStrictEqual([
            'module',
            'module-like-resource',
        ]);
        expect(grammar.resources).toStrictEqual([]);
        expect(grammar.attributes).toStrictEqual([]);
    });
    it('extracts attributes with same names', () => {
        const grammar = toVerifGrammar(decorateGrammar({
            types: {
                nodes: decorateNodesOrEdges([{
                    ID: 'module-ID',
                    name: 'module',
                }, {
                    ID: 'resource-ID',
                    name: 'resource',
                }, {
                    ID: 'attribute-ID',
                    name: 'attribute',
                }, {
                    ID: 'other-module-ID',
                    name: 'other-module',
                }, {
                    ID: 'other-resource-ID',
                    name: 'other-resource',
                }, {
                    ID: 'other-attribute-ID',
                    name: 'attribute',
                }]),
                edges: decorateNodesOrEdges([{
                    ID: 'resource-edge-ID',
                    name: 'resource-of',
                }, {
                    ID: 'attribute-edge-ID',
                    name: 'attribute-of',
                }, {
                    ID: 'other-resource-edge-ID',
                    name: 'resource-of',
                }, {
                    ID: 'other-attribute-edge-ID',
                    name: 'attribute-of',
                }]),
                typeGraph: decorateGraph({
                    nodes: decorateTypeGraphNodes([{
                        ID: 'module-type-ID',
                        type: 'module-ID'
                    }, {
                        ID: 'resource-type-ID',
                        type: 'resource-ID'
                    }, {
                        ID: 'attribute-type-ID',
                        type: 'attribute-ID'
                    }, {
                        ID: 'other-module-type-ID',
                        type: 'other-module-ID'
                    }, {
                        ID: 'other-resource-type-ID',
                        type: 'other-resource-ID'
                    }, {
                        ID: 'other-attribute-type-ID',
                        type: 'other-attribute-ID'
                    }]),
                    edges: decorateTypeGraphEdges([{
                        source: 'resource-type-ID',
                        target: 'module-type-ID',
                        type: 'resource-edge-ID',
                    }, {
                        source: 'attribute-type-ID',
                        target: 'resource-type-ID',
                        type: 'attribute-edge-ID',
                    }, {
                        source: 'other-resource-type-ID',
                        target: 'other-module-type-ID',
                        type: 'other-resource-edge-ID',
                    }, {
                        source: 'other-attribute-type-ID',
                        target: 'other-resource-type-ID',
                        type: 'other-attribute-edge-ID',
                    }]),
                }),
            },
        }), decorateConfiguration({
            rulePatterns: [{
                name: 'GET',
                regex: '.*GET.*',
            }],
            resourceEdgeName: 'resource-of',
            attributeEdgeName: 'attribute-of',
        }));
        expect(grammar.modules).toStrictEqual([
            'module',
            'other-module',
        ]);
        expect(grammar.resources).toStrictEqual([
            'module.resource',
            'other-module.other-resource',
        ]);
        expect(grammar.attributes).toStrictEqual([
            'module.resource.attribute',
            'other-module.other-resource.attribute',
        ]);
    });
    it('extracts attributes', () => {
        const grammar = toVerifGrammar(decorateGrammar({
            types: {
                nodes: decorateNodesOrEdges([{
                    ID: 'module-ID',
                    name: 'module',
                }, {
                    ID: 'resource-ID',
                    name: 'resource',
                }, {
                    ID: 'attribute-ID',
                    name: 'attribute',
                }, {
                    ID: 'other-module-ID',
                    name: 'other-module',
                }, {
                    ID: 'other-resource-ID',
                    name: 'other-resource',
                }, {
                    ID: 'other-attribute-ID',
                    name: 'other-attribute',
                }]),
                edges: decorateNodesOrEdges([{
                    ID: 'resource-edge-ID',
                    name: 'resource-of',
                }, {
                    ID: 'attribute-edge-ID',
                    name: 'attribute-of',
                }, {
                    ID: 'other-resource-edge-ID',
                    name: 'resource-of',
                }, {
                    ID: 'other-attribute-edge-ID',
                    name: 'attribute-of',
                }]),
                typeGraph: decorateGraph({
                    nodes: decorateTypeGraphNodes([{
                        ID: 'module-type-ID',
                        type: 'module-ID'
                    }, {
                        ID: 'resource-type-ID',
                        type: 'resource-ID'
                    }, {
                        ID: 'attribute-type-ID',
                        type: 'attribute-ID'
                    }, {
                        ID: 'other-module-type-ID',
                        type: 'other-module-ID'
                    }, {
                        ID: 'other-resource-type-ID',
                        type: 'other-resource-ID'
                    }, {
                        ID: 'other-attribute-type-ID',
                        type: 'other-attribute-ID'
                    }]),
                    edges: decorateTypeGraphEdges([{
                        source: 'resource-type-ID',
                        target: 'module-type-ID',
                        type: 'resource-edge-ID',
                    }, {
                        source: 'attribute-type-ID',
                        target: 'resource-type-ID',
                        type: 'attribute-edge-ID',
                    }, {
                        source: 'other-resource-type-ID',
                        target: 'other-module-type-ID',
                        type: 'other-resource-edge-ID',
                    }, {
                        source: 'other-attribute-type-ID',
                        target: 'other-resource-type-ID',
                        type: 'other-attribute-edge-ID',
                    }]),
                }),
            },
            rules: [
                decorateRule({
                    ID: '1.GET.call-E1_AB',
                    name: '1.GET.call-E1_AB',
                    graphs: [
                        decorateGraph({
                            nodes: decorateTypeGraphNodes([{
                                type: 'module-ID',
                            }, {
                                type: 'resource-ID',
                            }]),
                        }),
                        decorateGraph({
                            nodes: decorateTypeGraphNodes([{
                                type: 'attribute-ID',
                            }, {
                                type: 'other-attribute-ID',
                            }]),
                        }),
                    ],
                }),
            ]
        }), decorateConfiguration({
            rulePatterns: [{
                name: 'GET',
                regex: '.*GET.*',
            }],
            resourceEdgeName: 'resource-of',
            attributeEdgeName: 'attribute-of',
        }));
        expect(grammar.modules).toStrictEqual([
            'module',
            'other-module',
        ]);
        expect(grammar.resources).toStrictEqual([
            'module.resource',
            'other-module.other-resource',
        ]);
        expect(grammar.attributes).toStrictEqual([
            'module.resource.attribute',
            'other-module.other-resource.other-attribute',
        ]);
        expect(grammar.rules).toStrictEqual([{
            name: '1.GET.call-E1_AB',
            pattern: 'GET',
            contains: {
                modules: ['module'],
                resources: ['module.resource'],
                attributes: [
                    'module.resource.attribute',
                    'other-module.other-resource.other-attribute',
                ],
            },
        }]);
    });
    it('ignores edges which are not attribute edges when extracting attributes', () => {
        const grammar = toVerifGrammar(decorateGrammar({
            types: {
                nodes: decorateNodesOrEdges([{
                    ID: 'module-ID',
                    name: 'module',
                }, {
                    ID: 'resource-ID',
                    name: 'resource',
                }, {
                    ID: 'attribute-ID',
                    name: 'module-like-attribute',
                }]),
                edges: decorateNodesOrEdges([{
                    ID: 'resource-edge-ID',
                    name: 'resource-of',
                }, {
                    ID: 'attribute-edge-ID',
                    name: 'some-other-edge-attribute-of',
                }]),
                typeGraph: decorateGraph({
                    nodes: decorateTypeGraphNodes([{
                        ID: 'module-type-ID',
                        type: 'module-ID'
                    }, {
                        ID: 'resource-type-ID',
                        type: 'resource-ID'
                    }, {
                        ID: 'attribute-type-ID',
                        type: 'attribute-ID'
                    }]),
                    edges: decorateTypeGraphEdges([{
                        source: 'resource-type-ID',
                        target: 'module-type-ID',
                        type: 'resource-edge-ID',
                    }, {
                        source: 'attribute-type-ID',
                        target: 'resource-type-ID',
                        type: 'attribute-edge-ID',
                    }]),
                }),
            },
        }), decorateConfiguration({
            resourceEdgeName: 'resource-of',
            attributeEdgeName: 'attribute-of',
        }));
        expect(grammar.modules).toStrictEqual([
            'module',
            'module-like-attribute',
        ]);
        expect(grammar.resources).toStrictEqual(['module.resource']);
        expect(grammar.attributes).toStrictEqual([]);
    });
    it('extracts rules', () => {
        const rulePatterns = [{
            name: 'GET',
            regex: '.*GET.*',
        }, {
            name: 'generate-resource',
            regex: 'generate-\\w+\\.\\w+',
        }, {
            name: 'generate-attribute',
            regex: 'generate-\\w+\\.\\w+\\.\\w+',
        }, {
            name: 'mockgenerate-resource',
            regex: 'mockgenerate-\\w+\\.\\w+',
        }, {
            name: 'mockgenerate-attribute',
            regex: 'mockgenerate-\\w+\\.\\w+\\.\\w+',
        }];
        const configuration = decorateConfiguration({ rulePatterns });
        const GETRule = toVerifGrammarRule(decorateRule({
            ID: '1.GET.call-E1_AB',
            name: '1.GET.call-E1_AB',
        }), configuration);
        expect(GETRule).toStrictEqual({
            name: '1.GET.call-E1_AB',
            pattern: 'GET',
            contains: [],
        });

        const generateResourceRule = toVerifGrammarRule(decorateRule({
            ID: 'generate-A.A1',
            name: 'generate-A.A1',
        }), configuration);
        expect(generateResourceRule).toStrictEqual({
            name: 'generate-A.A1',
            pattern: 'generate-resource',
            contains: [],
        });

        const generateAttributeRule = toVerifGrammarRule(decorateRule({
            ID: 'generate-A.A1.a1',
            name: 'generate-A.A1.a1',
        }), configuration);
        expect(generateAttributeRule).toStrictEqual({
            name: 'generate-A.A1.a1',
            pattern: 'generate-attribute',
            contains: [],
        });

        const mockgenerateResourceRule = toVerifGrammarRule(decorateRule({
            ID: 'mockgenerate-A.A1',
            name: 'mockgenerate-A.A1',
        }), configuration);
        expect(mockgenerateResourceRule).toStrictEqual({
            name: 'mockgenerate-A.A1',
            pattern: 'mockgenerate-resource',
            contains: [],
        });

        const mockgenerateAttributeRule = toVerifGrammarRule(decorateRule({
            ID: 'mockgenerate-A.A1.a1',
            name: 'mockgenerate-A.A1.a1',
        }), configuration);
        expect(mockgenerateAttributeRule).toStrictEqual({
            name: 'mockgenerate-A.A1.a1',
            pattern: 'mockgenerate-attribute',
            contains: [],
        });
    });
    it('extracts node types in rules', () => {
        const rulePatterns = [{
            name: 'GET',
            regex: '.*GET.*',
        }];
        const configuration = decorateConfiguration({ rulePatterns });
        const GETRule = toVerifGrammarRule(decorateRule({
            ID: '1.GET.call-E1_AB',
            name: '1.GET.call-E1_AB',
            graphs: [
                decorateGraph({
                    nodes: decorateTypeGraphNodes([{
                        type: 'A',
                    }, {
                        type: 'B',
                    }]),
                }),
                decorateGraph({
                    nodes: decorateTypeGraphNodes([{
                        type: 'C',
                    }, {
                        type: 'D',
                    }]),
                }),
            ],
        }), configuration);
        expect(GETRule).toStrictEqual({
            name: '1.GET.call-E1_AB',
            pattern: 'GET',
            contains: ['A', 'B', 'C', 'D'],
        });
    });
});