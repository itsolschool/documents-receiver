import { drive_v3, google } from 'googleapis'
import { Credentials, JWTInput } from 'google-auth-library/build/src/auth/credentials'
import { JWT } from 'google-auth-library/build/src/auth/jwtclient'
import Team from '../models/Team'
import { escape } from 'lodash'
import Drive = drive_v3.Drive
import Schema$File = drive_v3.Schema$File

export { Credentials }
export const GDRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'

const SCOPES = ['https://www.googleapis.com/auth/drive']

export type OAuthClientSettings = {
    installed: {
        client_id: string
        project_id: string
        auth_uri: string
        token_uri: string
        auth_provider_x509_cert_url: string
        client_secret: string
        redirect_uris: string[]
    }
}

export default class GDriveService {
    readonly drive: Drive
    readonly rootFolderId: string
    readonly authorized: Promise<true>
    private readonly _authClient: JWT

    constructor(creds: JWTInput, rootFolderId: string) {
        this.rootFolderId = rootFolderId

        this._authClient = new google.auth.JWT({
            scopes: SCOPES
        })
        this._authClient.fromJSON(creds)
        this.authorized = this._authClient.authorize().then(() => true)

        this.drive = google.drive({ version: 'v3', auth: this._authClient })
    }

    get serviceAccountEmail(): string {
        return this._authClient.email
    }

    getLinkForFile(fileId: string): string {
        return `https://drive.google.com/open?id=${fileId}`
    }

    async checkOperational(): Promise<true> {
        const {
            data: { mimeType, capabilities }
        } = await this.drive.files.get({ fileId: this.rootFolderId, fields: 'capabilities,mimeType' })

        console.assert(mimeType === GDRIVE_FOLDER_MIME, 'Provided rootDir is not a folder')
        console.assert(
            capabilities.canAddChildren && capabilities.canRemoveChildren,
            'Editor rights should be provided to Service Account'
        )

        return true
    }

    async createFolder(name: string, parents?: string[]): Promise<Schema$File> {
        const requestBody = { name, mimeType: GDRIVE_FOLDER_MIME, parents }

        const { data } = await this.drive.files.create({ requestBody })
        return data
    }

    async createFolderForTeam(team: Team): Promise<void> {
        const folder = await this.createFolder(escape(team.represent), [this.rootFolderId])
        await Team.query()
            .findById(team.$id())
            .patch({ gdriveFolderId: folder.id })
    }
}
