const dappeteer = require('@chainsafe/dappeteer')


async function setupMetamask(browser, secretPhase, network) {
    const metamask = await dappeteer.setupMetamask(browser, {seed: secretPhase});

    if (network === '2') {
        await metamask.switchNetwork('rinkeby');
    } else if (network === '3') {
        await metamask.addNetwork({
            networkName: 'Polygon Mainnet',
            rpc: 'https://polygon-rpc.com/',
            chainId: 137,
            symbol: 'MATIC',
            explorer: 'https://polygonscan.com/'
        })
    } else if (network === '4') {
        await metamask.addNetwork({
            networkName: 'Polygon Test Network',
            rpc: 'https://rpc-mumbai.maticvigil.com/',
            chainId: 80001,
            symbol: 'MATIC',
            explorer: 'https://mumbai.polygonscan.com/'
        })
    }

    return metamask;
}

async function connectWallet(page, metamask) {
    await page.waitForSelector("i[title='Open menu']");
    await page.click("i[title='Open menu']");

    await page.waitForXPath('//button[(text()="Connect wallet")]');
    const connectWalletButton = await page.$x("//button[contains(text(), 'Connect wallet')]");
    await connectWalletButton[0].click();

    await page.waitForXPath('//span[(text()="MetaMask")]').then(async () =>{
        const metaMaskWalletButton = await page.$x("//span[contains(text(), 'MetaMask')]");
        await metaMaskWalletButton[0].click();

        await metamask.approve();
    })

    await page.waitForTimeout(1000);
}

module.exports = {
    connectWallet,
    setupMetamask
}
