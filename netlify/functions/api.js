const serverless = require('serverless-http');
const app = require('../../server'); // The exported express app

module.exports.handler = serverless(app);
