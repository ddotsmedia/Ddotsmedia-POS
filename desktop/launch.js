#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Remove ELECTRON_RUN_AS_NODE so Electron initializes with its full API
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronPath = require('electron');
const appPath = path.resolve(__dirname);

const child = spawn(electronPath, [appPath], {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('close', (code) => process.exit(code ?? 0));
