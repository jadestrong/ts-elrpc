import * as epc from '../dist/ts-elrpc.mjs'

let server;
epc.startServer([], 8888).then(server => {
    server.defineMethod('echo', args => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(args);
            }, 333);
        });
    });

    server.wait();
});
