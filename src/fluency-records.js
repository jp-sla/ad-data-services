const {
  map,
  first,
  logInfo,
  pprint
} = require('symbol-js');

const { jsonResponse } = require('./utils/request.js');
const { readCsv } = require('./utils/s3.js');
const { parseUtcDay } = require('./utils/time.js');

const { keys } = Object;

const ACCOUNT_IDS = {
  randazzo: '22845',
  vredevoogd: '22818',
  hager: '20145',
  'r-mech': '20133',
  aplusderr: '20132',
  schaafsma: '20088',
  action: '22763',
  reliable: '21590',
  nelson: '24242',
  greenbox: '28329',
  climate: '28343',
  turbo: '28342',
  classic: '28383',
  courtney: '28390',
  faszold: '28386',
  harster: '28417',
  weis: '28409',
  masters: '30322',
  flame: '30400',
  cmheating: '3737',
  gen3: '3468',
  church: '27848',
  'blue-frost': '30542',
  iceberg: '31083'
};

exports.handler = async (event) => {

  const info = s => logInfo(`/fluency-records - ${s}`);

  info(`called with...\n${pprint(event)}`);

  const {
    pathParameters: { account },
    queryStringParameters: {
      start,
      end
    } = {}
  } = event;

  const accountId = ACCOUNT_IDS[account];

  info(`Getting fluency records for ${account} (${accountId}) from ${start} to ${end}`);

  const recs = await readCsv('sla-partners-fluency', 'bq-imports/campaign_metrics_2.csv');

  info(`Read Fluency csv with ${recs.length} rows and keys ${keys(first(recs)).join(',')}`);

  const [startTs, endTs] = [start, end].map(parseUtcDay);

  const filtered = recs.filter(
    ({ 'Campaign Name': campaignName, Day, 'Fluency Account Plan ID': id }) => (
      id === accountId
      && !/^LocalServicesCampaign/u.test(campaignName)
      && map(
        parseUtcDay(Day),
        dayTs => dayTs >= startTs && dayTs < endTs
      )
    )
  );

  info(`returning ${filtered.length} records filtered records`);

  return jsonResponse(filtered);
};
