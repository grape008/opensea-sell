const wait = interval => new Promise(resolve => setTimeout(resolve, interval));

async function retry(
    fn,
    args,
    retriesLeft = 3,
    interval = 1000,
) {
    try {
        return await fn(...args);
    } catch (error) {
        await wait(interval);
        if (retriesLeft === 0) {
            throw new Error(error);
        }
        return retry(fn, args, --retriesLeft, interval);
    }
}


module.exports = {
    retry
}
