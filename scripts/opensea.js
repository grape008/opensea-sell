const chalk = require("chalk");
const fs = require('fs');


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


const uploadImage = async (page, file) => {
    const elementHandle = await page.$("#media");
    await elementHandle.uploadFile(file);
}

async function mintNft(page, metamask, nft, network) {
    if (fs.existsSync(`./assets/${nft.Name}.jpg`)) {
        await uploadImage(page, `./assets/${nft.Name}.jpg`);
    } else {
        await uploadImage(page, `./assets/${nft.Name}.png`);
    }

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

    await page.waitForXPath('//h4[text()="Waiting for your wallet signature..."]').then(() => {
        metamask.sign();
    });

    await page.waitForXPath(`//h4[text()="You created ${nft.Name}!"]`).then(() => {
        console.log(chalk.green(`${nft.Name} minted`));

        const url = page.url()
        const urlArray = url.split('/');

        nft.AssetUrl = url;
        nft.AssetToken = urlArray.pop();
        nft.AssetContract = urlArray.pop()
    });

    return nft;
}

module.exports = {
    sellNft,
    mintNft
}
