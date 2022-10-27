const {
  first,
  logInfo,
  pprint
} = require('symbol-js');

const { jsonResponse } = require('./utils/request.js');
const { readCsv } = require('./utils/s3.js');

const { keys } = Object;

exports.handler = async (event) => {

  const info = s => logInfo(`/fluency-spend - ${s}`);

  info(`called with...\n${pprint(event)}`);

  const {
    queryStringParameters: {
      accounts: accountsQp,
      start,
      end
    } = {}
  } = event;


  const fluencyCsv = readCsv('bq-imports/campaign_metrics_2.csv', 'sla-partners-fluency');
  info(`Read Fluency csv with ${fluencyCsv.length} rows and keys ${keys(first(fluencyCsv)).join(',')}`);

  return jsonResponse({ four: 4 });
};
