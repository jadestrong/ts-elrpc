import os from 'os';
import path from "path";
import * as log4js from "log4js";

const MAX_LOG_SIZE = 1024 * 1024;
const MAX_LOG_BACKUPS = 10;

const tmpDir = os.tmpdir()
export const logfile = path.resolve(tmpDir, `elrpc-${process.pid}.log`);

export const initLogger = () => {
  // if (_defaultLogger) return _defaultLogger;
  // const appender = {
  // 	type: 'console',
  // 	layout: {
  // 		type: "pattern",
  // 		pattern: "%5p | %m"
  // 	},
  // 	category: "log"
  // };
  // log4js.configure({appenders: [appender]});
  log4js.configure({
    appenders: {
        out: {
            type: 'file',
            mode: 0o666,
            filename: logfile,
            maxLogSize: MAX_LOG_SIZE,
            backups: MAX_LOG_BACKUPS,
            layout: {
                type: 'pattern',
                // Format log in following pattern:
                // yyyy-MM-dd HH:mm:ss.mil $Level (pid:$pid) %category - $message
                pattern: `%d{ISO8601} %p [%c] - %m`,
            },
        }
    },
    categories: {
        default: { appenders: ['out'], level: 'info' },
    },
  });

  const logger = log4js.getLogger("log");
  logger.level = 'off';

  return logger;
};
