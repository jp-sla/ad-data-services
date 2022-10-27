const { map, pprint, logInfo } = require('symbol-js');

const { handler: fluencySpendHandler } = require('./fluency-spend.js');

const { fromEntries } = Object;

const compose = (...fs) => (...as) => fs.reduce(
  (a, f, i) => typeof f === 'function'
    ? i === 0
      ? f(...as)
      : f(a)
    : f,
  undefined
);

const nameAs = (...names) => (...args) => fromEntries(
  names.map((n, i) => [n, args[i]]).filter(([, v]) => v !== undefined)
);

const queryStringParameters = props => ({ queryStringParameters: { ...props } });

const HANDLER_CONFIG = {
  'fluency-spend': {
    handler: fluencySpendHandler,
    getEvent: compose(nameAs('accounts', 'start', 'end'), queryStringParameters)
  }
};

const { argv: [,, service, ...args] } = process;

map(
  HANDLER_CONFIG[service],
  ({ handler, getEvent }) => handler(getEvent(...args))
).then(
  result => logInfo(`index ->\n${pprint({ result })}`)
);
