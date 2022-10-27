const {
  logInfo,
  pprint
} = require('symbol-js');

const { toIsoString } = require('./utils/time.js');
const { jsonResponse } = require('./utils/request.js');
const { getJobs } = require('./job/st-api2.js');

exports.handler = async (event) => {

  const info = s => logInfo(`/summaries ${toIsoString()} - ${s}`);

  info(`called with...\n${pprint(event)}`);

  const {
    queryStringParameters: {
      provider,
      account,
      ids: idsQpv
    } = {}
  } = event;

  const ids = idsQpv.split(',');

  info(`getting ${ids.length} jobs for ${provider}/${account}`);

  const jobs = await getJobs(account, ids);

  info(`returning ${jobs.length} jobs`);

  return jsonResponse(jobs);
};
