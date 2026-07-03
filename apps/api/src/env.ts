import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

const candidatePaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(__dirname, '../../../.env'),
  resolve(__dirname, '../../.env'),
];

for (const path of candidatePaths) {
  if (!existsSync(path)) {
    continue;
  }

  config({ path, quiet: true });

  if (process.env.DATABASE_URL) {
    break;
  }
}

config({ quiet: true });
