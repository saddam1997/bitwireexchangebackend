/**
 * BalanceController
 *
 * @description :: Server-side logic for managing balances
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

//BTC Wallet Details
var bitcoinBTC = require('bitcoin');
var clientBTC = new bitcoinBTC.Client({
  host: sails.config.company.clientBTChost,
  port: sails.config.company.clientBTCport,
  user: sails.config.company.clientBTCuser,
  pass: sails.config.company.clientBTCpass
});
//BCH Wallet Details
var bitcoinBCH = require('bitcoin');
var clientBCH = new bitcoinBCH.Client({
  host: sails.config.company.clientBCHhost,
  port: sails.config.company.clientBCHport,
  user: sails.config.company.clientBCHuser,
  pass: sails.config.company.clientBCHpass
});
//LTC Wallet Details
var bitcoinLTC = require('bitcoin');
var clientLTC = new bitcoinLTC.Client({
  host: sails.config.company.clientLTChost,
  port: sails.config.company.clientLTCport,
  user: sails.config.company.clientLTCuser,
  pass: sails.config.company.clientLTCpass
});
//INR Wallet Details
var bitcoinINR = require('bitcoin');
var clientINR = new bitcoinINR.Client({
  host: sails.config.company.clientINRhost,
  port: sails.config.company.clientINRport,
  user: sails.config.company.clientINRuser,
  pass: sails.config.company.clientINRpass
});
const LABELPREFIX = sails.config.common.LABELPREFIX;

const COMPANYACCOUNTBTC = sails.config.common.COMPANYACCOUNTBTC;
const COMPANYACCOUNTBCH = sails.config.common.COMPANYACCOUNTBCH;
const COMPANYACCOUNTLTC = sails.config.common.COMPANYACCOUNTLTC;
const COMPANYACCOUNTINR = sails.config.common.COMPANYACCOUNTINR;

module.exports = {
  getBalBTC: function(req, res, next) {
    console.log("Enter into getBalBTC::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBTC.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userBTCbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBTCAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BTC Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BTC server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BTC Server getBalance",
              statusCode: 400
            });
          }
          var totalBTCbalance = (parseFloat(userBTCbalanceInDb));
          if (parseFloat(userBTCbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userBTCbalanceInDb = parseFloat(user.BTCbalance);
            var userBTCbalanceInDb = new BigNumber(user.BTCbalance);
            var balanceFromCoinNode = new BigNumber(userBTCbalanceFromServer);
            var updateUserBTCBalance = userBTCbalanceInDb.plus(balanceFromCoinNode);
            clientBTC.cmd('move', labelWithPrefix,
              COMPANYACCOUNTBTC, userBTCbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromBTCAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "BTC Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in BTC server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in BTC Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      BTCbalance: parseFloat(updateUserBTCBalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User balance",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                        email: userMailId
                      }).populateAll().exec(function(err, user) {
                        if (err) {
                          return res.json({
                            "message": "Error to find user",
                            statusCode: 401
                          });
                        }
                        if (!user) {
                          return res.json({
                            "message": "Invalid email!",
                            statusCode: 401
                          });
                        }
                        console.log("Return Update details for BTC balance :: " + user);
                        res.json({
                          user: user,
                          statusCode: 200
                        });
                      });
                    });
                }
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
};