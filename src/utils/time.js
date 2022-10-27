const {
  map,
  rest,
  last,
  range,
  pad,
  ONE_WEEK,
  ONE_DAY,
  ONE_HOUR
} = require('symbol-js');

const {
  mapOverlapping
} = require('./functional.js');

const { floor } = Math;
const { now } = Date;

const date = ts => ts ? new Date(ts) : new Date();

const time = (y = 1970, m = 0, ...args) => new Date(y, m, ...args).getTime();

const utc = (y = 1970, m = 0, ...args) => Date.UTC(y, m, ...args);

const tomorrow = () => now() + ONE_DAY;

const getUtcMonthValues = ts => map(
  date(ts), d => [d.getUTCFullYear(), d.getUTCMonth()]
);

const getUtcDayValues = ts => map(
  date(ts), d => [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]
);

const getUtcHourValues = ts => map(
  date(ts), d => [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()]
);

const getUtcStartOfDay = (ts, offset = 0) => map(
  getUtcDayValues(ts), ([y, m, d]) => utc(y, m, d + offset)
);

const getUtcBufferedStartOfDay = (ts, buffer = (4 * ONE_HOUR)) => map(
  getUtcStartOfDay(),
  startOfDay => (startOfDay + buffer) < now()
    ? startOfDay
    : startOfDay - ONE_DAY
);

const getUtcStartOfHour = (ts, offset = 0) => map(
  getUtcHourValues(ts), ([y, m, d, h]) => utc(y, m, d, h + offset)
);

const getDayValues = ts => map(date(ts), d => [d.getFullYear(), d.getMonth(), d.getDate()]);

const getStartOfDay = (ts, offset = 0) => map(getDayValues(ts), ([y, m, d]) => time(y, m, d + offset));


const parseUtcDay = s => Date.UTC(
  ...map(s.split('-').map(Number), ([y, m, ...rs]) => [y, m - 1, ...rs])
);

const toIsoString = (ts = now()) => new Date(Number(ts)).toISOString();

const iso = (tsl = now()) => new Date(tsl).toISOString().replace(
  /\.\d\d\dZ$/u, 'Z'
);

const formatUtcMonthPartition = (ts = now()) => map(
  getUtcMonthValues(ts),
  ([y, m]) => [y, pad(m + 1)].join('/')
);

const formatUtcDay = (ts = now()) => map(
  getUtcDayValues(ts),
  ([y, m, d]) => [y, pad(m + 1), pad(d)].join('-')
);

const getIntervals = (start, end, interval) => range(
  floor((end - start) / interval) + 1,
  start, interval
);

const getRanges = intervals => mapOverlapping(
  intervals.slice(0, intervals.length - 1),
  (a, b = last(intervals)) => [a, b]
);

const getUtcMonths = (startTs, endTs = now()) => (
  endTs >= startTs + ONE_DAY
    ? map(
      [startTs, endTs].map(ts => getUtcDayValues(ts)),
      ([[sy, sm, sd], [ey, em, ed]]) => [
        ...sd > 1 ? [[sy, sm, sd]] : [],
        ...map(
          (em - sm + ((ey - sy) * 12)),
          ms => range(sd > 1 ? ms : ms + 1, sd > 1 ? sm + 1 : sm).map(m => [sy + floor(m / 12), m % 12, 1])
        ),
        ...ed > 1 ? [[ey, em, ed]] : []
      ]
    )
    : []
);

const getUtcMonthTsRanges = (startTs, endTs = now()) => (
  endTs > startTs
    ? getRanges(getUtcMonths(startTs, endTs))
    : []
).map(
  ([month, nextMonth]) => [
    utc(...month),
    utc(...nextMonth.length > 2 ? nextMonth : [...nextMonth, 0])
  ]
);

const getUtcMonthRanges = (startTs, endTs) => getUtcMonthTsRanges(
  startTs, endTs
).map(
  tsRange => tsRange.map(formatUtcDay)
);

const getUtcDayTsRanges = (startTs, endTs = now()) => getRanges(
  getIntervals(startTs, endTs, ONE_DAY)
);

const getUtcDayRanges = (startTs, endTs) => getUtcDayTsRanges(
  startTs, endTs
).map(
  tsRange => tsRange.map(formatUtcDay)
);

const getUtcWeekAndDayRanges = (startTs, endTs) => getRanges(
  map(
    getIntervals(startTs, endTs, 7 * ONE_DAY),
    (
      weekTimestamps,
      lastWeekTs = last(weekTimestamps),
      dayTimestamps = lastWeekTs ? getIntervals(lastWeekTs, endTs, ONE_DAY) : []
    ) => [...weekTimestamps, ...rest(dayTimestamps)].map(formatUtcDay)
  )
);

const getUtcIntervalDayRanges = (interval, startTs, endTs) => getRanges(
  map(
    getIntervals(startTs, endTs, interval * ONE_DAY),
    (
      weekTimestamps,
      lastWeekTs = last(weekTimestamps),
      dayTimestamps = lastWeekTs ? getIntervals(lastWeekTs, endTs, ONE_DAY) : []
    ) => [...weekTimestamps, ...rest(dayTimestamps)].map(formatUtcDay)
  )
);

const getUtcStartOfMonths = (startTs, endTs) => map(
  getUtcMonthValues(startTs),
  (
    [y, m],
    startOfMonth = utc(y, m),
    closestStartOfMonth = startOfMonth >= startTs ? startOfMonth : utc(y, m + 1)
  ) => closestStartOfMonth <= endTs
    ? [closestStartOfMonth, ...getUtcStartOfMonths(closestStartOfMonth + 1, endTs)]
    : []
);

const getUtcStartOfMonthsWeeksAndDays = (startTs, endTs) => map(
  getUtcStartOfMonths(startTs, endTs),
  (
    startOfMonths,
    startOfLastMonth = last(startOfMonths),
    startOfMonthsAndWeeks = startOfLastMonth && (startOfLastMonth + ONE_WEEK <= endTs)
      ? [...startOfMonths, ...rest(getIntervals(startOfLastMonth, endTs, ONE_WEEK))]
      : startOfMonths,
    lastStartOfMonthsAndWeeks = last(startOfMonthsAndWeeks)
  ) => lastStartOfMonthsAndWeeks && (lastStartOfMonthsAndWeeks + ONE_DAY <= endTs)
    ? [...startOfMonthsAndWeeks, ...rest(getIntervals(lastStartOfMonthsAndWeeks, endTs, ONE_DAY))]
    : startOfMonthsAndWeeks
);

const getUtcMonthWeekAndDayRanges = (startTs, endTs) => getRanges(
  getUtcStartOfMonthsWeeksAndDays(startTs, endTs).map(formatUtcDay)
);


const asMonthDayYear = (t, del = '/') => map(
  new Date(t),
  d => [d.getMonth() + 1, d.getDate(), d.getFullYear()].join(del)
);

module.exports = {
  date,
  time,
  utc,
  tomorrow,
  getUtcStartOfDay,
  getUtcBufferedStartOfDay,
  getUtcStartOfHour,
  getStartOfDay,
  parseUtcDay,
  toIsoString,
  iso,
  formatUtcMonthPartition,
  formatUtcDay,
  getUtcMonthTsRanges,
  getUtcMonthRanges,
  getUtcDayTsRanges,
  getUtcDayRanges,
  getUtcWeekAndDayRanges,
  getUtcIntervalDayRanges,
  getUtcMonthWeekAndDayRanges,
  asMonthDayYear
};
