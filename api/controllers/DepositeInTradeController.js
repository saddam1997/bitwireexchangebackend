/**
 * DepositeInTradeController
 *
 * @description :: Server-side logic for managing depositeintrades
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
//PYY Wallet Details
var bitcoinPYY = require('bitcoin');
var clientPYY = new bitcoinPYY.Client({
  host: sails.config.company.clientPYYhost,
  port: sails.config.company.clientPYYport,
  user: sails.config.company.clientPYYuser,
  pass: sails.config.company.clientPYYpass
});
//GDS Wallet Details
var bitcoinGDS = require('bitcoin');
var clientGDS = new bitcoinGDS.Client({
  host: sails.config.company.clientGDShost,
  port: sails.config.company.clientGDSport,
  user: sails.config.company.clientGDSuser,
  pass: sails.config.company.clientGDSpass
});
var transactionFeeBCH = sails.config.company.txFeeBCH;
var transactionFeeBTC = sails.config.company.txFeeBTC;
var transactionFeePYY = sails.config.company.txFeePYY;
var transactionFeeGDS = sails.config.company.txFeeGDS;

var companyBTCAccount = sails.config.company.companyBTCAccount;
var companyBCHAccount = sails.config.company.companyBCHAccount;
var companyGDSAccount = sails.config.company.companyGDSAccount;
var companyPYYAccount = sails.config.company.companyPYYAccount;

var currencyNameBTC = "BTC";
var currencyNameBCH = "BCH";
var currencyNameGDS = "GDS";
var currencyNamePYY = "PYY";

var actionNameDeposit = "Deposit";
var actionNameWithdrawal = "Withdrawal";

module.exports = {
  depositeInWalletBTC: function(req, res) {
    console.log("Enter into depositeInWalletBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToDeposite = parseFloat(req.body.btcamount);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userBTCAmountToDeposite || !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
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
        console.log("User want send BTC to send ::: " + userBTCAmountToDeposite);
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
              var userBTCMainBalanceInDb = userDetails.BTCMainbalance;
              if (userBTCAmountToDeposite > userBTCMainBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedBTCbalance = (parseFloat(userDetails.BTCbalance) + parseFloat(userBTCAmountToDeposite));
              var updatedBTCMainbalance = (parseFloat(userDetails.BTCMainbalance) - parseFloat(userBTCAmountToDeposite));

              User.update({
                  id: userDetails.id
                }, {
                  BTCbalance: parseFloat(updatedBTCbalance),
                  BTCMainbalance: parseFloat(updatedBTCMainbalance)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BTC main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userBTCAmountToDeposite,
                      currencyName: currencyNameBTC,
                      action: actionNameDeposit,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      //Move BTC Company account to User Account on deposite
                      clientBTC.cmd('move',
                        userEmailAddress,
                        companyBTCAccount,
                        userBTCAmountToDeposite,
                        function(err, moveBTCTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalBTC :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("BTC Server Refuse to connect App");
                              return res.json({
                                "message": "BTC Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(userEmailAddress + " Account has Insufficient funds ");
                              return res.json({
                                "message": userEmailAddress + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in BTC server err.code " + err.code);
                              return res.json({
                                "message": "Problem in BTC server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in BTC Server");
                            return res.json({
                              "message": "Error in BTC Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveBTCTransaction status " + moveBTCTransaction);
                            if (moveBTCTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });

                    });
                });
            }
          });
      }
    });

  },
  withdrawInWalletBTC: function(req, res) {
    console.log("Enter into withdrawInWalletBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToWithDraw = parseFloat(req.body.btcamount);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userBTCAmountToWithDraw || !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
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
        var userBTCBalanceInDb = parseFloat(userDetails.BTCbalance);
        console.log("User BTC balance in database ::: " + userBTCBalanceInDb);
        console.log("User want send BTC to send ::: " + userBTCAmountToWithDraw);
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
              var userBTCBalanceInDb = userDetails.BTCbalance;
              if (userBTCAmountToWithDraw > userBTCBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              //Deduct transactionFeeBTC
              var afterTransactionFeeAmount = (parseFloat(userBTCAmountToWithDraw) - parseFloat(transactionFeeBTC));
              console.log("afterTransactionFeeAmount :: " + afterTransactionFeeAmount);
              console.log("Spending password is valid!!!");
              var updatedBTCMainbalance = (parseFloat(userDetails.BTCMainbalance) + parseFloat(afterTransactionFeeAmount));
              var updatedBTCbalance = (parseFloat(userDetails.BTCbalance) - parseFloat(userBTCAmountToWithDraw));
              User.update({
                  id: userDetails.id
                }, {
                  BTCbalance: parseFloat(updatedBTCbalance),
                  BTCMainbalance: parseFloat(updatedBTCMainbalance)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BTC main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userBTCAmountToWithDraw,
                      currencyName: currencyNameBTC,
                      action: actionNameWithdrawal,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }

                      //Move BTC Company account to User Account on Withdrawal
                      clientBTC.cmd('move',
                        companyBTCAccount,
                        userEmailAddress,
                        afterTransactionFeeAmount,
                        function(err, moveBTCTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalBTC :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("BTC Server Refuse to connect App");
                              return res.json({
                                "message": "BTC Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyBTCAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyBTCAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in BTC server err.code " + err.code);
                              return res.json({
                                "message": "Problem in BTC server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in BTC Server");
                            return res.json({
                              "message": "Error in BTC Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveBTCTransaction status " + moveBTCTransaction);
                            if (moveBTCTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });
  },
  depositeInWalletBCH: function(req, res) {
    console.log("Enter into depositeInWalletBCH");
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToDeposite = parseFloat(req.body.bchamount);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userBCHAmountToDeposite || !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
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
              var userBCHMainBalanceInDb = userDetails.BCHMainbalance;
              if (userBCHAmountToDeposite > userBCHMainBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedBCHbalance = (parseFloat(userDetails.BCHbalance) + parseFloat(userBCHAmountToDeposite));
              var updatedBCHMainbalance = (parseFloat(userDetails.BCHMainbalance) - parseFloat(userBCHAmountToDeposite));

              User.update({
                  id: userDetails.id
                }, {
                  BCHbalance: parseFloat(updatedBCHbalance),
                  BCHMainbalance: parseFloat(updatedBCHMainbalance)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BTC main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userBCHAmountToDeposite,
                      currencyName: currencyNameBCH,
                      action: actionNameDeposit,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      //Move BCH Company account to User Account on deposite
                      clientBCH.cmd('move',
                        userEmailAddress,
                        companyBCHAccount,
                        userBCHAmountToDeposite,
                        function(err, moveBCHTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalBCH :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("BCH Server Refuse to connect App");
                              return res.json({
                                "message": "BCH Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyBCHAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyBCHAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in BCH server err.code " + err.code);
                              return res.json({
                                "message": "Problem in BCH server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in BCH Server");
                            return res.json({
                              "message": "Error in BCH Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveBCHTransaction status " + moveBCHTransaction);
                            if (moveBCHTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });

                    });
                });
            }
          });
      }
    });

  },
  withdrawInWalletBCH: function(req, res) {
    console.log("Enter into withdrawInWalletBCH");
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToWithDraw = parseFloat(req.body.bchamount);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userBCHAmountToWithDraw || !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
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
              var userBCHBalanceInDb = userDetails.BCHbalance;
              if (userBCHAmountToWithDraw > userBCHBalanceInDb) {
                console.log("User BCH balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BCH balance",
                  statusCode: 401
                });
              }
              //Deduct transactionFeeBCH
              var afterTransactionFeeAmount = (parseFloat(userBCHAmountToWithDraw) - parseFloat(transactionFeeBCH));
              console.log("afterTransactionFeeAmount :: " + afterTransactionFeeAmount);
              console.log("Spending password is valid!!!");
              var updatedBCHMainbalance = (parseFloat(userDetails.BCHMainbalance) + parseFloat(afterTransactionFeeAmount));
              var updatedBCHbalance = (parseFloat(userDetails.BCHbalance) - parseFloat(userBCHAmountToWithDraw));
              User.update({
                  id: userDetails.id
                }, {
                  BCHbalance: parseFloat(updatedBCHbalance),
                  BCHMainbalance: parseFloat(updatedBCHMainbalance)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BCH main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userBCHAmountToWithDraw,
                      currencyName: currencyNameBCH,
                      action: actionNameWithdrawal,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }

                      //Move BCH Company account to User Account on Withdrawal
                      clientBCH.cmd('move',
                        companyBCHAccount,
                        userEmailAddress,
                        afterTransactionFeeAmount,
                        function(err, moveBCHTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalBCH :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("BCH Server Refuse to connect App");
                              return res.json({
                                "message": "BCH Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyBCHAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyBCHAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in BCH server err.code " + err.code);
                              return res.json({
                                "message": "Problem in BCH server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in BCH Server");
                            return res.json({
                              "message": "Error in BCH Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveBCHTransaction status " + moveBCHTransaction);
                            if (moveBCHTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });
  },
  depositeInWalletPYY: function(req, res) {
    console.log("Enter into depositeInWalletPYY");
    var userEmailAddress = req.body.userMailId;
    var userPYYAmountToDeposite = parseFloat(req.body.pyyamount);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userPYYAmountToDeposite || !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
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
              var userPYYMainBalanceInDb = userDetails.PYYMainbalance;
              if (userPYYAmountToDeposite > userPYYMainBalanceInDb) {
                console.log("User PYY balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient PYY balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedPYYbalance = (parseFloat(userDetails.PYYbalance) + parseFloat(userPYYAmountToDeposite));
              var updatedPYYMainbalance = (parseFloat(userDetails.PYYMainbalance) - parseFloat(userPYYAmountToDeposite));

              User.update({
                  id: userDetails.id
                }, {
                  PYYbalance: parseFloat(updatedPYYbalance),
                  PYYMainbalance: parseFloat(updatedPYYMainbalance)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update PYY main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userPYYAmountToDeposite,
                      currencyName: currencyNamePYY,
                      action: actionNameDeposit,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      //Move PYY Company account to User Account on Withdrawal
                      clientPYY.cmd('move',
                        userEmailAddress,
                        companyPYYAccount,
                        userPYYAmountToDeposite,
                        function(err, movePYYTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalPYY :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("PYY Server Refuse to connect App");
                              return res.json({
                                "message": "PYY Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyPYYAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyPYYAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in PYY server err.code " + err.code);
                              return res.json({
                                "message": "Problem in PYY server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in PYY Server");
                            return res.json({
                              "message": "Error in PYY Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("movePYYTransaction status " + movePYYTransaction);
                            if (movePYYTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });

                    });
                });
            }
          });
      }
    });

  },
  withdrawInWalletPYY: function(req, res) {
    console.log("Enter into depositeInWalletPYY");
    var userEmailAddress = req.body.userMailId;
    var userPYYAmountToWithDraw = parseFloat(req.body.pyyamount);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userPYYAmountToWithDraw || !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
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
              var userPYYBalanceInDb = userDetails.PYYbalance;
              if (userPYYAmountToWithDraw > userPYYBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              //Deduct transactionFeePYY
              var afterTransactionFeeAmount = (parseFloat(userPYYAmountToWithDraw) - parseFloat(transactionFeePYY));
              console.log("afterTransactionFeeAmount :: " + afterTransactionFeeAmount);
              console.log("Spending password is valid!!!");
              var updatedPYYMainbalance = (parseFloat(userDetails.PYYMainbalance) + parseFloat(afterTransactionFeeAmount));
              var updatedPYYbalance = (parseFloat(userDetails.PYYbalance) - parseFloat(userPYYAmountToWithDraw));

              User.update({
                  id: userDetails.id
                }, {
                  PYYbalance: parseFloat(updatedPYYbalance),
                  PYYMainbalance: parseFloat(updatedPYYMainbalance)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update BTC main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userPYYAmountToWithDraw,
                      currencyName: currencyNamePYY,
                      action: actionNameWithdrawal,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }

                      //Move PYY Company account to User Account on Withdrawal
                      clientPYY.cmd('move',
                        companyPYYAccount,
                        userEmailAddress,
                        afterTransactionFeeAmount,
                        function(err, movePYYTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalPYY :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("PYY Server Refuse to connect App");
                              return res.json({
                                "message": "PYY Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyPYYAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyPYYAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in PYY server err.code " + err.code);
                              return res.json({
                                "message": "Problem in PYY server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in PYY Server");
                            return res.json({
                              "message": "Error in PYY Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("movePYYTransaction status " + movePYYTransaction);
                            if (movePYYTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });
  },
  depositeInWalletGDS: function(req, res) {
    console.log("Enter into depositeInWalletGDS");
    var userEmailAddress = req.body.userMailId;
    var userGDSAmountToDeposite = parseFloat(req.body.gdsamount);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userGDSAmountToDeposite || !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
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
        var userGDSBalanceInDb = parseFloat(userDetails.GDSbalance);
        console.log("User GDS balance in database ::: " + userGDSBalanceInDb);
        console.log("User want send GDS to send ::: " + userGDSAmountToDeposite);
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
              var userGDSMainBalanceInDb = userDetails.GDSMainbalance;
              if (userGDSAmountToDeposite > userGDSMainBalanceInDb) {
                console.log("User GDS balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient GDS balance",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var updatedGDSbalance = (parseFloat(userDetails.GDSbalance) + parseFloat(userGDSAmountToDeposite));
              var updatedGDSMainbalance = (parseFloat(userDetails.GDSMainbalance) - parseFloat(userGDSAmountToDeposite));

              User.update({
                  id: userDetails.id
                }, {
                  GDSbalance: parseFloat(updatedGDSbalance),
                  GDSMainbalance: parseFloat(updatedGDSMainbalance)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update GDS main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userGDSAmountToDeposite,
                      currencyName: currencyNameGDS,
                      action: actionNameDeposit,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }
                      //Move   User Account to GDS Company account on Deposite
                      clientGDS.cmd('move',
                        userEmailAddress,
                        companyGDSAccount,
                        userGDSAmountToDeposite,
                        function(err, moveGDSTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalGDS :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("GDS Server Refuse to connect App");
                              return res.json({
                                "message": "GDS Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyGDSAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyGDSAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in GDS server err.code " + err.code);
                              return res.json({
                                "message": "Problem in GDS server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in GDS Server");
                            return res.json({
                              "message": "Error in GDS Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveGDSTransaction status " + moveGDSTransaction);
                            if (moveGDSTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });

  },
  withdrawInWalletGDS: function(req, res) {
    console.log("Enter into depositeInWalletGDS");
    var userEmailAddress = req.body.userMailId;
    var userGDSAmountToWithDraw = parseFloat(req.body.gdsamount);
    var userSpendingPassword = req.body.spendingPassword;
    if (!userEmailAddress || !userGDSAmountToWithDraw || !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
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
              var userGDSBalanceInDb = userDetails.GDSbalance;
              if (userGDSAmountToWithDraw > userGDSBalanceInDb) {
                console.log("User GDS balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient GDS balance",
                  statusCode: 401
                });
              }
              //Deduct transactionFeePYY
              var afterTransactionFeeAmount = (parseFloat(userGDSAmountToWithDraw) - parseFloat(transactionFeeGDS));
              console.log("afterTransactionFeeAmount :: " + afterTransactionFeeAmount);
              console.log("Spending password is valid!!!");
              var updatedGDSMainbalance = (parseFloat(userDetails.GDSMainbalance) + parseFloat(afterTransactionFeeAmount));
              var updatedGDSbalance = (parseFloat(userDetails.GDSbalance) - parseFloat(userGDSAmountToWithDraw));
              User.update({
                  id: userDetails.id
                }, {
                  GDSbalance: parseFloat(updatedGDSbalance),
                  GDSMainbalance: parseFloat(updatedGDSMainbalance)
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    console.log("Error to update User after move bid!!!!!!!!!");
                    return res.json({
                      "message": "Error to update GDS main balance",
                      statusCode: 401
                    });
                  }
                  Tradebalanceorder.create({
                      amount: userGDSAmountToWithDraw,
                      currencyName: currencyNameGDS,
                      action: actionNameWithdrawal,
                      tradebalanceorderowner: userDetails.id
                    })
                    .exec(function(err, createtradeOrder) {
                      if (err) {
                        console.log("Error to update user");
                        return res.serverError(err);
                      }

                      //Move GDS Company account to User Account on Withdrawal
                      clientGDS.cmd('move',
                        companyGDSAccount,
                        userEmailAddress,
                        afterTransactionFeeAmount,
                        function(err, moveGDSTransaction, resHeaders) {
                          if (err) {
                            console.log("Error from WithdrawalGDS :: ");
                            if (err.code && err.code == "ECONNREFUSED") {
                              console.log("GDS Server Refuse to connect App");
                              return res.json({
                                "message": "GDS Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              console.log(companyGDSAccount + " Account has Insufficient funds ");
                              return res.json({
                                "message": companyGDSAccount + " Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              console.log("Problem in GDS server err.code " + err.code);
                              return res.json({
                                "message": "Problem in GDS server",
                                statusCode: 400
                              });
                            }
                            console.log("Error in GDS Server");
                            return res.json({
                              "message": "Error in GDS Server",
                              statusCode: 400
                            });
                          } else {
                            console.log("moveGDSTransaction status " + moveGDSTransaction);
                            if (moveGDSTransaction == true) {
                              User.findOne({
                                  email: userEmailAddress
                                })
                                .exec(function(err, userDetails) {
                                  if (err) {
                                    console.log("Error to find user");
                                  }
                                  if (!userDetails) {
                                    console.log("Invalid email!");
                                  } else {
                                    return res.json({
                                      user: userDetails,
                                      statusCode: 200
                                    });
                                  }
                                });
                            }
                          }
                        });
                    });
                });
            }
          });
      }
    });
  },
};
