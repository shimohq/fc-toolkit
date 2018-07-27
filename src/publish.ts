#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const FCClient = require('@alicloud/fc2');
const { execSync } = require('child_process');

const cwd = process.cwd();

const config = require(path.join(cwd, '.fc-config.json'));
const pkg = require(path.join(cwd, 'package.json'));
const serviceName = config.serviceName;
const functionName = `${pkg.name}-${pkg.version.replace(/\./g, '_')}`;

const client = new FCClient(config.fc.accountId, config.fc);

export async function publish() {
  try {
    console.log('run `npm install`..');
    execSync('npm install --production', { stdio: 'inherit' });

    console.log('compress file..');
    const filepath = `/tmp/${Math.random()}.zip`;
    execSync(`zip -r ${filepath} ./ -x *.git*`, { stdio: 'inherit' });

    console.log('uploading zip..');
    await client.createFunction(serviceName, {
      functionName,
      handler: 'index.handler',
      memorySize: 1024,
      runtime: 'nodejs8',
      timeout: 300, // second
      code: {
        zipFile: fs.readFileSync(filepath, 'base64'),
      },
      ...pick(
        config,
        'functionName',
        'handler',
        'memorySize',
        'runtime',
        'timeout'
      ),
    });

    console.log(`create function ${serviceName}/${functionName} successfully!`);
    process.exit(0);
  } catch (e) {
    console.log(e.message, e.stack);
    process.exit(1);
  }
}

function pick(obj: { [x: string]: any }, ...attrs: string[]) {
  const ret = {};
  attrs.forEach(attr => (obj[attr] = obj[attr]));
  return ret;
}

publish();
