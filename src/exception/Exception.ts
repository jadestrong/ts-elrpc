export default abstract class Exception {
    message: string;

    constructor(message: string) {
        this.message = message;
    }

    getMessage() {
        return this.message;
    }
}
