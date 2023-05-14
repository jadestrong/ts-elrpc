import { Deferred } from "../Deferred";
import Message from "./Message";
import symbol from "../symbol";
import { SExpSymbol } from "ts-elparser";

class CallMessage extends Message {
  method: SExpSymbol;
  args: string[];
  deferred: Deferred<any>;

  constructor(uid: number, method: SExpSymbol, args: any[], deferred: Deferred<any>) {
    super(uid);
    this.method = method;
    this.args = args;
    this.deferred = deferred;
  }

  toJSON() {
    return [symbol("call"), this.uid, this.method, this.args];
  }
}

export default CallMessage;
