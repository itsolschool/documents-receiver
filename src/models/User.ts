import { Model } from 'objection';
import Team from './Team';

export class User extends Model {
    tgId!: number;
    fullName!: string;

    static tableName = 'bot_users';
    static idColumn = 'tgId';

    static jsonSchema = {
        type: 'object',
        required: ['tgId', 'full_name'],
        properties: {
            tgId: { type: 'integer' },
            full_name: { type: 'string' }
        }
    };

    static relationMappings = {
        group: {
            relation: Model.BelongsToOneRelation,
            modelClass: Team,
            join: {
                from: 'bot_users.teamId',
                to: 'teams.id'
            }
        }
    };
}
