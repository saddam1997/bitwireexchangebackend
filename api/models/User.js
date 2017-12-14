/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
var bcrypt = require('bcrypt');
module.exports = {
  schema: true,
  autoCreatedAt: false,
  autoUpdatedAt: false,
  attributes: {
    email: {
      type: 'email',
      email: true,
      required: true,
      unique: true
    },

    BTCMainbalance: {
      type: 'float',
      defaultsTo: 0
    },
    BTCbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedBTCbalance: {
      type: 'float',
      defaultsTo: 0
    },
    BCHMainbalance: {
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

    LTCMainbalance: {
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

    INRMainbalance: {
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

    isBTCAddress: {
      type: 'integer',
      defaultsTo: 0
    },
    isBCHAddress: {
      type: 'integer',
      defaultsTo: 0
    },
    isLTCAddress: {
      type: 'integer',
      defaultsTo: 0
    },
    isINRAddress: {
      type: 'integer',
      defaultsTo: 0
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
  compareForgotpasswordOTP: function(otp, user, cb) {
    bcrypt.compare(otp, user.encryptedForgotPasswordOTP, function(err, match) {
      if (err) {
        console.log(" cb(err).. findOne.authenticated called.........");
        cb(err);
      }
      if (match) {
        cb(null, true);
      } else {
        console.log("not match.....");
        cb(err);
      }
    })
  },
  compareEmailVerificationOTP: function(otp, user, cb) {
    bcrypt.compare(otp, user.encryptedEmailVerificationOTP, function(err, match) {
      if (err) {
        console.log(" cb(err).. findOne.authenticated called.........");
        cb(err);
      }
      if (match) {
        cb(null, true);
      } else {
        console.log("not match.....");
        cb(err);
      }
    })
  },
  compareEmailVerificationOTPForSpendingPassword: function(otp, user, cb) {
    bcrypt.compare(otp, user.encryptedForgotSpendingPasswordOTP, function(err, match) {
      if (err) {
        console.log(" cb(err).. findOne.authenticated called.........");
        cb(err);
      }
      if (match) {
        cb(null, true);
      } else {
        console.log("not match.....");
        cb(err);
      }
    })
  }
};