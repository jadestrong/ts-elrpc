import { tryPListToObj } from "./utils";

class Method {
    name: string;
    body: (...args: any[]) => void;
    argdoc?: string;
    docstring?: string;

    constructor(name: string, body: any, argdoc: string = '', docstring: string = '') {
        this.name = name;
        this.body = body;
        this.argdoc = argdoc;
        this.docstring = docstring;
    }

    invoke(args: any) {
        args = Array.isArray(args) ? args : [args];
        // 将参数中可能存在的 plist 转换成对象结构，再透传给注册的函数
        args = args.map(tryPListToObj);
        return this.body.apply(null, args);
    }
}

export default Method;
