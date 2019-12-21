import { drive_v3, google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client'
import { Credentials } from 'google-auth-library/build/src/auth/credentials'
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
    public readonly drive!: Drive
    private readonly authClient!: OAuth2Client

    constructor(creds: OAuthClientSettings) {
        const { client_secret, client_id, redirect_uris } = creds.installed
        this.authClient = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

        this.drive = google.drive({ version: 'v3', auth: this.authClient })
    }

    private _rootFolderId: string | void

    get rootFolderId(): string {
        if (typeof this._rootFolderId === 'string') return this._rootFolderId
        throw TypeError('Root folder id should be initialized before using')
    }

    set rootFolderId(folderId: string) {
        this._rootFolderId = folderId
    }

    setCredentials(credentials: Credentials) {
        this.authClient.setCredentials(credentials)
    }

    getNewAuthUrl() {
        return this.authClient.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        })
    }

    async getCredentialsByCode(code: string): Promise<Credentials> {
        const credsResponse = await this.authClient.getToken(code)
        this.authClient.setCredentials(credsResponse.tokens)
        return credsResponse.tokens
        // this.authClient.setCredentials(creds);
    }

    async checkOperational(): Promise<boolean> {
        const fileMeta = {
            name: 'SERVICE OPERATIONAL INDICATOR'
        }
        const media = {
            mimeType: 'text/plain',
            body: 'Этот файл нужно удалить руками, раз сам не удалился :('
        }

        const response = await this.drive.files.create({
            requestBody: fileMeta,
            media,
            fields: 'id'
        })

        await this.drive.files.get({ fileId: response.data.id })
        await this.drive.files.delete({
            fileId: response.data.id
        })

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
