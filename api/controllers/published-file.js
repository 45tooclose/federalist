const PublishedBranchSerializer = require('../serializers/published-branch');
const S3PublishedFileLister = require('../services/S3PublishedFileLister');
const siteAuthorizer = require('../authorizers/site');
const { Site } = require('../models');

module.exports = {
  find: (req, res) => {
    let site;
    let pagedFilesResponse;
    const branch = req.params.branch;

    const startAtKey = req.query.startAtKey || null;

    Promise.resolve(Number(req.params.site_id)).then((siteId) => {
      if (isNaN(siteId)) {
        throw 404;
      }
      return Site.findById(siteId);
    }).then((model) => {
      if (!model) { throw 404; }

      site = model;
      return siteAuthorizer.findOne(req.user, site);
    }).then(() => S3PublishedFileLister.listPagedPublishedFilesForBranch(site, branch, startAtKey))
    .then((response) => {
      pagedFilesResponse = response;
      return PublishedBranchSerializer.serialize(site, branch);
    })
    .then((branchJSON) => {
      pagedFilesResponse.files = pagedFilesResponse.files.map(file =>
        Object.assign(file, { publishedBranch: branchJSON })
      );

      res.json(pagedFilesResponse);
    })
    .catch(res.error);
  },
};
