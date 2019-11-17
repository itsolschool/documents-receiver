import { Model } from 'objection';
import Team from './Team';

export default class Document extends Model {
    documentId!: number;
    team!: Team;
    milestone!: number;
    trelloAttachmentId!: string;
    gdriveFileId!: string;
    teamId!: number;

    static tableName = 'documents';
    static idColumn = 'documentId';

    static jsonSchema = {
        type: 'object',
        required: ['milestone', 'gdriveFileId', 'trelloAttachmentId', 'teamId'],
        properties: {
            teamId: {
                type: 'integer'
            },
            milestone: {
                type: 'integer'
            },
            trelloAttachmentId: {
                type: 'string'
            },
            gdriveFileId: {
                type: 'string'
            },
            attachedTime: {
                type: 'date'
            }
        }
    };

    static get relationMappings() {
        const Team = require('./Team').default;
        return {
            team: {
                modelClass: Team,
                relation: Model.BelongsToOneRelation,
                join: {
                    from: 'documents.teamId',
                    to: 'teams.teamId'
                }
            }
        };
    }
}
