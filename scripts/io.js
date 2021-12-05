const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function prompt(question) {
    return await new Promise(resolve => {
        rl.question(question, resolve)
    });
}

async function closeReadLine() {
    rl.close()
}

module.exports = {
    prompt,
    closeReadLine
}
