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
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBCH.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userBCHbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BCH server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BCH Server getBalance",
              statusCode: 400
            });
          }
          var totalBCHbalance = (parseFloat(userBCHbalanceInDb));
          if (parseFloat(userBCHbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userBCHbalanceInDb = parseFloat(user.BCHbalance);
            var userBCHbalanceInDb = new BigNumber(user.BCHbalance);
            var balanceFromCoinNode = new BigNumber(userBCHbalanceFromServer);
            var updateUserBCHBalance = userBCHbalanceInDb.plus(balanceFromCoinNode);
            clientBCH.cmd('move', labelWithPrefix,
              COMPANYACCOUNTBCH, userBCHbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromBCHAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "BCH Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in BCH server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in BCH Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      BCHbalance: parseFloat(updateUserBCHBalance)
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
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientLTC.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userLTCbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromLTCAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "LTC Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in LTC server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in LTC Server getBalance",
              statusCode: 400
            });
          }
          var totalLTCbalance = (parseFloat(userLTCbalanceInDb));
          if (parseFloat(userLTCbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userLTCbalanceInDb = parseFloat(user.LTCbalance);
            var userLTCbalanceInDb = new BigNumber(user.LTCbalance);
            var balanceFromCoinNode = new BigNumber(userLTCbalanceFromServer);
            var updateUserLTCBalance = userLTCbalanceInDb.plus(balanceFromCoinNode);
            clientLTC.cmd('move', labelWithPrefix,
              COMPANYACCOUNTLTC, userLTCbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromLTCAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "LTC Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in LTC server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in LTC Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      LTCbalance: parseFloat(updateUserLTCBalance)
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
                        console.log("Return Update details for LTC balance :: " + user);
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
  getBalINR: function(req, res, next) {
    console.log("Enter into getBalINR::: ");
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
      clientINR.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userINRbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromINRAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "INR Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in INR server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in INR Server getBalance",
              statusCode: 400
            });
          }
          var totalINRbalance = (parseFloat(userINRbalanceInDb));
          if (parseFloat(userINRbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userINRbalanceInDb = parseFloat(user.INRbalance);
            var userINRbalanceInDb = new BigNumber(user.INRbalance);
            var balanceFromCoinNode = new BigNumber(userINRbalanceFromServer);
            var updateUserINRBalance = userINRbalanceInDb.plus(balanceFromCoinNode);
            clientINR.cmd('move', labelWithPrefix,
              COMPANYACCOUNTINR, userINRbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromINRAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "INR Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in INR server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in INR Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      INRbalance: parseFloat(updateUserINRBalance)
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
                        console.log("Return Update details for INR balance :: " + user);
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