import symbol from "../symbol";
import Message from "./Message";

export default class EPCErrorMessage extends Message {
    errorMessage: string;

    constructor(uid: number, errorMessage: string) {
        super(uid);
        this.errorMessage = errorMessage;
    }

    toJSON(): any[] {
      return [symbol('epc-error'), this.uid, this.errorMessage];
    }
}
