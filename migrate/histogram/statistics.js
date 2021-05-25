const fs = require('fs');
const statistics = require('/media/localuser/da694e8a-55b4-4fc5-ace1-05ccd917cdfd/2021-03-28T20_19_58.155Z/statistics.json');
const basepath = 'C:/Users/cravo/Desktop/mestrado/histograms';
const filenames = [];

function makeVector(statName) {
    console.log(`vector of ${statName}`);
    const statsString = statistics
        .map(stats => stats[statName])
        .sort((x, y) => x - y)
        .map(stats => `\n${stats}`)
        .join(',');
    return `${statName} <- c(`
        + statsString
        + ')\n'
        + `log${statName} <- log(${statName})\n`
        + `log2${statName} <- log2(${statName})\n`
        + `log10${statName} <- log10(${statName})\n`;
}

// main, xlab: remember to add ""
function writeHist({ main, xlab, vector, histogram }) {
    const histogramString = histogram
        + `svg(file="${basepath}/${vector}.svg")\n`
        + `hist(${vector},\n`
        + `main=${main},\n`
        + `xlab=${xlab},\n`
        + 'ylab="Count",\n'
        + 'col=rgb(0.5, 0.5, 0.5, 1/4))\n'
        + 'dev.off()\n';
    const filename = `${vector}-histogram.r`;
    filenames.push(filename);
    console.log(`writing ${filename}`);
    fs.writeFileSync(filename, histogramString, 'utf-8');
}

function hist(vector) {
    writeHist({
        main: 'NULL',
        xlab: 'NULL',
        vector,
        histogram: makeVector(vector),
    });
    writeHist({
        main: 'NULL',
        xlab: 'NULL',
        vector: `log${vector}`,
        histogram: makeVector(vector),
    });
    writeHist({
        main: 'NULL',
        xlab: 'NULL',
        vector: `log2${vector}`,
        histogram: makeVector(vector),
    });
    writeHist({
        main: 'NULL',
        xlab: 'NULL',
        vector: `log10${vector}`,
        histogram: makeVector(vector),
    });
}

hist('total');
hist('files');
hist('program');
hist('identifier');
hist('statements');
hist('expressions');
hist('literals');
hist('declarations');
hist('classes');
hist('others');

const sourceString = filenames.map(name => `source("${basepath}/${name}")`).join('\n')
fs.writeFileSync('source.r', sourceString, 'utf-8');