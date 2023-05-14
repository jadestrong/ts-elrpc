import { SExpQuoted, SExpSymbol } from "ts-elparser";

let _uidCount = 1;
export const genuid = () => {
  return _uidCount++;
};

/**
 * 将字符串使用 0 补到 6 位长度
 */
export const padRight = (str: string, pad: string, num: number) => {
  return str.padStart(num, pad);
};

/**
 * 将 plist 转换成对象结构
 */
export const tryPListToObj = (arg: any) => {
    if (!Array.isArray(arg) || arg.length % 2 !== 0) {
        return arg;
    }
    for (let i = 0; i < arg.length; i++) {
        // 奇数位的变量名是值位，直接跳过
        if (i % 2 === 1) {
            continue;
        }
        // 偶数位为键，如果键不是以 “:” 开头的，则表明不是 plist ，直接返回
        if (!String.prototype.startsWith.call(arg[i], ':')) {
            return arg;
        }
    }
    const ret: Record<string, unknown> = {};
    for (const i of range(0, arg.length, 2)) {
        // 递归处理，值本身也可能是 plist
        ret[arg[i].slice(1)] = tryPListToObj(arg[i + 1]);
    }
    return ret;
}

function range(start: number, end: number, step: number): number[] {
    if (typeof end === 'undefined') {
        end = start;
        start = 0;
    }

    if (typeof step === 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= end) || (step < 0 && start <= end)) {
        return [];
    }

    const result: number[] = [];
    for (let i = start; step > 0 ? i < end : i > end; i += step) {
        result.push(i);
    }

    return result;
}

// {line: 1, character: 2} => [":line", 1, ":character", 2]
export function tryObjToPList(obj: any) {
    if (isPlainObject(obj)) {
        const result: any[] = [];
        Object.entries(obj).forEach(([key, value]) => {
            result.push(new SExpSymbol(`:${key}`));
            result.push(tryObjToPList(value));
        });
        return result;
        // return new SExpQuoted(parse1(encode(result)));
    } else if (Array.isArray(obj)) {
        return obj.map(item => tryObjToPList(item));
    } else {
        return obj;
    }
}

const _toString = Object.prototype.toString;

function isPlainObject(obj: any) {
    return _toString.call(obj) === '[object Object]';
}

export function symbol(name: string) {
  return new SExpSymbol(name);
}

export function quote(obj: any) {
    return new SExpQuoted(obj);
}
