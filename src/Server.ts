
import * as Express from 'express';
import {program} from 'commander';
import * as Path from 'path';
import * as FileSystem from 'fs-extra';
import {version} from '../package.json';
import {exec, ExecException} from 'child_process';

interface IConfig {
    host: string;
    port: number;
    secret: string;
}

program.name('stagen');
program.version(version, '-v, --version');

program.option('-c <config>', 'Path to the JSON config file. Defaults to <cwd>/stagen.json');
program.option('-h <host>', 'Binding interface. Defaults to 127.0.0.1');
program.option('-p <port>', 'Binding port. Defaults to 3000.');
program.parse(process.argv);
let options = program.opts();

let configFile: string = Path.resolve(process.cwd(), options.c ? options.c : './stagen.json');
let config: IConfig = null;

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

const app: Express.Express = Express();
app.use(Express.static(process.cwd()));

app.put('/_stagen/publish', (request: Express.Request, response: Express.Response) => {
    if (!config.secret || config.secret !== request.headers['x-secret']) {
        response.status(401).send();
        return;
    }

    let fstream: FileSystem.WriteStream = FileSystem.createWriteStream(Path.resolve(process.cwd(), 'stagen-tmp.tar.gz'));
    request.pipe(fstream);

    request.on('end', () => {
        exec('tar -xzf ./stagen-tmp.tar.gz', (error: ExecException) => {
            if (error) {
                console.error(error);
                response.status(500).send();
            }
            else {
                FileSystem.unlink(Path.resolve(process.cwd(), 'stagen-tmp.tar.gz'), (error: NodeJS.ErrnoException) => {
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
