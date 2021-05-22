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

First, create a folder to contain all experiments, in this case we will use folder `results` at the root of this repository. Then, create an empty subfolder for each experiment named `[mn]-verif3`, where `mn` is the name of a module net. So for example in order to translate module net `./examples/module-nets/researchnetv1`, we need to have following folder structure:
```
examples/
..module-nets/
....researchnetv1/
......module-net.json
......requirements.json
..verifier/
....verif3/
......configuration.json
......translation-grammar.ggx
results/
..researchnetv1-verif3/
```
and then run following command:
```
npm run translate examples/verifier results examples/module-nets
```