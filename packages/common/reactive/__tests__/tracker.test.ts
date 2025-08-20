/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { test, expect, describe } from 'vitest';

import { Tracker } from '../src';

function expectTrue(value: any): void {
  expect(value).toEqual(true);
}

function expectFalse(value: any): void {
  expect(value).toEqual(false);
}

function expectEqual(v1: any, v2: any, msg?: string) {
  expect(v1).toEqual(v2);
}

function createPromiseDelegate(): { promise: Promise<void>; complete: () => void } {
  let complete: () => void;
  const promise = new Promise<void>(res => {
    complete = res;
  });
  return {
    promise,
    complete,
  };
}

function nextTick(v = 0): Promise<void> {
  return new Promise(res => setTimeout(res, v));
}

/**
 * fork from: https://github.com/meteor/meteor/blob/devel/packages/tracker/tracker_tests.js
 */
describe('Tracker', () => {
  test('tracker - run', function () {
    var d = new Tracker.Dependency();
    var x = 0;
    var handle = Tracker.autorun(function () {
      d.depend();
      ++x;
    });
    // 默认会先执行一次
    expect(x).toEqual(1);
    Tracker.flush();
    expect(x).toEqual(1);
    d.changed();
    expect(x).toEqual(1);
    Tracker.flush();
    expect(x).toEqual(2);
    d.changed();
    expect(x).toEqual(2);
    Tracker.flush();
    expect(x).toEqual(3);
    d.changed();
    // Prevent the function from running further.
    handle.stop();
    Tracker.flush();
    expect(x).toEqual(3);
    d.changed();
    Tracker.flush();
    expect(x).toEqual(3);

    Tracker.autorun(function (internalHandle) {
      d.depend();
      ++x;
      if (x == 6) internalHandle.stop();
    });
    expect(x).toEqual(4);
    d.changed();
    Tracker.flush();
    expect(x).toEqual(5);
    d.changed();
    // Increment to 6 and stop.
    Tracker.flush();
    expect(x).toEqual(6);
    d.changed();
    Tracker.flush();
    // Still 6!
    expect(x).toEqual(6);
  });

  test('tracker - nested run', function () {
    var a = new Tracker.Dependency();
    var b = new Tracker.Dependency();
    var c = new Tracker.Dependency();
    var d = new Tracker.Dependency();
    var e = new Tracker.Dependency();
    var f = new Tracker.Dependency();

    var buf = '';

    Tracker.autorun(function () {
      a.depend();
      buf += 'a';
      Tracker.autorun(function () {
        b.depend();
        buf += 'b';
        Tracker.autorun(function () {
          c.depend();
          buf += 'c';
          var c2 = Tracker.autorun(function () {
            d.depend();
            buf += 'd';
            Tracker.autorun(function () {
              e.depend();
              buf += 'e';
              Tracker.autorun(function () {
                f.depend();
                buf += 'f';
              });
            });
            Tracker.onInvalidate(function () {
              // only run once
              c2.stop();
            });
          });
        });
      });
      Tracker.onInvalidate(function (c1) {
        c1.stop();
      });
    });

    const expectAndClear = function (str: string) {
      expect(buf).toEqual(str);
      buf = '';
    };

    expectAndClear('abcdef');

    expect(a.hasDependents()).toEqual(true);
    expect(b.hasDependents()).toEqual(true);
    expect(c.hasDependents()).toEqual(true);
    expect(d.hasDependents()).toEqual(true);
    expect(e.hasDependents()).toEqual(true);
    expect(f.hasDependents()).toEqual(true);

    b.changed();
    expectAndClear(''); // didn't flush yet
    Tracker.flush();
    expectAndClear('bcdef');

    c.changed();
    Tracker.flush();
    expectAndClear('cdef');

    var changeAndExpect = function (v, str) {
      v.changed();
      Tracker.flush();
      expectAndClear(str);
    };

    // should cause running
    changeAndExpect(e, 'ef');
    changeAndExpect(f, 'f');
    // invalidate inner context
    changeAndExpect(d, '');
    // no more running!
    changeAndExpect(e, '');
    changeAndExpect(f, '');

    expectTrue(a.hasDependents());
    expectTrue(b.hasDependents());
    expectTrue(c.hasDependents());
    expectFalse(d.hasDependents());
    expectFalse(e.hasDependents());
    expectFalse(f.hasDependents());

    // rerun C
    changeAndExpect(c, 'cdef');
    changeAndExpect(e, 'ef');
    changeAndExpect(f, 'f');
    // rerun B
    changeAndExpect(b, 'bcdef');
    changeAndExpect(e, 'ef');
    changeAndExpect(f, 'f');

    expectTrue(a.hasDependents());
    expectTrue(b.hasDependents());
    expectTrue(c.hasDependents());
    expectTrue(d.hasDependents());
    expectTrue(e.hasDependents());
    expectTrue(f.hasDependents());

    // kill A
    a.changed();
    changeAndExpect(f, '');
    changeAndExpect(e, '');
    changeAndExpect(d, '');
    changeAndExpect(c, '');
    changeAndExpect(b, '');
    changeAndExpect(a, '');

    expectFalse(a.hasDependents());
    expectFalse(b.hasDependents());
    expectFalse(c.hasDependents());
    expectFalse(d.hasDependents());
    expectFalse(e.hasDependents());
    expectFalse(f.hasDependents());
  });

  test('tracker - flush', function () {
    var buf = '';

    var c1 = Tracker.autorun(function (c) {
      buf += 'a';
      // invalidate first time
      if (c.firstRun) c.invalidate();
    });

    expectEqual(buf, 'a');
    Tracker.flush();
    expectEqual(buf, 'aa');
    Tracker.flush();
    expectEqual(buf, 'aa');
    c1.stop();
    Tracker.flush();
    expectEqual(buf, 'aa');

    //////

    buf = '';

    var c2 = Tracker.autorun(function (c) {
      buf += 'a';
      // invalidate first time
      if (c.firstRun) c.invalidate();

      Tracker.onInvalidate(function () {
        buf += '*';
      });
    });

    expectEqual(buf, 'a*');
    Tracker.flush();
    expectEqual(buf, 'a*a');
    c2.stop();
    expectEqual(buf, 'a*a*');
    Tracker.flush();
    expectEqual(buf, 'a*a*');

    /////
    // Can flush a different run from a run;
    // no current computation in afterFlush

    buf = '';

    var c3 = Tracker.autorun(function (c) {
      buf += 'a';
      // invalidate first time
      if (c.firstRun) c.invalidate();
      Tracker.afterFlush(function () {
        buf += Tracker.isActive() ? '1' : '0';
      });
    });

    Tracker.afterFlush(function () {
      buf += 'c';
    });

    var c4 = Tracker.autorun(function (c) {
      c4 = c;
      buf += 'b';
    });

    Tracker.flush();
    expectEqual(buf, 'aba0c0');
    c3.stop();
    c4.stop();
    Tracker.flush();

    // cases where flush throws

    var ran = false;
    Tracker.afterFlush(function (arg) {
      ran = true;
      expectEqual(typeof arg, 'undefined');
      expect(function () {
        Tracker.flush(); // illegal nested flush
      }).toThrowError();
    });

    Tracker.flush();
    expectTrue(ran);

    expect(function () {
      Tracker.autorun(function () {
        Tracker.flush(); // illegal to flush from a computation
      });
    }).toThrowError();

    expect(function () {
      Tracker.autorun(function () {
        Tracker.autorun(function () {});
        Tracker.flush();
      });
    }).toThrowError();
  });

  test('tracker - lifecycle', function () {
    expectFalse(Tracker.isActive());
    expectEqual(undefined, Tracker.getCurrentComputation());

    var runCount = 0;
    var firstRun = true;
    var buf = [];
    var cbId = 1;
    var makeCb = function () {
      var id = cbId++;
      return function () {
        buf.push(id);
      };
    };

    var shouldStop = false;

    var c1 = Tracker.autorun(function (c) {
      expectTrue(Tracker.isActive());
      expectEqual(c, Tracker.getCurrentComputation());
      expectEqual(c.stopped, false);
      expectEqual(c.invalidated, false);
      expectEqual(c.firstRun, firstRun);

      Tracker.onInvalidate(makeCb()); // 1, 6, ...
      Tracker.afterFlush(makeCb()); // 2, 7, ...

      Tracker.autorun(function (x) {
        x.stop();
        c.onInvalidate(makeCb()); // 3, 8, ...

        Tracker.onInvalidate(makeCb()); // 4, 9, ...
        Tracker.afterFlush(makeCb()); // 5, 10, ...
      });
      runCount++;

      if (shouldStop) c.stop();
    });

    firstRun = false;

    expectEqual(runCount, 1);

    expectEqual(buf, [4]);
    c1.invalidate();
    expectEqual(runCount, 1);
    expectEqual(c1.invalidated, true);
    expectEqual(c1.stopped, false);
    expectEqual(buf, [4, 1, 3]);

    Tracker.flush();

    expectEqual(runCount, 2);
    expectEqual(c1.invalidated, false);
    expectEqual(buf, [4, 1, 3, 9, 2, 5, 7, 10]);

    // test self-stop
    buf.length = 0;
    shouldStop = true;
    c1.invalidate();
    expectEqual(buf, [6, 8]);
    Tracker.flush();
    expectEqual(buf, [6, 8, 14, 11, 13, 12, 15]);
  });

  test('tracker - onInvalidate', function () {
    var buf = '';

    var c1 = Tracker.autorun(function () {
      buf += '*';
    });

    var append = function (
      x,
      expectedComputation?: Tracker.Computation,
    ): Tracker.IComputationCallback {
      return function (givenComputation) {
        expectFalse(Tracker.isActive());
        expectEqual(givenComputation, expectedComputation || c1);
        buf += x;
      };
    };

    c1.onStop(append('s'));

    c1.onInvalidate(append('a'));
    c1.onInvalidate(append('b'));
    expectEqual(buf, '*');
    Tracker.autorun(function (me) {
      Tracker.onInvalidate(append('z', me));
      me.stop();
      expectEqual(buf, '*z');
      c1.invalidate();
    });
    expectEqual(buf, '*zab');
    c1.onInvalidate(append('c'));
    c1.onInvalidate(append('d'));
    expectEqual(buf, '*zabcd');
    Tracker.flush();
    expectEqual(buf, '*zabcd*');

    // afterFlush ordering
    buf = '';
    c1.onInvalidate(append('a'));
    c1.onInvalidate(append('b'));
    Tracker.afterFlush(function () {
      append('x')(c1);
      c1.onInvalidate(append('c'));
      c1.invalidate();
      Tracker.afterFlush(function () {
        append('y')(c1);
        c1.onInvalidate(append('d'));
        c1.invalidate();
      });
    });
    Tracker.afterFlush(function () {
      append('z')(c1);
      c1.onInvalidate(append('e'));
      c1.invalidate();
    });

    expectEqual(buf, '');
    Tracker.flush();
    expectEqual(buf, 'xabc*ze*yd*');

    buf = '';
    c1.onInvalidate(append('m'));
    Tracker.flush();
    expectEqual(buf, '');
    c1.stop();
    expectEqual(buf, 'ms'); // s is from onStop
    Tracker.flush();
    expectEqual(buf, 'ms');
    c1.onStop(append('S'));
    expectEqual(buf, 'msS');
  });

  test('tracker - invalidate at flush time', function () {
    // Test this sentence of the docs: Functions are guaranteed to be
    // called at a time when there are no invalidated computations that
    // need rerunning.

    var buf = [];

    Tracker.afterFlush(function () {
      buf.push('C');
    });

    // When c1 is invalidated, it invalidates c2, then stops.
    var c1 = Tracker.autorun(function (c) {
      if (!c.firstRun) {
        buf.push('A');
        c2.invalidate();
        c.stop();
      }
    });

    var c2 = Tracker.autorun(function (c) {
      if (!c.firstRun) {
        buf.push('B');
        c.stop();
      }
    });

    // Invalidate c1.  If all goes well, the re-running of
    // c2 should happen before the afterFlush.
    c1.invalidate();
    Tracker.flush();

    expectEqual(buf.join(''), 'ABC');
  });

  test('tracker - throwFirstError', function (test) {
    var d = new Tracker.Dependency();
    Tracker.autorun(function (c) {
      d.depend();

      if (!c.firstRun) throw new Error('foo');
    });

    d.changed();
    Tracker.flush();

    d.changed();
    expect(function () {
      Tracker.flush({ throwFirstError: true });
    }).toThrowError(/foo/);
  });

  test('tracker - no infinite recomputation', async function () {
    var reran = false;
    var c = Tracker.autorun(function (c) {
      if (!c.firstRun) reran = true;
      c.invalidate();
    });
    expectFalse(reran);
    await new Promise(res => {
      setTimeout(function () {
        c.stop();
        Tracker.afterFlush(function () {
          expectTrue(reran);
          expectTrue(c.stopped);
          res(null);
        });
      }, 100);
    });
  });

  test('tracker - Tracker.flush finishes', function () {
    // Currently, _runFlush will "yield" every 1000 computations... unless run in
    // Tracker.flush. So this test validates that Tracker.flush is capable of
    // running 2000 computations. Which isn't quite the same as infinity, but it's
    // getting there.
    var n = 0;
    var c = Tracker.autorun(function (c) {
      if (++n < 2000) {
        c.invalidate();
      }
    });
    expectEqual(n, 1);
    Tracker.flush();
    expectEqual(n, 2000);
  });
  //
  test('tracker - Tracker.autorun, onError option', async function (ctx) {
    var d = new Tracker.Dependency();
    const promiseDelegate = createPromiseDelegate();
    var c = Tracker.autorun(
      function (c) {
        d.depend();

        if (!c.firstRun) throw new Error('foo');
      },
      {
        onError: function (err) {
          expectEqual(err.message, 'foo');
          promiseDelegate.complete();
        },
      },
    );

    d.changed();
    Tracker.flush();
    await promiseDelegate.promise;
  });

  test('tracker - async function - basics', async function () {
    const promiseDelegate = createPromiseDelegate();
    const computation = Tracker.autorun(async function (computation) {
      expectEqual(computation.firstRun, true, 'before (firstRun)');
      expectEqual(Tracker.getCurrentComputation(), computation, 'before');
      const x = await Promise.resolve().then(() =>
        Tracker.withComputation(computation, () => {
          // The `firstRun` is `false` as soon as the first `await` happens.
          expectEqual(computation.firstRun, false, 'inside (firstRun)');
          expectEqual(Tracker.getCurrentComputation(), computation, 'inside');
          return 123;
        }),
      );
      expectEqual(x, 123, 'await (value)');
      expectEqual(computation.firstRun, false, 'await (firstRun)');
      Tracker.withComputation(computation, () => {
        expectEqual(Tracker.getCurrentComputation(), computation, 'await');
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      Tracker.withComputation(computation, () => {
        expectEqual(computation.firstRun, false, 'sleep (firstRun)');
        expectEqual(Tracker.getCurrentComputation(), computation, 'sleep');
      });
      try {
        await Promise.reject('example');
      } catch (error) {
        Tracker.withComputation(computation, () => {
          expectEqual(error, 'example', 'catch (error)');
          expectEqual(computation.firstRun, false, 'catch (firstRun)');
          expectEqual(Tracker.getCurrentComputation(), computation, 'catch');
        });
      }
      promiseDelegate.complete();
    });

    expectEqual(Tracker.getCurrentComputation(), undefined, 'outside (computation)');
    // test.instanceOf(computation, Tracker.Computation, 'outside (result)');
    await promiseDelegate.promise;
  });

  test('tracker - async function - interleaved', async function () {
    let count = 0;
    const limit = 100;
    for (let index = 0; index < limit; ++index) {
      Tracker.autorun(async function (computation) {
        expectEqual(Tracker.getCurrentComputation(), computation, `before (${index})`);
        await new Promise(resolve => setTimeout(resolve, Math.random() * limit));
        count++;
        Tracker.withComputation(computation, () => {
          expectEqual(Tracker.getCurrentComputation(), computation, `after (${index})`);
        });
      });
    }

    expectEqual(count, 0, 'before resolve');
    await new Promise(resolve => setTimeout(resolve, limit));
    expectEqual(count, limit, 'after resolve');
  });

  test('tracker - async function - parallel', async function () {
    let resolvePromise;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    let count = 0;
    const limit = 100;
    const dependency = new Tracker.Dependency();
    for (let index = 0; index < limit; ++index) {
      Tracker.autorun(async function (computation) {
        count++;
        Tracker.withComputation(computation, () => {
          dependency.depend();
        });
        await promise;
        count--;
      });
    }

    expectEqual(count, limit, 'before');
    dependency.changed();
    await nextTick();
    expectEqual(count, limit * 2, 'changed');
    resolvePromise();
    await nextTick();
    expectEqual(count, 0, 'after');
  });

  test('tracker - async function - stepped', async function () {
    let resolvePromise;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    let count = 0;
    const limit = 100;
    for (let index = 0; index < limit; ++index) {
      Tracker.autorun(async function (computation) {
        expectEqual(Tracker.getCurrentComputation(), computation, `before (${index})`);
        await promise;
        count++;
        Tracker.withComputation(computation, () => {
          expectEqual(Tracker.getCurrentComputation(), computation, `after (${index})`);
        });
      });
    }

    expectEqual(count, 0, 'before resolve');
    resolvePromise();
    await nextTick();
    expectEqual(count, limit, 'after resolve');
  });

  test('tracker - async function - synchronize - firstRunPromise', async test => {
    let counter = 0;
    await Tracker.autorun(async () => {
      expectEqual(counter, 0);
      counter += 1;
      expectEqual(counter, 1);
      await new Promise(resolve => setTimeout(resolve));
      expectEqual(counter, 1);
      counter *= 2;
      expectEqual(counter, 2);
    }).result;

    await Tracker.autorun(async () => {
      expectEqual(counter, 2);
      counter += 1;
      expectEqual(counter, 3);
      await new Promise(resolve => setTimeout(resolve));
      expectEqual(counter, 3);
      counter *= 2;
      expectEqual(counter, 6);
    }).result;
  });

  test('computation - #flush', function () {
    var i = 0,
      j = 0,
      d = new Tracker.Dependency();
    var c1 = Tracker.autorun(function () {
      d.depend();
      i = i + 1;
    });
    var c2 = Tracker.autorun(function () {
      d.depend();
      j = j + 1;
    });
    expectEqual(i, 1);
    expectEqual(j, 1);

    d.changed();
    c1.flush();
    expectEqual(i, 2);
    expectEqual(j, 1);

    Tracker.flush();
    expectEqual(i, 2);
    expectEqual(j, 2);
  });
  test('computation - #run', function () {
    var i = 0,
      d = new Tracker.Dependency(),
      d2 = new Tracker.Dependency();
    var computation = Tracker.autorun(function (c) {
      d.depend();
      i = i + 1;
      //when #run() is called, this dependency should be picked up
      if (i >= 2 && i < 4) {
        d2.depend();
      }
    });
    expectEqual(i, 1);
    computation.run();
    expectEqual(i, 2);

    d.changed();
    Tracker.flush();
    expectEqual(i, 3);

    //we expect to depend on d2 at this point
    d2.changed();
    Tracker.flush();
    expectEqual(i, 4);

    //we no longer depend on d2, only d
    d2.changed();
    Tracker.flush();
    expectEqual(i, 4);
    d.changed();
    Tracker.flush();
    expectEqual(i, 5);
  });
});
