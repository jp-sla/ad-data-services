// string utils

const {
  map
} = require('symbol-js');

const capitalize = (s = '') => `${s.slice(0, 1).toUpperCase()}${s.slice(1)}`;

const upper = (s = '') => s.toUpperCase();

const lower = (s = '') => s.toLowerCase();

const replace = (s, p, r = '') => s.replace(
  typeof p === 'string'
    ? new RegExp(p, 'gu')
    : p,
  r
);

const key = (s = '') => lower(replace(s, '_', '-'));

// taken from https://stackoverflow.com/a/16702965
const isPhone = s => (
  /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/u.test(s)
);

const parsePhone = s => (
  typeof s === 'string'
    ? map(
      s.replace(/[^0-9]/ug, ''),
      stripped => stripped.length === 11 && stripped.startsWith('1')
        ? stripped.slice(1, 11)
        : stripped.length === 10
          ? stripped
          : undefined
    )
    : undefined
);

const isEmail = s => /^\s*([^@\s]+@[^@\s]+\.[^@\s]+\s*)$/u.test(s);
const scrubEmail = (email = '') => (
  typeof email === 'string'
    ? map(email.toLowerCase().trim(), s => isEmail(s) ? s : undefined)
    : undefined
);

const isName = v => /^[a-zA-Z]+(?:(?: and)?\.?[ -][a-zA-Z]*){0,4}$/u.test(v);

const scrubCommas = s => (s || '').replaceAll(',', '&comma;');


module.exports = {
  capitalize,
  upper,
  lower,
  replace,
  key,
  isPhone,
  parsePhone,
  isEmail,
  scrubEmail,
  isName,
  scrubCommas
};
