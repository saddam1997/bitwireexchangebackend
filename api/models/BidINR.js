/**
 * BidINR.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
var moment = require('moment');

module.exports = {

  schema: true,

  attributes: {
    createTimeUTC: {
      type: 'string',
    },
    bidAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalbidAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    bidAmountLTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalbidAmountLTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    bidAmountBCH: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalbidAmountBCH: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    bidAmountINR: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalbidAmountINR: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    bidRate: {
      type: 'float',
      required: true,
      defaultsTo: 0
    },
    status: {
      type: 'integer'
    },
    statusName: {
      type: 'string'
    },
    marketId: {
      type: 'integer'
    },
    bidownerINR: {
      model: 'user'
    }
  },
  afterCreate: function(values, next) {
    //values.createTimeUTC = moment.utc().format();
    values.createTimeUTC = Date.parse(moment.utc().format()) / 1000;
    BidINR.update({
      id: values.id
    }, values, next);
  }
};