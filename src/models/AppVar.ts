import { Model } from 'objection';

export default class AppVar extends Model {
    static tableName = 'app_vars';
    static idColumn = 'key';

    key!: string;
    value!: string;

    static jsonSchema = {
        type: 'object',
        required: ['key', 'value'],
        properties: {
            key: { type: 'string' },
            value: { type: 'string' }
        }
    };
}

export const APP_TRELLO_TOKEN_KEY = 'APP_TRELLO_TOKEN_KEY';
export const APP_TRELLO_BASE_BOARD_ID = 'APP_TRELLO_BASE_BOARD_ID';
export const APP_TRELLO_BASE_LIST_ID = 'APP_TRELLO_BASE_IST_ID';

export const APP_GDRIVE_ACCESS_TOKEN = 'REDIS_ACCESS_TOKEN_KEY';
