/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
var bcrypt = require('bcrypt');
module.exports = {
  schema: true,
  attributes: {
    email: {
      type: 'email',
      email: true,
      required: true,
      unique: true
    },
    BTCbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedBTCbalance: {
      type: 'float',
      defaultsTo: 0
    },

    BCHbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedBCHbalance: {
      type: 'float',
      defaultsTo: 0
    },

    LTCbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedLTCbalance: {
      type: 'float',
      defaultsTo: 0
    },

    INRbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedINRbalance: {
      type: 'float',
      defaultsTo: 0
    },
    USDbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedUSDbalance: {
      type: 'float',
      defaultsTo: 0
    },
    EURbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedEURbalance: {
      type: 'float',
      defaultsTo: 0
    },
    GBPbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedGBPbalance: {
      type: 'float',
      defaultsTo: 0
    },
    BRLbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedBRLbalance: {
      type: 'float',
      defaultsTo: 0
    },
    PLNbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedPLNbalance: {
      type: 'float',
      defaultsTo: 0
    },
    CADbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedCADbalance: {
      type: 'float',
      defaultsTo: 0
    },
    TRYbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedTRYbalance: {
      type: 'float',
      defaultsTo: 0
    },
    RUBbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedRUBbalance: {
      type: 'float',
      defaultsTo: 0
    },
    MXNbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedMXNbalance: {
      type: 'float',
      defaultsTo: 0
    },
    CZKbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedCZKbalance: {
      type: 'float',
      defaultsTo: 0
    },
    ILSbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedILSbalance: {
      type: 'float',
      defaultsTo: 0
    },
    NZDbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedNZDbalance: {
      type: 'float',
      defaultsTo: 0
    },
    JPYbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedJPYbalance: {
      type: 'float',
      defaultsTo: 0
    },
    SEKbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedSEKbalance: {
      type: 'float',
      defaultsTo: 0
    },
    AUDbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedAUDbalance: {
      type: 'float',
      defaultsTo: 0
    },

    isUserDisable: {
      type: "boolean",
      defaultsTo: false
    },

    isUserFreezed: {
      type: "boolean",
      defaultsTo: false
    },

    isBTCAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isBCHAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isLTCAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isINRAddress: {
      type: "boolean",
      defaultsTo: false
    },

    isUSDAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isEURAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isGBPAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isBRLAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isPLNAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isCADAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isTRYAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isRUBAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isMXNAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isCZKAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isILSAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isNZDAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isJPYAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isSEKAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isAUDAddress: {
      type: "boolean",
      defaultsTo: false
    },
    userBTCAddress: {
      type: 'string'
    },
    userBCHAddress: {
      type: 'string'
    },
    userLTCAddress: {
      type: 'string'
    },
    userINRAddress: {
      type: 'string'
    },

    userUSDAddress: {
      type: 'string'
    },
    userEURAddress: {
      type: 'string'
    },
    userGBPAddress: {
      type: 'string'
    },
    userBRLAddress: {
      type: 'string'
    },
    userPLNAddress: {
      type: 'string'
    },
    userCADAddress: {
      type: 'string'
    },
    userTRYAddress: {
      type: 'string'
    },
    userRUBAddress: {
      type: 'string'
    },
    userMXNAddress: {
      type: 'string'
    },
    userCZKAddress: {
      type: 'string'
    },
    userILSAddress: {
      type: 'string'
    },
    userNZDAddress: {
      type: 'string'
    },
    userJPYAddress: {
      type: 'string'
    },
    userSEKAddress: {
      type: 'string'
    },
    userAUDAddress: {
      type: 'string'
    },
    encryptedPassword: {
      type: 'string'
    },
    encryptedSpendingpassword: {
      type: 'string'
    },
    encryptedForgotPasswordOTP: {
      type: 'string'
    },
    encryptedForgotSpendingPasswordOTP: {
      type: 'string'
    },
    encryptedEmailVerificationOTP: {
      type: 'string'
    },
    verifyEmail: {
      type: 'boolean',
      defaultsTo: false
    },
    tfastatus: {
      type: "boolean",
      defaultsTo: false
    },
    googlesecreatekey: {
      type: 'string'
    },
    isAdmin: {
      type: 'boolean',
      defaultsTo: false
    },
    //Tradebalanceorder
    tradebalanceorderDetails: {
      collection: 'tradebalanceorder',
      via: 'tradebalanceorderowner'
    },
    //INR
    bidsINR: {
      collection: 'bidINR',
      via: 'bidownerINR'
    },
    asksINR: {
      collection: 'askINR',
      via: 'askownerINR'
    },

    //USD
    bidsUSD: {
      collection: 'bidUSD',
      via: 'bidownerUSD'
    },
    asksUSD: {
      collection: 'askUSD',
      via: 'askownerUSD'
    },

    //EUR
    bidsEUR: {
      collection: 'bidEUR',
      via: 'bidownerEUR'
    },
    asksEUR: {
      collection: 'askEUR',
      via: 'askownerEUR'
    },

    //GBP
    bidsGBP: {
      collection: 'bidGBP',
      via: 'bidownerGBP'
    },
    asksGBP: {
      collection: 'askGBP',
      via: 'askownerGBP'
    },

    //BRL
    bidsBRL: {
      collection: 'bidBRL',
      via: 'bidownerBRL'
    },
    asksBRL: {
      collection: 'askBRL',
      via: 'askownerBRL'
    },

    //PLN
    bidsPLN: {
      collection: 'bidPLN',
      via: 'bidownerPLN'
    },
    asksPLN: {
      collection: 'askPLN',
      via: 'askownerPLN'
    },

    //CAD
    bidsCAD: {
      collection: 'bidCAD',
      via: 'bidownerCAD'
    },
    asksCAD: {
      collection: 'askCAD',
      via: 'askownerCAD'
    },

    //TRY
    bidsTRY: {
      collection: 'bidTRY',
      via: 'bidownerTRY'
    },
    asksTRY: {
      collection: 'askTRY',
      via: 'askownerTRY'
    },

    //RUB
    bidsRUB: {
      collection: 'bidRUB',
      via: 'bidownerRUB'
    },
    asksRUB: {
      collection: 'askRUB',
      via: 'askownerRUB'
    },

    //MXN
    bidsMXN: {
      collection: 'bidMXN',
      via: 'bidownerMXN'
    },
    asksMXN: {
      collection: 'askMXN',
      via: 'askownerMXN'
    },

    //CZK
    bidsCZK: {
      collection: 'bidCZK',
      via: 'bidownerCZK'
    },
    asksCZK: {
      collection: 'askCZK',
      via: 'askownerCZK'
    },

    //ILS
    bidsILS: {
      collection: 'bidILS',
      via: 'bidownerILS'
    },
    asksILS: {
      collection: 'askILS',
      via: 'askownerILS'
    },

    //NZD
    bidsNZD: {
      collection: 'bidNZD',
      via: 'bidownerNZD'
    },
    asksNZD: {
      collection: 'askNZD',
      via: 'askownerNZD'
    },

    //JPY
    bidsJPY: {
      collection: 'bidJPY',
      via: 'bidownerJPY'
    },
    asksJPY: {
      collection: 'askJPY',
      via: 'askownerJPY'
    },

    //SEK
    bidsSEK: {
      collection: 'bidSEK',
      via: 'bidownerSEK'
    },
    asksSEK: {
      collection: 'askSEK',
      via: 'askownerSEK'
    },

    //AUD
    bidsAUD: {
      collection: 'bidAUD',
      via: 'bidownerAUD'
    },
    asksAUD: {
      collection: 'askAUD',
      via: 'askownerAUD'
    },
    transations: {
      collection: 'transation',
      via: 'transationowner'
    },
    tickets: {
      collection: 'ticket',
      via: 'ticketOwnerId'
    },
    toJSON: function() {
      var obj = this.toObject();
      delete obj.encryptedPassword;
      delete obj.encryptedSpendingpassword;
      delete obj.encryptedEmailVerificationOTP;
      delete obj.encryptedForgotPasswordOTP;
      delete obj.encryptedForgotSpendingPasswordOTP;
      return obj;
    }
  },
  beforeCreate: function(values, next) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) return next(err);
      bcrypt.hash(values.password, salt, function(err, hash) {
        if (err) return next(err);
        values.encryptedPassword = hash;
        next();
      })
    })
  },
  comparePassword: function(password, user, cb = () => {}) {
    bcrypt.compare(password, user.encryptedPassword, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },
  compareSpendingpassword: function(spendingpassword, user, cb = () => {}) {
    bcrypt.compare(spendingpassword, user.encryptedSpendingpassword, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },

  compareForgotpasswordOTP: function(otp, user, cb = () => {}) {
    bcrypt.compare(otp, user.encryptedForgotPasswordOTP, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },
  compareEmailVerificationOTP: function(otp, user, cb = () => {}) {
    bcrypt.compare(otp, user.encryptedEmailVerificationOTP, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },
  compareEmailVerificationOTPForSpendingPassword: function(otp, user, cb = () => {}) {
    bcrypt.compare(otp, user.encryptedForgotSpendingPasswordOTP, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  }
};