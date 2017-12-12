/**
 * TickersController
 *
 * @description :: Server-side logic for managing tickers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var redis = require('redis');
var bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
var cacheClient = redis.createClient();


module.exports = {
  testit: function(req, res) {

    var tickersData = "tickersData";
    console.log("value of Key :: " + tickersData);
    cacheClient.getAsync(tickersData)
      .then((data) => {
        console.log(tickersData + ' isInCache =', data);
        if (data) {
          return res.ok(JSON.parse(data));
        }
        return Promise.reject('NO_CACHE');
      })
      .catch((err) => {
        if (err !== 'NO_CACHE') {
          return Promise.reject(err);
        }
        User.find()
          .then((modelData) => {
            // return data; also cache
            console.log(tickersData + ' not in cache, retrieved:', modelData);
            return cacheClient.setexAsync(tickersData, 60, JSON.stringify(modelData))
              .then(() => {
                res.ok(modelData);
              });
          })
          .catch((error) => {
            res.serverError(error);
          });
      });
  },
};