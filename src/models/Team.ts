import { Model } from 'objection';

export default class Team extends Model {
    capacity!: number;
    name!: string;
    schoolName!: string;
    trelloCardId?: string;
    gdriveFolderId?: string;

    static tableName = 'teams';
    static idColumn = 'teamId';

    static jsonSchema = {
        type: 'object',
        required: ['capacity', 'name', 'schoolName'],
        properties: {
            teamId: {
                type: 'integer'
            },
            capacity: {
                type: 'integer',
                default: 5
            },
            name: {
                type: 'string'
            },
            schoolName: {
                type: 'string'
            },
            trelloCardId: {
                type: 'string'
            },
            gdriveFolderId: {
                type: 'string'
            }
        }
    };
}
