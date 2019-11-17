import { Model } from 'objection';
import crypto from 'crypto';
import User from './User';
import Document from './Document';

export default class Team extends Model {
    capacity!: number;
    name!: string;
    schoolName!: string;
    trelloCardId?: string;
    gdriveFolderId?: string;
    members!: User[];
    documents!: Document[];
    inviteToken?: string;
    isAdmin: boolean;

    setNewInviteToken() {
        const sha1 = crypto.createHash('sha256');
        const result = sha1.update(`&^qast^${this.name}  ${new Date()}--${this.schoolName}`).digest('hex');
        this.inviteToken = result.slice(0, 10);
    }

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
            },
            inviteToken: {
                type: 'string',
                maxLength: 10,
                minLength: 10
            },
            isAdmin: {
                type: 'boolean'
            }
        }
    };

    static get relationMappings() {
        const User = require('./User').default;
        const Document = require('./Document').default;
        return {
            members: {
                modelClass: User,
                relation: Model.HasManyRelation,
                join: {
                    from: 'teams.teamId',
                    to: 'bot_users.teamId'
                }
            },
            documents: {
                modelClass: Document,
                relation: Model.HasManyRelation,
                join: {
                    from: 'teams.teamId',
                    to: 'documents.teamId'
                }
            }
        };
    }
}
