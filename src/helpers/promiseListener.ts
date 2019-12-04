export default async function<T>(cb: (ar: T[]) => any | Promise<any>, promises: Promise<T>[]): Promise<Array<T>> {
    let result = new Array(promises.length).fill(undefined)

    let busy: Promise<any> | boolean = false

    function notify(force = false) {
        if (force)
            Promise.resolve(busy)
                .then(() => (busy = cb(result)))
                .then(() => (busy = false))
        else if (!busy) {
            busy = Promise.resolve(cb(result)).then(() => (busy = false))
        }
    }

    promises.forEach((p, i) => {
        const binded = bind(result, i)
        p.then(binded, binded).then(() => notify())
    })

    // notify();
    await Promise.all(promises)
    notify(true)

    return result
}

function bind(obj, i) {
    return (val) => {
        obj[i] = val
    }
}
