import { Socket } from "net";
import { encode, parse1 } from "ts-elparser";
import Method from "./Method";
import symbol from "./symbol";
import { Deferred } from "./Deferred";
import { tryPListToObj, genuid, padRight } from "./utils";
import {
  CallMessage,
  MethodsMessage,
  Message,
  ReturnMessage,
  EPCErrorMessage,
  ErrorMessage,
} from "./message";
import { EPCRuntimeException, EPCStackException, Exception } from "./exception";
import { initLogger } from "./logger";

enum QueueState {
  GO,
  STOP
}

enum SocketState {
  SOCKET_OPENED,
  SOCKET_CLOSING,
  SOCKET_NOT_CONNECTED,
}

enum MsgType {
  QUIT = "quit",
  CALL = "call",
  RETURN = "return",
  RETURN_ERROR = "return-error",
  EPC_ERROR = "epc_error",
  METHODS = "methods",
}

class RPCServer {
  name: string;
  socket: Socket;
  socketState = SocketState.SOCKET_OPENED;
  methods: Record<string, Method> = {};

  logger = initLogger();

  session: Record<number, CallMessage | MethodsMessage> = {};

  receiveBuffer = Buffer.alloc(0);

  queueState: typeof QueueState.GO | typeof QueueState.STOP = QueueState.GO;

  queueStream: (Message | null)[] = [];
  closeHooks: ((...args: any[]) => void)[] = [];

  constructor(name: string, socket: Socket, methods?: Method[]) {
    this.name = name;
    this.socket = socket;

    this.socket.on("data", (chunk) => {
      this.onReceiveData(chunk);
    });

    this.socket.on("end", () => {
      this.logger.info("!Socket closed by peer");
      this.stop();
    });

    this.socket.on("drain", () => {
      this.ondrain.call(this);
    });

    if (methods) {
      methods.forEach((method) => {
        this.registerMethod(method);
      });
    }
  }

  addCloseHook(hook: () => void) {
    if (this.closeHooks.includes(hook)) return;
    this.closeHooks.push(hook);
  }

  registerMethod(method: Method) {
    this.methods[method.name] = method;
    return method;
  }

  defineMethod(name: string, body: (...args: any[]) => void, argdoc?: string, docstring?: string) {
    return this.registerMethod(new Method(name, body, argdoc, docstring));
  }

  // 调用远程的方法，如果参数是 obj 需要将其转换成 plist 并 quote 它， emacs 才能正常识别
  // 否则，会丢失 key 值
  callMethod<T>(...args: any[]) {
    // TODO send to emacs, must need
    const name = symbol(args.shift());
    const d = new Deferred<T>();
    const uid = genuid();
    this.logger.debug('args: ', args);
    const msg = new CallMessage(uid, name, args, d);
    this.session[uid] = msg;
    this.queueMessage(msg);
    return d.promise;
  }

  queryMethod() {
    const d = new Deferred();
    const uid = genuid();
    const msg = new MethodsMessage(uid, d);
    this.session[uid] = msg;
    this.queueMessage(msg);
    return d.promise;
  }

  stop() {
    this.logger.debug("Stop Signal");
    if (this.socketState === SocketState.SOCKET_OPENED) {
      this.logger.debug("PeerProcess.stop: received!");
      this.socketState = SocketState.SOCKET_CLOSING;
      this.socket.end();
      this.queueMessage(null);
      this.clearWaitingSessions();
      this.socketState = SocketState.SOCKET_NOT_CONNECTED;
      this.closeHooks.forEach((hook) => {
        hook && hook.call(this);
      });
      this.logger.debug("PeerProcess.stop: completed");
    }
  }

  private onReceiveData(chunk: Buffer | null) {
    if (chunk) {
      this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);
    }
    const buf = this.receiveBuffer;
    if (buf.length >= 6) {
      const str = buf.subarray(0, 6).toString();
      this.logger.debug(`<< H:${str}`);
      const len = parseInt(str, 16);
      if (isNaN(len) || len <= 0) {
        this.logger.error(`Wrong Content Length: ${str} -> ${len}`);
        this.stop();
        return;
      }
      if (len > buf.length - 6) {
        this.logger.debug(`Wait for more input ${buf.length - 6} / ${len}`);
        return; // wait for subsequent data
      }
      const content = buf.subarray(6, 6 + len).toString();
      if (this.logger.isDebugEnabled()) {
        this.logger.debug(`<< B:${content}`);
      }
      this.receiveBuffer = buf.subarray(6 + len);

      let obj: any;
      try {
        obj = parse1(content);
      } catch (e) {
        this.logger.warn(`Parse Error: ${e}`, e);
        return;
      }
      try {
        this.dispatchHandler(obj);
      } catch (e) {
        this.logger.warn(`Dispatch Error ${e}`, e);
        return;
      }
      this.logger.debug("Dispatch OK");
      if (this.receiveBuffer.length > 6) {
        this.logger.debug("Try to read the next buffer.");
        this.onReceiveData(null);
      } else {
        this.logger.debug("Wait for next data chunk.");
      }
    }
  }

  // TODO msg type
  private dispatchHandler(msg: any) {
    msg = msg.toJS();
    const type = msg.shift() as MsgType;
    this.logger.debug(`dispatchHandler type : ${type}`, msg);
    switch (type) {
      case MsgType.QUIT:
        this.logger.debug("Quit Message Received.");
        this.stop();
        break;
      case MsgType.CALL:
        this.handlerCall(msg[0], msg[1], msg[2]);
        break;
      case MsgType.RETURN:
        this.handlerReturn(msg[0], msg[1]);
        break;
      case MsgType.RETURN_ERROR:
        this.handlerErrorReturn(msg[0], new EPCRuntimeException(msg[1]));
        break;
      case MsgType.EPC_ERROR:
        this.handlerErrorReturn(msg[0], new EPCStackException(msg[1]));
        break;
      case MsgType.METHODS:
        this.handlerMethods.apply(this, msg);
        break;
      default:
        this.logger.warn(`Unknown Message Type: ${type}`);
    }
  }

  // 供别人调用通过 registryMethod 注册的方法
  private handlerCall(uid: number, name: string, args: any[]) {
    this.logger.debug(`Handler Call: ${uid} / ${name} / ${args}`);
    const method = this.methods[name];
    if (method) {
      try {
        const ret = method.invoke(args);
        Promise.resolve(ret).then((_ret) => {
          this.queueMessage(new ReturnMessage(uid, _ret));
        });
      } catch (e) {
        this.logger.debug(`Method [${name}] throw an error ${e}`, e);
        this.queueMessage(new ErrorMessage(uid, (e as Error).toString()));
      }
    } else {
      this.logger.warn(`Method ${name} not found.`);
      this.queueMessage(
        new EPCErrorMessage(uid, `Not found the method: ${name}`)
      );
    }
    this.logger.debug("Handler Call OK");
  }

  // 返回值可能的类型有那些？ string number object array TODO
  private handlerReturn(uid: number, value: string) {
    const m = this.session[uid];
    // this.logger.debug('handlerReturn', uid, m);
    if (m) {
      delete this.session[uid];
      value = tryPListToObj(value);
      // value = Array.isArray(value) ? value.map(tryPListToObj) : tryPListToObj(value);
      this.logger.debug(`return value`, uid, JSON.stringify(value));
      m.deferred.resolve(value);
    }
  }
  private handlerErrorReturn(uid: number, error: Exception) {
    const m = this.session[uid];
    if (m) {
      delete this.session[uid];
      m.deferred.reject(error);
    }
  }

  private handlerMethods(uid: number) {
    this.logger.debug(`Handler Methods: ${uid}`);
    const ret = Object.keys(this.methods).map((k) => {
      const m = this.methods[k];
      return [symbol(k), m.argdoc, m.docstring];
    });
    const msg = new ReturnMessage(uid, ret);
    this.queueMessage(msg);
    this.logger.debug("Handler Methods OK");
  }

  private clearWaitingSessions() {
    const keys = Object.keys(this.session).map(Number);
    keys.forEach((uid) => {
      this.handlerReturn(uid, "EPC Connection closed");
    });
  }
  private queueMessage(msg: Message | null) {
    this.onqueue(msg);
  }

  private send() {
    if (this.queueStream.length === 0) return; // do nothing
    const msg = this.queueStream.shift();
    if (!msg) return; // ignore finish signal
    this.logger.debug(`Stream.write: ${msg.uid}`);

    let strBody: string;
    try {
      // this.logger.debug('strBody', msg.toJSON());
      strBody = encode(msg.toJSON(), true);
    } catch (e) {
      if (msg instanceof ReturnMessage) {
        // re-send error message with wrapping EPCStackException
        this.queueMessage(new EPCErrorMessage(msg.uid, (e as Error).message));
        this.logger.warn(
          `Encoding error ${(e as Error).message} / recover error message.`,
          e
        );
        this.send();
        return;
      }

      if (msg instanceof CallMessage) {
        // return error message to the local client with wrapping EPCStackException
        this.handlerErrorReturn(
          msg.uid,
          new EPCStackException((e as Error).message)
        );
        this.logger.warn(
          `Encoding error ${(e as Error).message} / recover error message.`,
          e
        );

        this.send();
        return;
      }

      this.send();
      this.logger.error(
        `Encoding error ${
          (e as Error).message
        } / Could not recover the messaging.`
      );
      return;
    }

    if (this.logger.isDebugEnabled()) {
      // this.logger.debug(`Encode: ${strBody}`);
      const buf = Buffer.from(strBody, "utf-8");
      const len = buf.length;
      const bufok = this.socket.write(
        Buffer.from(padRight(len.toString(16), "0", 6) + strBody, "utf-8")
      );
      this.logger.debug(
        `Stream.ok : uid=${msg.uid} / ${len} bytes / buf:${bufok}`
      );
      if (bufok) {
        this.send();
      } else {
        this.queueState = QueueState.STOP;
      }
    }
  }

  /* Wait for finishing this RPCServer connection */
  wait() {
    const d = new Deferred();
    const waitFunc = () => {
      setTimeout(() => {
        if (this.socketState !== SocketState.SOCKET_OPENED) {
          d.resolve(0);
        } else {
          waitFunc();
        }
      }, 100);
    };

    waitFunc();
    return d.promise;
  }

  ondrain() {
    if (this.queueState === QueueState.GO) {
      this.logger.debug("QueueState.GO.ondrain");
    } else {
      this.logger.debug(
        "QueueState.STOP.ondrain : num=" + this.queueStream.length
      );
      this.queueState = QueueState.GO;
      this.send();
    }
  }

  onqueue(msg: Message | null) {
    if (!msg) return;
    if (this.queueState === QueueState.GO) {
      this.logger.debug("QueueState.GO.onqueue : " + msg.uid);
      this.queueStream.push(msg);
      this.send();
    } else {
      this.logger.debug("QueueState.STOP.onqueue : " + msg.uid);
      this.queueStream.push(msg);
    }
  }
}

export default RPCServer;
