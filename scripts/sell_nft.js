const chalk = require('chalk');
const dappeteer = require('@chainsafe/dappeteer')
const puppeteer = require('puppeteer');

const {prompt, closeReadLine} = require('./io')
const {chooseNetwork, getOpenSeaUrl} = require('./networks')
const {setupMetamask, connectWallet} = require('./metamask');


async function sellNft(browser, page, metamask, nftUrl, orderPrice) {
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

    await page.waitForXPath('//a[text()="View Item"]');
}

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

    await closeReadLine();

    let completedOrders = 0;
    let attempt = 1;

    while (numberOfOrders !== completedOrders) {
        console.log();
        console.log(chalk.red(`Попытка ${attempt}`));
        attempt++;

        const browser = await dappeteer.launch(puppeteer, {
            executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome', metamaskVersion: 'v10.1.1'
        });

        const metamask = await setupMetamask(browser, secretPhase, network);

        const page = await browser.newPage();
        await page.goto(openSeaUrl);

        const firstTabs = await browser.pages();
        await firstTabs[0].close();

        await connectWallet(page, metamask);

        let errors = 0;
        while (errors < 5) {
            if (completedOrders === numberOfOrders) {
                break;
            }

            await sellNft(browser, page, metamask, nftUrl, orderPrice).then(() => {
                console.log(`Ордер размещен ${completedOrders}`);
                completedOrders++;
                errors = 0;
            }).catch((error) => {
                errors++;
                console.log(chalk.red(`Ошибка размещения ордера ${error}`));
            });
        }

        await browser.close();
    }

    console.log();
    console.log(chalk.green(`Всего размещено ${completedOrders} ордеров`));
})();
