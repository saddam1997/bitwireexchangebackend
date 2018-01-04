/**
 * Ticket.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    ticketOwnerId: {
      model: 'user'
    },
    department: {
      type: 'string'
    }, //IT,TESTING etc
    title: {
      type: 'string'
    }, //short summary
    description: {
      type: 'string'
    },
    attachment: {
      type: 'string'
    }, //image of prob. etc
    status: {
      type: 'integer'
    }, //0=pending , 1=inProgress, 2=resolved
    resolvedBy: {
      model: 'user'
    },
    createTimeUTC: {
      type: 'string'
    },
    resolvedTimeUTC: {
      type: 'string'
    }
  }
};