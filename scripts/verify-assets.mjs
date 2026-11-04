// Verify that every imported asset is unchanged and all literal media references exist.
// Optional argument: packaged app/game directory; otherwise verifies the source repo.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = process.argv[2] ? path.resolve(process.argv[2]) : repo;
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'assets/original-manifest.json')));
for (const entry of manifest) {
  const data = fs.readFileSync(path.join(root, entry.path));
  if (data.length !== entry.bytes || crypto.createHash('sha256').update(data).digest('hex') !== entry.sha256)
    throw new Error(`Asset changed: ${entry.path}`);
}
const src = fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root;
let references = 0;
for (const file of fs.readdirSync(src).filter(f => f.endsWith('.ow'))) {
  for (const match of fs.readFileSync(path.join(src, file), 'utf8').matchAll(/"(assets\/[^"\n]+\.(?:png|gif|webp|jpg|wav))"/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) throw new Error(`${file}: missing ${match[1]}`);
    references++;
  }
}
console.log(`PASS: ${manifest.length} original asset hashes and ${references} literal media references`);
