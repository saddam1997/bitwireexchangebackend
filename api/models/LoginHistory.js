/**
 * LoginHistory.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
var moment = require('moment');

module.exports = {

  attributes: {
    logintime: {
      type: 'string',
    },
    logouttime: {
      type: 'string',
    },
    ip: {
      type: 'string',
    },
    status: {
      type: 'integer',
    },
    statusName: {
      type: 'string',
    },
    loginowner: {
      model: 'user'
    }
  },
  afterCreate: function(values, next) {
    //values.createTimeUTC = moment.utc().format();
    values.logintime = Date.parse(moment.utc().format()) / 1000;
    LoginHistory.update({
      id: values.id
    }, values, next);
  }
};