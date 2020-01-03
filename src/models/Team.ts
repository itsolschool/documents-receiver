import { Model } from 'objection'
import crypto from 'crypto'
import User from './User'
import Document from './Document'

export default class Team extends Model {
    static tableName = 'teams'
    static idColumn = 'teamId'
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
                type: ['string', 'null']
            },
            gdriveFolderId: {
                type: ['string', 'null']
            },
            inviteToken: {
                type: ['string', 'null'],
                maxLength: 10,
                minLength: 10
            },
            isAdmin: {
                type: 'boolean'
            }
        }
    }

    capacity!: number
    name!: string
    schoolName!: string
    trelloCardId: string | null
    gdriveFolderId: string | null
    members!: User[]
    documents!: Document[]
    inviteToken: string | null
    isAdmin: boolean

    static get relationMappings() {
        const User = require('./User').default
        const Document = require('./Document').default
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
        }
    }

    get represent(): string {
        return `${this.name}. ${this.schoolName}`
    }

    setNewInviteToken() {
        const sha1 = crypto.createHash('sha256')
        const result = sha1.update(`&^qast^${this.name}  ${new Date()}--${this.schoolName}`).digest('hex')
        this.inviteToken = result.slice(0, 10)
    }
}
