const dappeteer = require('@chainsafe/dappeteer')
const puppeteer = require('puppeteer');
const chalk = require('chalk');
const csv = require('./csv');
const fs = require("fs");

const {setupMetamask, connectWallet} = require("./metamask");
const {sellNft} = require('./opensea');
const {getOpenSeaUrl} = require("./networks");

async function sellMintedNft(secretPhase, network) {
    const openSeaUrl = await getOpenSeaUrl(network);

    // copy file to sell
    if (!fs.existsSync('./result/unsold.csv')) {
        fs.copyFileSync('./result/minted.csv', './result/unsold.csv')
    }


    const unsoldNft = await csv.readNftFromCsvFile('result/unsold.csv');

    if (unsoldNft.length > 0) {
        await dappeteer.launch(puppeteer, {
            executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
            metamaskVersion: 'v10.1.1',
            headless: false
        }).then(async (browser) => {
            const metamask = await setupMetamask(browser, secretPhase, network);

            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0);
            await page.goto(openSeaUrl);

            const firstTabs = await browser.pages();
            await firstTabs[0].close();

            await connectWallet(page, metamask);


            for (const nft of unsoldNft) {
                if (nft.Price !== '') {
                    await sellNft(browser, page, metamask, nft.AssetUrl, nft.Price).then(() => {
                        csv.writeSoldNftToCsvFile(nft);

                        console.log(chalk.green(`Ордер размещен ${nft.Name}`));
                    }).catch((error) => {
                        console.log(chalk.red(`Ошибка размещения ордера ${nft.Name}: ${error}`));
                    });
                }
            }

            await browser.close();
        }).catch((error) => {
            console.log(chalk.red(`Ошибка запуска browser: ${error}`));
        });
    } else {
        console.log(chalk.green(`Нет nft для продажи...`));
    }
}


module.exports = {
    sellMintedNft
}
