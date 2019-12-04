import { Trello } from 'trello-helper'
import { TrelloRequest } from 'trello-helper/build/TrelloRequest'
import { RestPromise } from 'trello-helper/build/Interfaces'

interface AddBoardParams {
    name: string
    defaultLabels?: boolean
    defaultLists?: boolean
    desc?: string
    isOrganization?: string
    idBoardSource?: string
    keepFromSource?: 'none' | 'cards'
    powerUps?: 'all' | 'calendar' | 'cardAging' | 'recap' | 'voting'
    prefs_permissionLevel?: 'org' | 'private' /*default*/ | 'public'
    prefs_voting?: 'disabled' /*default*/ | 'members' | 'observers' | 'org' | 'public'
    prefs_comments?: 'disabled' | 'members' /*default*/ | 'observers' | 'org' | 'public'
    prefs_invitations?: 'members' /*default*/ | 'admins'
    prefs_selfJoin?: boolean
    prefs_cardCovers?: boolean
    prefs_background?: 'blue' /*default*/ | 'orange' | 'green' | 'red' | 'purple' | 'pink' | 'lime' | 'sky' | 'grey'
    prefs_cardAging?: 'regular' /*default*/ | 'pirate'
}

interface AddListParams {
    name: string
    idBoard: string
    idListSource?: string
    pos?: 'top' | 'bottom' | number
}

type ListFields = 'id' | 'name' | 'closed' | 'idBoard' | 'pos' | 'subscribed' | 'softLimit'

export default class TrelloService extends Trello {
    // Строка авторизации состоит из 2 частей:
    //   <key>:<token>
    constructor(auth?: string) {
        // Нужно чтобы эта штука не создавала лишних файлов и переменных окружения.
        //  Поэтому говорим ей, чтобы она не рыпалась что-то где-то сохранять.
        process.env.trelloHelper = '{"appKey":null,"token":null}'
        super({ useExistingEnvVar: true })
        process.env.trelloHelper = null

        if (auth) this.setCredentials(auth)
    }

    public setCredentials(auth: string) {
        const [key, token] = auth.split(':')
        const trelloRequest = new TrelloRequest({ key, token })
        // @ts-ignore -- потому что очень и очень плохо лезть в private поля базовых классов, но нам надо
        this.trelloRequest = trelloRequest
    }

    public async addBoard(params: AddBoardParams): RestPromise {
        return this.post({ options: params, path: TrelloService.getBoardPrefixWithId('') })
    }

    public async deleteBoard(idBoard: string): RestPromise {
        return this.delete({
            path: TrelloService.getBoardPrefixWithId(idBoard)
        })
    }

    public async addList(params: AddListParams): RestPromise {
        return this.post({
            options: params,
            path: TrelloService.getListPrefixWithId('')
        })
    }

    public async getList(listId: string, options?: any): RestPromise {
        return this.get({
            path: TrelloService.getListPrefixWithId(listId),
            options
        })
    }

    public async getListField(listId: string, field?: ListFields): RestPromise {
        return this.get({
            path: TrelloService.getListPrefixWithId(listId) + '/' + field
        })
    }

    public async deleteList(listId) {
        return this.delete({
            path: TrelloService.getListPrefixWithId(listId)
        })
    }

    public async checkOperational(): RestPromise {
        const board = await this.addBoard({
            name: 'BOT TEST <to delete>'
        })

        await this.addList({
            idBoard: board.id,
            name: 'test'
        })

        await this.deleteBoard(board.id)
    }
}
