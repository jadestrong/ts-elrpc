import * as epc from '../src'

let server;
epc.startServer([], 8888).then(server => {
    server.defineMethod('add', (a, b) => {
        return a + b;
    });
    server.wait();
})
