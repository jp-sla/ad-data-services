const {
  logInfo,
  pprint
} = require('symbol-js');

const { parseUtcDay, formatUtcDay, getUtcMonthWeekAndDayRanges } = require('./utils/time.js');

exports.handler = async (event) => {

  logInfo(`/account-summaries ->\n${pprint(event)}`);

  const {
    start: startP,
    end: endP = formatUtcDay()
  } = event;

  return getUtcMonthWeekAndDayRanges(...[startP, endP].map(parseUtcDay)).map(
    ([start, end]) => ({ start, end })
  );
};
