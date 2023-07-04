import os from 'os';
import path from "path";
import { Logger, pino } from 'pino';

const tmpDir = os.tmpdir()
export const logfile = path.resolve(tmpDir, `elrpc-pino-${process.pid}.log`);

const transport = pino.transport({
  targets: [{
    level: 'debug',
    target: 'pino-pretty',
    options: {
      destination: logfile,
    }
  }]
})

let logger: Logger;
export const initLogger = () => {
  if (logger) {
    return logger
  }
  logger = pino(transport);
  // logger.level = 'debug'
  return logger
}
