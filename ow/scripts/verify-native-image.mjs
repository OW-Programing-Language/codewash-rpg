/**
 * Smoke-checks a jpackage app-image, including packaged runtime only.
 * All checks execute the packaged native launcher, not the developer script.
 */
import {existsSync, lstatSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function pathsForOS(output, platform = process.platform) {
  const root = resolve(output, 'images',
    platform === 'darwin' ? 'CodeWashRPG.app' : 'CodeWashRPG');
  const binary = platform === 'win32'
    ? join(root, 'CodeWashRPG.exe')
    : platform === 'darwin'
      ? join(root, 'Contents/MacOS/CodeWashRPG')
      : join(root, 'bin/CodeWashRPG');
  const app = platform === 'win32'
    ? join(root, 'app')
    : platform === 'darwin'
      ? join(root, 'Contents/app')
      : join(root, 'lib/app');
  return {root, binary, app};
}

export function verifyContents({root, binary, app}) {
  if (!existsSync(binary) || !lstatSync(binary).isFile()) {
    throw new Error('Missing native launcher: ' + binary);
  }
  for (const name of ['native-launcher.jar', 'OwIDE.jar',
    'ow-graphics-native.jar', 'payload/ow/dependencies.lock.yml',
    'payload/ow/src/engine/battle_gpu.ow',
    'payload/ow/assets/native/skills/math_icon.png',
    'payload/ow/.ow/deps/graphics/.ow-resolved']) {
    if (!existsSync(join(app, name))) {
      throw new Error('Missing packaged resource: ' + name + ' in ' + root);
    }
  }
  if (!existsSync(join(app, 'lib'))) {
    throw new Error('Missing bundled LWJGL jar directory');
  }
  return true;
}

export function runPackagedImage(output, args = ['--self-test'], platform = process.platform) {
  const image = pathsForOS(output, platform);
  verifyContents(image);
  const p = spawnSync(image.binary, args, {
    cwd: here, // intentional: the app MUST NOT rely on caller cwd
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: args.includes('--smoke') ? 120_000 : 40_000,
  });
  if (p.error) throw p.error;
  if (p.status !== 0) {
    throw new Error('Native image failed ' + args.join(' ') + '\n' +
      (p.stdout || '') + '\n' + (p.stderr || '') + '\nStatus ' + p.status);
  }
  console.log('PASS: ' + args.join(' ') + ' using ' + image.binary);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const out = process.argv[2] ? resolve(process.argv[2]) : resolve(here, 'ow/native-dist');
    runPackagedImage(out);
    runPackagedImage(out, ['--check']);
    if (process.argv.includes('--smoke')) runPackagedImage(out, ['--smoke']);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
