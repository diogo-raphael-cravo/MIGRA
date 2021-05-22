# MIGRA

Module Integration using Graph Grammars (MIGRA) is a research project to help developers migrate software modules.

## Requirements

- Linux
- Docker v20 ([Get Docker](https://docs.docker.com/get-docker/))
- NodeJS v14 ([Get NodeJS](https://nodejs.org/))

## Building

```
sh build.sh
```

## Running

For help, run:
```
cd migra
npm run help
```

### Folder structure

First, create a folder to contain all experiments, in this case we will use folder `migra/experiments` in this repository. Then, create an empty subfolder for each experiment named `[mn]-verif3`, where `mn` is the name of a module net. So for example in order to translate module net `migra/examples/module-nets/researchnetv1`, we need to have following folder structure:
```
results/                       this folder must be empty, verification results will be saved here
examples/                      this is where we save inputs to our verification process
..module-nets/                 each subfolder of this is a module net
....researchnetv1/
......module-net.json          actual module net
......requirements.json        auxiliary file used to compute statistics
..verifier/                    each subfolder is a verification and translation procedure
....verif3/
......configuration.json       instructions on how to translate and verify
......translation-grammar.ggx  translation grammar that translates module net to verification grammar
experiments/                   each subfolder is a verified module net
..researchnetv1-verif3/        instructs migra to verify module net researchnetv1 with verif3 procedure
```

### Running step-by-step

#### Step 1. Translation

To translate module nets to verification grammars using AGG, run following command:
```
npm run translate $(pwd)/examples/verifier $(pwd)/experiments $(pwd)/examples/module-nets
```

#### Step 2. Critical pairs

To compute critical pairs using Verigraph, run following command:
```
npm run critical-pairs /tmp $(pwd)/examples/verifier $(pwd)/experiments
```

#### Step 3. Verification

To verify, run following command:
```
npm run verify $(pwd)/examples/verifier $(pwd)/examples/module-nets $(pwd)/experiments $(pwd)/results
```

