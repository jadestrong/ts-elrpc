import * as epc from '../dist/ts-elrpc.mjs'

let server;
epc.startServer([], 8888).then(server => {
    server.defineMethod('echo', (args) => {
        return args;
    });
    server.wait()
});
