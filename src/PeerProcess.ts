import { ChildProcess, spawn } from "child_process";
import { Deferred } from "./Deferred";
import { startClient } from "./elrpc";
import { initLogger } from "./logger";
import Method from "./Method";
import RPCServer from "./RPCServer";

enum ProcessStatus {
  NOT_STARTED = "not_started",
  START_PRE = "start_pre",
  START_SPAWNED = "start_spawned",
  START_PORT_RECEIVE = "start_port_receive",
  START_ERROR = "start_error",
  CLOSING = 'closing',
  START_ESTABLISED = 'start_establised',
  CLOSED = 'closed',
}

export default class PeerProcess {
  cmd: string[];
  status = ProcessStatus.NOT_STARTED;
  client: RPCServer | undefined;
  process: ChildProcess | undefined;

  constructor(cmd: string[]) {
    this.cmd = cmd;
    this.status = ProcessStatus.NOT_STARTED;
  }

  start() {
    this.status = ProcessStatus.START_PRE;
    const d = new Deferred<number>();
    const cmd = this.cmd[0];
    const args = this.cmd.slice(1);
    const logger = initLogger();
    logger.debug("Process CMD: ", this.cmd.join(" "));
    let port: number | null = null;
    this.process = spawn(cmd, args);
    this.status = ProcessStatus.START_SPAWNED;

    this.process.stdout?.on("data", (data) => {
      if (!port) {
        try {
          port = parseInt(data.toString(), 10);
          if (isNaN(port)) {
            logger.error("Wrong port number: ", data.toString());
            port = null;
            return;
          }
          this.status = ProcessStatus.START_PORT_RECEIVE;
          d.resolve(port);
        } catch (e) {
          d.reject(e);
        }
      } else {
        logger.debug(`PEER: ${data.toString()}`);
      }
    });

    this.process.stderr?.on("data", (data) => {
      this.status = ProcessStatus.START_ERROR;
      logger.warn(data.toString());
    });

    return d.promise.then(_port => {
      return startClient(_port).then((client) => {
        this.client = client;
        client.addCloseHook(() => {
          this.status = ProcessStatus.CLOSED;
          this.process?.kill('SIGTERM');
        });
        this.status = ProcessStatus.START_ESTABLISED;
        return this;
      });
    });
  }

  registerMethod(method: Method) {
    return this.client?.registerMethod(method);
  }

  defineMethod(name: string, body: () => void, argdoc: string, docstring: string) {
    return this.client?.defineMethod(name, body, argdoc, docstring);
  }

  callMethod(...args: any[]) {
    return this.client?.callMethod.apply(this.client, args);
  }

  queryMethod() {
    return this.client?.queryMethod();
  }

  stop() {
    this.status = ProcessStatus.CLOSING;
    return this.client?.stop();
  }
}
