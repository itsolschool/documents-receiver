import * as fs from 'fs';
import * as path from 'path';

const driveClientSecretPath = path.join(__dirname, '../config/gdrive_client_secret.json');


export const

    REDIS_URL = process.env.REDIS_URL,
    GDRIVE_CLIENT_SECRET = JSON.parse(fs.readFileSync(driveClientSecretPath, 'utf8'));
