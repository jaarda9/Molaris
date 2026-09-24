import 'dotenv/config';
import http from 'http';
import path from 'path';
import { createApp } from './src/app.js';
import { AUTH_ENABLED } from './src/middleware/auth.js';
import { getPatientRepository } from './src/repositories/patients.js';
import { DEFAULT_DB_FILE, getDb } from './src/db/connection.js';
import { scheduleDailyBackups } from './src/db/backup.js';

const PORT = Number(process.env.PORT) || 3000;

// Patient data stays on this PC unless the clinic deliberately opens it to its network
// (HOST=0.0.0.0, e.g. a reception PC) — and that is only allowed with a password.
const LOOPBACK = '127.0.0.1';
let host = process.env.HOST || LOOPBACK;
if (host !== LOOPBACK && host !== 'localhost' && !AUTH_ENABLED) {
  console.warn(
    `[SECURITY] HOST=${host} would expose every patient record to the network without a password. ` +
    'Set a real APP_PASSWORD in .env to share the app on the clinic network. Listening on this PC only.'
  );
  host = LOOPBACK;
}

// Open the database (and run migrations / legacy JSON import) before accepting requests.
getPatientRepository();

// Daily copy next to the database (data/backups/ by default), 30 days kept.
const dbFile = process.env.MOLARIS_DB_FILE || DEFAULT_DB_FILE;
if (dbFile !== ':memory:') scheduleDailyBackups(getDb(), path.join(path.dirname(dbFile), 'backups'));

http.createServer(createApp()).listen(PORT, host, () => {
  const where = host === LOOPBACK || host === 'localhost' ? 'this PC only' : `network (${host}), password required`;
  console.log(`[M.O.L.A.R.I.S] online at http://localhost:${PORT} (${where})`);
});
