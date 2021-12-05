const fs = require('fs');
const dappeteer = require('@chainsafe/dappeteer')
const puppeteer = require('puppeteer');
const {chooseNetwork, getOpenSeaUrl} = require('./networks');
const {setupMetamask, connectWallet} = require("./metamask");
const {prompt, closeReadLine} = require("./io");
const chalk = require('chalk');
const {readCsvFile} = require('./csv');

const uploadImage = async (page, file) => {
    const elementHandle = await page.$("#media");
    await elementHandle.uploadFile(file);
}

async function mintNft(page, nft, network) {
    await uploadImage(page, `./assets/${nft.Name}.jpg`);

    await page.focus('#name');
    await page.keyboard.type(nft.Name);

    await page.focus('#description');
    let description = nft.Description;
    description = description.replace(new RegExp('\n', 'g'), '\n\n');

    await page.keyboard.type(description);

    if (["3", "4"].includes(network)) {
        await page.click("input[id='chain']");
        await page.click('img[src="/static/images/logos/polygon.svg"]');
    }

    if (nft['Unlockable content'] !== '') {
        await page.click("input[id='unlockable-content-toggle']");
        await page.focus("textarea[placeholder='Enter content (access key, code to redeem, link to a file, etc.)']");
        await page.keyboard.type(nft['Unlockable content']);
    }

    await page.evaluate(() => {
        const inputSupply = document.getElementById('supply');
        inputSupply.value = '';
    });

    await page.focus("input[id='supply'");
    await page.keyboard.type('1');

    if (nft.traits.length > 0) {
        await page.click('button[aria-label="Add properties"]');

        const addMore = await page.$x("//button[contains(text(), 'Add more')]");
        for (let i = 0; i < nft.traits.length; i++) {
            await addMore[0].click();

            const inputType = await page.$x('//input[@placeholder="Character"]');
            await inputType[i].focus();
            await page.keyboard.type(nft.traits[i].type);

            const inputValue = await page.$x('//input[@placeholder="Male"]');
            await inputValue[i].focus();
            await page.keyboard.type(nft.traits[i].value);
        }

        const saveButton = await page.$x("//button[contains(text(), 'Save')]");
        await saveButton[0].click();
    }

    const createButton = await page.$x("//button[contains(text(), 'Create')]");
    await createButton[0].click();
}

async function sellNft(page, metamask, price) {
    const sellButton = await page.$x("//a[contains(text(), 'Sell')]");
    await sellButton[0].click();

    await page.waitForSelector('input[name="price"]').then(async () => {
        await page.focus('input[name="price"]');
        await page.keyboard.type(price);

        await page.click('button[type="submit"]');
    });

    await page.waitForXPath('//p[text()="Waiting for signature..."]').then(async () => {
        await metamask.sign();
    });

    await page.waitForXPath('//a[text()="View Item"]');
}

(async () => {
    const network = await chooseNetwork();
    const openSeaUrl = await getOpenSeaUrl(network);

    const secretPhase = await prompt(chalk.red('MetaMask Secret Phrase: '));
    const collectionSlug = await prompt(chalk.green('Collection Slug: '));

    const browser = await dappeteer.launch(puppeteer, {
        executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
        metamaskVersion: 'v10.1.1'
    });

    const metamask = await setupMetamask(browser, secretPhase, network);

    const page = await browser.newPage();
    await page.goto(openSeaUrl);

    const firstTabs = await browser.pages();
    await firstTabs[0].close();

    await connectWallet(page, metamask);

    const nfts = await readCsvFile('./assets/nfts.csv');

    const tabs = await browser.pages();

    for (const nft of nfts) {
        if (!fs.existsSync(`./assets/${nft.Name}.jpg`)) {
            console.log(chalk.red(`Файл не найден: ${nft.Name}.jpg`));

            continue;
        }

        await tabs[1].bringToFront()
        await tabs[1].goto(`${openSeaUrl}/collection/${collectionSlug}/assets/create?enable_supply=true`);

        await mintNft(page, nft, network).catch((error) => {
            console.log(chalk.red(error));
        });

        await page.waitForXPath('//h4[text()="Waiting for your wallet signature..."]').then(() => {
            metamask.sign();
        });

        await page.waitForXPath(`//h4[text()="You created ${nft.Name}!"]`).then(() => {
            console.log(chalk.green(`${nft.Name} minted`));
            console.log(nft);
            console.log();
        });

        if (nft.Price !== '') {
            await tabs[1].bringToFront()

            let orderPrice = nft.Price.replace(',', '.');

            await page.click('i[aria-label="Close"]');

            await page.waitForXPath("//a[contains(text(), 'Sell')]").then(async () => {
                await sellNft(page, metamask, orderPrice);
            });

        }

    }

    await closeReadLine();
    await browser.close();
})();
