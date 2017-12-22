/**
 * SendamountController
 *
 * @description :: Server-side logic for managing sendamounts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

const TRANSACTION_ACTION_WITHDRAW_ID = sails.config.common.TRANSACTION_ACTION_WITHDRAW_ID;
const TRANSACTION_ACTION_WITHDRAW_NAME = sails.config.common.TRANSACTION_ACTION_WITHDRAW_NAME;


const CURRENCY_NAME_BTC = sails.config.common.BTC;
const CURRENCY_NAME_BCH = sails.config.common.BCH;
const CURRENCY_NAME_LTC = sails.config.common.LTC;
const CURRENCY_NAME_INR = sails.config.common.INR;
const CURRENCY_NAME_USD = sails.config.common.USD;
const CURRENCY_NAME_EUR = sails.config.common.EUR;
const CURRENCY_NAME_GBP = sails.config.common.GBP;
const CURRENCY_NAME_BRL = sails.config.common.BRL;
const CURRENCY_NAME_PLN = sails.config.common.PLN;
const CURRENCY_NAME_CAD = sails.config.common.CAD;
const CURRENCY_NAME_TRY = sails.config.common.TRY;
const CURRENCY_NAME_RUB = sails.config.common.RUB;
const CURRENCY_NAME_MXN = sails.config.common.MXN;
const CURRENCY_NAME_CZK = sails.config.common.CZK;
const CURRENCY_NAME_ILS = sails.config.common.ILS;
const CURRENCY_NAME_NZD = sails.config.common.NZD;
const CURRENCY_NAME_JPY = sails.config.common.JPY;
const CURRENCY_NAME_SEK = sails.config.common.SEK;
const CURRENCY_NAME_AUD = sails.config.common.AUD;

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
                      var saveTransactionDeails = {
                        amount: parseFloat(userBTCAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverBTCAddress,
                        currencyName: CURRENCY_NAME_BTC,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfBTC),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                      var saveTransactionDeails = {
                        amount: parseFloat(userBCHAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverBCHAddress,
                        currencyName: CURRENCY_NAME_BCH,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfBCH),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                      var saveTransactionDeails = {
                        amount: parseFloat(userLTCAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverLTCAddress,
                        currencyName: CURRENCY_NAME_LTC,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfLTC),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                      var saveTransactionDeails = {
                        amount: parseFloat(userINRAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverINRAddress,
                        currencyName: CURRENCY_NAME_INR,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfINR),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendUSD: function(req, res, next) {
    console.log("Enter into sendUSD");
    var userEmailAddress = req.body.userMailId;
    var userUSDAmountToSend = new BigNumber(req.body.amount);
    var userReceiverUSDAddress = req.body.recieverUSDCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniUSDAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userUSDAmountToSend || !userReceiverUSDAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniUSDAmountSentByUser.greaterThanOrEqualTo(userUSDAmountToSend)) {
      console.log("Sending amount is not less then " + miniUSDAmountSentByUser);
      return res.json({
        "message": "Sending amount USD is not less then " + miniUSDAmountSentByUser,
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
              var USDBalanceInDB = new BigNumber(userDetails.USDbalance);

              console.log("Enter Before If ");

              if (userUSDAmountToSend.greaterThan(USDBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeUSD);
                var transactionFeeOfUSD = new BigNumber(transactionFeeUSD);
                var netamountToSend = userUSDAmountToSend.minus(transactionFeeOfUSD);
                console.log("clientUSD netamountToSend :: " + netamountToSend);
                clientUSD.cmd('sendfrom', COMPANYACCOUNTUSD, userReceiverUSDAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXUSD, userReceiverUSDAddress, userReceiverUSDAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromUSDAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "USD Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid USD Address",
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
                          "message": "Problem in USD server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in USD Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateUSDAmountInDB = USDBalanceInDB.minus(userUSDAmountToSend);
                    console.log("updateUSDAmountInDB ::: " + updateUSDAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      USDbalance: updateUSDAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userUSDAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverUSDAddress,
                        currencyName: CURRENCY_NAME_USD,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfUSD),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendEUR: function(req, res, next) {
    console.log("Enter into sendEUR");
    var userEmailAddress = req.body.userMailId;
    var userEURAmountToSend = new BigNumber(req.body.amount);
    var userReceiverEURAddress = req.body.recieverEURCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniEURAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userEURAmountToSend || !userReceiverEURAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniEURAmountSentByUser.greaterThanOrEqualTo(userEURAmountToSend)) {
      console.log("Sending amount is not less then " + miniEURAmountSentByUser);
      return res.json({
        "message": "Sending amount EUR is not less then " + miniEURAmountSentByUser,
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
              var EURBalanceInDB = new BigNumber(userDetails.EURbalance);

              console.log("Enter Before If ");

              if (userEURAmountToSend.greaterThan(EURBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeEUR);
                var transactionFeeOfEUR = new BigNumber(transactionFeeEUR);
                var netamountToSend = userEURAmountToSend.minus(transactionFeeOfEUR);
                console.log("clientEUR netamountToSend :: " + netamountToSend);
                clientEUR.cmd('sendfrom', COMPANYACCOUNTEUR, userReceiverEURAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXEUR, userReceiverEURAddress, userReceiverEURAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromEURAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "EUR Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid EUR Address",
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
                          "message": "Problem in EUR server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in EUR Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateEURAmountInDB = EURBalanceInDB.minus(userEURAmountToSend);
                    console.log("updateEURAmountInDB ::: " + updateEURAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      EURbalance: updateEURAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userEURAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverEURAddress,
                        currencyName: CURRENCY_NAME_EUR,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfEUR),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendGBP: function(req, res, next) {
    console.log("Enter into sendGBP");
    var userEmailAddress = req.body.userMailId;
    var userGBPAmountToSend = new BigNumber(req.body.amount);
    var userReceiverGBPAddress = req.body.recieverGBPCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniGBPAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userGBPAmountToSend || !userReceiverGBPAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniGBPAmountSentByUser.greaterThanOrEqualTo(userGBPAmountToSend)) {
      console.log("Sending amount is not less then " + miniGBPAmountSentByUser);
      return res.json({
        "message": "Sending amount GBP is not less then " + miniGBPAmountSentByUser,
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
              var GBPBalanceInDB = new BigNumber(userDetails.GBPbalance);

              console.log("Enter Before If ");

              if (userGBPAmountToSend.greaterThan(GBPBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeGBP);
                var transactionFeeOfGBP = new BigNumber(transactionFeeGBP);
                var netamountToSend = userGBPAmountToSend.minus(transactionFeeOfGBP);
                console.log("clientGBP netamountToSend :: " + netamountToSend);
                clientGBP.cmd('sendfrom', COMPANYACCOUNTGBP, userReceiverGBPAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXGBP, userReceiverGBPAddress, userReceiverGBPAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromGBPAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "GBP Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid GBP Address",
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
                          "message": "Problem in GBP server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in GBP Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateGBPAmountInDB = GBPBalanceInDB.minus(userGBPAmountToSend);
                    console.log("updateGBPAmountInDB ::: " + updateGBPAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      GBPbalance: updateGBPAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userGBPAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverGBPAddress,
                        currencyName: CURRENCY_NAME_GBP,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfGBP),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendBRL: function(req, res, next) {
    console.log("Enter into sendBRL");
    var userEmailAddress = req.body.userMailId;
    var userBRLAmountToSend = new BigNumber(req.body.amount);
    var userReceiverBRLAddress = req.body.recieverBRLCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniBRLAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userBRLAmountToSend || !userReceiverBRLAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniBRLAmountSentByUser.greaterThanOrEqualTo(userBRLAmountToSend)) {
      console.log("Sending amount is not less then " + miniBRLAmountSentByUser);
      return res.json({
        "message": "Sending amount BRL is not less then " + miniBRLAmountSentByUser,
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
              var BRLBalanceInDB = new BigNumber(userDetails.BRLbalance);

              console.log("Enter Before If ");

              if (userBRLAmountToSend.greaterThan(BRLBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeBRL);
                var transactionFeeOfBRL = new BigNumber(transactionFeeBRL);
                var netamountToSend = userBRLAmountToSend.minus(transactionFeeOfBRL);
                console.log("clientBRL netamountToSend :: " + netamountToSend);
                clientBRL.cmd('sendfrom', COMPANYACCOUNTBRL, userReceiverBRLAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXBRL, userReceiverBRLAddress, userReceiverBRLAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromBRLAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "BRL Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid BRL Address",
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
                          "message": "Problem in BRL server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in BRL Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateBRLAmountInDB = BRLBalanceInDB.minus(userBRLAmountToSend);
                    console.log("updateBRLAmountInDB ::: " + updateBRLAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      BRLbalance: updateBRLAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userBRLAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverBRLAddress,
                        currencyName: CURRENCY_NAME_BRL,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfBRL),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendPLN: function(req, res, next) {
    console.log("Enter into sendPLN");
    var userEmailAddress = req.body.userMailId;
    var userPLNAmountToSend = new BigNumber(req.body.amount);
    var userReceiverPLNAddress = req.body.recieverPLNCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniPLNAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userPLNAmountToSend || !userReceiverPLNAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniPLNAmountSentByUser.greaterThanOrEqualTo(userPLNAmountToSend)) {
      console.log("Sending amount is not less then " + miniPLNAmountSentByUser);
      return res.json({
        "message": "Sending amount PLN is not less then " + miniPLNAmountSentByUser,
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
              var PLNBalanceInDB = new BigNumber(userDetails.PLNbalance);

              console.log("Enter Before If ");

              if (userPLNAmountToSend.greaterThan(PLNBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeePLN);
                var transactionFeeOfPLN = new BigNumber(transactionFeePLN);
                var netamountToSend = userPLNAmountToSend.minus(transactionFeeOfPLN);
                console.log("clientPLN netamountToSend :: " + netamountToSend);
                clientPLN.cmd('sendfrom', COMPANYACCOUNTPLN, userReceiverPLNAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXPLN, userReceiverPLNAddress, userReceiverPLNAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromPLNAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "PLN Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid PLN Address",
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
                          "message": "Problem in PLN server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in PLN Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updatePLNAmountInDB = PLNBalanceInDB.minus(userPLNAmountToSend);
                    console.log("updatePLNAmountInDB ::: " + updatePLNAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      PLNbalance: updatePLNAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userPLNAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverPLNAddress,
                        currencyName: CURRENCY_NAME_PLN,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfPLN),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendCAD: function(req, res, next) {
    console.log("Enter into sendCAD");
    var userEmailAddress = req.body.userMailId;
    var userCADAmountToSend = new BigNumber(req.body.amount);
    var userReceiverCADAddress = req.body.recieverCADCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniCADAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userCADAmountToSend || !userReceiverCADAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniCADAmountSentByUser.greaterThanOrEqualTo(userCADAmountToSend)) {
      console.log("Sending amount is not less then " + miniCADAmountSentByUser);
      return res.json({
        "message": "Sending amount CAD is not less then " + miniCADAmountSentByUser,
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
              var CADBalanceInDB = new BigNumber(userDetails.CADbalance);

              console.log("Enter Before If ");

              if (userCADAmountToSend.greaterThan(CADBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeCAD);
                var transactionFeeOfCAD = new BigNumber(transactionFeeCAD);
                var netamountToSend = userCADAmountToSend.minus(transactionFeeOfCAD);
                console.log("clientCAD netamountToSend :: " + netamountToSend);
                clientCAD.cmd('sendfrom', COMPANYACCOUNTCAD, userReceiverCADAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXCAD, userReceiverCADAddress, userReceiverCADAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromCADAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "CAD Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid CAD Address",
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
                          "message": "Problem in CAD server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in CAD Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateCADAmountInDB = CADBalanceInDB.minus(userCADAmountToSend);
                    console.log("updateCADAmountInDB ::: " + updateCADAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      CADbalance: updateCADAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userCADAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverCADAddress,
                        currencyName: CURRENCY_NAME_CAD,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfCAD),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendTRY: function(req, res, next) {
    console.log("Enter into sendTRY");
    var userEmailAddress = req.body.userMailId;
    var userTRYAmountToSend = new BigNumber(req.body.amount);
    var userReceiverTRYAddress = req.body.recieverTRYCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniTRYAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userTRYAmountToSend || !userReceiverTRYAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniTRYAmountSentByUser.greaterThanOrEqualTo(userTRYAmountToSend)) {
      console.log("Sending amount is not less then " + miniTRYAmountSentByUser);
      return res.json({
        "message": "Sending amount TRY is not less then " + miniTRYAmountSentByUser,
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
              var TRYBalanceInDB = new BigNumber(userDetails.TRYbalance);

              console.log("Enter Before If ");

              if (userTRYAmountToSend.greaterThan(TRYBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeTRY);
                var transactionFeeOfTRY = new BigNumber(transactionFeeTRY);
                var netamountToSend = userTRYAmountToSend.minus(transactionFeeOfTRY);
                console.log("clientTRY netamountToSend :: " + netamountToSend);
                clientTRY.cmd('sendfrom', COMPANYACCOUNTTRY, userReceiverTRYAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXTRY, userReceiverTRYAddress, userReceiverTRYAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromTRYAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "TRY Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid TRY Address",
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
                          "message": "Problem in TRY server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in TRY Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateTRYAmountInDB = TRYBalanceInDB.minus(userTRYAmountToSend);
                    console.log("updateTRYAmountInDB ::: " + updateTRYAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      TRYbalance: updateTRYAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userTRYAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverTRYAddress,
                        currencyName: CURRENCY_NAME_TRY,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfTRY),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendRUB: function(req, res, next) {
    console.log("Enter into sendRUB");
    var userEmailAddress = req.body.userMailId;
    var userRUBAmountToSend = new BigNumber(req.body.amount);
    var userReceiverRUBAddress = req.body.recieverRUBCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniRUBAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userRUBAmountToSend || !userReceiverRUBAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniRUBAmountSentByUser.greaterThanOrEqualTo(userRUBAmountToSend)) {
      console.log("Sending amount is not less then " + miniRUBAmountSentByUser);
      return res.json({
        "message": "Sending amount RUB is not less then " + miniRUBAmountSentByUser,
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
              var RUBBalanceInDB = new BigNumber(userDetails.RUBbalance);

              console.log("Enter Before If ");

              if (userRUBAmountToSend.greaterThan(RUBBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeRUB);
                var transactionFeeOfRUB = new BigNumber(transactionFeeRUB);
                var netamountToSend = userRUBAmountToSend.minus(transactionFeeOfRUB);
                console.log("clientRUB netamountToSend :: " + netamountToSend);
                clientRUB.cmd('sendfrom', COMPANYACCOUNTRUB, userReceiverRUBAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXRUB, userReceiverRUBAddress, userReceiverRUBAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromRUBAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "RUB Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid RUB Address",
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
                          "message": "Problem in RUB server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in RUB Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateRUBAmountInDB = RUBBalanceInDB.minus(userRUBAmountToSend);
                    console.log("updateRUBAmountInDB ::: " + updateRUBAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      RUBbalance: updateRUBAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userRUBAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverRUBAddress,
                        currencyName: CURRENCY_NAME_RUB,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfRUB),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendMXN: function(req, res, next) {
    console.log("Enter into sendMXN");
    var userEmailAddress = req.body.userMailId;
    var userMXNAmountToSend = new BigNumber(req.body.amount);
    var userReceiverMXNAddress = req.body.recieverMXNCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniMXNAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userMXNAmountToSend || !userReceiverMXNAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniMXNAmountSentByUser.greaterThanOrEqualTo(userMXNAmountToSend)) {
      console.log("Sending amount is not less then " + miniMXNAmountSentByUser);
      return res.json({
        "message": "Sending amount MXN is not less then " + miniMXNAmountSentByUser,
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
              var MXNBalanceInDB = new BigNumber(userDetails.MXNbalance);

              console.log("Enter Before If ");

              if (userMXNAmountToSend.greaterThan(MXNBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeMXN);
                var transactionFeeOfMXN = new BigNumber(transactionFeeMXN);
                var netamountToSend = userMXNAmountToSend.minus(transactionFeeOfMXN);
                console.log("clientMXN netamountToSend :: " + netamountToSend);
                clientMXN.cmd('sendfrom', COMPANYACCOUNTMXN, userReceiverMXNAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXMXN, userReceiverMXNAddress, userReceiverMXNAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromMXNAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "MXN Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid MXN Address",
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
                          "message": "Problem in MXN server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in MXN Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateMXNAmountInDB = MXNBalanceInDB.minus(userMXNAmountToSend);
                    console.log("updateMXNAmountInDB ::: " + updateMXNAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      MXNbalance: updateMXNAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userMXNAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverMXNAddress,
                        currencyName: CURRENCY_NAME_MXN,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfMXN),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendCZK: function(req, res, next) {
    console.log("Enter into sendCZK");
    var userEmailAddress = req.body.userMailId;
    var userCZKAmountToSend = new BigNumber(req.body.amount);
    var userReceiverCZKAddress = req.body.recieverCZKCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniCZKAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userCZKAmountToSend || !userReceiverCZKAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniCZKAmountSentByUser.greaterThanOrEqualTo(userCZKAmountToSend)) {
      console.log("Sending amount is not less then " + miniCZKAmountSentByUser);
      return res.json({
        "message": "Sending amount CZK is not less then " + miniCZKAmountSentByUser,
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
              var CZKBalanceInDB = new BigNumber(userDetails.CZKbalance);

              console.log("Enter Before If ");

              if (userCZKAmountToSend.greaterThan(CZKBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeCZK);
                var transactionFeeOfCZK = new BigNumber(transactionFeeCZK);
                var netamountToSend = userCZKAmountToSend.minus(transactionFeeOfCZK);
                console.log("clientCZK netamountToSend :: " + netamountToSend);
                clientCZK.cmd('sendfrom', COMPANYACCOUNTCZK, userReceiverCZKAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXCZK, userReceiverCZKAddress, userReceiverCZKAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromCZKAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "CZK Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid CZK Address",
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
                          "message": "Problem in CZK server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in CZK Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateCZKAmountInDB = CZKBalanceInDB.minus(userCZKAmountToSend);
                    console.log("updateCZKAmountInDB ::: " + updateCZKAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      CZKbalance: updateCZKAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userCZKAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverCZKAddress,
                        currencyName: CURRENCY_NAME_CZK,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfCZK),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendILS: function(req, res, next) {
    console.log("Enter into sendILS");
    var userEmailAddress = req.body.userMailId;
    var userILSAmountToSend = new BigNumber(req.body.amount);
    var userReceiverILSAddress = req.body.recieverILSCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniILSAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userILSAmountToSend || !userReceiverILSAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniILSAmountSentByUser.greaterThanOrEqualTo(userILSAmountToSend)) {
      console.log("Sending amount is not less then " + miniILSAmountSentByUser);
      return res.json({
        "message": "Sending amount ILS is not less then " + miniILSAmountSentByUser,
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
              var ILSBalanceInDB = new BigNumber(userDetails.ILSbalance);

              console.log("Enter Before If ");

              if (userILSAmountToSend.greaterThan(ILSBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeILS);
                var transactionFeeOfILS = new BigNumber(transactionFeeILS);
                var netamountToSend = userILSAmountToSend.minus(transactionFeeOfILS);
                console.log("clientILS netamountToSend :: " + netamountToSend);
                clientILS.cmd('sendfrom', COMPANYACCOUNTILS, userReceiverILSAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXILS, userReceiverILSAddress, userReceiverILSAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromILSAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "ILS Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid ILS Address",
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
                          "message": "Problem in ILS server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in ILS Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateILSAmountInDB = ILSBalanceInDB.minus(userILSAmountToSend);
                    console.log("updateILSAmountInDB ::: " + updateILSAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      ILSbalance: updateILSAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userILSAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverILSAddress,
                        currencyName: CURRENCY_NAME_ILS,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfILS),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendNZD: function(req, res, next) {
    console.log("Enter into sendNZD");
    var userEmailAddress = req.body.userMailId;
    var userNZDAmountToSend = new BigNumber(req.body.amount);
    var userReceiverNZDAddress = req.body.recieverNZDCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniNZDAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userNZDAmountToSend || !userReceiverNZDAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniNZDAmountSentByUser.greaterThanOrEqualTo(userNZDAmountToSend)) {
      console.log("Sending amount is not less then " + miniNZDAmountSentByUser);
      return res.json({
        "message": "Sending amount NZD is not less then " + miniNZDAmountSentByUser,
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
              var NZDBalanceInDB = new BigNumber(userDetails.NZDbalance);

              console.log("Enter Before If ");

              if (userNZDAmountToSend.greaterThan(NZDBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeNZD);
                var transactionFeeOfNZD = new BigNumber(transactionFeeNZD);
                var netamountToSend = userNZDAmountToSend.minus(transactionFeeOfNZD);
                console.log("clientNZD netamountToSend :: " + netamountToSend);
                clientNZD.cmd('sendfrom', COMPANYACCOUNTNZD, userReceiverNZDAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXNZD, userReceiverNZDAddress, userReceiverNZDAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromNZDAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "NZD Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid NZD Address",
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
                          "message": "Problem in NZD server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in NZD Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateNZDAmountInDB = NZDBalanceInDB.minus(userNZDAmountToSend);
                    console.log("updateNZDAmountInDB ::: " + updateNZDAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      NZDbalance: updateNZDAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userNZDAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverNZDAddress,
                        currencyName: CURRENCY_NAME_NZD,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfNZD),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendJPY: function(req, res, next) {
    console.log("Enter into sendJPY");
    var userEmailAddress = req.body.userMailId;
    var userJPYAmountToSend = new BigNumber(req.body.amount);
    var userReceiverJPYAddress = req.body.recieverJPYCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniJPYAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userJPYAmountToSend || !userReceiverJPYAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniJPYAmountSentByUser.greaterThanOrEqualTo(userJPYAmountToSend)) {
      console.log("Sending amount is not less then " + miniJPYAmountSentByUser);
      return res.json({
        "message": "Sending amount JPY is not less then " + miniJPYAmountSentByUser,
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
              var JPYBalanceInDB = new BigNumber(userDetails.JPYbalance);

              console.log("Enter Before If ");

              if (userJPYAmountToSend.greaterThan(JPYBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeJPY);
                var transactionFeeOfJPY = new BigNumber(transactionFeeJPY);
                var netamountToSend = userJPYAmountToSend.minus(transactionFeeOfJPY);
                console.log("clientJPY netamountToSend :: " + netamountToSend);
                clientJPY.cmd('sendfrom', COMPANYACCOUNTJPY, userReceiverJPYAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXJPY, userReceiverJPYAddress, userReceiverJPYAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromJPYAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "JPY Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid JPY Address",
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
                          "message": "Problem in JPY server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in JPY Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateJPYAmountInDB = JPYBalanceInDB.minus(userJPYAmountToSend);
                    console.log("updateJPYAmountInDB ::: " + updateJPYAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      JPYbalance: updateJPYAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userJPYAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverJPYAddress,
                        currencyName: CURRENCY_NAME_JPY,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfJPY),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendSEK: function(req, res, next) {
    console.log("Enter into sendSEK");
    var userEmailAddress = req.body.userMailId;
    var userSEKAmountToSend = new BigNumber(req.body.amount);
    var userReceiverSEKAddress = req.body.recieverSEKCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniSEKAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userSEKAmountToSend || !userReceiverSEKAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniSEKAmountSentByUser.greaterThanOrEqualTo(userSEKAmountToSend)) {
      console.log("Sending amount is not less then " + miniSEKAmountSentByUser);
      return res.json({
        "message": "Sending amount SEK is not less then " + miniSEKAmountSentByUser,
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
              var SEKBalanceInDB = new BigNumber(userDetails.SEKbalance);

              console.log("Enter Before If ");

              if (userSEKAmountToSend.greaterThan(SEKBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeSEK);
                var transactionFeeOfSEK = new BigNumber(transactionFeeSEK);
                var netamountToSend = userSEKAmountToSend.minus(transactionFeeOfSEK);
                console.log("clientSEK netamountToSend :: " + netamountToSend);
                clientSEK.cmd('sendfrom', COMPANYACCOUNTSEK, userReceiverSEKAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXSEK, userReceiverSEKAddress, userReceiverSEKAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromSEKAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "SEK Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid SEK Address",
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
                          "message": "Problem in SEK server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in SEK Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateSEKAmountInDB = SEKBalanceInDB.minus(userSEKAmountToSend);
                    console.log("updateSEKAmountInDB ::: " + updateSEKAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      SEKbalance: updateSEKAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userSEKAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverSEKAddress,
                        currencyName: CURRENCY_NAME_SEK,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfSEK),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
  sendAUD: function(req, res, next) {
    console.log("Enter into sendAUD");
    var userEmailAddress = req.body.userMailId;
    var userAUDAmountToSend = new BigNumber(req.body.amount);
    var userReceiverAUDAddress = req.body.recieverAUDCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniAUDAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userAUDAmountToSend || !userReceiverAUDAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniAUDAmountSentByUser.greaterThanOrEqualTo(userAUDAmountToSend)) {
      console.log("Sending amount is not less then " + miniAUDAmountSentByUser);
      return res.json({
        "message": "Sending amount AUD is not less then " + miniAUDAmountSentByUser,
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
              var AUDBalanceInDB = new BigNumber(userDetails.AUDbalance);

              console.log("Enter Before If ");

              if (userAUDAmountToSend.greaterThan(AUDBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeAUD);
                var transactionFeeOfAUD = new BigNumber(transactionFeeAUD);
                var netamountToSend = userAUDAmountToSend.minus(transactionFeeOfAUD);
                console.log("clientAUD netamountToSend :: " + netamountToSend);
                clientAUD.cmd('sendfrom', COMPANYACCOUNTAUD, userReceiverAUDAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXAUD, userReceiverAUDAddress, userReceiverAUDAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromAUDAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "AUD Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid AUD Address",
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
                          "message": "Problem in AUD server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in AUD Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateAUDAmountInDB = AUDBalanceInDB.minus(userAUDAmountToSend);
                    console.log("updateAUDAmountInDB ::: " + updateAUDAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      AUDbalance: updateAUDAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userAUDAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverAUDAddress,
                        currencyName: CURRENCY_NAME_AUD,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfAUD),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
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
                  });
              }
            }
          });
      }
    });
  },
};