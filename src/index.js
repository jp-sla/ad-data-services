const { map, pprint, logInfo } = require('symbol-js');

const { handler: customerJobRecordsHandler } = require('./customer-job-records.js');
const { handler: customerSummariesHandler } = require('./customer-summaries.js');
const { handler: estimatesHandler } = require('./estimates.js');
const { handler: jobsHandler } = require('./jobs.js');
const { handler: summariesHandler } = require('./summaries.js');
const { handler: summariesCountHandler } = require('./summaries-count.js');
const { handler: intervalDayRangesHandler } = require('./interval-day-ranges.js');

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
  'customer-summaries': {
    handler: customerSummariesHandler,
    getEvent: compose(nameAs('provider', 'account', 'accountStart', 'start', 'end'), queryStringParameters)
  },
  'customer-job-records': {
    handler: customerJobRecordsHandler,
    getEvent: compose(nameAs('provider', 'account', 'customerId', 'cb'), queryStringParameters)
  },
  estimates: {
    handler: estimatesHandler,
    getEvent: compose(nameAs('provider', 'account', 'ids'), queryStringParameters)
  },
  jobs: {
    handler: jobsHandler,
    getEvent: compose(nameAs('provider', 'account', 'ids'), queryStringParameters)
  },
  summaries: {
    handler: summariesHandler,
    getEvent: compose(nameAs('provider', 'account', 'start', 'end'), queryStringParameters)
  },
  'summaries-count': {
    handler: summariesCountHandler,
    getEvent: nameAs('provider', 'account', 'start', 'end')
  },
  'interval-day-ranges': {
    handler: intervalDayRangesHandler,
    getEvent: nameAs('start', 'end')
  }
};

const { argv: [,, service, ...args] } = process;

map(
  HANDLER_CONFIG[service],
  ({ handler, getEvent }) => handler(getEvent(...args))
).then(
  result => logInfo(`index ->\n${pprint({ result })}`)
);
