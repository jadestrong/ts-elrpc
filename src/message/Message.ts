export default abstract class Message {
    uid: number;

    constructor(uid: number) {
        this.uid = uid;
    }

    abstract toJSON(): any[];
}
