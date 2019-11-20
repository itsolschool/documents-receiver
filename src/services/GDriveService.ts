import { drive_v3, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client';
import { Credentials } from 'google-auth-library/build/src/auth/credentials';
import Drive = drive_v3.Drive;

export { Credentials };
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.appdata'];

export type OAuthClientSettings = {
    installed: {
        client_id: string;
        project_id: string;
        auth_uri: string;
        token_uri: string;
        auth_provider_x509_cert_url: string;
        client_secret: string;
        redirect_uris: string[];
    };
};

export default class GDriveService {
    private authClient!: OAuth2Client;

    private drive!: Drive;

    constructor(creds: OAuthClientSettings) {
        const { client_secret, client_id, redirect_uris } = creds.installed;
        this.authClient = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        this.drive = google.drive({ version: 'v3', auth: this.authClient });
    }

    setCredentials(credentials: Credentials) {
        this.authClient.setCredentials(credentials);
    }

    getNewAuthUrl() {
        return this.authClient.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
    }

    async getCredentialsByCode(code: string): Promise<Credentials> {
        const credsResponse = await this.authClient.getToken(code);
        this.authClient.setCredentials(credsResponse.tokens);
        return credsResponse.tokens;
        // this.authClient.setCredentials(creds);
    }

    async checkOperational(): Promise<boolean> {
        const fileMeta = {
            name: 'tester.txt',
            parents: ['appDataFolder']
        };
        const media = {
            mimeType: 'text/plain'
        };

        const response = await this.drive.files.create({
            requestBody: fileMeta,
            media,
            fields: 'id'
        });
        console.log(response);

        await this.drive.files.delete({
            fileId: response.data.id
        });

        return true;
    }
}
