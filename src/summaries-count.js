const {
  logInfo,
  pprint
} = require('symbol-js');

const { fetchUri, getDigitalUri } = require('./utils/request.js');
const { toIsoString } = require('./utils/time.js');


const info = s => logInfo(`/customer-summaries-count ${toIsoString()} - ${s}`);

exports.handler = async (event) => {

  info(`called with \n${pprint(event)}`);

  const {
    provider,
    account,
    accountStart,
    start,
    end
  } = event;

  const summaries = await fetchUri(
    getDigitalUri(['ad-data-services', 'customer-summaries'], {
      provider,
      account,
      accountStart,
      start,
      end
    })
  );

  info(`returning ${summaries.length} summaries`);

  return summaries.length;
};
