import { Model } from 'objection';
import Team from './Team';

export default class User extends Model {
    tgId!: number;
    fullName!: string;
    teamId!: number;
    team!: Team;

    static tableName = 'bot_users';
    static idColumn = 'tgId';

    static jsonSchema = {
        type: 'object',
        required: ['tgId', 'fullName', 'teamId'],
        properties: {
            tgId: { type: 'integer' },
            fullName: { type: 'string' },
            teamId: { type: 'integer' }
        }
    };

    static relationMappings = {
        team: {
            relation: Model.BelongsToOneRelation,
            modelClass: Team,
            join: {
                from: 'bot_users.teamId',
                to: 'teams.teamId'
            }
        }
    };
}
