import { Deferred } from "../Deferred";
import Message from "./Message";
import symbol from "../symbol";

export default class MethodsMessage extends Message {
    deferred: Deferred<any>;

    constructor(uid: number, deferred: Deferred<any>) {
        super(uid);
        this.deferred = deferred;
    }

    toJSON(): any[] {
        return [symbol('methods'), this.uid];
    }
}
