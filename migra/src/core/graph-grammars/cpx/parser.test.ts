import * as Sinon from 'sinon';
import * as GGXParser from '../ggx/parser';
import * as CPXParser from './parser';
import { decorateGrammar } from '../decorators.test';

function makeMockXml(confsConfContainer: string, depsConfContainer: string): string {
    return '<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<Document version="1.0">\n'
        + '<CriticalPairs ID="I0">\n'
        + '    <GraphTransformationSystem>\n'
        + '    </GraphTransformationSystem>\n'
        + '    <cpaOptions complete="true" consistent="false" directlyStrictConfluent="false" '
        + 'directlyStrictConfluentUpToIso="false" essential="false" ignoreSameMatch="false" '
        + 'ignoreSameRule="false" maxBoundOfCriticCause="0" namedObject="false" '
        + 'strongAttrCheck="false"/>\n'
        + '<conflictContainer kind="exclude">\n'
        + confsConfContainer
        + '</conflictContainer>\n'
        + '<dependencyContainer kind="trigger_switch_dependency">\n'
        + depsConfContainer
        + '</dependencyContainer>\n'
        + '</CriticalPairs>\n'
        + '</Document>\n';
}

const container = '<RuleSet i0="1.GET.call-E1_AB" i1="2.GET.return-E1_AB"/>\n'
    + '<RuleSet2 i0="1.GET.call-E1_AB" i1="2.GET.return-E1_AB"/>\n'
    + '<Rule R1="1.GET.call-E1_AB">\n'
    + '    <Rule R2="1.GET.call-E1_AB"/>\n'
    + '    <Rule R2="2.GET.return-E1_AB"/>\n'
    + '</Rule>\n'
    + '<Rule R1="2.GET.return-E1_AB">\n'
    + '    <Rule R2="1.GET.call-E1_AB"/>\n'
    + '    <Rule R2="2.GET.return-E1_AB">\n'
    + '      <Overlapping_Pair>\n'
    + '        <Graph ID="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon" kind="GRAPH"'
    + '            name="( 1 ) delete-use-verigraph-conflict">\n'
    + '          <Node ID="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N3" type="N5"/>\n'
    + '          <Edge ID="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_E4"'
    + '            source="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N3"'
    + '            target="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N4" type="E1"/>\n'
    + '        </Graph>\n'
    + '        <Morphism name="MorphOf_2.GET.return-E1_AB" source="LHS">\n'
    + '          <Mapping image="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N0"'
    + '            orig="LeftOf_2.GET.return-E1_AB_N3"/>\n'
    + '          <Mapping image="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N4"'
    + '            orig="LeftOf_2.GET.return-E1_AB_N2"/>\n'
    + '        </Morphism>\n'
    + '        <Morphism name="MorphOf_2.GET.return-E1_AB" source="LHS">\n'
    + '          <Mapping image="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N3"'
    + '            orig="LeftOf_2.GET.return-E1_AB_N3"/>\n'
    + '          <Mapping image="2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N4"'
    + '            orig="LeftOf_2.GET.return-E1_AB_N2"/>\n'
    + '        </Morphism>\n'
    + '      </Overlapping_Pair>\n'
    + '    </Rule>\n'
    + '</Rule>\n';

const cpaOptions = {
    complete: true,
    consistent: false,
    directlyStrictConfluent: false,
    directlyStrictConfluentUpToIso: false,
    essential: false,
    ignoreSameMatch: false,
    ignoreSameRule: false,
    maxBoundOfCriticCause: 0,
    namedObject: false,
    strongAttrCheck: false,
};

const conflictContainerExpect = {
    kind: 'exclude',
    RuleSet: [
        '1.GET.call-E1_AB',
        '2.GET.return-E1_AB',
    ],
    RuleSet2: [
        '1.GET.call-E1_AB',
        '2.GET.return-E1_AB',
    ],
    Rules: [{
        R1: '1.GET.call-E1_AB',
        R2: '1.GET.call-E1_AB',
        overlappingPairs: [],
    }, {
        R1: '1.GET.call-E1_AB',
        R2: '2.GET.return-E1_AB',
        overlappingPairs: [],
    }, {
        R1: '2.GET.return-E1_AB',
        R2: '1.GET.call-E1_AB',
        overlappingPairs: [],
    }, {
        R1: '2.GET.return-E1_AB',
        R2: '2.GET.return-E1_AB',
        overlappingPairs: [{
            graph: {
                ID: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon',
                kind: 'GRAPH',
                name: '( 1 ) delete-use-verigraph-conflict',
                nodes: [{
                    ID: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N3',
                    type: 'N5',
                    attributes: [],
                }],
                edges: [{
                    ID: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_E4',
                    type: 'E1',
                    source: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N3',
                    target: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N4',
                    attributes: [],
                }],
            },
            morphisms: [{
                name: 'MorphOf_2.GET.return-E1_AB',
                source: 'LHS',
                mappings: [{
                    image: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N0',
                    orig: 'LeftOf_2.GET.return-E1_AB_N3',
                }, {
                    image: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N4',
                    orig: 'LeftOf_2.GET.return-E1_AB_N2',
                }],
            }, {
                name: 'MorphOf_2.GET.return-E1_AB',
                source: 'LHS',
                mappings: [{
                    image: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N3',
                    orig: 'LeftOf_2.GET.return-E1_AB_N3',
                }, {
                    image: '2.GET.return-E1_AB2.GET.return-E1_AB1_delusecon_N4',
                    orig: 'LeftOf_2.GET.return-E1_AB_N2',
                }],
            }],
        }],
    }],
};

describe('cpx-parser', () => {
    const stubs: Sinon.SinonStub[] = [];
    beforeEach(() => {
        stubs.push(Sinon.stub(GGXParser, 'parseGraphTransformationSystem')
            .resolves(decorateGrammar({})));
    });
    afterEach(() => {
        stubs.forEach(stub => stub.restore());
    });
    it('parses cpx', async () => {
        const xmlToParse = makeMockXml(container, container);
        const criticalPairs = await CPXParser.parseXml(xmlToParse);
        expect(criticalPairs.cpaOptions).toStrictEqual(cpaOptions);
        expect(criticalPairs.conflictContainer)
            .toStrictEqual(conflictContainerExpect);
        expect(criticalPairs.dependencyContainer)
            .toStrictEqual({
                ...conflictContainerExpect,
                kind: 'trigger_switch_dependency',
            });
    });
});