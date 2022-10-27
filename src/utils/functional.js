// functional utils

const mapOverlapping = (a = [], f = (x, y) => [x, y]) => a.map(
  (v, i, ...args) => f(v, a[i + 1], i, ...args)
);

const some = (tf, ...args) => args.some(a => tf(a));
const every = (tf, ...args) => args.every(a => tf(a));


module.exports = {
  mapOverlapping,
  some,
  every
};
