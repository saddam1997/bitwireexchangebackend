/**
 * Transation.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    amount: {
      type: 'float',
      defaultsTo: 0.00
    },
    networkFee: {
      type: 'float',
      defaultsTo: 0.00
    },
    actionName: {
      type: 'string'
    },
    actionId: {
      type: 'integer'
    },
    address: {
      type: 'string'
    },
    txid: {
      type: 'string'
    },
    currencyName: {
      type: 'string'
    },
    transationowner: {
      model: 'user'
    }
  }
};