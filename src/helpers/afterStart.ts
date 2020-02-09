import Team from '../models/Team'
import AppVar, { APP_VAR_KEYS } from '../models/AppVar'
import GDriveService from '../services/GDriveService'
import TrelloService from '../services/TrelloService'
import { __ } from './strings'
import { transaction } from 'objection'
import { captureException } from '@sentry/node'
import { BotConfig } from 'bot-config'
import Telegraf, { ContextMessageUpdate } from 'telegraf'

const debug = require('debug')('bot:after')

interface ServicesAndConfig {
    gdrive: GDriveService
    trello: TrelloService
    config: BotConfig
    bot: Telegraf<ContextMessageUpdate>
}

export default async (args: ServicesAndConfig) =>
    Promise.all([setupFirstTeam(args), checkGDrive(args), setupTrelloSpawnList(args)])

async function setupFirstTeam({ bot }: ServicesAndConfig) {
    let log = debug.extend('db')

    let team = await Team.query()
        .where('isAdmin', true)
        .first()

    if (!team) {
        team = new Team()
        team.setNewInviteToken()
        team.schoolName = 'croc'
        team.name = 'Администраторы'
        team.isAdmin = true

        await Team.query().insert(team)
        log("Org's team added.")
    }

    if (process.env.NODE_ENV === 'development') {
        let botInfo = await bot.telegram.getMe()
        console.log(`Orgs team invite link: https://t.me/${botInfo.username}?start=${team.inviteToken}`)
    }
}

async function checkGDrive({ gdrive, config }: ServicesAndConfig) {
    const log = debug.extend('gdrive')

    try {
        await gdrive.checkOperational()
        log('GDrive operational.')
    } catch (e) {
        log('GDrive is not operational')
        captureException(e)
    }
}

async function setupTrelloSpawnList({ trello, config }: ServicesAndConfig) {
    const log = debug.extend('trello')

    const spawnListAlreadyExists = await hasSpawnList({ trello })

    if (spawnListAlreadyExists) {
        log('Trello Spawn List found.')
        trello.spawnListId = (await AppVar.query().findById(APP_VAR_KEYS.TRELLO_SPAWN_LIST_ID)).value
        return
    }

    debug('Trello Spawn List not found. Creating new one...')

    const list = await trello.addList({
        idBoard: config.trello.boardId,
        name: __('init.trello.spawnListName'),
        pos: 'top'
    })

    await transaction(AppVar.knex(), async (tx) => {
        await AppVar.query(tx).deleteById(APP_VAR_KEYS.TRELLO_SPAWN_LIST_ID)

        await AppVar.query(tx).insert({
            key: APP_VAR_KEYS.TRELLO_SPAWN_LIST_ID,
            value: list.id
        })
    })

    debug('Creating help card...')
    await trello.addCard({
        name: __('init.trello.cardName'),
        idList: list.id,
        // @ts-ignore -- потому что в оригинальной библиотеке не завезли полные типы для API
        desc: __('init.trello.cardDesc')
    })

    debug('Trello Spawn List created: %j', list)
    trello.spawnListId = list.id

    return
}

async function hasSpawnList({ trello }: Partial<ServicesAndConfig>): Promise<boolean> {
    const listIdOrNull = await AppVar.query().findById(APP_VAR_KEYS.TRELLO_SPAWN_LIST_ID)
    if (!listIdOrNull) return false
    try {
        await trello.getList(listIdOrNull.value)
        return true
    } catch (e) {
        if (e.error === 'invalid id') return false
        throw e
    }
}
