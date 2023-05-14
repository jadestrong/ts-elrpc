import Message from "./Message";

export default class EPCErrorMessage extends Message {
    errorMessage: string;

    constructor(uid: number, errorMessage: string) {
        super(uid);
        this.errorMessage = errorMessage;
    }

    toJSON(): any[] {
        throw new Error("Method not implemented.");
    }
}
