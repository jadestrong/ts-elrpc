import { createConnection, createServer } from "net";
import RPCServer from "./RPCServer";
import Method from "./Method";
import PeerProcess from "./PeerProcess";
import { EPCRuntimeException, EPCStackException } from "./exception";
import { initLogger } from "./logger";

/**
 * Bind and Listen the TCP Server port and return RPCServer object.
 * @param {Method[]} [methods]
 * @param {number} [port]
 * @return Promise RPCServer
 */
const startServer = (methods?: Method[], port?: number): Promise<RPCServer> => {
  if (!port) port = 0; // choosed by the system
  return new Promise((resolve) => {
    const serverSocket = createServer((conn) => {
      const svr = new RPCServer("server", conn, methods);
      svr.addCloseHook(() => {
        serverSocket.close();
      });
      resolve(svr);
    });

    serverSocket.listen(port, "localhost", 1, () => {
      const addr = serverSocket.address();
      if (typeof addr === 'string') {
        console.log(addr);
      } else {
        console.log(addr?.port);
      }
    });
  });
};

/**
 * Connect to the TCP port and return RPCServer object.
 * @param {number} port
 * @param {Method[]} [methods]
 * @param {string} [host]
 * @return Promise RPCServer
 */
const startClient = (
  port: number,
  methods?: Method[],
  host?: string
): Promise<RPCServer> => {
  if (!host) host = "localhost";
  return new Promise((resolve, reject) => {
    try {
      const socket = createConnection(port, host, () => {
        const client = new RPCServer("client", socket, methods);
        resolve(client);
      });
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Execute the command and return PeerProcess object which
 * has a RPCServer object.
 * @param {string[]} cmd - command for starting EPC Peer Process, such as ["node", "_echo.js"]
 * @return Promise PeerProcess
 */
const startProcess = (cmd: string[]): Promise<PeerProcess> => {
  // console.log('cmd', cmd);
  const svr = new PeerProcess(cmd);
  try {
    return svr.start();
  } catch (e) {
    return Promise.reject(e);
  }
};

export {
  startServer,
  startClient,
  startProcess,
  Method,
  EPCStackException,
  EPCRuntimeException,
  initLogger,
};
