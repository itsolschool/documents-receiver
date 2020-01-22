import { Model } from 'objection'

export default class AppVar extends Model {
    static tableName = 'app_vars'
    static idColumn = 'key'

    key!: string
    value!: string

    static jsonSchema = {
        type: 'object',
        required: ['key', 'value'],
        properties: {
            key: { type: 'string' },
            value: { type: 'string' }
        }
    }
}

export enum APP_VAR_KEYS {
    TRELLO_SPAWN_LIST_ID = 'TRELLO/spawnListId'
}
