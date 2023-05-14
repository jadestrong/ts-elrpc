import * as epc from '../dist/ts-elrpc.mjs'

let server
epc.startServer([], 8888).then(server => {
    server.defineMethod('num_error', () => {
        return 1/0;
    });

    server.defineMethod('raise_error', () => {
        throw 'Raised!';
    });

    server.defineMethod('echo', (arg) => {
        return arg;
    });

    server.wait();
})
