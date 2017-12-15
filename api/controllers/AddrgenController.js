/**
 * AddrgenController
 *
 * @description :: Server-side logic for managing addrgens
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

const LABELPREFIX = sails.config.common.LABELPREFIX;

module.exports = {
  getNewBTCAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
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
      if (user.isBTCAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBTC.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from BTC server",
            statusCode: 400
          });
        }
        console.log('BTC address generated', address);
        if (!user.isBTCAddress) {
          User.update({
            email: userMailId
          }, {
            isBTCAddress: true,
            userBTCAddress: address
          }).exec(function afterwards(err, updated) {

            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewBCHAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
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
      if (user.isBCHAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBCH.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from BCH server",
            statusCode: 400
          });
        }
        console.log('BCH address generated', address);
        if (!user.isBCHAddress) {
          User.update({
            email: userMailId
          }, {
            isBCHAddress: true,
            userBCHAddress: address
          }).exec(function afterwards(err, updated) {

            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewLTCAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
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
      if (user.isLTCAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientLTC.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from LTC server",
            statusCode: 400
          });
        }
        console.log('LTC address generated', address);
        if (!user.isLTCAddress) {
          User.update({
            email: userMailId
          }, {
            isLTCAddress: true,
            userLTCAddress: address
          }).exec(function afterwards(err, updated) {

            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewINRAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
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
      if (user.isINRAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientINR.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from INR server",
            statusCode: 400
          });
        }
        console.log('INR address generated', address);
        if (!user.isINRAddress) {
          User.update({
            email: userMailId
          }, {
            isINRAddress: true,
            userINRAddress: address
          }).exec(function afterwards(err, updated) {

            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              statusCode: 200
            });
          });
        }
      });
    });
  },
};