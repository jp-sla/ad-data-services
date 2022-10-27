const {
  logInfo,
  pprint
} = require('symbol-js');

const { parseUtcDay, toIsoString } = require('./utils/time.js');
const { cachedRequest, jsonResponse } = require('./utils/request.js');
const { getStApi2CustomerSummaries } = require('./job/st-api2.js');

exports.handler = async (event) => {

  const info = s => logInfo(`/customer-summaries ${toIsoString()} - ${s}`);

  info(`called with...\n${pprint(event)}`);

  const {
    queryStringParameters: {
      provider,
      account,
      accountStart,
      start,
      end
    } = {}
  } = event;

  info(`getting summaries for ${provider}/${account} from ${start} to ${end}`);

  const summaries = await getStApi2CustomerSummaries(
    account, ...[accountStart, start, end].map(parseUtcDay)
  );

  info(`returning ${summaries.length} summaries`);

  return jsonResponse(summaries);
};
