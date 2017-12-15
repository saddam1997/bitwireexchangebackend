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

//USD Wallet Details
var bitcoinUSD = require('bitcoin');
var clientUSD = new bitcoinUSD.Client({
  host: sails.config.company.clientUSDhost,
  port: sails.config.company.clientUSDport,
  user: sails.config.company.clientUSDuser,
  pass: sails.config.company.clientUSDpass
});

//EUR Wallet Details
var bitcoinEUR = require('bitcoin');
var clientEUR = new bitcoinEUR.Client({
  host: sails.config.company.clientEURhost,
  port: sails.config.company.clientEURport,
  user: sails.config.company.clientEURuser,
  pass: sails.config.company.clientEURpass
});

//GBP Wallet Details
var bitcoinGBP = require('bitcoin');
var clientGBP = new bitcoinGBP.Client({
  host: sails.config.company.clientGBPhost,
  port: sails.config.company.clientGBPport,
  user: sails.config.company.clientGBPuser,
  pass: sails.config.company.clientGBPpass
});

//BRL Wallet Details
var bitcoinBRL = require('bitcoin');
var clientBRL = new bitcoinBRL.Client({
  host: sails.config.company.clientBRLhost,
  port: sails.config.company.clientBRLport,
  user: sails.config.company.clientBRLuser,
  pass: sails.config.company.clientBRLpass
});

//PLN Wallet Details
var bitcoinPLN = require('bitcoin');
var clientPLN = new bitcoinPLN.Client({
  host: sails.config.company.clientPLNhost,
  port: sails.config.company.clientPLNport,
  user: sails.config.company.clientPLNuser,
  pass: sails.config.company.clientPLNpass
});

//CAD Wallet Details
var bitcoinCAD = require('bitcoin');
var clientCAD = new bitcoinCAD.Client({
  host: sails.config.company.clientCADhost,
  port: sails.config.company.clientCADport,
  user: sails.config.company.clientCADuser,
  pass: sails.config.company.clientCADpass
});

//TRY Wallet Details
var bitcoinTRY = require('bitcoin');
var clientTRY = new bitcoinTRY.Client({
  host: sails.config.company.clientTRYhost,
  port: sails.config.company.clientTRYport,
  user: sails.config.company.clientTRYuser,
  pass: sails.config.company.clientTRYpass
});

//RUB Wallet Details
var bitcoinRUB = require('bitcoin');
var clientRUB = new bitcoinRUB.Client({
  host: sails.config.company.clientRUBhost,
  port: sails.config.company.clientRUBport,
  user: sails.config.company.clientRUBuser,
  pass: sails.config.company.clientRUBpass
});

//MXN Wallet Details
var bitcoinMXN = require('bitcoin');
var clientMXN = new bitcoinMXN.Client({
  host: sails.config.company.clientMXNhost,
  port: sails.config.company.clientMXNport,
  user: sails.config.company.clientMXNuser,
  pass: sails.config.company.clientMXNpass
});

//CZK Wallet Details
var bitcoinCZK = require('bitcoin');
var clientCZK = new bitcoinCZK.Client({
  host: sails.config.company.clientCZKhost,
  port: sails.config.company.clientCZKport,
  user: sails.config.company.clientCZKuser,
  pass: sails.config.company.clientCZKpass
});

//ILS Wallet Details
var bitcoinILS = require('bitcoin');
var clientILS = new bitcoinILS.Client({
  host: sails.config.company.clientILShost,
  port: sails.config.company.clientILSport,
  user: sails.config.company.clientILSuser,
  pass: sails.config.company.clientILSpass
});

//NZD Wallet Details
var bitcoinNZD = require('bitcoin');
var clientNZD = new bitcoinNZD.Client({
  host: sails.config.company.clientNZDhost,
  port: sails.config.company.clientNZDport,
  user: sails.config.company.clientNZDuser,
  pass: sails.config.company.clientNZDpass
});

//JPY Wallet Details
var bitcoinJPY = require('bitcoin');
var clientJPY = new bitcoinJPY.Client({
  host: sails.config.company.clientJPYhost,
  port: sails.config.company.clientJPYport,
  user: sails.config.company.clientJPYuser,
  pass: sails.config.company.clientJPYpass
});

//SEK Wallet Details
var bitcoinSEK = require('bitcoin');
var clientSEK = new bitcoinSEK.Client({
  host: sails.config.company.clientSEKhost,
  port: sails.config.company.clientSEKport,
  user: sails.config.company.clientSEKuser,
  pass: sails.config.company.clientSEKpass
});

//AUD Wallet Details
var bitcoinAUD = require('bitcoin');
var clientAUD = new bitcoinAUD.Client({
  host: sails.config.company.clientAUDhost,
  port: sails.config.company.clientAUDport,
  user: sails.config.company.clientAUDuser,
  pass: sails.config.company.clientAUDpass
});
const LABELPREFIX = sails.config.common.LABELPREFIX;

const COMPANYACCOUNTBTC = sails.config.common.COMPANYACCOUNTBTC;
const COMPANYACCOUNTBCH = sails.config.common.COMPANYACCOUNTBCH;
const COMPANYACCOUNTLTC = sails.config.common.COMPANYACCOUNTLTC;
const COMPANYACCOUNTINR = sails.config.common.COMPANYACCOUNTINR;
const COMPANYACCOUNTUSD = sails.config.common.COMPANYACCOUNTUSD;
const COMPANYACCOUNTEUR = sails.config.common.COMPANYACCOUNTEUR;
const COMPANYACCOUNTGBP = sails.config.common.COMPANYACCOUNTGBP;
const COMPANYACCOUNTBRL = sails.config.common.COMPANYACCOUNTBRL;
const COMPANYACCOUNTPLN = sails.config.common.COMPANYACCOUNTPLN;
const COMPANYACCOUNTCAD = sails.config.common.COMPANYACCOUNTCAD;
const COMPANYACCOUNTTRY = sails.config.common.COMPANYACCOUNTTRY;
const COMPANYACCOUNTRUB = sails.config.common.COMPANYACCOUNTRUB;
const COMPANYACCOUNTMXN = sails.config.common.COMPANYACCOUNTMXN;
const COMPANYACCOUNTCZK = sails.config.common.COMPANYACCOUNTCZK;
const COMPANYACCOUNTILS = sails.config.common.COMPANYACCOUNTILS;
const COMPANYACCOUNTNZD = sails.config.common.COMPANYACCOUNTNZD;
const COMPANYACCOUNTJPY = sails.config.common.COMPANYACCOUNTJPY;
const COMPANYACCOUNTSEK = sails.config.common.COMPANYACCOUNTSEK;
const COMPANYACCOUNTAUD = sails.config.common.COMPANYACCOUNTAUD;

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
  getBalUSD: function(req, res, next) {
    console.log("Enter into getBalUSD::: ");
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
      clientUSD.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userUSDbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromUSDAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "USD Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in USD server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in USD Server getBalance",
              statusCode: 400
            });
          }
          var totalUSDbalance = (parseFloat(userUSDbalanceInDb));
          if (parseFloat(userUSDbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userUSDbalanceInDb = parseFloat(user.USDbalance);
            var userUSDbalanceInDb = new BigNumber(user.USDbalance);
            var balanceFromCoinNode = new BigNumber(userUSDbalanceFromServer);
            var updateUserUSDBalance = userUSDbalanceInDb.plus(balanceFromCoinNode);
            clientUSD.cmd('move', labelWithPrefix,
              COMPANYACCOUNTUSD, userUSDbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromUSDAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "USD Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in USD server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in USD Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      USDbalance: parseFloat(updateUserUSDBalance)
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
                        console.log("Return Update details for USD balance :: " + user);
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
  getBalEUR: function(req, res, next) {
    console.log("Enter into getBalEUR::: ");
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
      clientEUR.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userEURbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromEURAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "EUR Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in EUR server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in EUR Server getBalance",
              statusCode: 400
            });
          }
          var totalEURbalance = (parseFloat(userEURbalanceInDb));
          if (parseFloat(userEURbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userEURbalanceInDb = parseFloat(user.EURbalance);
            var userEURbalanceInDb = new BigNumber(user.EURbalance);
            var balanceFromCoinNode = new BigNumber(userEURbalanceFromServer);
            var updateUserEURBalance = userEURbalanceInDb.plus(balanceFromCoinNode);
            clientEUR.cmd('move', labelWithPrefix,
              COMPANYACCOUNTEUR, userEURbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromEURAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "EUR Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in EUR server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in EUR Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      EURbalance: parseFloat(updateUserEURBalance)
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
                        console.log("Return Update details for EUR balance :: " + user);
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
  getBalGBP: function(req, res, next) {
    console.log("Enter into getBalGBP::: ");
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
      clientGBP.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userGBPbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromGBPAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "GBP Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in GBP server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in GBP Server getBalance",
              statusCode: 400
            });
          }
          var totalGBPbalance = (parseFloat(userGBPbalanceInDb));
          if (parseFloat(userGBPbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userGBPbalanceInDb = parseFloat(user.GBPbalance);
            var userGBPbalanceInDb = new BigNumber(user.GBPbalance);
            var balanceFromCoinNode = new BigNumber(userGBPbalanceFromServer);
            var updateUserGBPBalance = userGBPbalanceInDb.plus(balanceFromCoinNode);
            clientGBP.cmd('move', labelWithPrefix,
              COMPANYACCOUNTGBP, userGBPbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromGBPAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "GBP Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in GBP server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in GBP Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      GBPbalance: parseFloat(updateUserGBPBalance)
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
                        console.log("Return Update details for GBP balance :: " + user);
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
  getBalBRL: function(req, res, next) {
    console.log("Enter into getBalBRL::: ");
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
      clientBRL.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userBRLbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBRLAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BRL Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BRL server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BRL Server getBalance",
              statusCode: 400
            });
          }
          var totalBRLbalance = (parseFloat(userBRLbalanceInDb));
          if (parseFloat(userBRLbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userBRLbalanceInDb = parseFloat(user.BRLbalance);
            var userBRLbalanceInDb = new BigNumber(user.BRLbalance);
            var balanceFromCoinNode = new BigNumber(userBRLbalanceFromServer);
            var updateUserBRLBalance = userBRLbalanceInDb.plus(balanceFromCoinNode);
            clientBRL.cmd('move', labelWithPrefix,
              COMPANYACCOUNTBRL, userBRLbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromBRLAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "BRL Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in BRL server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in BRL Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      BRLbalance: parseFloat(updateUserBRLBalance)
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
                        console.log("Return Update details for BRL balance :: " + user);
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
  getBalPLN: function(req, res, next) {
    console.log("Enter into getBalPLN::: ");
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
      clientPLN.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userPLNbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromPLNAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "PLN Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in PLN server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in PLN Server getBalance",
              statusCode: 400
            });
          }
          var totalPLNbalance = (parseFloat(userPLNbalanceInDb));
          if (parseFloat(userPLNbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userPLNbalanceInDb = parseFloat(user.PLNbalance);
            var userPLNbalanceInDb = new BigNumber(user.PLNbalance);
            var balanceFromCoinNode = new BigNumber(userPLNbalanceFromServer);
            var updateUserPLNBalance = userPLNbalanceInDb.plus(balanceFromCoinNode);
            clientPLN.cmd('move', labelWithPrefix,
              COMPANYACCOUNTPLN, userPLNbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromPLNAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "PLN Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in PLN server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in PLN Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      PLNbalance: parseFloat(updateUserPLNBalance)
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
                        console.log("Return Update details for PLN balance :: " + user);
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
  getBalCAD: function(req, res, next) {
    console.log("Enter into getBalCAD::: ");
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
      clientCAD.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userCADbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromCADAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "CAD Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in CAD server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in CAD Server getBalance",
              statusCode: 400
            });
          }
          var totalCADbalance = (parseFloat(userCADbalanceInDb));
          if (parseFloat(userCADbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userCADbalanceInDb = parseFloat(user.CADbalance);
            var userCADbalanceInDb = new BigNumber(user.CADbalance);
            var balanceFromCoinNode = new BigNumber(userCADbalanceFromServer);
            var updateUserCADBalance = userCADbalanceInDb.plus(balanceFromCoinNode);
            clientCAD.cmd('move', labelWithPrefix,
              COMPANYACCOUNTCAD, userCADbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromCADAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "CAD Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in CAD server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in CAD Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      CADbalance: parseFloat(updateUserCADBalance)
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
                        console.log("Return Update details for CAD balance :: " + user);
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
  getBalTRY: function(req, res, next) {
    console.log("Enter into getBalTRY::: ");
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
      clientTRY.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userTRYbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromTRYAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "TRY Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in TRY server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in TRY Server getBalance",
              statusCode: 400
            });
          }
          var totalTRYbalance = (parseFloat(userTRYbalanceInDb));
          if (parseFloat(userTRYbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userTRYbalanceInDb = parseFloat(user.TRYbalance);
            var userTRYbalanceInDb = new BigNumber(user.TRYbalance);
            var balanceFromCoinNode = new BigNumber(userTRYbalanceFromServer);
            var updateUserTRYBalance = userTRYbalanceInDb.plus(balanceFromCoinNode);
            clientTRY.cmd('move', labelWithPrefix,
              COMPANYACCOUNTTRY, userTRYbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromTRYAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "TRY Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in TRY server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in TRY Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      TRYbalance: parseFloat(updateUserTRYBalance)
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
                        console.log("Return Update details for TRY balance :: " + user);
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
  getBalRUB: function(req, res, next) {
    console.log("Enter into getBalRUB::: ");
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
      clientRUB.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userRUBbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromRUBAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "RUB Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in RUB server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in RUB Server getBalance",
              statusCode: 400
            });
          }
          var totalRUBbalance = (parseFloat(userRUBbalanceInDb));
          if (parseFloat(userRUBbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userRUBbalanceInDb = parseFloat(user.RUBbalance);
            var userRUBbalanceInDb = new BigNumber(user.RUBbalance);
            var balanceFromCoinNode = new BigNumber(userRUBbalanceFromServer);
            var updateUserRUBBalance = userRUBbalanceInDb.plus(balanceFromCoinNode);
            clientRUB.cmd('move', labelWithPrefix,
              COMPANYACCOUNTRUB, userRUBbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromRUBAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "RUB Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in RUB server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in RUB Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      RUBbalance: parseFloat(updateUserRUBBalance)
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
                        console.log("Return Update details for RUB balance :: " + user);
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
  getBalMXN: function(req, res, next) {
    console.log("Enter into getBalMXN::: ");
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
      clientMXN.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userMXNbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromMXNAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "MXN Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in MXN server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in MXN Server getBalance",
              statusCode: 400
            });
          }
          var totalMXNbalance = (parseFloat(userMXNbalanceInDb));
          if (parseFloat(userMXNbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userMXNbalanceInDb = parseFloat(user.MXNbalance);
            var userMXNbalanceInDb = new BigNumber(user.MXNbalance);
            var balanceFromCoinNode = new BigNumber(userMXNbalanceFromServer);
            var updateUserMXNBalance = userMXNbalanceInDb.plus(balanceFromCoinNode);
            clientMXN.cmd('move', labelWithPrefix,
              COMPANYACCOUNTMXN, userMXNbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromMXNAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "MXN Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in MXN server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in MXN Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      MXNbalance: parseFloat(updateUserMXNBalance)
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
                        console.log("Return Update details for MXN balance :: " + user);
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
  getBalCZK: function(req, res, next) {
    console.log("Enter into getBalCZK::: ");
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
      clientCZK.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userCZKbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromCZKAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "CZK Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in CZK server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in CZK Server getBalance",
              statusCode: 400
            });
          }
          var totalCZKbalance = (parseFloat(userCZKbalanceInDb));
          if (parseFloat(userCZKbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userCZKbalanceInDb = parseFloat(user.CZKbalance);
            var userCZKbalanceInDb = new BigNumber(user.CZKbalance);
            var balanceFromCoinNode = new BigNumber(userCZKbalanceFromServer);
            var updateUserCZKBalance = userCZKbalanceInDb.plus(balanceFromCoinNode);
            clientCZK.cmd('move', labelWithPrefix,
              COMPANYACCOUNTCZK, userCZKbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromCZKAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "CZK Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in CZK server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in CZK Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      CZKbalance: parseFloat(updateUserCZKBalance)
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
                        console.log("Return Update details for CZK balance :: " + user);
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
  getBalILS: function(req, res, next) {
    console.log("Enter into getBalILS::: ");
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
      clientILS.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userILSbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromILSAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "ILS Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in ILS server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in ILS Server getBalance",
              statusCode: 400
            });
          }
          var totalILSbalance = (parseFloat(userILSbalanceInDb));
          if (parseFloat(userILSbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userILSbalanceInDb = parseFloat(user.ILSbalance);
            var userILSbalanceInDb = new BigNumber(user.ILSbalance);
            var balanceFromCoinNode = new BigNumber(userILSbalanceFromServer);
            var updateUserILSBalance = userILSbalanceInDb.plus(balanceFromCoinNode);
            clientILS.cmd('move', labelWithPrefix,
              COMPANYACCOUNTILS, userILSbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromILSAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "ILS Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in ILS server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in ILS Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      ILSbalance: parseFloat(updateUserILSBalance)
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
                        console.log("Return Update details for ILS balance :: " + user);
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
  getBalNZD: function(req, res, next) {
    console.log("Enter into getBalNZD::: ");
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
      clientNZD.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userNZDbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromNZDAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "NZD Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in NZD server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in NZD Server getBalance",
              statusCode: 400
            });
          }
          var totalNZDbalance = (parseFloat(userNZDbalanceInDb));
          if (parseFloat(userNZDbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userNZDbalanceInDb = parseFloat(user.NZDbalance);
            var userNZDbalanceInDb = new BigNumber(user.NZDbalance);
            var balanceFromCoinNode = new BigNumber(userNZDbalanceFromServer);
            var updateUserNZDBalance = userNZDbalanceInDb.plus(balanceFromCoinNode);
            clientNZD.cmd('move', labelWithPrefix,
              COMPANYACCOUNTNZD, userNZDbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromNZDAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "NZD Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in NZD server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in NZD Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      NZDbalance: parseFloat(updateUserNZDBalance)
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
                        console.log("Return Update details for NZD balance :: " + user);
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
  getBalJPY: function(req, res, next) {
    console.log("Enter into getBalJPY::: ");
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
      clientJPY.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userJPYbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromJPYAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "JPY Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in JPY server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in JPY Server getBalance",
              statusCode: 400
            });
          }
          var totalJPYbalance = (parseFloat(userJPYbalanceInDb));
          if (parseFloat(userJPYbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userJPYbalanceInDb = parseFloat(user.JPYbalance);
            var userJPYbalanceInDb = new BigNumber(user.JPYbalance);
            var balanceFromCoinNode = new BigNumber(userJPYbalanceFromServer);
            var updateUserJPYBalance = userJPYbalanceInDb.plus(balanceFromCoinNode);
            clientJPY.cmd('move', labelWithPrefix,
              COMPANYACCOUNTJPY, userJPYbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromJPYAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "JPY Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in JPY server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in JPY Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      JPYbalance: parseFloat(updateUserJPYBalance)
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
                        console.log("Return Update details for JPY balance :: " + user);
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
  getBalSEK: function(req, res, next) {
    console.log("Enter into getBalSEK::: ");
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
      clientSEK.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userSEKbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromSEKAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "SEK Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in SEK server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in SEK Server getBalance",
              statusCode: 400
            });
          }
          var totalSEKbalance = (parseFloat(userSEKbalanceInDb));
          if (parseFloat(userSEKbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userSEKbalanceInDb = parseFloat(user.SEKbalance);
            var userSEKbalanceInDb = new BigNumber(user.SEKbalance);
            var balanceFromCoinNode = new BigNumber(userSEKbalanceFromServer);
            var updateUserSEKBalance = userSEKbalanceInDb.plus(balanceFromCoinNode);
            clientSEK.cmd('move', labelWithPrefix,
              COMPANYACCOUNTSEK, userSEKbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromSEKAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "SEK Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in SEK server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in SEK Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      SEKbalance: parseFloat(updateUserSEKBalance)
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
                        console.log("Return Update details for SEK balance :: " + user);
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
  getBalAUD: function(req, res, next) {
    console.log("Enter into getBalAUD::: ");
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
      clientAUD.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userAUDbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromAUDAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "AUD Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in AUD server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in AUD Server getBalance",
              statusCode: 400
            });
          }
          var totalAUDbalance = (parseFloat(userAUDbalanceInDb));
          if (parseFloat(userAUDbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userAUDbalanceInDb = parseFloat(user.AUDbalance);
            var userAUDbalanceInDb = new BigNumber(user.AUDbalance);
            var balanceFromCoinNode = new BigNumber(userAUDbalanceFromServer);
            var updateUserAUDBalance = userAUDbalanceInDb.plus(balanceFromCoinNode);
            clientAUD.cmd('move', labelWithPrefix,
              COMPANYACCOUNTAUD, userAUDbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromAUDAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "AUD Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in AUD server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in AUD Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      AUDbalance: parseFloat(updateUserAUDBalance)
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
                        console.log("Return Update details for AUD balance :: " + user);
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