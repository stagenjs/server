#!/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Express = require("express");
const commander_1 = require("commander");
const Path = require("path");
const FileSystem = require("fs-extra");
const package_json_1 = require("../package.json");
const child_process_1 = require("child_process");
commander_1.program.name('stagen');
commander_1.program.version(package_json_1.version, '-v, --version');
commander_1.program.option('-c <config>', 'Path to the JSON config file. Defaults to <cwd>/stagen.json');
commander_1.program.option('-d <directory>', 'Path to the root directory to serve. Defaults to <cwd>');
commander_1.program.option('-h <host>', 'Binding interface. Defaults to 127.0.0.1');
commander_1.program.option('-p <port>', 'Binding port. Defaults to 3000.');
commander_1.program.parse(process.argv);
let options = commander_1.program.opts();
let configFile = Path.resolve(process.cwd(), options.c ? options.c : './stagen.json');
let config = null;
try {
    config = require(configFile);
}
catch (ex) {
    console.error('Error loading ' + configFile);
    throw ex;
}
if (options.h) {
    config.host = options.h;
}
if (options.p) {
    config.port = options.p;
}
if (!config.host) {
    config.host = '127.0.0.1';
}
if (!config.port && config.port !== 0) {
    config.port = 3000;
}
let serveDirectory = Path.resolve(process.cwd());
if (options.d) {
    serveDirectory = Path.resolve(process.cwd(), options.d);
}
const app = Express();
app.use(Express.static(serveDirectory));
app.put('/_stagen/publish', (request, response) => {
    if (!config.secret || config.secret !== request.headers['x-secret']) {
        response.status(401).send();
        return;
    }
    let fstream = FileSystem.createWriteStream(Path.resolve(process.cwd(), 'stagen-tmp.tar.gz'));
    request.pipe(fstream);
    request.on('end', () => {
        child_process_1.exec('tar -xzf ./stagen-tmp.tar.gz', (error) => {
            if (error) {
                console.error(error);
                response.status(500).send();
            }
            else {
                FileSystem.unlink(Path.resolve(process.cwd(), 'stagen-tmp.tar.gz'), (error) => {
                    if (error) {
                        console.error(error);
                        response.status(500).send();
                    }
                    else {
                        response.status(204).send();
                    }
                });
            }
        });
    });
});
app.listen(config.port, config.host, () => {
    console.info(`Listening to ${config.host}:${config.port}`);
});
//# sourceMappingURL=Server.js.map