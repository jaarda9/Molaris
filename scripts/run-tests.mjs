// Finds every *.test.ts under src/ and runs them with node's test runner.
// (Node 20's --test does not expand globs itself, and listing files in
// package.json would make every new test a merge conflict.)
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function findTests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return findTests(full);
    return entry.name.endsWith('.test.ts') ? [full] : [];
  });
}

const files = findTests('src').sort();
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
