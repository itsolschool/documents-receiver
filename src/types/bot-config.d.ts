import { JWTInput } from 'google-auth-library/build/src/auth/credentials'

declare module 'bot-config' {
    export type BotConfig = {
        /**
         * Масств названий всех документов по порядку, которые должна предоставить команда.
         *  TODO убрать это в бд.
         */
        milestones: string[]
        upload: {
            /**
             * {@link https://ru.wikipedia.org/wiki/Список_MIME-типов|Все MIME} типы файлов, которые может сохранять бот.
             */
            allowedMIMEs: string[]
            /**
             * Маска имени файла, при сохранении на GDrive.
             *
             * @param milestoneNum Номер документа по порядку из {@link milestones}, начиная с 1
             * @param milestoneTitle Название документа из {@link milestones}
             * @param versionNumber Номер версии файла
             */
            fileMask: string
        }
        server: {
            /**
             * Порт, на котором должен слушать webhook
             */
            port: number
        }
        telegram: {
            /**
             * Если установлен, например `http://domain.com/path`, то зарегистрирует этот вебхук у телеграма
             и запустит локальный http сервер на порту {@link server.port} с прослушкой на `/path`.
             * Если не установлен, то будет использоваться Longpoll
             */
            webhook: null | string
            /**
             * Bot API token для телеграма. Получить можно у https://t.me/BotFather.
             */
            token: string
        }
        gdrive: {
            /**
             * id папки, которую расшарили с ботом
             */
            rootDirId: string
            /**
             * Данные сервисного аккаунта, которые можно получить по инструкции `docs/connect_gdrive.adoc`
             */
            serviceAccount: JWTInput
        }
        trello: {
            /**
             * Id доски, где будет создана колонка "Spawn Teams". Можно получить вставив id из короткой ссылки на доску в метод
             https://developers.trello.com/reference#boardsboardid-1[/boards/id].
             */
            boardId: string
            /**
             * Пара `<api key>:<token>`. Api key можно https://trello.com/app-key[получить в devtools].
             Token можно сгенерировать там же, ссылкой ниже. Если не установлено, то старается брать это значени из бд.
             */
            'appKey:token': string
        }
        sentry?: {
            /**
             * DSN адрес из
             * {@link https://docs.sentry.io/error-reporting/quickstart/?platform=node#configure-the-sdk|документации к Sentry}.
             */
            dsn: string
        }
        /**
         * URL к Redis. Если установлено, то все сессии хранятся там,
         если не установлено, то в памяти процесса.
         */
        redis?: string
    }
}
