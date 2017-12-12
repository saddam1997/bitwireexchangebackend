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
module.exports = {
  sendBTC: function(req, res, next) {
    console.log("Enter into sendBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToSend = parseFloat(req.body.amount);
    var userReceiverBTCAddress = req.body.recieverBTCCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var miniBTCAmountSentByUser = 0.001;
    miniBTCAmountSentByUser = parseFloat(miniBTCAmountSentByUser);
    if (!userEmailAddress || !userBTCAmountToSend || !userReceiverBTCAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userBTCAmountToSend < miniBTCAmountSentByUser) {
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
        var userBTCBalanceInDb = parseFloat(userDetails.BTCMainbalance);
        console.log("User BTC balance in database ::: " + userBTCBalanceInDb);
        console.log("User want send BTC to send ::: " + userBTCAmountToSend);
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
              var userBTCAddressInDb = userDetails.userBTCAddress;
              var userBTCBalanceInDb = userDetails.BTCMainbalance;
              if (userBTCAmountToSend > userBTCBalanceInDb) {
                console.log("User BTC balance is Insufficient");
                return res.json({
                  "message": "You have Insufficient BTC balance",
                  statusCode: 401
                });
              }
              if (userReceiverBTCAddress == userBTCAddressInDb) {
                console.log("User address and userReceiverBTCAddress Same !!!");
                return res.json({
                  "message": "userReceiverBTCAddress and Your BTC Address Same",
                  statusCode: 401
                });
              }
              console.log("Spending password is valid!!!");
              var minimumNumberOfConfirmation = 1;
              var netamountToSend = parseFloat(userBTCAmountToSend) - parseFloat(transactionFeeBTC);
              console.log("clientBTC netamountToSend :: " + netamountToSend);
              clientBTC.cmd('sendfrom', userEmailAddress, userReceiverBTCAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverBTCAddress, userReceiverBTCAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromBTCAccount:: ");
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
                      "message": "Error in BTC Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);
                  console.log("userBTCAddressInDb :: " + userBTCAddressInDb);
                  console.log("userBTCAmountToSend  :: " + userBTCAmountToSend);
                  var updatedBTCbalance = (parseFloat(userBTCBalanceInDb) - parseFloat(userBTCAmountToSend));
                  console.log("Update new Balance of user in DB ::" + parseFloat(updatedBTCbalance));
                  User.update({
                      email: userEmailAddress
                    }, {
                      BTCMainbalance: parseFloat(updatedBTCbalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User",
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
          });
      }
    });
  },
  sendBCH: function(req, res, next) {
    console.log("Enter into sendBCH with ::: " + JSON.stringify(req.body));
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToSend = parseFloat(req.body.amount);
    var userReceiverBCHAddress = req.body.recieverBCHCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountBCHSentByUser = 0.008;
    miniBCHAmountSentByUser = parseFloat(minimumAmountBCHSentByUser);

    if (!userEmailAddress || !userBCHAmountToSend || !userReceiverBCHAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user!!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userBCHAmountToSend < minimumAmountBCHSentByUser) {
      console.log("amount in not less 0.08 !!!");
      return res.json({
        "message": "BCH Amount not less than " + minimumAmountBCHSentByUser,
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
      }
      var userBCHBalanceInDb = parseFloat(userDetails.BCHMainbalance);
      var userBCHAddressInDb = userDetails.userBCHAddress;
      console.log("UserAMount in database ::: " + userDetails.BCHMainbalance);
      console.log("BCH Amount send by user ::: " + userBCHAmountToSend);
      if (userBCHAmountToSend > userBCHBalanceInDb) {
        console.log("BCH Amount amount Exceed !!!");
        return res.json({
          "message": "You have Insufficient BCH balance",
          statusCode: 401
        });
      }
      if (userReceiverBCHAddress == userBCHAddressInDb) {
        console.log("User address and recieverBCHCoinAddress Same !!!");
        return res.json({
          "message": "recieverBCHCoinAddress and Your BCH Address Same",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": err,
            statusCode: 400
          });
        }
        if (!valid) {
          console.log("Spending password is invalid !!!");
          return res.json({
            "message": "Please enter correct spending password",
            statusCode: 400
          });
        } else {
          console.log("Spending password is valid!!!");
          var minimumNumberOfConfirmation = 1;
          var netAmountToSend = parseFloat(userBCHAmountToSend) - parseFloat(transactionFeeBCH);
          console.log(userEmailAddress + " netAmountToSend ::: " + netAmountToSend);
          console.log(userEmailAddress + " transactionFeeBCH ::: " + transactionFeeBCH);

          clientBCH.cmd('sendfrom', userEmailAddress, userReceiverBCHAddress, parseFloat(netAmountToSend),
            minimumNumberOfConfirmation, userReceiverBCHAddress, userReceiverBCHAddress,
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
                  "message": "Error in BCH Server",
                  statusCode: 400
                });
              }
              console.log('TransactionDetails :', TransactionDetails);
              console.log("User balance in db:: " + userBCHBalanceInDb);
              console.log("UserBCHAmountToSend  :: " + userBCHAmountToSend);

              var updatedBCHbalance = parseFloat(userBCHBalanceInDb) - parseFloat(userBCHAmountToSend);
              console.log("Update new Balance of user in DB ::" + updatedBCHbalance);
              User.update({
                  email: userEmailAddress
                }, {
                  BCHMainbalance: updatedBCHbalance
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    return res.json({
                      "message": "Error to update User",
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
                      console.log("Update User details of BCH " +
                        JSON.stringify(user));
                      res.json({
                        user: user,
                        statusCode: 200
                      });
                    });
                });
            });
        }
      });
    });
  },
  sendPYY: function(req, res, next) {
    console.log("Enter into sendPYY with ::: " + JSON.stringify(req.body));
    var userEmailAddress = req.body.userMailId;
    var userPYYAmountToSend = parseFloat(req.body.amount);
    var userReceiverPYYAddress = req.body.recieverPYYCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountPYYSentByUser = 0.008;
    miniPYYAmountSentByUser = parseFloat(minimumAmountPYYSentByUser);

    if (!userEmailAddress || !userPYYAmountToSend || !userReceiverPYYAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user!!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userPYYAmountToSend < minimumAmountPYYSentByUser) {
      console.log("amount in not less 0.08 !!!");
      return res.json({
        "message": "PYY Amount not less than " + minimumAmountPYYSentByUser,
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
      }
      var userPYYBalanceInDb = parseFloat(userDetails.PYYMainbalance);
      var userPYYAddressInDb = userDetails.userPYYAddress;
      console.log("UserAMount in database ::: " + userDetails.PYYMainbalance);
      console.log("PYY Amount send by user ::: " + userPYYAmountToSend);
      if (userPYYAmountToSend > userPYYBalanceInDb) {
        console.log("PYY Amount amount Exceed !!!");
        return res.json({
          "message": "You have Insufficient PYY balance",
          statusCode: 401
        });
      }
      if (userReceiverPYYAddress == userPYYAddressInDb) {
        console.log("User address and recieverPYYCoinAddress Same !!!");
        return res.json({
          "message": "recieverPYYCoinAddress and Your PYY Address Same",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": err,
            statusCode: 400
          });
        }
        if (!valid) {
          console.log("Spending password is invalid !!!");
          return res.json({
            "message": "Please enter correct spending password",
            statusCode: 400
          });
        } else {
          console.log("Spending password is valid!!!");
          var minimumNumberOfConfirmation = 1;
          var netAmountToSend = parseFloat(userPYYAmountToSend) - parseFloat(transactionFeePYY);
          console.log(userEmailAddress + " netAmountToSend ::: " + netAmountToSend);
          console.log(userEmailAddress + " transactionFeePYY ::: " + transactionFeePYY);

          clientPYY.cmd('sendfrom', userEmailAddress, userReceiverPYYAddress, parseFloat(netAmountToSend),
            minimumNumberOfConfirmation, userReceiverPYYAddress, userReceiverPYYAddress,
            function(err, TransactionDetails, resHeaders) {
              if (err) {
                console.log("Error from sendFromPYYAccount:: " + err);
                if (err.code && err.code == "ECONNREFUSED") {
                  return res.json({
                    "message": "PYY Server Refuse to connect App",
                    statusCode: 400
                  });
                }
                if (err.code && err.code == -5) {
                  return res.json({
                    "message": "Invalid PYY Address",
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
                    "message": "Problem in PYY server",
                    statusCode: 400
                  });
                }
                return res.json({
                  "message": "Error in PYY Server",
                  statusCode: 400
                });
              }
              console.log('TransactionDetails :', TransactionDetails);
              console.log("User balance in db:: " + userPYYBalanceInDb);
              console.log("UserPYYAmountToSend  :: " + userPYYAmountToSend);

              var updatedPYYbalance = parseFloat(userPYYBalanceInDb) - parseFloat(userPYYAmountToSend);
              console.log("Update new Balance of user in DB ::" + updatedPYYbalance);
              User.update({
                  email: userEmailAddress
                }, {
                  PYYMainbalance: updatedPYYbalance
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    return res.json({
                      "message": "Error to update User",
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
                      console.log("Update User details of PYY " +
                        JSON.stringify(user));
                      res.json({
                        user: user,
                        statusCode: 200
                      });
                    });
                });
            });
        }
      });
    });
  },
  sendGDS: function(req, res, next) {
    console.log("Enter into sendGDS with ::: " + JSON.stringify(req.body));
    var userEmailAddress = req.body.userMailId;
    var userGDSAmountToSend = parseFloat(req.body.amount);
    var userReceiverGDSAddress = req.body.recieverGDSCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var userCommentForReceiver = req.body.commentForReciever;
    var userCommentForSender = req.body.commentForSender;
    var minimumAmountGDSSentByUser = 0.008;
    miniGDSAmountSentByUser = parseFloat(minimumAmountGDSSentByUser);

    if (!userEmailAddress || !userGDSAmountToSend || !userReceiverGDSAddress ||
      !userSpendingPassword || !userCommentForReceiver || !userCommentForSender) {
      console.log("Can't be empty!!! by user!!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userGDSAmountToSend < minimumAmountGDSSentByUser) {
      console.log("amount in not less 0.08 !!!");
      return res.json({
        "message": "GDS Amount not less than " + minimumAmountGDSSentByUser,
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
      }
      var userGDSBalanceInDb = parseFloat(userDetails.GDSMainbalance);
      var userGDSAddressInDb = userDetails.userGDSAddress;
      console.log("UserAMount in database ::: " + userDetails.GDSMainbalance);
      console.log("GDS Amount send by user ::: " + userGDSAmountToSend);
      if (userGDSAmountToSend > userGDSBalanceInDb) {
        console.log("GDS Amount amount Exceed !!!");
        return res.json({
          "message": "You have Insufficient GDS balance",
          statusCode: 401
        });
      }
      if (userReceiverGDSAddress == userGDSAddressInDb) {
        console.log("User address and recieverGDSCoinAddress Same !!!");
        return res.json({
          "message": "recieverGDSCoinAddress and Your GDS Address Same",
          statusCode: 401
        });
      }
      User.compareSpendingpassword(userSpendingPassword, userDetails, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": err,
            statusCode: 400
          });
        }
        if (!valid) {
          console.log("Spending password is invalid !!!");
          return res.json({
            "message": "Please enter correct spending password",
            statusCode: 400
          });
        } else {
          console.log("Spending password is valid!!!");
          var minimumNumberOfConfirmation = 1;
          var netAmountToSend = parseFloat(userGDSAmountToSend) - parseFloat(transactionFeeGDS);
          console.log(userEmailAddress + " netAmountToSend ::: " + netAmountToSend);
          console.log(userEmailAddress + " transactionFeeGDS ::: " + transactionFeeGDS);

          clientGDS.cmd('sendfrom', userEmailAddress, userReceiverGDSAddress, parseFloat(netAmountToSend),
            minimumNumberOfConfirmation, userReceiverGDSAddress, userReceiverGDSAddress,
            function(err, TransactionDetails, resHeaders) {
              if (err) {
                console.log("Error from sendFromGDSAccount:: " + err);
                if (err.code && err.code == "ECONNREFUSED") {
                  return res.json({
                    "message": "GDS Server Refuse to connect App",
                    statusCode: 400
                  });
                }
                if (err.code && err.code == -5) {
                  return res.json({
                    "message": "Invalid GDS Address",
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
                    "message": "Problem in GDS server",
                    statusCode: 400
                  });
                }
                return res.json({
                  "message": "Error in GDS Server",
                  statusCode: 400
                });
              }
              console.log('TransactionDetails :', TransactionDetails);
              console.log("User balance in db:: " + userGDSBalanceInDb);
              console.log("UserGDSAmountToSend  :: " + userGDSAmountToSend);

              var updatedGDSbalance = parseFloat(userGDSBalanceInDb) - parseFloat(userGDSAmountToSend);
              console.log("Update new Balance of user in DB ::" + updatedGDSbalance);
              User.update({
                  email: userEmailAddress
                }, {
                  GDSMainbalance: updatedGDSbalance
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    return res.json({
                      "message": "Error to update User",
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
                      console.log("Update User details of GDS " +
                        JSON.stringify(user));
                      res.json({
                        user: user,
                        statusCode: 200
                      });
                    });
                });
            });
        }
      });
    });
  },
  getTxsListBCH: function(req, res, next) {
    console.log("Enter into getTransactionListBCH::: ");
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
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientBCH.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
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
          console.log("Return transactionList List !! ");
          // for(var i = 0; i < transactionList.length; i++) {
          //   console.log("transactionList.account ::"+transactionList[i].address);
          //   if(transactionList[i].comment == companyBCHAccountAddress){
          //     console.log("companyBCHAccountAddress found !!!");
          //       delete transactionList[i];
          //   }
          // }
          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListBTC: function(req, res, next) {

    console.log("Enter into getTxsListBTC::: ");
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
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientBTC.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
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
          console.log("Return transactionList List !! ");
          // for(var i = 0; i < transactionList.length; i++) {
          //   console.log("transactionList.account ::"+transactionList[i].address);
          //   if(transactionList[i].comment == companyBCHAccountAddress){
          //     console.log("companyBCHAccountAddress found !!!");
          //       delete transactionList[i];
          //   }
          // }
          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListPYY: function(req, res, next) {
    console.log("Enter into getTxsListPYY::: ");
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
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientPYY.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
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
          console.log("Return transactionList List !! ");

          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getTxsListGDS: function(req, res, next) {
    console.log("Enter into getTxsListGDS::: ");
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
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientGDS.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
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
          console.log("Return transactionList List !! ");

          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
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
      clientBCH.cmd(
        'getbalance',
        userMailId,
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
      clientBTC.cmd(
        'getbalance',
        userMailId,
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
  getBalPYY: function(req, res, next) {
    console.log("Enter into getBalPYY::: ");
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
      console.log("UserBCH Balance ::" + user.PYYMainbalance);
      var userPYYMainbalanceInDb = parseFloat(user.PYYMainbalance);
      var userFreezedPYYMainbalanceInDb = parseFloat(user.FreezedPYYbalance);
      clientPYY.cmd(
        'getbalance',
        userMailId,
        function(err, userPYYMainbalanceFromServer, resHeaders) {
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
          var totalPYYMainbalance = (parseFloat(userPYYMainbalanceInDb));
          console.log(parseFloat(userPYYMainbalanceFromServer) + " BHC server and in DB BCH + Freezed " + parseFloat(totalPYYMainbalance));
          if (parseFloat(userPYYMainbalanceFromServer) > parseFloat(totalPYYMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                PYYMainbalance: parseFloat(userPYYMainbalanceFromServer)
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
  getBalGDS: function(req, res, next) {
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
      console.log("UserBCH Balance ::" + user.GDSMainbalance);
      var userGDSMainbalanceInDb = parseFloat(user.GDSMainbalance);
      var userFreezedGDSMainbalanceInDb = parseFloat(user.FreezedGDSbalance);
      clientBCH.cmd(
        'getbalance',
        userMailId,
        function(err, userGDSMainbalanceFromServer, resHeaders) {
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
          var totalGDSMainbalance = (parseFloat(userGDSMainbalanceInDb));
          console.log(parseFloat(userGDSMainbalanceFromServer) + " BHC server and in DB BCH + Freezed " + parseFloat(totalGDSMainbalance));
          if (parseFloat(userGDSMainbalanceFromServer) > parseFloat(totalGDSMainbalance)) {
            console.log("UserBalance Need to update ............");
            User.update({
                email: userMailId
              }, {
                GDSMainbalance: parseFloat(userGDSMainbalanceFromServer)
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