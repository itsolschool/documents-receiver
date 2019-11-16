import { Model } from 'objection';
import Team from './Team';

export default class Document extends Model {
    documentId!: number;
    ownerTeam!: Team;
    milestone!: number;
    trelloAttachmentId!: string;
    gdriveFileId!: string;

    static tableName = 'documents';
    static idColumn = 'documentId';

    static jsonSchema = {
        type: 'object',
        required: ['milestone', 'gdriveFileId', 'trelloAttachmentId', 'ownerTeam'],
        properties: {
            ownerTeam: {
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
}
