const chalk = require("chalk");
const colorize = require('json-colorizer');
const dappeteer = require('@chainsafe/dappeteer')
const readline = require('readline');
const puppeteer = require('puppeteer');

let openSeaUrl = 'https://opensea.io/';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function prompt(question) {
    return await new Promise(resolve => {
        rl.question(question, resolve)
    });
}

(async () => {
    console.log(colorize({
        "1": "Mainnet",
        "2": "Rinkeby"
    }, {
        colors: {STRING_KEY: 'red'},
        pretty: true
    }));

    console.log();

    let network = '';
    do {
        network = await prompt(chalk.red('Cеть: '));
    } while (!network.match(/^(1|2)$/));


    console.log();
    const secretPhase = await prompt(chalk.red(`MetaMask Secret Phrase: `));
    const nftUrl = await prompt(chalk.red(`NFT Url: `));
    console.log();

    let numberOfOrders = ''
    do {
        numberOfOrders = await prompt(chalk.green("Количество ордеров: "));
    } while (numberOfOrders.match("\d+"))

    numberOfOrders = parseInt(numberOfOrders);

    let orderPrice = ''
    do {
        orderPrice = await prompt(chalk.green("Цена: "));
    } while (orderPrice.match("\d+"))

    const browser = await dappeteer.launch(puppeteer, {metamaskVersion: 'v10.1.1'});
    const metamask = await dappeteer.setupMetamask(browser, {seed: secretPhase});

    if (network === '2') {
        await metamask.switchNetwork('rinkeby');
        openSeaUrl = 'https://testnets.opensea.io/';
    }

    const page = await browser.newPage();
    await page.goto(openSeaUrl);

    const firstTabs = await browser.pages();
    await firstTabs[0].close();

    await page.waitForSelector("i[title='Open menu']");
    await page.click("i[title='Open menu']");

    await page.waitForXPath('//button[(text()="Connect wallet")]');
    const connectWalletButton = await page.$x("//button[contains(text(), 'Connect wallet')]");
    await connectWalletButton[0].click();

    await page.waitForXPath('//span[(text()="MetaMask")]');
    const metaMaskWalletButton = await page.$x("//span[contains(text(), 'MetaMask')]");
    await metaMaskWalletButton[0].click();

    await metamask.approve();

    await page.waitForTimeout(3000);

    let completedOrders = 0;
    let uncompletedOrders = 0;

    for (let i = 0; i < numberOfOrders; i++) {
        const tabs = await browser.pages();

        await tabs[1].bringToFront()
        await tabs[1].goto(nftUrl + '/sell')

        await page.focus('input[name="price"]')
        await page.keyboard.type(orderPrice)
        await page.click('button[type="submit"]');

        await page.waitForXPath('//p[text()="Waiting for signature..."]').then(() => {
            metamask.sign();
        });

        await page.waitForXPath('//a[text()="View Item"]').then(() => {
            console.log(`Ордер ${i} размещен`);
            completedOrders++;
        }).catch(() => {
            console.log(chalk.red(`Ошибка размещения ордера ${i}`));
            uncompletedOrders++;
        });
    }

    console.log();
    console.log(chalk.green(`Всего размещено ${completedOrders} ордеров`));
    console.log(chalk.red(`Не удалось разместить ${uncompletedOrders} ордеров`));

    rl.close()
    await browser.close();
})();
