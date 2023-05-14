import * as epc from '../dist/ts-elrpc.mjs'

epc.startServer().then(server => {
    server.wait()
});
