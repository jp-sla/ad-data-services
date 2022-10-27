const Aws = require('aws-sdk');
const parse = require('csv-parse/lib/sync');


const {
  map,
  notEmpty
} = require('symbol-js');

const s3 = new Aws.S3({
  apiVersion: '2006-03-01'
});

const readCsv = async (Bucket, Prefix) => {

  const { Contents } = await s3.listObjectsV2({
    Bucket,
    Prefix
  }).promise();

  return await Promise.all(
    Contents.map(
      ({ Key }) => s3.getObject({
        Bucket,
        Key
      }).promise().then(
        ({ Body }) => map(
          Body.toString('ascii'),
          text => notEmpty(text)
            ? parse(text, {
              columns: true,
              skip_empty_lines: true,
              relax_column_count: true
            }).map((r, i) => ({ s3Key: Key, recordIndex: `${i}`, ...r }))
            : []
        )
      )
    )
  ).then(
    rowSets => rowSets.flat()
  );
};

module.exports = {
  readCsv
};
