# agg

## Docker

### Building
```
docker build -t agg-save:0.0.2 -f ./Dockerfile .
```

### Running
```
COMMAND=Save
COMMAND=Transform
COMMAND=TransformLayered
SOURCE=path
TARGET=path
docker run -v /:/usr/tmpdir -e COMMAND=$COMMAND -e SOURCE=$SOURCE -e TARGET=$TARGET -it --rm --name agg-save agg-save:0.0.2
```