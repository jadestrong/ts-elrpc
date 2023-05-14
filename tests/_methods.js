import * as epc from '../dist/ts-elrpc.mjs'

epc.startServer().then((server) => {
    server.defineMethod('method1', (args) => {
        return args;
    }, "args", "");

    server.defineMethod('test2', args => {
        return args;
    }, 'a,b,c', 'docstring here...');

    server.defineMethod('test3', args => {
        return args;
    });

    server.wait();
});
