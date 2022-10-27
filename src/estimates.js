const {
  logInfo,
  pprint
} = require('symbol-js');

const { toIsoString } = require('./utils/time.js');
const { jsonResponse } = require('./utils/request.js');
const { getEstimates } = require('./job/st-api2.js');

exports.handler = async (event) => {

  const info = s => logInfo(`/estimates ${toIsoString()} - ${s}`);

  info(`called with...\n${pprint(event)}`);


  const {
    queryStringParameters: {
      provider,
      account,
      ids: idsQpv
    } = {}
  } = event;

  const ids = idsQpv.split(',');

  info(`getting ${ids.length} estimates for ${provider}/${account}`);

  const jobs = await getEstimates(account, ids);

  info(`returning ${jobs.length} estimates`);

  return jsonResponse(jobs);
};
