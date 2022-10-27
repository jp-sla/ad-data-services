const {
  logInfo,
  pprint
} = require('symbol-js');

const { parseUtcDay, toIsoString } = require('./utils/time.js');
const { jsonResponse } = require('./utils/request.js');
const { getStApi2Summaries } = require('./job/st-api2.js');

exports.handler = async (event) => {

  const info = s => logInfo(`/summaries ${toIsoString()} - ${s}`);

  info(`called with...\n${pprint(event)}`);

  const {
    queryStringParameters: {
      provider,
      account,
      start,
      end
    } = {}
  } = event;

  info(`getting summaries for ${provider}/${account} from ${start} to ${end}`);

  const summaries = await getStApi2Summaries(
    account,
    parseUtcDay(start),
    parseUtcDay(end)
  );

  info(`returning ${summaries.length} summaries`);

  return jsonResponse(summaries);
};
