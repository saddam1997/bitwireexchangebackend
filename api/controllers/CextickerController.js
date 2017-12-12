/**
 * CextickerController
 *
 * @description :: Server-side logic for managing cextickers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var request = require('request');
module.exports = {

  getChart: function(req, res, next) {
    console.log("Enter Into getChart!!! " + JSON.stringify(req.body));
    sails.log.info("Enter Into getChart!!! " + JSON.stringify(req.body));
    var lastHours = req.body.lastHours;
    var maxRespArrSize = req.body.maxRespArrSize;

    if (!lastHours || !maxRespArrSize) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    var options = {
      method: 'POST',
      url: 'https://cex.io/api/price_stats/BCH/BTC',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        'accept-language': 'en-US,en;q=0.8'
      },
      body: {
        "lastHours": lastHours,
        "maxRespArrSize": maxRespArrSize
      },
      json: true
    };
    request(options, function(error, response, body) {
      if (error) {
        console.log("Error to get current BCH Price");
        return res.json({
          "message": "Error to get history of data",
          statusCode: 401
        });
      }
      var arrayObjectTimeStamp = [];
      var arrayObject = [];
      for (var i = 0; i < body.length; i++) {
        var date = new Date(body[i].tmsp * 1000)
        var hours = date.getHours();
        var minutes = "0" + date.getMinutes();
        var formattedTime = hours + ':' + minutes.substr(-2);
        arrayObjectTimeStamp.push(formattedTime);
        arrayObject.push(parseFloat(body[i].price));
      }
      return res.send({
        "timeStamp": arrayObjectTimeStamp,
        "rate": arrayObject
      });
    });
  },
  getCurrntPriceOfBTC: function(req, res, next) {
    console.log("Enter into getCurrntPriceOfBTC");
    sails.log.info("Enter into getCurrntPriceOfBTC");
    var options = {
      method: 'GET',
      url: 'https://cex.io/api/ticker/BCH/BTC',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        'accept-language': 'en-US,en;q=0.8'
      },
      json: true
    };
    request(options, function(error, response, body) {
      if (error) {
        console.log("Error to get current BCH Price");
        return res.json({
          "message": "Error to get current BCH Price",
          statusCode: 401
        });
      } else {
        console.log("Returning Current price of BCH ");
        return res.json({
          "currentPrice": body,
          statusCode: 200
        });
      }
    });
  }
};
