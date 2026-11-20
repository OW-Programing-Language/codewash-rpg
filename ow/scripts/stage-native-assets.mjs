/**
 * Asset staging for the native OW Graphics SPI's strict image sandbox.
 * It rejects ".." and absolute image paths, so assets in ../public/assets
 * must be copied INTO the ow/ root without changing the original files.
 *
 * Only literal, allowlisted references from NativeArtCatalog.ow are copied.
 * No remote downloads or binary blobs are committed to Git.
 */
import {readFileSync, mkdirSync, copyFileSync, existsSync, statSync} from 'node:fs';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const catalogPath = join(root, 'ow/src/engine/NativeArtCatalog.ow');

export function listNativeAssets(catalogSource) {
  const refs = [...catalogSource.matchAll(/"assets\/native\/([^"]+)"/g)];
  if (refs.length === 0) throw new Error('Missing native asset references');
  const assets = new Set();
  for (const match of refs) {
    const name = match[1];
    if (!/^(?:skills|items|badges|themes|mobs\/(?:hostile|miniboss|boss))\/[A-Za-z0-9_-]+\.(?:png|jpg|jpeg)$/.test(name)) {
      throw new Error('Native asset path outside approved catalogue: ' + name);
    }
    assets.add(name);
  }
  return [...assets].sort();
}

export function stageNativeAssets(repoRoot = root) {
  const catalog = readFileSync(join(repoRoot, 'ow/src/engine/NativeArtCatalog.ow'), 'utf8');
  const names = listNativeAssets(catalog);
  const source = join(repoRoot, 'public/assets');
  const target = join(repoRoot, 'ow/assets/native');
  for (const name of names) {
    const origin = resolve(source, name);
    const destination = resolve(target, name);
    if (!origin.startsWith(source + sep) || !destination.startsWith(target + sep)) {
      throw new Error('Asset escapes its designated root: ' + name);
    }
    if (!existsSync(origin) || !statSync(origin).isFile()) {
      throw new Error('Original artwork is missing: ' + origin);
    }
    mkdirSync(dirname(destination), {recursive: true});
    copyFileSync(origin, destination);
  }
  return names;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const names = stageNativeAssets();
    process.stdout.write('Staged ' + names.length + ' original PNG/JPEG images in ow/assets/native/\n');
  } catch (error) {
    process.stderr.write('Native art staging: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
