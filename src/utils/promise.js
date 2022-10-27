const {
  seqn,
  logInfo
} = require('symbol-js');

const wait = timeout => new Promise(
  resolve => setTimeout(() => resolve(timeout), timeout)
);


const [
  throttle,
  setThrottleMax
] = seqn(
  (
    queue = [],
    outstanding = 0,
    maxOutstanding = 5,
    exec = promiser => seqn(
      (outstanding += 1),
      logInfo(`Throttle: executing promise with ${outstanding} out of ${maxOutstanding} outstanding`),
      promiser().then(
        result => seqn(
          (outstanding -= 1),
          logInfo(`Throttle: promise completed with ${outstanding} out of ${maxOutstanding} outstanding`),
          outstanding < maxOutstanding && queue.length
            ? exec(queue.pop())
            : undefined,
          result
        )
      )
    )
  ) => [
    promiser => outstanding < maxOutstanding
      ? exec(promiser)
      : queue.unshift(promiser),
    max => logInfo(`Throttle - setting max to ${max}`) || (maxOutstanding = max)
  ]
);

const syncRcr = (acc, op0, ...ops) => op0().then(
  result => (
    ops.length
      ? syncRcr([...acc, result], ...ops)
      : [...acc, result]
  )
);

const sync = ops => syncRcr([], ...ops);

module.exports = {
  wait,
  throttle,
  setThrottleMax,
  sync
};
