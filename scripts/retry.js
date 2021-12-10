const wait = interval => new Promise(resolve => setTimeout(resolve, interval));

async function retry(
    fn,
    args,
    retriesLeft = 3,
    interval = 3000,
) {
    try {
        return await fn(...args);
    } catch (error) {
        console.log("Ошибка вызова. Повтор.");
        
        const timeout = (3 - retriesLeft + 1) * interval;
        await wait(timeout);

        if (retriesLeft === 0) {
            throw new Error(error);
        }
        return retry(fn, args, --retriesLeft, interval);
    }
}


module.exports = {
    retry
}
