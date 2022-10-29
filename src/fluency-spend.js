const {
  map,
  first,
  logInfo,
  pprint
} = require('symbol-js');

const { requestDigital, jsonResponse } = require('./utils/request.js');

const {
  parseUtcDay,
  getUtcStartOfDay,
  getUtcStartOfMonth,
  formatUtcDay,
  getUtcMonthWeekAndDayRanges
} = require('./utils/time.js');

const { keys } = Object;
const { round } = Math;

exports.handler = async (event) => {

  const info = s => logInfo(`/fluency-spend - ${s}`);

  info(`called with...\n${pprint(event)}`);

  const {
    queryStringParameters: {
      accounts: accountsQp,
      start: startQp,
      end: endQp
    } = {}
  } = event;

  const accounts = accountsQp.split(',');
  const [startTs, endTs] = [startQp, endQp].map(parseUtcDay);

  const rangeStartTs = getUtcStartOfMonth(startTs);
  const rangeEndTs = getUtcStartOfDay();

  info(`Getting records for '${accounts.join('\',\'')}' from ${[rangeStartTs, rangeEndTs].map(formatUtcDay).join(' to ')}`);

  const ranges = getUtcMonthWeekAndDayRanges(rangeStartTs, rangeEndTs);


  const recs = await Promise.all(
    ranges.flatMap(
      ([start, end]) => accounts.map(
        account => requestDigital(
          ['ad-data-services', 'fluency-records', account], {
            start, end
          }
        )
      )
    )
  ).then(rslSets => rslSets.flat());

  info(`Got ${recs.length} records with keys: '${recs.length && keys(first(recs)).join('\',\'')}'`);

  const filtered = recs.filter(
    ({ Day }) => map(
      parseUtcDay(Day),
      dayTs => dayTs >= startTs && dayTs < endTs
    )
  );

  info(`Filtered to ${recs.length} records between ${startQp} and ${endQp}`);

  const spend = round(filtered.reduce((a, { Cost }) => Number(Cost) + a, 0) * 100) / 100;

  info(`Returning total spend of '${spend}'`);

  return jsonResponse(spend);
};
