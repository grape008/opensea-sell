const fs = require('fs');
const csv = require('fast-csv');

const RESERVED_NAMES = ['Name', 'Description', 'Price', 'Unlockable content'];

async function parseRow(row) {
    let nft = {
        traits: []
    }

    for (let [k, v] of Object.entries(row)) {
        if (RESERVED_NAMES.includes(k)) {
            // fixed price
            if (k === 'Price') {
                v = v.replace(',', '.');
            }

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

async function readNftFromCsvFile(fileName) {
    return new Promise((resolve, reject) => {
        let rows = [];

        csv.parseFile(fileName, {headers: true})
            .on('error', error => reject(error))
            .on('data', (row) => rows.push(row))
            .on('end', () => resolve(rows));
    });
}


async function writeNftToCsvFile(nft, fileName) {
    let rows = [];

    rows.push({
        Name: nft.Name,
        AssetUrl: nft.AssetUrl,
        AssetContract: nft.AssetContract,
        AssetToken: nft.AssetToken,
        Price: nft.Price
    });

    await writeRowsToCsvFile(rows, fileName);
}

async function writeMintedNftToCsvFile(nft) {
    // write minted nft to result file

    await writeNftToCsvFile(nft, 'result/minted.csv');

    const unminted = await readNftFromCsvFile('./result/unminted.csv')
        .then((rows) => rows
            .filter(row => row.Name !== nft.Name)
        );

    await writeRowsToCsvFile(unminted, './result/unminted.csv', 'w');
}


async function writeSoldNftToCsvFile(nft) {
    // write sold nft to result file
    await writeNftToCsvFile(nft, 'result/sold.csv');

    const unsold = await readNftFromCsvFile('./result/unsold.csv')
        .then((rows) => rows
            .filter(row => row.Name !== nft.Name)
        );

    await writeRowsToCsvFile(unsold, './result/unsold.csv', 'w');
}


async function writeRowsToCsvFile(rows, fileName, flag = 'a') {
    let headers = true;

    if (fs.existsSync(fileName) && flag === 'a') {
        headers = false;
    }

    const ws = fs.createWriteStream(fileName, {flags: flag});
    csv.write(rows, {headers: headers}).pipe(ws);
}

module.exports = {
    readCsvFile,
    readNftFromCsvFile,
    writeMintedNftToCsvFile,
    writeSoldNftToCsvFile
}
