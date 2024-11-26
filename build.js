import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

function exec(cmd) {
    execSync(cmd, {
        cwd: process.cwd(),
        stdio: ['inherit', 'inherit', 'inherit']
    })
}

process.chdir(path.dirname(process.argv[1]))
fs.rmSync('build', {
    recursive: true,
    force: true
})
fs.mkdirSync('build')

exec('node --experimental-sea-config sea-config.json')

process.chdir(path.join(path.dirname(process.argv[1]), 'build'))

fs.copyFileSync(process.execPath, 'factorio-profile-manager.exe')
exec('"C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool" remove /s factorio-profile-manager.exe')
exec('npx postject factorio-profile-manager.exe NODE_SEA_BLOB sea-prep.blob ' +
    '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2')