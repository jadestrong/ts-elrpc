import * as epc from '../dist/ts-elrpc.mjs'

let server;
epc.startServer([], 8888).then(server => {
    server.defineMethod('add', (a, b) => {
        return a + b;
    });
    server.wait();
})
