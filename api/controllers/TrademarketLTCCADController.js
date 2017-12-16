/**
 * TrademarketLTCCADController
 *CAD
 * @description :: Server-side logic for managing trademarketltccads
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

var statusZero = sails.config.common.statusZero;
var statusOne = sails.config.common.statusOne;
var statusTwo = sails.config.common.statusTwo;
var statusThree = sails.config.common.statusThree;

var statusZeroCreated = sails.config.common.statusZeroCreated;
var statusOneSuccessfull = sails.config.common.statusOneSuccessfull;
var statusTwoPending = sails.config.common.statusTwoPending;
var statusThreeCancelled = sails.config.common.statusThreeCancelled;
var constants = require('./../../config/constants');

const txFeeWithdrawSuccessLTC = sails.config.common.txFeeWithdrawSuccessLTC;
const LTCMARKETID = sails.config.common.LTCMARKETID;
module.exports = {

  addAskCADMarket: async function(req, res) {
    console.log("Enter into ask api addAskCADMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountCAD = new BigNumber(req.body.askAmountCAD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountCAD || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountCAD < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
      console.log("Negative Paramter");
      return res.json({
        "message": "Negative Paramter!!!!",
        statusCode: 400
      });
    }
    try {
      var userAsker = await User.findOne({
        id: userAskownerId
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Error in fetching user',
        statusCode: 401
      });
    }
    if (!userAsker) {
      return res.json({
        "message": "Invalid Id!",
        statusCode: 401
      });
    }
    console.log("User details find successfully :::: " + JSON.stringify(userAsker));
    var userCADBalanceInDb = new BigNumber(userAsker.CADbalance);
    var userFreezedCADBalanceInDb = new BigNumber(userAsker.FreezedCADbalance);

    userCADBalanceInDb = parseFloat(userCADBalanceInDb);
    userFreezedCADBalanceInDb = parseFloat(userFreezedCADBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountCAD.greaterThanOrEqualTo(userCADBalanceInDb)) {
      return res.json({
        "message": "You have insufficient CAD Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountCAD :: " + userAskAmountCAD);
    console.log("userCADBalanceInDb :: " + userCADBalanceInDb);
    // if (userAskAmountCAD >= userCADBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient CAD Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountCAD = parseFloat(userAskAmountCAD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskCAD.create({
        askAmountLTC: userAskAmountLTC,
        askAmountCAD: userAskAmountCAD,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountCAD: userAskAmountCAD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        askownerCAD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.CAD_ASK_ADDED, askDetails);
    // var updateUserCADBalance = (parseFloat(userCADBalanceInDb) - parseFloat(userAskAmountCAD));
    // var updateFreezedCADBalance = (parseFloat(userFreezedCADBalanceInDb) + parseFloat(userAskAmountCAD));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userCADBalanceInDb = new BigNumber(userCADBalanceInDb);
    var updateUserCADBalance = userCADBalanceInDb.minus(userAskAmountCAD);
    updateUserCADBalance = parseFloat(updateUserCADBalance);
    userFreezedCADBalanceInDb = new BigNumber(userFreezedCADBalanceInDb);
    var updateFreezedCADBalance = userFreezedCADBalanceInDb.plus(userAskAmountCAD);
    updateFreezedCADBalance = parseFloat(updateFreezedCADBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedCADbalance: updateFreezedCADBalance,
        CADbalance: updateUserCADBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidCAD.find({
        bidRate: {
          'like': parseFloat(userAskRate)
        },
        marketId: {
          'like': LTCMARKETID
        },
        status: {
          '!': [statusOne, statusThree]
        }
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to find CAD bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingCAD = new BigNumber(userAskAmountCAD);
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
      //this loop for sum of all Bids amount of CAD
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountCAD;
      }
      if (total_bid <= totoalAskRemainingCAD) {
        console.log("Inside of total_bid <= totoalAskRemainingCAD");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingCAD");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingCAD :: " + totoalAskRemainingCAD);
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingCAD = (parseFloat(totoalAskRemainingCAD) - parseFloat(currentBidDetails.bidAmountCAD));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingCAD = totoalAskRemainingCAD.minus(currentBidDetails.bidAmountCAD);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingCAD :: " + totoalAskRemainingCAD);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

          if (totoalAskRemainingCAD == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingCAD == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerCAD
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCAD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
            updatedCADbalanceBidder = updatedCADbalanceBidder.plus(currentBidDetails.bidAmountCAD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of CAD Update user " + updatedCADbalanceBidder);
            //var txFeesBidderCAD = (parseFloat(currentBidDetails.bidAmountCAD) * parseFloat(txFeeWithdrawSuccessCAD));
            // var txFeesBidderCAD = new BigNumber(currentBidDetails.bidAmountCAD);
            //
            // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD)
            // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
            // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


            //updatedCADbalanceBidder =  parseFloat(updatedCADbalanceBidder);

            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                CADbalance: updatedCADbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and CAD balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedCADbalanceAsker = parseFloat(totoalAskRemainingCAD);
            //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);

            //updatedFreezedCADbalanceAsker =  parseFloat(updatedFreezedCADbalanceAsker);
            //Deduct Transation Fee Asker
            //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var LTCAmountSucess = new BigNumber(userAskAmountLTC);
            LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount LTC updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
            updatedLTCbalanceAsker = parseFloat(updatedLTCbalanceAsker);
            console.log("After deduct TX Fees of CAD Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedCADbalance: updatedFreezedCADbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed CADBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidCAD:: ");
            try {
              var bidDestroy = await BidCAD.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
            } catch (e) {
              return res.json({
                error: e,
                "message": "Failed with an error",
                statusCode: 200
              });
            }
            sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskCAD.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskCAD.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskCAD',
                statusCode: 401
              });
            }
            //emitting event of destruction of CAD_ask
            sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCAD == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCAD " + currentBidDetails.bidownerCAD);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerCAD
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
            updatedCADbalanceBidder = updatedCADbalanceBidder.plus(currentBidDetails.bidAmountCAD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of CAD 089089Update user " + updatedCADbalanceBidder);
            // var txFeesBidderCAD = (parseFloat(currentBidDetails.bidAmountCAD) * parseFloat(txFeeWithdrawSuccessCAD));
            // var txFeesBidderCAD = new BigNumber(currentBidDetails.bidAmountCAD);
            // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
            // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            // // updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
            // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCADbalanceBidder:: " + updatedCADbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                CADbalance: updatedCADbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);

            try {
              var desctroyCurrentBid = await BidCAD.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
            } catch (e) {
              return res.json({
                error: e,
                "message": "Failed with an error",
                statusCode: 200
              });
            }
            sails.sockets.blast(constants.CAD_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCAD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerCAD");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(totoalAskRemainingCAD));
            //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
            console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var LTCAmountSucess = new BigNumber(userAskAmountLTC);
            LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);

            //var txFeesAskerLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of CAD Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedCADbalance: updatedFreezedCADbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskCAD.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
                askAmountCAD: parseFloat(totoalAskRemainingCAD),
                status: statusTwo,
                statusName: statusTwoPending,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            sails.sockets.blast(constants.CAD_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingCAD :: " + totoalAskRemainingCAD);
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingCAD = totoalAskRemainingCAD - allBidsFromdb[i].bidAmountCAD;
          if (totoalAskRemainingCAD >= currentBidDetails.bidAmountCAD) {
            //totoalAskRemainingCAD = (parseFloat(totoalAskRemainingCAD) - parseFloat(currentBidDetails.bidAmountCAD));
            totoalAskRemainingCAD = totoalAskRemainingCAD.minus(currentBidDetails.bidAmountCAD);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
            console.log("start from here totoalAskRemainingCAD == 0::: " + totoalAskRemainingCAD);

            if (totoalAskRemainingCAD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingCAD == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerCAD :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
              //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));
              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(currentBidDetails.bidAmountCAD);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 CAD Update user " + updatedCADbalanceBidder);
              //var txFeesBidderCAD = (parseFloat(currentBidDetails.bidAmountCAD) * parseFloat(txFeeWithdrawSuccessCAD));

              // var txFeesBidderCAD = new BigNumber(currentBidDetails.bidAmountCAD);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);
              // console.log("After deduct TX Fees of CAD Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerCAD
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  CADbalance: updatedCADbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
              //var updatedFreezedCADbalanceAsker = parseFloat(totoalAskRemainingCAD);
              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(totoalAskRemainingCAD));
              //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
              console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
              var LTCAmountSucess = new BigNumber(userAskAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);
              //var txFeesAskerLTC = (parseFloat(updatedLTCbalanceAsker) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

              console.log("After deduct TX Fees of CAD Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerCAD
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
                  FreezedCADbalance: updatedFreezedCADbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidCAD.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidCAD.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidCAD.update({
                  id: currentBidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskCAD.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskCAD.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskCAD.update({
                  id: askDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCAD == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCAD " + currentBidDetails.bidownerCAD);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

              //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));
              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(currentBidDetails.bidAmountCAD);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var txFeesBidderCAD = (parseFloat(currentBidDetails.bidAmountCAD) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(currentBidDetails.bidAmountCAD);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);
              // console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedCADbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerCAD
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  CADbalance: updatedCADbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidCAD.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidCAD.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.CAD_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCAD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update Bid
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountCAD = (parseFloat(currentBidDetails.bidAmountCAD) - parseFloat(totoalAskRemainingCAD));
            var updatedBidAmountCAD = new BigNumber(currentBidDetails.bidAmountCAD);
            updatedBidAmountCAD = updatedBidAmountCAD.minus(totoalAskRemainingCAD);

            try {
              var updatedaskDetails = await BidCAD.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
                bidAmountCAD: updatedBidAmountCAD,
                status: statusTwo,
                statusName: statusTwoPending,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update socket.io
            sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerCAD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


            //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.CADbalance) + parseFloat(totoalAskRemainingCAD));

            var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.CADbalance);
            updatedCADbalanceBidder = updatedCADbalanceBidder.plus(totoalAskRemainingCAD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of CAD Update user " + updatedCADbalanceBidder);
            //var CADAmountSucess = parseFloat(totoalAskRemainingCAD);
            //var CADAmountSucess = new BigNumber(totoalAskRemainingCAD);
            //var txFeesBidderCAD = (parseFloat(CADAmountSucess) * parseFloat(txFeeWithdrawSuccessCAD));
            //var txFeesBidderCAD = (parseFloat(totoalAskRemainingCAD) * parseFloat(txFeeWithdrawSuccessCAD));



            // var txFeesBidderCAD = new BigNumber(totoalAskRemainingCAD);
            // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
            //
            // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
            // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            //Need to change here ...111...............askDetails
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCADbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                CADbalance: updatedCADbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerCAD");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of CAD Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedCADbalance: updatedFreezedCADbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskCAD.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskCAD.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskCAD.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //emitting event for CAD_ask destruction
            sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          }
        }
      }
    }
    console.log("Total Bid ::: " + total_bid);
    return res.json({
      "message": "Your ask placed successfully!!",
      statusCode: 200
    });
  },
  addBidCADMarket: async function(req, res) {
    console.log("Enter into ask api addBidCADMarket :: " + JSON.stringify(req.body));
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountCAD = new BigNumber(req.body.bidAmountCAD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountCAD = parseFloat(userBidAmountCAD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountCAD || !userBidAmountLTC ||
      !userBidRate || !userBid1ownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid parameter!!!!",
        statusCode: 400
      });
    }
    try {
      var userBidder = await User.findOne({
        id: userBid1ownerId
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    if (!userBidder) {
      return res.json({
        "message": "Invalid Id!",
        statusCode: 401
      });
    }
    console.log("Getting user details !! !");
    var userLTCBalanceInDb = new BigNumber(userBidder.LTCbalance);
    var userFreezedLTCBalanceInDb = new BigNumber(userBidder.FreezedLTCbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountLTC = new BigNumber(userBidAmountLTC);
    if (userBidAmountLTC.greaterThanOrEqualTo(userLTCBalanceInDb)) {
      return res.json({
        "message": "You have insufficient LTC Balance",
        statusCode: 401
      });
    }
    userBidAmountLTC = parseFloat(userBidAmountLTC);
    try {
      var bidDetails = await BidCAD.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountCAD: userBidAmountCAD,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountCAD: userBidAmountCAD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        bidownerCAD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.CAD_BID_ADDED, bidDetails);

    console.log("Bid created .........");
    //var updateUserLTCBalance = (parseFloat(userLTCBalanceInDb) - parseFloat(userBidAmountLTC));
    var updateUserLTCBalance = new BigNumber(userLTCBalanceInDb);
    updateUserLTCBalance = updateUserLTCBalance.minus(userBidAmountLTC);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedLTCBalance = (parseFloat(userFreezedLTCBalanceInDb) + parseFloat(userBidAmountLTC));
    var updateFreezedLTCBalance = new BigNumber(userBidder.FreezedLTCbalance);
    updateFreezedLTCBalance = updateFreezedLTCBalance.plus(userBidAmountLTC);

    console.log("Updating user's bid details sdfyrtyupdateFreezedLTCBalance  " + updateFreezedLTCBalance);
    console.log("Updating user's bid details asdfasdf updateUserLTCBalance  " + updateUserLTCBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedLTCbalance: parseFloat(updateFreezedLTCBalance),
        LTCbalance: parseFloat(updateUserLTCBalance),
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    try {
      var allAsksFromdb = await AskCAD.find({
        askRate: {
          'like': parseFloat(userBidRate)
        },
        marketId: {
          'like': LTCMARKETID
        },
        status: {
          '!': [statusOne, statusThree]
        }
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    console.log("Getting all bids details.............");
    if (allAsksFromdb) {
      if (allAsksFromdb.length >= 1) {
        //Find exact bid if available in db
        var total_ask = 0;
        var totoalBidRemainingCAD = new BigNumber(userBidAmountCAD);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of CAD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountCAD;
        }
        if (total_ask <= totoalBidRemainingCAD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingCAD :: " + totoalBidRemainingCAD);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingCAD = totoalBidRemainingCAD - allAsksFromdb[i].bidAmountCAD;
            //totoalBidRemainingCAD = (parseFloat(totoalBidRemainingCAD) - parseFloat(currentAskDetails.askAmountCAD));
            totoalBidRemainingCAD = totoalBidRemainingCAD.minus(currentAskDetails.askAmountCAD);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
            console.log("start from here totoalBidRemainingCAD == 0::: " + totoalBidRemainingCAD);
            if (totoalBidRemainingCAD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingCAD == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerCAD totoalBidRemainingCAD == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(currentAskDetails.askAmountCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(currentAskDetails.askAmountCAD);
              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of CAD Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedCADbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              try {
                var BidderuserAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedLTCbalance of bidder deduct and CAD  give to bidder
              //var updatedCADbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.CADbalance) + parseFloat(totoalBidRemainingCAD)) - parseFloat(totoalBidRemainingLTC);
              //var updatedCADbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.CADbalance) + parseFloat(userBidAmountCAD)) - parseFloat(totoalBidRemainingCAD));
              var updatedCADbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(totoalBidRemainingCAD);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainCAD updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var CADAmountSucess = (parseFloat(userBidAmountCAD) - parseFloat(totoalBidRemainingCAD));
              // var CADAmountSucess = new BigNumber(userBidAmountCAD);
              // CADAmountSucess = CADAmountSucess.minus(totoalBidRemainingCAD);
              //
              // //var txFeesBidderCAD = (parseFloat(CADAmountSucess) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(CADAmountSucess);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              //
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingCAD == 0updatedCADbalanceBidder ::: " + updatedCADbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingCAD asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingCAD == 0BidCAD.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidCAD.destroy({
              //   id: bidDetails.bidownerCAD
              // });
              try {
                var bidDestroy = await BidCAD.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0AskCAD.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskCAD.destroy({
              //   id: currentAskDetails.askownerCAD
              // });
              try {
                var askDestroy = await AskCAD.update({
                  id: currentAskDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0  enter into else of totoalBidRemainingCAD == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0start User.findOne currentAskDetails.bidownerCAD ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(currentAskDetails.askAmountCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(currentAskDetails.askAmountCAD);
              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

              console.log("After deduct TX Fees of CAD Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskCAD.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskCAD.update({
                  id: currentAskDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              sails.sockets.blast(constants.CAD_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingCAD == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerCAD");
              //var updatedCADbalanceBidder = ((parseFloat(userAllDetailsInDBBid.CADbalance) + parseFloat(userBidAmountCAD)) - parseFloat(totoalBidRemainingCAD));
              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBid.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(totoalBidRemainingCAD);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainCAD updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var CADAmountSucess = (parseFloat(userBidAmountCAD) - parseFloat(totoalBidRemainingCAD));
              // var CADAmountSucess = new BigNumber(userBidAmountCAD);
              // CADAmountSucess = CADAmountSucess.minus(totoalBidRemainingCAD);
              //
              // //var txFeesBidderCAD = (parseFloat(CADAmountSucess) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(CADAmountSucess);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              //
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);
              // console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedCADbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountLTC totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountCAD totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidCAD.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
                  bidAmountCAD: totoalBidRemainingCAD,
                  status: statusTwo,
                  statusName: statusTwoPending
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              sails.sockets.blast(constants.CAD_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingCAD :: " + totoalBidRemainingCAD);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingCAD = totoalBidRemainingCAD - allAsksFromdb[i].bidAmountCAD;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingCAD = totoalBidRemainingCAD.minus(currentAskDetails.askAmountCAD);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingCAD == 0::: " + totoalBidRemainingCAD);

              if (totoalBidRemainingCAD == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingCAD == 0Enter into totoalBidRemainingCAD == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCAD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                try {
                  var userAllDetailsInDBBidder = await User.findOne({
                    id: bidDetails.bidownerCAD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingCAD == 0userAll bidDetails.askownerCAD :: ");
                console.log(" totoalBidRemainingCAD == 0Update value of Bidder and asker");
                //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(currentAskDetails.askAmountCAD));
                var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
                updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(currentAskDetails.askAmountCAD);

                //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
                var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
                var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
                txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

                console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
                //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

                console.log("After deduct TX Fees of CAD Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingCAD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingCAD == 0updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);
                console.log(" totoalBidRemainingCAD == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerCAD
                  }, {
                    FreezedCADbalance: updatedFreezedCADbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedCADbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(userBidAmountCAD)) - parseFloat(totoalBidRemainingCAD));

                var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
                updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);
                updatedCADbalanceBidder = updatedCADbalanceBidder.minus(totoalBidRemainingCAD);

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalBidRemainingLTC);
                console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedLTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
                //var CADAmountSucess = (parseFloat(userBidAmountCAD) - parseFloat(totoalBidRemainingCAD));
                // var CADAmountSucess = new BigNumber(userBidAmountCAD);
                // CADAmountSucess = CADAmountSucess.minus(totoalBidRemainingCAD);
                //
                //
                // //var txFeesBidderCAD = (parseFloat(CADAmountSucess) * parseFloat(txFeeWithdrawSuccessCAD));
                // var txFeesBidderCAD = new BigNumber(CADAmountSucess);
                // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
                // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
                // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
                // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
                //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
                updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);



                console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 updatedFreezedCADbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedCADbalanceBidder " + updatedCADbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerCAD
                  }, {
                    CADbalance: updatedCADbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 BidCAD.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskCAD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskCAD.update({
                    id: currentAskDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 AskCAD.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidCAD.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidCAD.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 enter into else of totoalBidRemainingCAD == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0totoalBidRemainingCAD == 0 start User.findOne currentAskDetails.bidownerCAD " + currentAskDetails.bidownerCAD);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCAD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(currentAskDetails.askAmountCAD));

                var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
                updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(currentAskDetails.askAmountCAD);

                //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
                var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
                var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
                txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

                console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
                //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
                console.log("After deduct TX Fees of CAD Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 updatedFreezedCADbalanceAsker:: " + updatedFreezedCADbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerCAD
                  }, {
                    FreezedCADbalance: updatedFreezedCADbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskCAD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskCAD.update({
                    id: currentAskDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull,
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    "message": "Failed with an error",
                    statusCode: 200
                  });
                }
                sails.sockets.blast(constants.CAD_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountCAD = (parseFloat(currentAskDetails.askAmountCAD) - parseFloat(totoalBidRemainingCAD));

              var updatedAskAmountCAD = new BigNumber(currentAskDetails.askAmountCAD);
              updatedAskAmountCAD = updatedAskAmountCAD.minus(totoalBidRemainingCAD);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskCAD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
                  askAmountCAD: updatedAskAmountCAD,
                  status: statusTwo,
                  statusName: statusTwoPending,
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              sails.sockets.blast(constants.CAD_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(totoalBidRemainingCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(totoalBidRemainingCAD);

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
              console.log("Total Ask RemainCAD updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of CAD Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedCADbalanceAsker:: " + updatedFreezedCADbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerCAD");
              //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(userBidAmountCAD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountCAD " + userBidAmountCAD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.CADbalance " + userAllDetailsInDBBidder.CADbalance);

              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var txFeesBidderCAD = (parseFloat(updatedCADbalanceBidder) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(userBidAmountCAD);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              //
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCAD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedCADbalanceBidder ::: " + updatedCADbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidCAD.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidCAD.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidCAD.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC Bid destroy successfully desctroyCurrentBid ::");
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            }
          }
        }
      }
      return res.json({
        "message": "Your bid placed successfully!!",
        statusCode: 200
      });
    } else {
      //No bid match on this rate Ask and Ask placed successfully
      return res.json({
        "message": "Your bid placed successfully!!",
        statusCode: 200
      });
    }
  },
  removeBidCADMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdCAD;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidCAD.findOne({
      bidownerCAD: bidownerId,
      id: userBidId,
      marketId: {
        'like': LTCMARKETID
      },
      status: {
        '!': [statusOne, statusThree]
      }
    }).exec(function(err, bidDetails) {
      if (err) {
        return res.json({
          "message": "Error to find bid",
          statusCode: 400
        });
      }
      if (!bidDetails) {
        return res.json({
          "message": "No Bid found for this user",
          statusCode: 400
        });
      }
      console.log("Valid bid details !!!" + JSON.stringify(bidDetails));
      User.findOne({
        id: bidownerId
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
        var userLTCBalanceInDb = parseFloat(user.LTCbalance);
        var bidAmountOfLTCInBidTableDB = parseFloat(bidDetails.bidAmountLTC);
        var userFreezedLTCbalanceInDB = parseFloat(user.FreezedLTCbalance);
        var updateFreezedBalance = (parseFloat(userFreezedLTCbalanceInDB) - parseFloat(bidAmountOfLTCInBidTableDB));
        var updateUserLTCBalance = (parseFloat(userLTCBalanceInDb) + parseFloat(bidAmountOfLTCInBidTableDB));
        console.log("userLTCBalanceInDb :" + userLTCBalanceInDb);
        console.log("bidAmountOfLTCInBidTableDB :" + bidAmountOfLTCInBidTableDB);
        console.log("userFreezedLTCbalanceInDB :" + userFreezedLTCbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserLTCBalance :" + updateUserLTCBalance);

        User.update({
            id: bidownerId
          }, {
            LTCbalance: parseFloat(updateUserLTCBalance),
            FreezedLTCbalance: parseFloat(updateFreezedBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user LTC balance");
              return res.json({
                "message": "Error to update User values",
                statusCode: 400
              });
            }
            console.log("Removing bid !!!");
            BidCAD.update({
              id: userBidId
            }, {
              status: statusThree,
              statusName: statusThreeCancelled
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.CAD_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskCADMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdCAD;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskCAD.findOne({
      askownerCAD: askownerId,
      id: userAskId,
      status: {
        '!': [statusOne, statusThree]
      },
      marketId: {
        'like': LTCMARKETID
      },
    }).exec(function(err, askDetails) {
      if (err) {
        return res.json({
          "message": "Error to find ask",
          statusCode: 400
        });
      }
      if (!askDetails) {
        return res.json({
          "message": "No ask found for this user",
          statusCode: 400
        });
      }
      console.log("Valid ask details !!!" + JSON.stringify(askDetails));
      User.findOne({
        id: askownerId
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
        var userCADBalanceInDb = parseFloat(user.CADbalance);
        var askAmountOfCADInAskTableDB = parseFloat(askDetails.askAmountCAD);
        var userFreezedCADbalanceInDB = parseFloat(user.FreezedCADbalance);
        console.log("userCADBalanceInDb :" + userCADBalanceInDb);
        console.log("askAmountOfCADInAskTableDB :" + askAmountOfCADInAskTableDB);
        console.log("userFreezedCADbalanceInDB :" + userFreezedCADbalanceInDB);
        var updateFreezedCADBalance = (parseFloat(userFreezedCADbalanceInDB) - parseFloat(askAmountOfCADInAskTableDB));
        var updateUserCADBalance = (parseFloat(userCADBalanceInDb) + parseFloat(askAmountOfCADInAskTableDB));
        User.update({
            id: askownerId
          }, {
            CADbalance: parseFloat(updateUserCADBalance),
            FreezedCADbalance: parseFloat(updateFreezedCADBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user LTC balance");
              return res.json({
                "message": "Error to update User values",
                statusCode: 400
              });
            }
            console.log("Removing ask !!!");
            AskCAD.update({
              id: userAskId
            }, {
              status: statusThree,
              statusName: statusThreeCancelled
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.CAD_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidCAD: function(req, res) {
    console.log("Enter into ask api getAllBidCAD :: ");
    BidCAD.find({
        status: {
          '!': [statusOne, statusThree]
        },
        marketId: {
          'like': LTCMARKETID
        }
      })
      .sort('bidRate DESC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get AskEBT !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskEBT Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidCAD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountCAD')
              .exec(function(err, bidAmountCADSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCADSum",
                    statusCode: 401
                  });
                }
                BidCAD.find({
                    status: {
                      '!': [statusOne, statusThree]
                    },
                    marketId: {
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCAD: allAskDetailsToExecute,
                      bidAmountCADSum: bidAmountCADSum[0].bidAmountCAD,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskEBT Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllAskCAD: function(req, res) {
    console.log("Enter into ask api getAllAskCAD :: ");
    AskCAD.find({
        status: {
          '!': [statusOne, statusThree]
        },
        marketId: {
          'like': LTCMARKETID
        }
      })
      .sort('askRate ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get AskEBT !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskEBT Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskCAD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountCAD')
              .exec(function(err, askAmountCADSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCADSum",
                    statusCode: 401
                  });
                }
                AskCAD.find({
                    status: {
                      '!': [statusOne, statusThree]
                    },
                    marketId: {
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCAD: allAskDetailsToExecute,
                      askAmountCADSum: askAmountCADSum[0].askAmountCAD,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCAD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsCADSuccess: function(req, res) {
    console.log("Enter into ask api getBidsCADSuccess :: ");
    BidCAD.find({
        status: {
          'like': statusOne
        },
        marketId: {
          'like': LTCMARKETID
        }
      })
      .sort('createTimeUTC ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get AskEBT !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskEBT Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidCAD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountCAD')
              .exec(function(err, bidAmountCADSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCADSum",
                    statusCode: 401
                  });
                }
                BidCAD.find({
                    status: {
                      'like': statusOne
                    },
                    marketId: {
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCAD: allAskDetailsToExecute,
                      bidAmountCADSum: bidAmountCADSum[0].bidAmountCAD,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskEBT Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAsksCADSuccess: function(req, res) {
    console.log("Enter into ask api getAsksCADSuccess :: ");
    AskCAD.find({
        status: {
          'like': statusOne
        },
        marketId: {
          'like': LTCMARKETID
        }
      })
      .sort('createTimeUTC ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get AskEBT !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskEBT Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskCAD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountCAD')
              .exec(function(err, askAmountCADSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCADSum",
                    statusCode: 401
                  });
                }
                AskCAD.find({
                    status: {
                      'like': statusOne
                    },
                    marketId: {
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCAD: allAskDetailsToExecute,
                      askAmountCADSum: askAmountCADSum[0].askAmountCAD,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCAD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};