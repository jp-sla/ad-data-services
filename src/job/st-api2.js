const {
  map,
  val,
  notEmpty,
  first,
  hashBy,
  hashByValues,
  range
} = require('symbol-js');


const { dedupe } = require('../utils/collection.js');
const { cachedRequest } = require('../utils/request.js');
const { formatUtcDay, toIsoString } = require('../utils/time.js');


const { isArray } = Array;
const { entries } = Object;
const { ceil } = Math;

const requestStApi2 = (parts, params = {}, cb = undefined, page = 1, acc = []) => cachedRequest(
  ['dps', 'st2', ...parts], {
    includeTotal: true,
    pageSize: 200,
    ...params,
    page
  },
  cb
).then(
  ({ data = [], hasMore }) => (
    hasMore
      ? requestStApi2(
        parts,
        params,
        cb,
        page + 1,
        [...acc, ...data]
      )
      : [...acc, ...data]
  )
);

const getStApi2Estimates = (account, startTs, endTs) => Promise.all([
  requestStApi2(
    [account, 'sales', 'estimates'], {
      createdOnOrAfter: toIsoString(startTs),
      createdBefore: toIsoString(endTs)
    }
  ),
  requestStApi2([account, 'sales', 'estimates'], {
    soldAfter: toIsoString(startTs - 1),
    soldBefore: toIsoString(endTs)
  })
]).then(
  rspSets => dedupe(rspSets.flat(), val('id'))
);


const getStApi2Jobs = (account, startTs, endTs) => Promise.all([
  requestStApi2([account, 'jpm', 'jobs'], {
    createdOnOrAfter: toIsoString(startTs),
    createdBefore: toIsoString(endTs)
  }),
  requestStApi2([account, 'jpm', 'jobs'], {
    completedOnOrAfter: toIsoString(startTs),
    completedBefore: toIsoString(endTs)
  }),
  requestStApi2([account, 'jpm', 'jobs'], {
    appointmentStartsOnOrAfter: toIsoString(startTs),
    appointmentStartsBefore: toIsoString(endTs)
  })
]).then(
  rspSets => dedupe(rspSets.flat(), val('id'))
);


const getStApi2EstimatesWithUpdates = (account, accountSts, startTs, endTs) => Promise.all([
  requestStApi2([account, 'sales', 'estimates'], {
    createdOnOrAfter: toIsoString(startTs),
    createdBefore: toIsoString(endTs)
  }),
  requestStApi2([account, 'sales', 'estimates'], {
    soldAfter: toIsoString(startTs - 1),
    soldBefore: toIsoString(endTs)
  }),
  ...accountSts !== startTs
    ? [
      requestStApi2([account, 'sales', 'estimates'], {
        createdOnOrAfter: toIsoString(accountSts),
        modifiedOnOrAfter: toIsoString(startTs),
        modifiedBefore: toIsoString(endTs)
      }),
      requestStApi2([account, 'sales', 'estimates'], {
        soldAfter: toIsoString(accountSts),
        modifiedOnOrAfter: toIsoString(startTs),
        modifiedBefore: toIsoString(endTs)
      })
    ]
    : []
]).then(
  rspSets => dedupe(rspSets.flat(), val('id'))
);


const getStApi2JobsWithUpdates = (account, accountSts, startTs, endTs) => Promise.all([
  requestStApi2([account, 'jpm', 'jobs'], {
    createdOnOrAfter: toIsoString(startTs),
    createdBefore: toIsoString(endTs)
  }),
  requestStApi2([account, 'jpm', 'jobs'], {
    completedOnOrAfter: toIsoString(startTs),
    completedBefore: toIsoString(endTs)
  }),
  requestStApi2([account, 'jpm', 'jobs'], {
    appointmentStartsOnOrAfter: toIsoString(startTs),
    appointmentStartsBefore: toIsoString(endTs)
  }),
  ...accountSts !== startTs
    ? [
      requestStApi2([account, 'jpm', 'jobs'], {
        createdOnOrAfter: toIsoString(accountSts),
        modifiedOnOrAfter: toIsoString(startTs),
        modifiedBefore: toIsoString(endTs)
      }),
      requestStApi2([account, 'jpm', 'jobs'], {
        completedOnOrAfter: toIsoString(accountSts),
        modifiedOnOrAfter: toIsoString(startTs),
        modifiedBefore: toIsoString(endTs)
      }),
      requestStApi2([account, 'jpm', 'jobs'], {
        appointmentStartsOnOrAfter: toIsoString(accountSts),
        modifiedOnOrAfter: toIsoString(startTs),
        modifiedBefore: toIsoString(endTs)
      })
    ]
    : []
]).then(
  rspSets => dedupe(rspSets.flat(), val('id'))
);

const resolveStApi2Ids = (parts, ids, cb) => map(
  50,
  maxIds => Promise.all(
    range(ceil(ids.length / maxIds), 0, maxIds).map(
      idx => cachedRequest(
        ['dps', 'st2', ...parts], {
          ids: ids.slice(idx, idx + maxIds).join(','),
          ...cb ? { cb } : {}
        }
      ).then(({ data = [] }) => data)
    )
  )
).then(
  sets => sets.flat()
);

const requestStApi2CustomerContacts = (account, customerId, cb) => cachedRequest(
  ['dps', 'st2', account, 'crm', 'customers', customerId, 'contacts'],
  {},
  cb
).then(
  ({ data = [] }) => map(
    isArray(data) ? data : [], // handles inactive customer [409]
    contacts => contacts.map(contact => ({ customerId, ...contact }))
  )
);


const resolveStApi2Contacts = (account, customerIds, cb) => Promise.all(
  customerIds.map(
    customerId => requestStApi2CustomerContacts(account, customerId, cb)
  )
).then(
  sets => sets.flat()
);

const resolveStApi2Invoices = (account, customerIds, cb) => Promise.all(
  customerIds.map(
    customerId => cachedRequest(
      ['dps', 'st2', account, 'accounting', 'invoices'],
      { customerId },
      cb
    ).then(
      ({ data = [] }) => map(
        isArray(data) ? data : [],
        contacts => contacts.map(contact => ({ customerId, ...contact }))
      )
    )
  )
).then(
  sets => sets.flat()
);

const numberFilter = ({ type, value }) => (type === 'Phone' || type === 'MobilePhone')
  && notEmpty(value)
  && !/^\d{0,3}0+$/u.test(value);

const emailFilter = ({ type, value }) => type === 'Email'
  && notEmpty(value)
  && !/^no[em]{2}ail?@/iu.test(value)
  && !/^no@/iu.test(value)
  && !/notgiven@/iu.test(value)
  && !/^dispatch@/iu.test(value)
  && !/^noreply@/iu.test(value)
  && !/^declined@/iu.test(value);

const getStApi2CustomerSummaries = (account, accountSts, startTs, endTs) => Promise.all([
  getStApi2EstimatesWithUpdates(account, accountSts, startTs, endTs),
  getStApi2JobsWithUpdates(account, accountSts, startTs, endTs)
]).then(
  ([estimates, jobs]) => map(
    [hashByValues(jobs, 'id'), formatUtcDay(endTs)],
    ([jobsById, end]) => resolveStApi2Ids(
      [account, 'jpm', 'jobs'],
      dedupe(estimates.map(({ jobId }) => jobId).filter(notEmpty).filter(id => !jobsById[id])), end
    ).then(
      estJobs => map(
        dedupe([...jobs, ...estJobs].map(({ customerId }) => customerId)),
        customerIds => resolveStApi2Contacts(
          account, customerIds, end
        ).then(
          contacts => entries(
            hashBy(contacts, ({ customerId }) => customerId)
          ).map(
            ([customerId, cs]) => [
              [
                ...cs.filter(numberFilter).map(({ value }) => value),
                ...cs.filter(emailFilter).map(({ value }) => value)
              ],
              customerId
            ]
          )
        )
      )
    )
  )
);


const getStApi2Summaries = (account, startTs, endTs) => Promise.all([
  getStApi2Estimates(
    account, startTs, endTs
  ),
  getStApi2Jobs(
    account, startTs, endTs
  )
]).then(
  ([estimates, jobs]) => map(
    formatUtcDay(endTs),
    (
      end,
      jobsById = hashByValues(jobs, 'id'),
      adlJobIds = dedupe(estimates.map(val('jobId')).filter(id => notEmpty(id) && !jobsById[id]))
    ) => resolveStApi2Ids(
      [account, 'jpm', 'jobs'], adlJobIds, end
    ).then(
      adlJobs => map(
        [...jobs, ...adlJobs],
        allJobs => resolveStApi2Contacts(
          account, dedupe(allJobs.map(val('customerId'))), end
        ).then(
          contacts => map(
            hashByValues(contacts, 'customerId'),
            (
              contactsByCustomerId,
              jobsByCustomerId = hashByValues(allJobs, 'customerId'),
              contactsByJobId = hashBy(
                contacts, ({ customerId }) => map(
                  jobsByCustomerId[customerId],
                  (js = []) => js.flatMap(val('id'))
                )
              ),
              getNumbersAndEmails = jid => map(
                contactsByJobId[jid],
                (
                  cs = [],
                  numbers = cs.filter(numberFilter).map(({ value }) => value),
                  emails = cs.filter(emailFilter).map(({ value }) => value.toLowerCase())
                ) => ({
                  ...numbers.length ? { numbers } : {},
                  ...emails.length ? { emails } : {}
                })
              )
            ) => [
              ...estimates.map(
                ({ id, jobId }) => ({
                  source: 'st-api2', type: 'estimate-summary', id, ...getNumbersAndEmails(jobId)
                })
              ),
              ...jobs.map(
                ({ id }) => ({
                  source: 'st-api2', type: 'job-summary', id, ...getNumbersAndEmails(id)
                })
              )
            ]
          )
        )
      )
    )
  )
);
//
// const getJobs = (account, ids) => resolveStApi2Ids(
//   [account, 'jpm', 'jobs'], ids, 'blee02'
// ).then(
//   jobs => map(
//     [
//       dedupe(jobs.map(({ customerId }) => customerId)),
//       dedupe(jobs.flatMap(({ firstAppointmentId: fid, lastAppointmentId: lid }) => [fid, lid].filter(notEmpty)))
//     ],
//     ([customerIds, appointmentIds]) => Promise.all([
//       resolveStApi2Ids([account, 'crm', 'customers'], customerIds, 'blee01'),
//       resolveStApi2Contacts(account, customerIds, 'blee01'),
//       resolveStApi2Invoices(account, customerIds, 'blee01'),
//       resolveStApi2Ids([account, 'jpm', 'appointments'], appointmentIds, 'blee01'),
//       requestStApi2([account, 'settings', 'business-units'], { cb: 'blee01' }),
//       requestStApi2([account, 'marketing', 'campaigns'], { cb: 'blee01' }),
//       requestStApi2([account, 'jpm', 'job-types'], { cb: 'blee01' })
//     ]).then(
//       ([customers, contacts, invoices, appointments, businessUnits, campaigns, jobTypes]) => map(
//         [
//           hashByValues(contacts, 'customerId'),
//           hashByValues(invoices.filter(({ job }) => notEmpty(job)), 'job', 'id'),
//           hashByValues(appointments, 'id'),
//           hashByValues(businessUnits, 'id'),
//           hashByValues(campaigns, 'id'),
//           hashByValues(jobTypes, 'id')
//         ],
//         (
//           [contactsByCustomerId, invoicesByJobId, appointmentsById, businessUnitsById, campaignsById, jobTypesById],
//           customersWithContacts = customers.map(
//             customer => map(customer, ({ id }) => ({ ...customer, contacts: contactsByCustomerId[id] }))
//           ),
//           customersById = hashByValues(customersWithContacts, 'id')
//         ) => jobs.map(
//           job => map(
//             job,
//             ({ id, businessUnitId, campaignId, customerId, firstAppointmentId, jobTypeId, lastAppointmentId }) => ({
//               source: 'service-titan-api2',
//               type: 'job',
//               data: {
//                 ...job,
//                 businessUnit: first(businessUnitsById[businessUnitId]),
//                 campaign: first(campaignsById[campaignId]),
//                 customer: first(customersById[customerId]),
//                 firstAppointment: first(appointmentsById[firstAppointmentId]),
//                 invoices: invoicesByJobId[id],
//                 jobType: first(jobTypesById[jobTypeId]),
//                 lastAppointment: first(appointmentsById[lastAppointmentId])
//               }
//             })
//           )
//         )
//       )
//     )
//   )
// );
//
// const getEstimates = (account, ids) => resolveStApi2Ids(
//   [account, 'sales', 'estimates'], ids, 'blee02'
// ).then(
//   estimates => getJobs(account, dedupe(estimates.map(({ jobId }) => jobId))).then(
//     jobsRecs => map(
//       hashByValues(jobsRecs.map(({ data: job }) => job), 'id'),
//       jobsById => estimates.map(
//         estimate => map(
//           estimate,
//           ({ jobId }) => ({
//             source: 'service-titan-api2',
//             type: 'estimate',
//             data: {
//               ...estimate,
//               job: first(jobsById[jobId])
//             }
//           })
//         )
//       )
//     )
//   )
// );

const getApi2CustomerJrs = (account, customerId, cb) => Promise.all([
  cachedRequest(['dps', 'st2', account, 'crm', 'customers', customerId], {}, cb),
  requestStApi2CustomerContacts(account, customerId, cb),
  requestStApi2([account, 'jpm', 'jobs'], { customerId }, cb),
  requestStApi2([account, 'accounting', 'invoices'], { customerId }, cb),
  requestStApi2([account, 'settings', 'business-units'], {}, cb),
  requestStApi2([account, 'marketing', 'campaigns'], {}, cb),
  requestStApi2([account, 'jpm', 'job-types'], {}, cb)
]).then(
  ([cusRec, contacts, jobRecs, invoices, businessUnits, campaigns, jobTypes]) => map(
    [
      jobRecs.map(({ id }) => id),
      dedupe(jobRecs.flatMap(({ firstAppointmentId: fid, lastAppointmentId: lid }) => [fid, lid].filter(notEmpty)))
    ],
    ([jobIds, appointmentIds]) => Promise.all([
      Promise.all(
        jobIds.map(
          jobId => requestStApi2([account, 'sales', 'estimates'], { jobId }, cb)
        )
      ).then(rslSets => rslSets.flat()),
      resolveStApi2Ids([account, 'jpm', 'appointments'], appointmentIds, cb)
    ]).then(
      ([estRecs, appointments]) => map(
        [
          { ...cusRec, contacts },
          hashByValues(invoices.filter(({ job }) => notEmpty(job)), 'job', 'id'),
          hashByValues(appointments, 'id'),
          hashByValues(businessUnits, 'id'),
          hashByValues(campaigns, 'id'),
          hashByValues(jobTypes, 'id')
        ],
        ([customer, invoicesByJobId, appointmentsById, businessUnitsById, campaignsById, jobTypesById]) => map(
          jobRecs.map(
            jobRec => map(
              jobRec,
              ({ id, businessUnitId, campaignId, firstAppointmentId, jobTypeId, lastAppointmentId }) => ({
                ...jobRec,
                customer,
                businessUnit: first(businessUnitsById[businessUnitId]),
                campaign: first(campaignsById[campaignId]),
                firstAppointment: first(appointmentsById[firstAppointmentId]),
                invoices: invoicesByJobId[id],
                jobType: first(jobTypesById[jobTypeId]),
                lastAppointment: first(appointmentsById[lastAppointmentId])
              })
            )
          ),
          jobs => [
            ...jobs.map(data => ({ source: 'service-titan-api2', type: 'job', data })),
            ...map(
              hashByValues(jobs, 'id'),
              jobsById => estRecs.map(
                estRec => map(
                  estRec,
                  ({ jobId }) => ({
                    source: 'service-titan-api2',
                    type: 'estimate',
                    data: { ...estRec, job: first(jobsById[jobId]) }
                  })
                )
              )
            )
          ]
        )
      )
    )
  )
);

module.exports = {
  requestStApi2,
  getStApi2Estimates,
  getStApi2Jobs,
  getStApi2EstimatesWithUpdates,
  getStApi2JobsWithUpdates,
  requestStApi2CustomerContacts,
  resolveStApi2Contacts,
  resolveStApi2Invoices,
  resolveStApi2Ids,
  getStApi2CustomerSummaries,
  getStApi2Summaries,
  getApi2CustomerJrs
};
