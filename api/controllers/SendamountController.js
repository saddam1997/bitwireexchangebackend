/**
 * SendamountController
 *
 * @description :: Server-side logic for managing sendamounts
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

var transactionFeeBCH = sails.config.common.txFeeBCH;
var transactionFeeBTC = sails.config.common.txFeeBTC;
var transactionFeeLTC = sails.config.common.txFeeLTC;
var transactionFeeINR = sails.config.common.txFeeINR;
var transactionFeeUSD = sails.config.common.txFeeUSD;
var transactionFeeEUR = sails.config.common.txFeeEUR;
var transactionFeeGBP = sails.config.common.txFeeGBP;
var transactionFeeBRL = sails.config.common.txFeeBRL;
var transactionFeePLN = sails.config.common.txFeePLN;
var transactionFeeCAD = sails.config.common.txFeeCAD;
var transactionFeeTRY = sails.config.common.txFeeTRY;
var transactionFeeRUB = sails.config.common.txFeeRUB;
var transactionFeeMXN = sails.config.common.txFeeMXN;
var transactionFeeCZK = sails.config.common.txFeeCZK;
var transactionFeeILS = sails.config.common.txFeeILS;
var transactionFeeNZD = sails.config.common.txFeeNZD;
var transactionFeeJPY = sails.config.common.txFeeJPY;
var transactionFeeSEK = sails.config.common.txFeeSEK;
var transactionFeeAUD = sails.config.common.txFeeAUD;

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


const CONFIRMATIONOFTXBTC = sails.config.common.CONFIRMATIONOFTXBTC;
const CONFIRMATIONOFTXBCH = sails.config.common.CONFIRMATIONOFTXBCH;
const CONFIRMATIONOFTXLTC = sails.config.common.CONFIRMATIONOFTXLTC;
const CONFIRMATIONOFTXINR = sails.config.common.CONFIRMATIONOFTXINR;
const CONFIRMATIONOFTXUSD = sails.config.common.CONFIRMATIONOFTXUSD;
const CONFIRMATIONOFTXEUR = sails.config.common.CONFIRMATIONOFTXEUR;
const CONFIRMATIONOFTXGBP = sails.config.common.CONFIRMATIONOFTXGBP;
const CONFIRMATIONOFTXBRL = sails.config.common.CONFIRMATIONOFTXBRL;
const CONFIRMATIONOFTXPLN = sails.config.common.CONFIRMATIONOFTXPLN;
const CONFIRMATIONOFTXCAD = sails.config.common.CONFIRMATIONOFTXCAD;
const CONFIRMATIONOFTXTRY = sails.config.common.CONFIRMATIONOFTXTRY;
const CONFIRMATIONOFTXRUB = sails.config.common.CONFIRMATIONOFTXRUB;
const CONFIRMATIONOFTXMXN = sails.config.common.CONFIRMATIONOFTXMXN;
const CONFIRMATIONOFTXCZK = sails.config.common.CONFIRMATIONOFTXCZK;
const CONFIRMATIONOFTXILS = sails.config.common.CONFIRMATIONOFTXILS;
const CONFIRMATIONOFTXNZD = sails.config.common.CONFIRMATIONOFTXNZD;
const CONFIRMATIONOFTXJPY = sails.config.common.CONFIRMATIONOFTXJPY;
const CONFIRMATIONOFTXSEK = sails.config.common.CONFIRMATIONOFTXSEK;
const CONFIRMATIONOFTXAUD = sails.config.common.CONFIRMATIONOFTXAUD;
module.exports = {
  sendBTC: function(req, res, next) {
    console.log("Enter into sendBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToSend = new BigNumber(req.body.amount);
    var userReceiverBTCAddress = req.body.recieverBTCCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniBTCAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userBTCAmountToSend || !userReceiverBTCAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniBTCAmountSentByUser.greaterThanOrEqualTo(userBTCAmountToSend)) {
      console.log("Sending amount is not less then " + miniBTCAmountSentByUser);
      return res.json({
        "message": "Sending amount BTC is not less then " + miniBTCAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var BTCBalanceInDB = new BigNumber(userDetails.BTCbalance);

              console.log("Enter Before If ");

              if (userBTCAmountToSend.greaterThan(BTCBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeBTC);
                var transactionFeeOfBTC = new BigNumber(transactionFeeBTC);
                var netamountToSend = userBTCAmountToSend.minus(transactionFeeOfBTC);
                console.log("clientBTC netamountToSend :: " + netamountToSend);
                clientBTC.cmd('sendfrom', COMPANYACCOUNTBTC, userReceiverBTCAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXBTC, userReceiverBTCAddress, userReceiverBTCAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromBTCAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "BTC Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid BTC Address",
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
                          "message": "Problem in BTC server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in BTC Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateBTCAmountInDB = BTCBalanceInDB.minus(userBTCAmountToSend);
                    console.log("updateBTCAmountInDB ::: " + updateBTCAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      BTCbalance: updateBTCAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
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
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                  });
              }
            }
          });
      }
    });
  },
  sendBCH: function(req, res, next) {
    console.log("Enter into sendBCH");
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToSend = new BigNumber(req.body.amount);
    var userReceiverBCHAddress = req.body.recieverBCHCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniBCHAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userBCHAmountToSend || !userReceiverBCHAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniBCHAmountSentByUser.greaterThanOrEqualTo(userBCHAmountToSend)) {
      console.log("Sending amount is not less then " + miniBCHAmountSentByUser);
      return res.json({
        "message": "Sending amount BCH is not less then " + miniBCHAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var BCHBalanceInDB = new BigNumber(userDetails.BCHbalance);

              console.log("Enter Before If ");

              if (userBCHAmountToSend.greaterThan(BCHBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeBCH);
                var transactionFeeOfBCH = new BigNumber(transactionFeeBCH);
                var netamountToSend = userBCHAmountToSend.minus(transactionFeeOfBCH);
                console.log("clientBCH netamountToSend :: " + netamountToSend);
                clientBCH.cmd('sendfrom', COMPANYACCOUNTBCH, userReceiverBCHAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXBCH, userReceiverBCHAddress, userReceiverBCHAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromBCHAccount:: " + err);
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
                        "message": "Error in BCH Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateBCHAmountInDB = BCHBalanceInDB.minus(userBCHAmountToSend);
                    console.log("updateBCHAmountInDB ::: " + updateBCHAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      BCHbalance: updateBCHAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
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
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                  });
              }
            }
          });
      }
    });
  },
  sendLTC: function(req, res, next) {
    console.log("Enter into sendLTC");
    var userEmailAddress = req.body.userMailId;
    var userLTCAmountToSend = new BigNumber(req.body.amount);
    var userReceiverLTCAddress = req.body.recieverLTCCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniLTCAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userLTCAmountToSend || !userReceiverLTCAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniLTCAmountSentByUser.greaterThanOrEqualTo(userLTCAmountToSend)) {
      console.log("Sending amount is not less then " + miniLTCAmountSentByUser);
      return res.json({
        "message": "Sending amount LTC is not less then " + miniLTCAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var LTCBalanceInDB = new BigNumber(userDetails.LTCbalance);

              console.log("Enter Before If ");

              if (userLTCAmountToSend.greaterThan(LTCBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeLTC);
                var transactionFeeOfLTC = new BigNumber(transactionFeeLTC);
                var netamountToSend = userLTCAmountToSend.minus(transactionFeeOfLTC);
                console.log("clientLTC netamountToSend :: " + netamountToSend);
                clientLTC.cmd('sendfrom', COMPANYACCOUNTLTC, userReceiverLTCAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXLTC, userReceiverLTCAddress, userReceiverLTCAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromLTCAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "LTC Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid LTC Address",
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
                          "message": "Problem in LTC server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in LTC Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateLTCAmountInDB = LTCBalanceInDB.minus(userLTCAmountToSend);
                    console.log("updateLTCAmountInDB ::: " + updateLTCAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      LTCbalance: updateLTCAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
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
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                  });
              }
            }
          });
      }
    });
  },
  sendINR: function(req, res, next) {
    console.log("Enter into sendINR");
    var userEmailAddress = req.body.userMailId;
    var userINRAmountToSend = new BigNumber(req.body.amount);
    var userReceiverINRAddress = req.body.recieverINRCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniINRAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userINRAmountToSend || !userReceiverINRAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniINRAmountSentByUser.greaterThanOrEqualTo(userINRAmountToSend)) {
      console.log("Sending amount is not less then " + miniINRAmountSentByUser);
      return res.json({
        "message": "Sending amount INR is not less then " + miniINRAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var INRBalanceInDB = new BigNumber(userDetails.INRbalance);

              console.log("Enter Before If ");

              if (userINRAmountToSend.greaterThan(INRBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeINR);
                var transactionFeeOfINR = new BigNumber(transactionFeeINR);
                var netamountToSend = userINRAmountToSend.minus(transactionFeeOfINR);
                console.log("clientINR netamountToSend :: " + netamountToSend);
                clientINR.cmd('sendfrom', COMPANYACCOUNTINR, userReceiverINRAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXINR, userReceiverINRAddress, userReceiverINRAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromINRAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "INR Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid INR Address",
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
                          "message": "Problem in INR server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in INR Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateINRAmountInDB = INRBalanceInDB.minus(userINRAmountToSend);
                    console.log("updateINRAmountInDB ::: " + updateINRAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      INRbalance: updateINRAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                          email: userEmailAddress
                        }).populateAll()
                        .exec(function(err, user) {
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
                          console.log("Return user details after sending amount!!");
                          res.json({
                            user: user,
                            statusCode: 200
                          });
                        });
                    });
                  });
              }
            }
          });
      }
    });
  },
};