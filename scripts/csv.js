const fs = require('fs');
const csv = require('fast-csv');

const RESERVED_NAMES = ['Name', 'Description', 'Price', 'Unlockable content'];

async function parseRow(row) {
    let nft = {
        traits: []
    }

    for (const [k, v] of Object.entries(row)) {
        if (RESERVED_NAMES.includes(k)) {
            nft[k] = v;
        } else {
            nft.traits.push({'type': k, 'value': v});
        }
    }

    return nft
}

async function readCsvFile(fileName) {
    return new Promise((resolve, reject) => {
        let result = [];
        fs.createReadStream(fileName)
            .pipe(csv.parse({headers: true}))
            .on('error', error => console.error(error))
            .on('data', async row => result.push(await parseRow(row)))
            .on('end', () => resolve(result));
    });
}

module.exports = {
    readCsvFile
}
