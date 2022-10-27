const fetch = require('node-fetch');
const { gzip } = require('zlib');
const https = require('https');

const {
  seqn,
  map,
  pprint,
  logInfo
} = require('symbol-js');


const { dedupe } = require('./collection.js');
const { formatUtcMonthPartition } = require('./time.js');


const { entries, values } = Object;

const DIGITAL_ROOT = 'https://searchlight.digital';

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 7
});

const error = (msg) => {
  throw Error(msg);
};

const getQueryString = (p = {}) => map(
  entries(p).map(ent => ent.map(v => encodeURIComponent(v)).join('=')).join('&'),
  qs => qs ? `?${qs}` : ''
);

const getDigitalUri = (parts, params) => `${[DIGITAL_ROOT, ...parts].join('/')}${getQueryString(params)}`;

const fetchUri = seqn(
  (
    attempt = (uri, accept, n = 0) => seqn(
      logInfo(`-> ${uri}`),
      fetch(uri, {
        agent,
        headers: {
          'Content-Type': 'application/json',
          Authorization: '5ae05bd2-0490-49e4-bd10-a611eea35aaf'
        }
      }).then(
        response => map(
          response,
          ({ ok, status, statusText }) => seqn(
            logInfo(`[${statusText}] <- ${uri}`),
            ok
              ? response.json().then(
                json => accept(json)
              )
              : status === 503
                ? n < 25
                  ? attempt(uri, accept, n + 1)
                  : error('|ERROR|<- Received 503 after maximum number of attempts')
                : error('|ERROR|<- Received unexpected response')
          )
        )
      )
    )
  ) => uri => new Promise(accept => attempt(uri, accept))
);

const [
  getCachedResult,
  setCachedResult,
  getCachedFullKey
] = map(
  {},
  (
    cache,
    getFullKey = (key, cb) => `${key}${cb === undefined ? '' : `|${cb}`}`
  ) => [
    (key, cb) => cache[getFullKey(key, cb)],
    (key, cb, result) => seqn(
      // (cache = filterEntries(([k]) => !k.startsWith(`${account}/${customerId}`))),
      (cache[getFullKey(key, cb)] = result),
      result
    ),
    getFullKey
  ]
);


const cachedRequest = (parts, params, cb) => map(
  [...parts, ...values(params)].join('/'),
  (
    key,
    cachedResponse = getCachedResult(key, cb)
  ) => cachedResponse
    ? Promise.resolve(cachedResponse)
    : fetchUri(
      getDigitalUri(parts, { ...params, ...cb ? { cb } : {} })
    ).then(
      result => map(
        logInfo(`(NEAR MISS) <- ${getCachedFullKey(key, cb)}`),
        setCachedResult(key, cb, result)
      )
    )
);

const requestDigital = (...args) => error(`requestDigital called with...\n${pprint(args)}`);

const requestMatching = (account, type, source, startTs, endTs) => Promise.all(
  dedupe([startTs, endTs].map(formatUtcMonthPartition)).map(
    path => requestDigital(['service', 'matching', account], {
      type,
      source,
      path
    })
  )
).then(
  matchingSets => matchingSets.flat()
);


const gzipJsonResponse = c => new Promise(
  (accept, reject) => gzip(
    JSON.stringify(c),
    (err, gzipped) => (
      err
        ? reject(Error(err))
        : accept({
          body: gzipped.toString('base64'),
          isBase64Encoded: true,
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip',
            'Cache-Control': 'max-age=2592000'
          }
        })
    )
  )
);

const jsonResponse = c => map(
  JSON.stringify(c),
  body => ({
    body,
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=2592000'
    }
  })
);


module.exports = {
  getQueryString,
  getDigitalUri,
  fetchUri,
  cachedRequest,
  requestDigital,
  requestMatching,
  gzipJsonResponse,
  jsonResponse
};
