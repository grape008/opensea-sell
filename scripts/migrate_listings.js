const chalk = require('chalk');
const dappeteer = require('@chainsafe/dappeteer')
const puppeteer = require('puppeteer');

const {prompt, closeReadLine} = require('./io')
const {chooseNetwork, getOpenSeaUrl} = require('./networks')
const {connectWallet} = require('./metamask');

(async () => {
    const network = await chooseNetwork();
    const openSeaUrl = await getOpenSeaUrl(network);
    const secretPhase = await prompt(chalk.red('MetaMask Secret Phrase: '));

    await closeReadLine();

    const browser = await dappeteer.launch(puppeteer, {
        executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
        metamaskVersion: 'v10.1.1',
        timeout: 5000
    })

    const metamask = await dappeteer.setupMetamask(browser, {
        seed: secretPhase
    })

    if (network === '2') {
        await metamask.switchNetwork('rinkeby');
    }

    const page = await browser.newPage()
    await page.setDefaultNavigationTimeout(5000)
    await page.setDefaultTimeout(5000)
    await page.goto(openSeaUrl)

    await page.waitForTimeout(1000)

    await connectWallet(page, metamask);

    const tabs = await browser.pages();
    await tabs[2].bringToFront();

    await page.goto(`${openSeaUrl}/account`);
    await page.waitForXPath('//span[(text()="Migrate listings")]')
    const migrateButton = await page.$x("//span[contains(text(), 'Migrate listings')]")
    await migrateButton[0].click()
        .then(() => page.waitForTimeout(1000)
            .then(() => metamask.sign()
                .then(() => tabs[2].bringToFront())))


    for (let i = 0; i < 999; i++) {
        await page.waitForXPath('//button[(text()="Confirm")]')

        const confirmButton = await page.$x("//button[contains(text(), 'Confirm')]")

        for (let j = 0; j < 9; j++) {
            await confirmButton[j]
                .click()
                .then(() => page.waitForTimeout(1000)
                    .then(() => metamask.sign()
                        .then(() => tabs[2].bringToFront())
                        .catch((error) => {
                            console.log(error.toString())
                            tabs[2].bringToFront()
                        })))
        }

        await page.goto(`${openSeaUrl}/account`)
        await page.waitForXPath('//span[(text()="Migrate listings")]')
            .then(async () => {
                const migrateButton = await page.$x("//span[contains(text(), 'Migrate listings')]")
                await migrateButton[0].click()
            })

    }


    await browser.close();
})();
