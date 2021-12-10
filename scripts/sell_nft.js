const chalk = require('chalk');
const dappeteer = require('@chainsafe/dappeteer')
const puppeteer = require('puppeteer');

const {prompt, closeReadLine} = require('./io')
const {chooseNetwork, getOpenSeaUrl} = require('./networks')
const {setupMetamask, connectWallet} = require('./metamask');


(async () => {
    const network = await chooseNetwork();
    const openSeaUrl = await getOpenSeaUrl(network);
    const secretPhase = await prompt(chalk.red('MetaMask Secret Phrase: '));

    console.log();
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

    let completedOrders = 0;
    let uncompletedOrders = 0;

    for (let i = 0; i < numberOfOrders; i++) {
        const tabs = await browser.pages();

        await tabs[1].bringToFront()
        await tabs[1].goto(nftUrl + '/sell')

        await page.waitForSelector('input[name="price"]').then(async () => {
            await page.focus('input[name="price"]');
            await page.keyboard.type(orderPrice);

            await page.click('button[type="submit"]');
        });

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

    await closeReadLine();
    await browser.close();
})();
