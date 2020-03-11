const config = require('config')
const Telegram = require('telegraf').Telegram
const Markup = require('telegraf').Markup

const bot = new Telegram(config.telegram.token)

const idsNames = [
    [
        666666666,
        'Some Name'
    ]
]

const message = `
Доброе дня

Прошли первые приёмки. Через меня загрузили первые документы. Правда не всегда удачно. В общем прошло первое тестирование и оказалось, что лапищи у Создателя не так мощны как хотелось бы 🙁

В тестировании очень важен фидбек. Я хочу стать лучше и ты можешь помочь. Заполони формочку для фидбека и Создатель поймёт, как сделать меня удобнее
`
const markup = Markup.inlineKeyboard([Markup.urlButton('Открыть форму', 'https://forms.gle/LgQ9H13rNfTaxqCQ6')])

;(async () => {
    console.log(idsNames)
    for (let i = 0; i < idsNames.length; i++) {
        const [id, fullName] = idsNames[i]
        console.log(`sending message to ${fullName}`)

        await bot.sendSticker(id, 'CAACAgIAAxkBAAIDSl5QVxu6wJvdeM6TfOsGOv_76IJjAAKIAAMWQmsKW_Cgofh5AAElGAQ')
        await bot.sendMessage(id, message, markup.extra())

        await wait(300)
    }
})()

function wait(n) {
    return new Promise(res => setTimeout(res, n))
}
