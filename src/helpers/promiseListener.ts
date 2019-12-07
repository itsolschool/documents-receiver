export default async function<T>(cb: (ar: T[]) => any | Promise<any>, promises: Promise<T>[]): Promise<Array<T>> {
    let result = new Array(promises.length).fill(undefined)

    let busy: Promise<any> | boolean = false

    function notify() {
        if (!busy) {
            busy = Promise.resolve(cb(result)).then(() => (busy = false))
        }
    }

    promises.forEach((p, i) => {
        const binded = bind(result, i)
        p.then(binded, binded).then(() => notify())
    })

    await Promise.all(promises)
    return result
}

function bind(obj, i) {
    return (val) => {
        obj[i] = val
    }
}
