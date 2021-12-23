const chalk = require('chalk');
const fs = require('fs');
const dappeteer = require('@chainsafe/dappeteer')
const puppeteer = require('puppeteer');

const csv = require('./csv');
const {chooseNetwork, getOpenSeaUrl} = require('./networks');
const {setupMetamask, connectWallet} = require("./metamask");
const {prompt, closeReadLine} = require("./io");
const {retry} = require('./retry');
const {mintNft} = require('./opensea');
const {sellMintedNft} = require('./sell_minted_nft')

const resultDir = './result';

(async () => {
    const network = await chooseNetwork();
    const openSeaUrl = await getOpenSeaUrl(network);

    const secretPhase = await prompt(chalk.red('MetaMask Secret Phrase: '));
    const collectionSlug = await prompt(chalk.green('Collection Slug: '));

    await closeReadLine();

    // create result directory
    if (!fs.existsSync(resultDir)) {
        fs.mkdirSync(resultDir)
    }

    // copy file to mint
    if (!fs.existsSync('./result/unminted.csv')) {
        fs.copyFileSync('./assets/nfts.csv', './result/unminted.csv')
    }

    console.log();
    console.log(chalk.blue('minting...'));

    const nfts = await csv.readCsvFile('./result/unminted.csv');
    if (nfts.length > 0) {
        await dappeteer.launch(puppeteer, {
            executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
            metamaskVersion: 'v10.1.1',
            headless: false,
            timeout: 90000
        }).then(async (browser) => {
            const metamask = await setupMetamask(browser, secretPhase, network);

            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0);
            await page.goto(openSeaUrl);

            const firstTabs = await browser.pages();
            await firstTabs[0].close();

            await connectWallet(page, metamask);

            const tabs = await browser.pages();

            // mint nft
            for (const nft of nfts) {
                if (!fs.existsSync(`./assets/${nft.Name}.jpg`) && !fs.existsSync(`./assets/${nft.Name}.png`)) {
                    console.log(chalk.red(`Файл не найден: ${nft.Name}`));

                    continue;
                }

                await tabs[1].bringToFront()
                // await tabs[1].goto(`${openSeaUrl}/collection/${collectionSlug}/assets/create?enable_supply=true`);
                await tabs[1].goto(`${openSeaUrl}/collection/${collectionSlug}/assets/create`);

                // await retry(mintNft, [page, metamask, nft, network]).then(async (mintedNft) => {
                await mintNft(page, metamask, nft, network).then(async (mintedNft) => {
                    await csv.writeMintedNftToCsvFile(mintedNft);
                }).catch((error) => {
                    console.log(chalk.red(`Ошибка minting'а ${nft.Name}: ${error}`));
                });
            }

            await browser.close();
        }).catch((error) => {
            console.log(chalk.red(`Ошибка запуска browser: ${error}`));
        });
    } else {
        console.log(chalk.green(`Нет nft для minting'а...`));
    }

    console.log();
    console.log(chalk.blue('продажа...'));
    await sellMintedNft(secretPhase, network);
})();
