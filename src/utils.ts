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

export function isPlistLikeArray(input: Array<any>) {
  if (!Array.isArray(input) || input.length % 2 !== 0) {
    return false;
  }
  for (let i = 0; i < input.length; i += 2) {
    const key = input[i];
    const value = input[i + 1];
    if (typeof key !== 'string' || !key.startsWith(':')) {
      return false;
    }
    if (Array.isArray(value)) {
      if (!isPlistLikeArray(value) && !value.every(isPlistLikeArray)) {
        return false;
      }
    } else if (typeof value === 'object' && value !== null) {
      const values = Object.values(value);
      if (values.some(v => Array.isArray(v) ? !v.every(isPlistLikeArray) : typeof v === 'object' && v !== null)) {
        return false;
      }
    }
  }
  return true;
}

export function convertPlistLikeArrayToObject(input: Array<any>) {
  if (!isPlistLikeArray(input)) {
    return input;
    // throw new Error('Input is not a plist-like array');
  }
  const result = {};
  for (let i = 0; i < input.length; i += 2) {
    const key = input[i].substring(1);
    const value = input[i + 1];
    if (Array.isArray(value)) {
      if (isPlistLikeArray(value)) {
        result[key] = convertPlistLikeArrayToObject(value);
      } else if (value.every(isPlistLikeArray)) {
        result[key] = value.map(convertPlistLikeArrayToObject);
      } else {
        console.log('invalid value', value);
        throw new Error('Value is not a plist-like array');
      }
    } else if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value);
      const convertedEntries = entries.map(([k, v]) => {
        if (Array.isArray(v)) {
          return [k, v.map(v2 => isPlistLikeArray(v2) ? convertPlistLikeArrayToObject(v2) : v2)];
        } else if (typeof v === 'object' && v !== null) {
          return [k, convertPlistLikeArrayToObject(Object.entries(v))];
        } else {
          return [k, v];
        }
      });
      result[key] = Object.fromEntries(convertedEntries);
    } else {
      result[key] = value;
    }
  }
  return result;
}
