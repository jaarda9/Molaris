import 'dotenv/config';
import http from 'http';
import { createApp } from './src/app.js';
import { AUTH_ENABLED } from './src/middleware/auth.js';
import { getPatientRepository } from './src/repositories/patients.js';

const PORT = Number(process.env.PORT) || 3000;

if (!AUTH_ENABLED) {
  console.warn(
    '[SECURITY WARNING] APP_PASSWORD is not set (or is still "change_me") — ' +
    'M.O.L.A.R.I.S is running with NO authentication. Every patient record and ' +
    'endpoint is open to anyone who can reach this server. Set a real APP_PASSWORD ' +
    'in .env before exposing this beyond your own machine.'
  );
}

// Open the database (and run migrations / legacy JSON import) before accepting requests.
getPatientRepository();

http.createServer(createApp()).listen(PORT, '0.0.0.0', () => {
  console.log(`[M.O.L.A.R.I.S] online at http://localhost:${PORT}`);
});
