import Message from "./Message";
import symbol from "../symbol";

export default class ReturnMessage extends Message {
    value: any;

    constructor(uid: number, value: any) {
        super(uid);
        this.value = value;
    }

    toJSON(): any[] {
        return [symbol('return'), this.uid, this.value];
    }
}
