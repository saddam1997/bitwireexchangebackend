/**
 * UsertransactionController
 *
 * @description :: Server-side logic for managing usertransactions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
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
var transactionFeeBCH = sails.config.company.txFeeBCH;
var transactionFeeBTC = sails.config.company.txFeeBTC;
var transactionFeeLTC = sails.config.company.txFeeLTC;
var transactionFeeINR = sails.config.company.txFeeINR;

const LABELPREFIX = sails.config.common.LABELPREFIX;

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
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserBCH Balance ::" + user.BTCMainbalance);
      var userBTCMainbalanceInDb = parseFloat(user.BTCMainbalance);
      var userFreezedBTCMainbalanceInDb = parseFloat(user.FreezedBTCbalance);
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBTC.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userBTCMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BCH server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BCH Server",
              statusCode: 400
            });
          }
          var totalBTCMainbalance = (parseFloat(userBTCMainbalanceInDb));
          console.log(parseFloat(userBTCMainbalanceFromServer) + " on server and in DB BTC + Freezed :: " + parseFloat(totalBTCMainbalance));
          if (parseFloat(userBTCMainbalanceFromServer) > parseFloat(totalBTCMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                BTCMainbalance: parseFloat(userBTCMainbalanceFromServer)
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
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
            // res.json({
            //   "message": "No need to update",
            //   statusCode: 201
            // });
          }
        });
    });
  },
  getBalBCH: function(req, res, next) {
    console.log("Enter into getBalBCH::: ");
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
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserBCH Balance ::" + user.BCHMainbalance);
      var userBCHMainbalanceInDb = parseFloat(user.BCHMainbalance);
      var userFreezedBCHMainbalanceInDb = parseFloat(user.FreezedBCHbalance);
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBCH.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userBCHMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code == -5) {
              return res.json({
                "message": "Invalid BCH Address",
                statusCode: 400
              });
            }
            if (err.code && err.code == -6) {
              return res.json({
                "message": "Account has Insufficient funds",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BCH server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BCH Server",
              statusCode: 400
            });
          }
          var totalBCHMainbalance = (parseFloat(userBCHMainbalanceInDb));
          console.log(parseFloat(userBCHMainbalanceFromServer) + " BHC server and in DB BCH + Freezed " + parseFloat(totalBCHMainbalance));
          if (parseFloat(userBCHMainbalanceFromServer) > parseFloat(totalBCHMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                BCHMainbalance: parseFloat(userBCHMainbalanceFromServer)
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
                  console.log("Return Update details for BCH balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
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
  getBalLTC: function(req, res, next) {
    console.log("Enter into getBalLTC::: ");
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
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserBCH Balance ::" + user.LTCMainbalance);
      var userLTCMainbalanceInDb = parseFloat(user.LTCMainbalance);
      var userFreezedLTCMainbalanceInDb = parseFloat(user.FreezedLTCbalance);

      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);

      clientLTC.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userLTCMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code == -5) {
              return res.json({
                "message": "Invalid BCH Address",
                statusCode: 400
              });
            }
            if (err.code && err.code == -6) {
              return res.json({
                "message": "Account has Insufficient funds",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BCH server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BCH Server",
              statusCode: 400
            });
          }
          var totalLTCMainbalance = (parseFloat(userLTCMainbalanceInDb));
          console.log(parseFloat(userLTCMainbalanceFromServer) + " BHC server and in DB BCH + Freezed " + parseFloat(totalLTCMainbalance));
          if (parseFloat(userLTCMainbalanceFromServer) > parseFloat(totalLTCMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                LTCMainbalance: parseFloat(userLTCMainbalanceFromServer)
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
                  console.log("Return Update details for BCH balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
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
  getBalINR: function(req, res, next) {
    console.log("Enter into getBalBCH::: ");
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
      console.log("Valid User :: " + JSON.stringify(user));
      console.log("UserBCH Balance ::" + user.INRMainbalance);
      var userINRMainbalanceInDb = parseFloat(user.INRMainbalance);
      var userFreezedINRMainbalanceInDb = parseFloat(user.FreezedINRbalance);

      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);

      clientBCH.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userINRMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code == -5) {
              return res.json({
                "message": "Invalid BCH Address",
                statusCode: 400
              });
            }
            if (err.code && err.code == -6) {
              return res.json({
                "message": "Account has Insufficient funds",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BCH server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BCH Server",
              statusCode: 400
            });
          }
          var totalINRMainbalance = (parseFloat(userINRMainbalanceInDb));
          console.log(parseFloat(userINRMainbalanceFromServer) + " BHC server and in DB BCH + Freezed " + parseFloat(totalINRMainbalance));
          if (parseFloat(userINRMainbalanceFromServer) > parseFloat(totalINRMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                INRMainbalance: parseFloat(userINRMainbalanceFromServer)
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
                  console.log("Return Update details for BCH balance :: " + user);
                  res.json({
                    user: user,
                    statusCode: 200
                  });
                });
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