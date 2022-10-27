const {
  logInfo,
  pprint
} = require('symbol-js');

const { toIsoString } = require('./utils/time.js');
const { gzipJsonResponse } = require('./utils/request.js');
const { getApi2CustomerJrs } = require('./job/st-api2.js');

exports.handler = async (event) => {

  const info = s => logInfo(`/customer-job-records ${toIsoString()} - ${s}`);

  info(`called with...\n${pprint(event)}`);

  const {
    queryStringParameters: {
      provider,
      account,
      customerId,
      cb
    } = {}
  } = event;

  info(`getting customer job records from ${provider}/${account} for ${customerId}`);

  const jobRecs = await getApi2CustomerJrs(account, customerId, cb);

  info(`returning ${jobRecs.length} customer job records`);

  return gzipJsonResponse(jobRecs);
};
