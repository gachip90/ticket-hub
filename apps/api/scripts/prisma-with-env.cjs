const { resolve } = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../../../.env') });
dotenv.config();

const prismaCliPath = require.resolve('prisma/build/index.js');
const result = spawnSync(process.execPath, [prismaCliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
