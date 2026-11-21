/**
 * Asset staging for the native OW Graphics SPI's strict image sandbox.
 * It rejects ".." and absolute image paths, so assets in ../public/assets
 * must be copied INTO the ow/ root without changing the original files.
 *
 * Only literal, allowlisted references from NativeArtCatalog.ow are copied.
 * No remote downloads or binary blobs are committed to Git.
 */
import {readFileSync, mkdirSync, copyFileSync, existsSync, statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Electron's browser sniffs these JPEG images despite their .png extension.
// Native OW Graphics validates magic bytes, so stage the exact originals
// using their correct .jpg file extension without modifying public/assets.
export const mislabeledJpegSource = Object.freeze({
  'themes/spy.jpg': 'themes/spy.png',
  'themes/Scifi.jpg': 'themes/Scifi.png',
  'themes/fantasy.jpg': 'themes/fantasy.png',
});

// Only allow these known original GIF-only mobs to become PNG stills.
// Native ImageIO does not animate GIF/WebP; never substitute an unrelated egg.
export const originalGifForPng = Object.freeze({
  'mobs/hostile/ghast.png': 'mobs/hostile/ghast.gif',
  'mobs/hostile/blaze.png': 'mobs/hostile/blaze.gif',
  'mobs/hostile/guardian.png': 'mobs/hostile/guardian.gif',
  'mobs/hostile/phantom.png': 'mobs/hostile/phantom.gif',
  'mobs/miniboss/elderguardian.png': 'mobs/miniboss/elderguardian.gif',
  'mobs/boss/warden.png': 'mobs/boss/warden.gif',
  'mobs/boss/enderdragon.png': 'mobs/boss/enderdragon.gif',
});

export function listNativeAssets(catalogSource) {
  const refs = [...catalogSource.matchAll(/"assets\/native\/([^"]+)"/g)];
  if (refs.length === 0) throw new Error('Missing native asset references');
  const assets = new Set();
  for (const match of refs) {
    const name = match[1];
    if (!/^(?:fonts|patterns|skills|items|badges|themes|mobs\/(?:hostile|miniboss|boss))\/[A-Za-z0-9_-]+\.(?:png|jpg|jpeg)$/.test(name)) {
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
    const originalName = Object.hasOwn(mislabeledJpegSource, name) ? mislabeledJpegSource[name] : name;
    const origin = resolve(source, originalName);
    const destination = resolve(target, name);
    if (!origin.startsWith(source + sep) || !destination.startsWith(target + sep)) {
      throw new Error('Asset escapes its designated root: ' + name);
    }
    mkdirSync(dirname(destination), {recursive: true});
    if (name === 'fonts/vt323-atlas.png') {
      // The native game uses the exact licensed Electron VT323 typeface,
      // but ships only its offline raster atlas in the portable image.
      const javaSource = join(repoRoot, 'ow/scripts/Vt323Atlas.java');
      const fontSource = join(repoRoot, 'ow/assets/fonts/VT323-Regular.ttf');
      if (!existsSync(javaSource) || !existsSync(fontSource)) {
        throw new Error('Licensed VT323 font generator assets are missing');
      }
      execFileSync('java', [javaSource, fontSource, destination],
        {stdio: 'pipe', env: {...process.env, JAVA_TOOL_OPTIONS: '-Djava.awt.headless=true'}});
    } else if (existsSync(origin) && statSync(origin).isFile()) {
      if (Object.hasOwn(mislabeledJpegSource, name)) {
        const magic = readFileSync(origin).subarray(0, 3);
        if (magic[0] !== 0xff || magic[1] !== 0xd8 || magic[2] !== 0xff) {
          throw new Error('Misnamed Electron asset is not a JPEG: ' + originalName);
        }
      }
      copyFileSync(origin, destination);
    } else if (Object.hasOwn(originalGifForPng, name)) {
      const gifSource = resolve(source, originalGifForPng[name]);
      if (!gifSource.startsWith(source + sep) || !existsSync(gifSource) ||
          !statSync(gifSource).isFile()) {
        throw new Error('Original GIF source is missing: ' + gifSource);
      }
      execFileSync('java', [
        join(repoRoot, 'ow/scripts/GifFirstFrame.java'), gifSource, destination
      ], {stdio: 'pipe'});
    } else {
      throw new Error('Original artwork is missing: ' + origin);
    }
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
