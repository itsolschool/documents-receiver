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

export const APP_TRELLO_TOKEN_KEY = 'TRELLO_TOKEN_KEY';
export const APP_TRELLO_BASE_BOARD_ID = 'TRELLO_BASE_BOARD_ID';
export const APP_TRELLO_BASE_LIST_ID = 'TRELLO_BASE_LIST_ID';

export const APP_GDRIVE_ACCESS_TOKEN_KEY = 'GDRIVE_ACCESS_TOKEN_KEY';
export const APP_GDRIVE_BASE_DIR_ID = 'GDRIVE_BASE_DIR_ID';
