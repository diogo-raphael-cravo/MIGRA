echo "Building AGG"
cd agg
docker build -t agg-save:0.0.2 -f ./Dockerfile .
cd ../

echo "Building Verigraph"
cd verigraph
docker build -t verigraph:754ec08 -f ./Dockerfile .
cd ../

echo "Building MIGRA"
cd migra
npm install
cd ../

echo "Done!"