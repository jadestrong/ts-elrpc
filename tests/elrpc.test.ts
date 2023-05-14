import { spawn } from "child_process";
import { describe, expect, it } from "@jest/globals";
import * as epc from '../src/index'
import PeerProcess from "../src/PeerProcess";
import { EPCStackException } from "../src/exception";

const _b = (name: string) => {
  return `./tests/${name}`;
}

describe('01 Process', () => {
  it('should start with port num and getting it', (done) => {
    try {
      const cp = spawn('node', [_b('_echo.js')])
      cp.stdout.on('data', (data) => {
        try {
          const port = parseInt(data.toString(), 10)
          expect(port).toBe(8888);
          done();
        } catch (err) {
          done(err)
        } finally {
          cp.kill()
        }
      });

      cp.stderr.on('data', (data) => {
        // something wrong
        done(data.toString())
      });
    } catch (err) {
      done(err)
    }
  });

  it('should start without port num and getting the port num', (done) => {
    try {
      const cp = spawn('node', [_b('_process.js')]);
      cp.stdout.on('data', data => {
        try {
          const port = parseInt(data.toString(), 10);
          expect(port > 0).toBeTruthy();
          done();
        } catch (err) {
          done(err);
        } finally {
          cp.kill();
        }
      });

      cp.stderr.on('data', data => {
        // something wrong
        done(data.toString());
      });
    } catch (err) {
      done(err);
    }
  });
});

const withEPC = async (progname: string, callback: (cl: PeerProcess) => Promise<void>) => {
  let client: PeerProcess | null | void = null;
  try {
    client = await epc.startProcess(['node', _b(progname)]);
    if (client) {
      await callback(client)
      client.stop()
    }
  } catch (err) {
    if (client) {
      client.stop();
    }
    return Promise.reject(err)
  }
};

describe('02 Echo', () => {
  it('should echo a message', (done) => {
    withEPC('_echo.js', async (client) => {
      try {
        const ret = await client.callMethod('echo', 'hello');
        expect(typeof ret === 'string').toBeTruthy();
        expect(ret).toBe('hello');

        const ret2 = await client.callMethod('echo', 12345);
        expect(typeof ret2 === 'number').toBeTruthy();
        expect(ret2).toBe(12345);

        const ret3 = await client.callMethod('echo', [1, "2", 3.2, false]);
        expect(Array.isArray(ret3)).toBeTruthy();
        expect(ret3).toEqual([1, "2", 3.2, null]); // false -> null
        done()
      } catch(e) {
        done(e)
      }
    });
  });
});

describe('03 Add', () => {
  it('should add objects', (done) => {
    withEPC('_add.js', async (client) => {
      try {
        const ret = await client.callMethod('add', 1, 2);
        expect(typeof ret).toBe('number');
        expect(ret).toBe(3);

        const ret1 = await client.callMethod('add', 'A', 'B');
        expect(typeof ret1).toBe('string');
        expect(ret1).toBe('AB');

        done()
      } catch(e) {
        done(e)
      }
    })
  });
});

describe('04 Errors', () => {
  it('should return runtime errors', (done) => {
    withEPC('_error.js', async (client) => {
      try {
        const ret = await client.callMethod('raise_error');
        console.log(ret)
      } catch(e) {
        expect(e.message).toBe("Raised!");
      }
    }).then(done).catch(e => done(e));
  });

  it('should return an epc-stack error for wrong object', done => {
    withEPC('_error.js', async (client) => {
      try {
        const ret = await client.callMethod('num_error');
        console.log(ret);
      } catch(e) {
        expect(e instanceof EPCStackException).toBeTruthy()
        expect(e.message).toMatch('Infinite can not be encoded');
      }

      try {
        const ret = await client.callMethod('echo', new Date());
        console.log(ret);
      } catch(e) {
        expect(e instanceof EPCStackException).toBeTruthy();
        expect(e.message).toMatch('Unknown object type');
      }
    })
      .then(done)
      .catch((e) => done(e));
  });

  it('should return an epc-stack error for method missing', done => {
    withEPC('_error.js', async (client) => {
      try {
        const ret = await client.callMethod('echo??', 1);
        console.log(ret);
      } catch(e) {
        expect(e instanceof EPCStackException).toBeTruthy();
        expect(e.message).toMatch('Not found the method: echo??');
      }
    })
      .then(done)
      .catch(e => done(e));
  });
});

describe("05 Query", () => {
  it('should return a list of methods.', done => {
    withEPC('_methods.js', async (client) => {
      const ret = await client.queryMethod();
      expect(ret).toEqual([
        ["method1", "args", ""],
        ["test2", "a,b,c", "docstring here..."],
        ["test3", "", ""]
      ]);
    }).then(done).catch(e => done(e));
  });
});


describe('06 Echo Async', () => {
  it('should echo a message asynchronously.', (done) => {
    withEPC('_async.js', async (client) => {
      const ret = await client.callMethod('echo', 'hello');
      expect(ret !== null).toBeTruthy();
      expect(typeof ret === 'string').toBeTruthy();
      expect(ret).toBe('hello');

      const ret1 = await client.callMethod('echo', 12345);
      expect(typeof ret1 === 'number').toBeTruthy();
      expect(ret1).toBe(12345);

      const ret2 = await client.callMethod('echo', [1, '2', 3.2, false]);
      expect(ret2 instanceof Array).toBeTruthy();
      expect(ret2).toEqual([1, '2', 3.2, null]); // false -> null
    }).then(done).catch(e => done(e));
  });
});
