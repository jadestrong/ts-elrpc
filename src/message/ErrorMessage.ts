import Message from "./Message";
import symbol from "../symbol";

export default class ErrorMessage extends Message {
    errorMessage: string;

    constructor(uid: number, errorMessage: string) {
        super(uid);
        this.errorMessage = errorMessage;
    }

    toJSON(): any[] {
        return [symbol('return-error'), this.uid, this.errorMessage];
    }
}
