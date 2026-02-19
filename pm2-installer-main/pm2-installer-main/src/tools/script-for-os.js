'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const projectRoot = path.resolve(__dirname, '../../');
const pkgPath = path.resolve(projectRoot, 'package.json');

if (!pkgPath.startsWith(projectRoot + path.sep)) {
  console.error('Blocked: package.json resolved outside allowed root.');
  process.exit(1);
}

try {
  const stat = fs.lstatSync(pkgPath);

  if (stat.isSymbolicLink()) {
    console.error('Blocked: package.json must not be a symbolic link.');
    process.exit(1);
  }
} catch (err) {
  console.error('Unable to access package.json at expected location.');
  process.exit(1);
}

let packageJson;
try {
  const raw = fs.readFileSync(pkgPath, 'utf8');
  packageJson = JSON.parse(raw);
} catch (err) {
  console.error('Failed to read or parse package.json.');
  process.exit(1);
}

const { scripts = {} } = packageJson;
const platform = os.platform();

if (
  process.env['npm_config_argv'] === undefined &&
  process.env['npm_lifecycle_script'] === undefined
) {
  console.error('script-for-os is intended for use from an npm script only.');
  process.exit(1);
}

let targetScriptName;
let scriptParameters = [];

if (process.env['npm_config_argv'] !== undefined) {
  try {
    const parsed = JSON.parse(process.env['npm_config_argv']);
    const parameters = parsed.original || [];
    [, targetScriptName, ...scriptParameters] = parameters;
  } catch {
    console.error('Failed to parse npm_config_argv.');
    process.exit(1);
  }
} else if (
  process.env['npm_lifecycle_script'] &&
  process.env['npm_lifecycle_event']
) {
  const lifecycle = process.env['npm_lifecycle_script'];

  scriptParameters = lifecycle
    .slice(lifecycle.indexOf('.js') + 4)
    .split(' ')
    .filter(Boolean)
    .map(p => (p.length > 2 ? p.slice(1, -1) : p));

  targetScriptName = process.env['npm_lifecycle_event'];
}

if (!/^[a-zA-Z0-9:_-]+$/.test(targetScriptName)) {
  console.error('Invalid script name detected.');
  process.exit(1);
}

for (const param of scriptParameters) {
  if (!/^[a-zA-Z0-9._:/-]*$/.test(param)) {
    console.error('Invalid script parameter detected.');
    process.exit(1);
  }
}

const platformKeys = [platform];

if (platform === 'darwin') platformKeys.push('macos');
if (platform === 'win32') platformKeys.push('windows');
if (['darwin', 'linux', 'freebsd', 'android'].includes(platform)) {
  platformKeys.push('unix');
}

platformKeys.push('default');

let scriptName;

for (const keyPlatform of platformKeys) {
  const key = `${targetScriptName}:${keyPlatform}`;
  if (Object.prototype.hasOwnProperty.call(scripts, key)) {
    scriptName = key;
    break;
  }
}

if (!scriptName) {
  console.error(
    `script-for-os: Could not find script for "${targetScriptName}".\nExpected one of:\n`,
    platformKeys.map(k => `${targetScriptName}:${k}`)
  );
  process.exit(1);
}

const childArgs = ['run', scriptName, ...scriptParameters];
const command = platform === 'win32' ? 'npm.cmd' : 'npm';

const child = execFile(command, childArgs, {
  stdio: 'inherit'
});

child.on('error', err => {
  console.error('Failed to execute npm:', err.message);
  process.exit(1);
});

child.on('exit', code => {
  process.exit(code ?? 0);
});