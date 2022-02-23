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

    for (let i = 0; i < 999; i++) {
        const browser = await dappeteer.launch(puppeteer, {
            executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
            metamaskVersion: 'v10.1.1'
        })

        const metamask = await dappeteer.setupMetamask(browser, {
            seed: secretPhase
        })

        if (network === '2') {
            await metamask.switchNetwork('rinkeby');
        }

        const page = await browser.newPage()
        await page.setDefaultNavigationTimeout(0)
        // await page.setDefaultTimeout(10000)
        await page.goto(openSeaUrl)

        await page.waitForTimeout(1000)

        await connectWallet(page, metamask);

        const tabs = await browser.pages();
        await tabs[2].bringToFront();

        await page.goto(`${openSeaUrl}/account`);
        await page.waitForXPath('//span[(text()="Migrate listings")]')
        const migrateButton = await page.$x("//span[contains(text(), 'Migrate listings')]")
        await migrateButton[0].click()
            .then(() => page.waitForTimeout(2500)
                .then(() => metamask.sign()
                    .then(() => tabs[2].bringToFront()).catch((error) => {
                        console.log(error.toString())
                    })))

        await page.waitForTimeout(1000);

        await page.evaluate(_ => {
            window.scrollBy(0, window.innerHeight);
        });

        await page.waitForTimeout(5000);

        await page.waitForXPath("//button[contains(text(), 'Confirm')]")

        const confirmButton = await page.$x("//button[contains(text(), 'Confirm')]")
            .catch((error) => {
                console.log(error.toString())
            })

        console.log(`Найдено записей: ${confirmButton.length}`)

        let idx = 99;

        if (confirmButton.length < idx) {
            idx = confirmButton.length
        }

        if (idx === 0) {
            await browser.close();
            break;
        }

        for (let j = 0; j < idx; j++) {
            await confirmButton[j]
                .click()
                .then(() => page.waitForTimeout(2000)
                    .then(() => metamask.sign()
                        .then(() => tabs[2].bringToFront())
                        .catch((error) => {
                            console.log(error.toString())
                            tabs[2].bringToFront()
                        })))
        }

        await browser.close();
    }
})();
