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

    await closeReadLine();

    const browser = await dappeteer.launch(puppeteer, {
        executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
        metamaskVersion: 'v10.1.1',
        headless: false,
        timeout: 90000
    });

    const metamask = await dappeteer.setupMetamask(browser, {seed: secretPhase});

    if (network === '2') {
        await metamask.switchNetwork('rinkeby');
    }

    const page = await browser.newPage();
    await page.bringToFront()
    await page.setDefaultNavigationTimeout(0);
    await page.goto(openSeaUrl);

    await page.waitForTimeout(1000)

    await connectWallet(page, metamask);

    await page.waitForTimeout(1000)

    const tabs = await browser.pages();
    await tabs[0].close();

    await page.goto(`${openSeaUrl}/account`);
    await page.waitForXPath('//span[(text()="Migrate listings")]')
    const migrateButton = await page.$x("//span[contains(text(), 'Migrate listings')]")
    await migrateButton[0].click();

    await page.waitForTimeout(3000)
    await metamask.sign()

    await page.waitForTimeout(3000)

    await page.waitForXPath('//button[(text()="Confirm")]').then(async () => {
        const confirmButton = await page.$x("//button[contains(text(), 'Confirm')]");

        confirmButton.forEach((btn) => {
            btn.click()
            metamask.sign()
        })

    })

    // await browser.close();
})();
