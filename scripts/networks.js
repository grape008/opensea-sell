const colorize = require("json-colorizer");
const {prompt} = require("./io");
const chalk = require("chalk");

const OPENSEA_URL = {
    '1': 'https://opensea.io/',
    '2': 'https://testnets.opensea.io/',
    '3': 'https://opensea.io/',
    '4': 'https://testnets.opensea.io/',
}

async function chooseNetwork() {
    let network = '';

    console.log(colorize({
        "1": "Mainnet",
        "2": "Rinkeby",
        "3": "Polygon",
        "4": "Mumbai (Polygon Test)"
    }, {
        colors: {STRING_KEY: 'red'},
        pretty: true
    }));

    console.log();

    do {
        network = await prompt(chalk.red('Cеть: '));
    } while (!network.match(/^(1|2|3|4)$/));

    return network;
}

async function getOpenSeaUrl(network) {
    return OPENSEA_URL[network];
}

module.exports = {
    chooseNetwork,
    getOpenSeaUrl
}
