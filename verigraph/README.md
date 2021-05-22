# verigraph-docker
Dockerfile for Verigraph


## Docker

### Building
```
docker build -t verigraph:754ec08 -f ./Dockerfile .
```

### Running
```
VERSION=754ec08
COMMAND=analysis\ --output-file\ /host$(pwd)/output.cpx\ --verbose\ /host$(pwd)/example-grammar.ggx
docker run -v /:/host -e COMMAND="$COMMAND" -it --rm --name verigraph verigraph:$VERSION
```