#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const FCClient = require('@alicloud/fc2');
const { execSync } = require('child_process');
const filesize = require('filesize');

import { getFunctionName } from './common';

const args = process.argv.slice(2);
const skipInstall = args.indexOf('--si') > -1;
if (skipInstall) {
  console.log('skip installation');
}

const cwd = process.cwd();

const config = require(path.join(cwd, '.fc-config.json'));
const pkg = require(path.join(cwd, 'package.json'));

// allow customize installation command
const installCommand = config.intall || 'npm install --production';
const serviceName = config.serviceName;

// allow customize version and publish multiple functions at once
const version = (config.version || pkg.version) as string;

const name = config.name || pkg.name;
const functionNames = version
  .split(',')
  .map(v => getFunctionName({ name, version: v }));

const client = new FCClient(config.fc.accountId, {
  ...config.fc,
  ...{
    // 如果配置中包含内网，则移除内网后缀
    region: config.fc.region.replace('-internal', ''),
  },
});

function prepare() {
  if (!skipInstall) {
    console.log(`run ${installCommand}..`);
    execSync(installCommand, { stdio: 'inherit' });
  }
  console.log('compress file..');
  const filepath = `/tmp/${Math.random()}.zip`;
  execSync(config.zip || `zip -qr ${filepath} ./ -x *.git*`, {
    stdio: 'inherit',
  });

  console.log(
    `zip file size is ${filesize(fs.statSync(filepath).size)}, uploading zip..`
  );
  return filepath;
}

async function publishToFc(filepath: string, functionName: string) {
  await client.createFunction(serviceName, {
    functionName,
    handler: 'index.handler',
    memorySize: 1024,
    runtime: 'nodejs10',
    timeout: 300, // second
    code: {
      zipFile: fs.readFileSync(filepath, 'base64'),
    },
    ...pick(config, 'handler', 'memorySize', 'runtime', 'timeout'),
  });

  console.log(`create function ${serviceName}/${functionName} successfully!`);
}

function pick(obj: { [x: string]: any }, ...attrs: string[]) {
  const ret = {} as any;
  attrs.forEach(attr => {
    ret[attr] = obj[attr];
  });
  return ret;
}

async function publish() {
  try {
    const filepath = prepare();
    await Promise.all(functionNames.map(n => publishToFc(filepath, n)));

    process.exit(0);
  } catch (e) {
    console.log(e.message, e.stack);
    process.exit(1);
  }
}

publish();
