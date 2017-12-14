/**
 * AskINR.js
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
    askAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    askAmountINR: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalaskAmountBTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalaskAmountINR: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    askAmountLTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalaskAmountLTC: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    askAmountBCH: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    totalaskAmountBCH: {
      type: 'float',
      defaultsTo: 0.00,
      required: true
    },
    askRate: {
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
    askownerINR: {
      model: 'user'
    }
  },
  afterCreate: function(values, next) {
    //values.createTimeUTC = moment.utc().format();
    values.createTimeUTC = Date.parse(moment.utc().format()) / 1000;
    AskINR.update({
      id: values.id
    }, values, next);
  }
};