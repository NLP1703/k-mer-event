#!/usr/bin/env node
// Generate a cryptographically strong secret suitable for JWT_SECRET.
//   node scripts/generate-secret.js          -> prints a secret
//   node scripts/generate-secret.js --write   -> also writes/updates backend/.env
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const secret = crypto.randomBytes(48).toString('hex'); // 96 hex chars
const refresh = crypto.randomBytes(48).toString('hex');

const shouldWrite = process.argv.includes('--write');

if (!shouldWrite) {
  console.log('\nGenerated secrets (copy into backend/.env):\n');
  console.log(`JWT_SECRET=${secret}`);
  console.log(`JWT_REFRESH_SECRET=${refresh}\n`);
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

const upsert = (body, key, value) => {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  return re.test(body) ? body.replace(re, line) : `${body.trimEnd()}\n${line}\n`;
};

content = upsert(content, 'JWT_SECRET', secret);
content = upsert(content, 'JWT_REFRESH_SECRET', refresh);
fs.writeFileSync(envPath, content);
console.log(`✅ Wrote JWT_SECRET and JWT_REFRESH_SECRET to ${envPath}`);
