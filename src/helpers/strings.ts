import lodash from 'lodash'
import format from 'string-template'
import { GREEN_MARK, RED_CROSS, WHITE_QUESTION_MARK } from '../const/emojies'

type TemplateProcessor = (values?: { [key: string]: string }) => string
type InstrumentedStringTree<T> = {
    [P in keyof T]: T[P] extends string ? TemplateProcessor : InstrumentedStringTree<T[P]>
}

type StringTree = {
    [key: string]: string | StringTree
}

function instrumentWithVars<T extends StringTree>(src: T) {
    let result = {}

    for (let key of Object.keys(src)) {
        const source = src[key]

        if (typeof source === 'string') {
            result[key] = (data?: { [key: string]: string }) => {
                if (key.endsWith('__html')) {
                    data = lodash.mapValues(data, (val) => lodash.escape(val))
                }

                return format(source || key, data)
            }
        } else {
            result[key] = instrumentWithVars(source)
        }
    }

    return result as InstrumentedStringTree<T>
}

const strings = {
    system: {
        accessDenied: 'Я не знаю такую команду...'
    },
    referral: {
        referralRequired: `Привет! Я - бот ШИР для отправки документов. Я работаю только по реферралам. Да, вот такой я плохой`,
        wrongToken: `Привет! Прости, но кажется у тебя битая ссылка. Попроси ссылочку ещё раз и попробуй снова!`,

        teamIsOvercrowded: `Привет! Прости, но команда {team} уже имеет полный состав - {count} человек.
        
Ты можешь попросить администратора увеличить состав команды`,

        askName: `
Привет!
Для того, чтобы войти в команду {team} укажи свои имя и фамилию:`,
        final: `Как прикажете, ваше превосходительство, {name} 😁
Теперь ты в команде {team}!`,
        doubt: `
Прости, я сомневаюсь, что тебя так зовут. Попробуй ещё раз.`,
        restricted: 'Ю шел нот пас!.. пока не скажешь как тебя звоут'
    },
    main: {
        admin: `Можно создавать команды.
        
/cancel - всегда вернёт в главное меню`,
        user: `Твоя команда - {team}
Ты можешь загрузить новые документы, или перезагрузить старые.

/cancel - всегда вернёт в главное меню`,
        btns: {
            addTeam: 'Создать команду',
            gdriveHealthcheck: 'Состояние GDrive',
            uploadDocuments: 'Загрузить документ',
            uploadedFiles: 'Загруженные документы'
        }
    },
    gdrive: {
        shareDir__html: `В файле general.json указан id папки. Предоставьте к ней доступ:\n<code>{email}</code>`,
        btns: {
            openDirLink: `Открыть папку браузере`
        }
    },
    init: {
        trello: {
            spawnListName: 'TEAM SPAWN',
            cardName: 'Инструкция по боту',
            // TODO тут обязательно должен быть контакт админа или разраба
            cardDesc: `
В эту колонку будут закидываться карточки новых команд, зарегистрированных через бота.

Правила такие:
- Можно: перемещать и архивировать карточки, изменять их названия.
- Нельзя: удалять карточки и изменять подкреплённые документы. Удалять эту колонку.

Если будут баги - связывайтесь с разработчиком. Сейчас это @BANOnotIT.
`
        }
    },
    addTeam: {
        askName: 'Введите название команды',
        nameNotUniq: 'Простите, команда с таким названием уже есть... Попробуйте другое название',
        askSchool: 'Введите школу',
        confirm__html: 'Команда <b>{name}</b>\nШкола <b>{school}</b>\n\nВсё правильно? (нажмите кнопку)',
        confirmYes: 'Да',
        confirmNo: 'Нет. Хочу поправить',
        retry: 'Хорошо, попробуем ещё раз!',
        result: '{trello} Trello\n{gdrive} GDrive\n\n{errors}',
        link: 'Ссылка для команды:\n{link}'
    },
    uploadDocument: {
        askTeam: 'От имени какой команды надо загрузить?',
        teamChosen__html: 'От имени команды <i>{team}</i>',
        askMilestone: `Какой файл ты хочешь загрузить?`,
        milestoneChosen__html: `Ну хорошо. Значит загружаем <i>{milestone}</i>`,
        askDocument: `А теперь давай мне файл
      
Принимаются:
- ссылки на Google Документы
- ссылки на файл на Google Диске
- презентации (.pptx)
- документы (.docx)
- таблицы (.xlsx)
- PDF файлы`,
        noAccessToLink: 'Я не смог получить файл по этой ссылке. Расшарь ссылку на чтение, позязя',
        noLinkFound: 'Это не ссылка на Google Диск или Документ. А мне нужна либо ссылка на файл, либо сам файл',

        // TODO возможно люди не поймут что такое презентации. Узнать понимают ли они расширения файлов.
        wrongFileType: `Я не могу загружать файлы в этом формате. Я могу только в PDF, документы и презентации. Переведи в другой формат и попробуй ещё разок`,
        uploadProgress: `${WHITE_QUESTION_MARK} Загружаю документ...`,
        errorUploading: `${RED_CROSS} К сожалению произошла ошибка.\nПопробуй загрузить документ попозже`,
        successUploading__html: `
${GREEN_MARK} Я загрузил: <i>{documentTitle}</i>.

Можешь посмотреть <a href="{folderLink}">остальные файлы</a>
`
    },
    feedback: {
        ask: 'Так-с... Я правильно всё сделал? Расскажи всё моему Создателю - он попросил)',
        btn: 'Дать фидбек'
    },
    errors: {
        notText: 'К сожалению, я не понимаю. Введите значение текстом'
    }
}

export default instrumentWithVars(strings)
