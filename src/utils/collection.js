// array / list utils

const {
  seqn,
  map,
  last
} = require('symbol-js');


const { isArray } = Array;
const { entries } = Object;

const stringify = v => typeof v === 'string' ? v : JSON.stringify(v);

const hashIdxBy = (ar = [], f = v => v) => ar.reduce(
  (a, v, i) => seqn(
    (
      r = f(v, i),
      ks = isArray(r) ? r : [r]
    ) => ks.forEach(k => a[k] ? a[k].push(i) : (a[k] = [i])),
    a
  ),
  {}
);

const getConnectedNodes = (ns, getAdjIndices = seqn((h = hashIdxBy(ns)) => i => h[ns[i]] || [])) => seqn(
  (
    visited = Array(ns.length),
    process = i => seqn(
      (visited[i] = true),
      getAdjIndices(i).reduce(
        (a, ai) => visited[ai] ? a : [...a, ...process(ai)],
        [ns[i]]
      )
    )
  ) => ns.reduce(
    (a, v, i) => visited[i] ? a : [...a, process(i)],
    []
  )
);

const dedupe = (a = [], f = stringify) => seqn(
  (
    h = {},
    r = []
  ) => seqn(
    a.forEach(
      v => map(
        f(v), k => h[k] ? h[k].push(v) : r.push(h[k] = [v])
      )
    ),
    r.map(last)
  )
);

const toLine = o => entries(o).map(ent => ent.join(': ')).join(', ');

module.exports = {
  stringify,
  hashIdxBy,
  getConnectedNodes,
  dedupe,
  toLine
};
