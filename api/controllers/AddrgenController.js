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
              newaddress: address,
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
              newaddress: address,
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
              newaddress: address,
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewUSDAddress: function(req, res) {
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
      if (user.isUSDAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientUSD.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from USD server",
            statusCode: 400
          });
        }
        console.log('USD address generated', address);
        if (!user.isUSDAddress) {
          User.update({
            email: userMailId
          }, {
            isUSDAddress: true,

            userUSDAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewEURAddress: function(req, res) {
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
      if (user.isEURAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientEUR.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from EUR server",
            statusCode: 400
          });
        }
        console.log('EUR address generated', address);
        if (!user.isEURAddress) {
          User.update({
            email: userMailId
          }, {
            isEURAddress: true,

            userEURAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewGBPAddress: function(req, res) {
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
      if (user.isGBPAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientGBP.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from GBP server",
            statusCode: 400
          });
        }
        console.log('GBP address generated', address);
        if (!user.isGBPAddress) {
          User.update({
            email: userMailId
          }, {
            isGBPAddress: true,

            userGBPAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewBRLAddress: function(req, res) {
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
      if (user.isBRLAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBRL.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from BRL server",
            statusCode: 400
          });
        }
        console.log('BRL address generated', address);
        if (!user.isBRLAddress) {
          User.update({
            email: userMailId
          }, {
            isBRLAddress: true,

            userBRLAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewPLNAddress: function(req, res) {
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
      if (user.isPLNAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientPLN.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from PLN server",
            statusCode: 400
          });
        }
        console.log('PLN address generated', address);
        if (!user.isPLNAddress) {
          User.update({
            email: userMailId
          }, {
            isPLNAddress: true,

            userPLNAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewCADAddress: function(req, res) {
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
      if (user.isCADAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientCAD.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from CAD server",
            statusCode: 400
          });
        }
        console.log('CAD address generated', address);
        if (!user.isCADAddress) {
          User.update({
            email: userMailId
          }, {
            isCADAddress: true,

            userCADAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewTRYAddress: function(req, res) {
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
      if (user.isTRYAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientTRY.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from TRY server",
            statusCode: 400
          });
        }
        console.log('TRY address generated', address);
        if (!user.isTRYAddress) {
          User.update({
            email: userMailId
          }, {
            isTRYAddress: true,

            userTRYAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewRUBAddress: function(req, res) {
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
      if (user.isRUBAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientRUB.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from RUB server",
            statusCode: 400
          });
        }
        console.log('RUB address generated', address);
        if (!user.isRUBAddress) {
          User.update({
            email: userMailId
          }, {
            isRUBAddress: true,

            userRUBAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewMXNAddress: function(req, res) {
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
      if (user.isMXNAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientMXN.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from MXN server",
            statusCode: 400
          });
        }
        console.log('MXN address generated', address);
        if (!user.isMXNAddress) {
          User.update({
            email: userMailId
          }, {
            isMXNAddress: true,

            userMXNAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewCZKAddress: function(req, res) {
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
      if (user.isCZKAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientCZK.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from CZK server",
            statusCode: 400
          });
        }
        console.log('CZK address generated', address);
        if (!user.isCZKAddress) {
          User.update({
            email: userMailId
          }, {
            isCZKAddress: true,

            userCZKAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewILSAddress: function(req, res) {
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
      if (user.isILSAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientILS.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from ILS server",
            statusCode: 400
          });
        }
        console.log('ILS address generated', address);
        if (!user.isILSAddress) {
          User.update({
            email: userMailId
          }, {
            isILSAddress: true,

            userILSAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewNZDAddress: function(req, res) {
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
      if (user.isNZDAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientNZD.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from NZD server",
            statusCode: 400
          });
        }
        console.log('NZD address generated', address);
        if (!user.isNZDAddress) {
          User.update({
            email: userMailId
          }, {
            isNZDAddress: true,

            userNZDAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewJPYAddress: function(req, res) {
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
      if (user.isJPYAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientJPY.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from JPY server",
            statusCode: 400
          });
        }
        console.log('JPY address generated', address);
        if (!user.isJPYAddress) {
          User.update({
            email: userMailId
          }, {
            isJPYAddress: true,

            userJPYAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewSEKAddress: function(req, res) {
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
      if (user.isSEKAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientSEK.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from SEK server",
            statusCode: 400
          });
        }
        console.log('SEK address generated', address);
        if (!user.isSEKAddress) {
          User.update({
            email: userMailId
          }, {
            isSEKAddress: true,

            userSEKAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewAUDAddress: function(req, res) {
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
      if (user.isAUDAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientAUD.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from AUD server",
            statusCode: 400
          });
        }
        console.log('AUD address generated', address);
        if (!user.isAUDAddress) {
          User.update({
            email: userMailId
          }, {
            isAUDAddress: true,

            userAUDAddress: address
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
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
};