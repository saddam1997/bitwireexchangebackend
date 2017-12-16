/**
 * TrademarketLTCRUBController
 *
 * @description :: Server-side logic for managing trademarketltcrubs
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


  addAskRUBMarket: async function(req, res) {
    console.log("Enter into ask api addAskRUBMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountRUB = new BigNumber(req.body.askAmountRUB);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountRUB || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountRUB < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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
    var userRUBBalanceInDb = new BigNumber(userAsker.RUBbalance);
    var userFreezedRUBBalanceInDb = new BigNumber(userAsker.FreezedRUBbalance);

    userRUBBalanceInDb = parseFloat(userRUBBalanceInDb);
    userFreezedRUBBalanceInDb = parseFloat(userFreezedRUBBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountRUB.greaterThanOrEqualTo(userRUBBalanceInDb)) {
      return res.json({
        "message": "You have insufficient RUB Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountRUB :: " + userAskAmountRUB);
    console.log("userRUBBalanceInDb :: " + userRUBBalanceInDb);
    // if (userAskAmountRUB >= userRUBBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient RUB Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountRUB = parseFloat(userAskAmountRUB);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskRUB.create({
        askAmountLTC: userAskAmountLTC,
        askAmountRUB: userAskAmountRUB,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountRUB: userAskAmountRUB,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        askownerRUB: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.RUB_ASK_ADDED, askDetails);
    // var updateUserRUBBalance = (parseFloat(userRUBBalanceInDb) - parseFloat(userAskAmountRUB));
    // var updateFreezedRUBBalance = (parseFloat(userFreezedRUBBalanceInDb) + parseFloat(userAskAmountRUB));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userRUBBalanceInDb = new BigNumber(userRUBBalanceInDb);
    var updateUserRUBBalance = userRUBBalanceInDb.minus(userAskAmountRUB);
    updateUserRUBBalance = parseFloat(updateUserRUBBalance);
    userFreezedRUBBalanceInDb = new BigNumber(userFreezedRUBBalanceInDb);
    var updateFreezedRUBBalance = userFreezedRUBBalanceInDb.plus(userAskAmountRUB);
    updateFreezedRUBBalance = parseFloat(updateFreezedRUBBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedRUBbalance: updateFreezedRUBBalance,
        RUBbalance: updateUserRUBBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidRUB.find({
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
        message: 'Failed to find RUB bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingRUB = new BigNumber(userAskAmountRUB);
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
      //this loop for sum of all Bids amount of RUB
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountRUB;
      }
      if (total_bid <= totoalAskRemainingRUB) {
        console.log("Inside of total_bid <= totoalAskRemainingRUB");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingRUB");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingRUB :: " + totoalAskRemainingRUB);
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingRUB = (parseFloat(totoalAskRemainingRUB) - parseFloat(currentBidDetails.bidAmountRUB));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingRUB = totoalAskRemainingRUB.minus(currentBidDetails.bidAmountRUB);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingRUB :: " + totoalAskRemainingRUB);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

          if (totoalAskRemainingRUB == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingRUB == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerRUB
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerRUB
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(currentBidDetails.bidAmountRUB));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(currentBidDetails.bidAmountRUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of RUB Update user " + updatedRUBbalanceBidder);
            //var txFeesBidderRUB = (parseFloat(currentBidDetails.bidAmountRUB) * parseFloat(txFeeWithdrawSuccessRUB));
            // var txFeesBidderRUB = new BigNumber(currentBidDetails.bidAmountRUB);
            //
            // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB)
            // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
            // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);


            //updatedRUBbalanceBidder =  parseFloat(updatedRUBbalanceBidder);

            console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerRUB
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                RUBbalance: updatedRUBbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and RUB balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedRUBbalanceAsker = parseFloat(totoalAskRemainingRUB);
            //var updatedFreezedRUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(userAskAmountRUB)) + parseFloat(totoalAskRemainingRUB));
            var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(userAskAmountRUB);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.plus(totoalAskRemainingRUB);

            //updatedFreezedRUBbalanceAsker =  parseFloat(updatedFreezedRUBbalanceAsker);
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
            console.log("After deduct TX Fees of RUB Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerRUB
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedRUBbalance: updatedFreezedRUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed RUBBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidRUB:: ");
            try {
              var bidDestroy = await BidRUB.update({
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
            sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskRUB.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskRUB.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskRUB',
                statusCode: 401
              });
            }
            //emitting event of destruction of RUB_ask
            sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingRUB == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerRUB " + currentBidDetails.bidownerRUB);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerRUB
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(currentBidDetails.bidAmountRUB));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(currentBidDetails.bidAmountRUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of RUB 089089Update user " + updatedRUBbalanceBidder);
            // var txFeesBidderRUB = (parseFloat(currentBidDetails.bidAmountRUB) * parseFloat(txFeeWithdrawSuccessRUB));
            // var txFeesBidderRUB = new BigNumber(currentBidDetails.bidAmountRUB);
            // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
            // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            // // updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
            // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);


            console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedRUBbalanceBidder:: " + updatedRUBbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerRUB
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                RUBbalance: updatedRUBbalanceBidder
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
              var desctroyCurrentBid = await BidRUB.update({
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
            sails.sockets.blast(constants.RUB_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerRUB
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerRUB");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(totoalAskRemainingRUB));
            //var updatedFreezedRUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(userAskAmountRUB)) + parseFloat(totoalAskRemainingRUB));
            var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(userAskAmountRUB);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.plus(totoalAskRemainingRUB);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainRUB totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainRUB userAllDetailsInDBAsker.FreezedRUBbalance " + userAllDetailsInDBAsker.FreezedRUBbalance);
            console.log("Total Ask RemainRUB updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
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
            console.log("After deduct TX Fees of RUB Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedRUBbalanceAsker ::: " + updatedFreezedRUBbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerRUB
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedRUBbalance: updatedFreezedRUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountRUB totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskRUB.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
                askAmountRUB: parseFloat(totoalAskRemainingRUB),
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
            sails.sockets.blast(constants.RUB_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingRUB :: " + totoalAskRemainingRUB);
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingRUB = totoalAskRemainingRUB - allBidsFromdb[i].bidAmountRUB;
          if (totoalAskRemainingRUB >= currentBidDetails.bidAmountRUB) {
            //totoalAskRemainingRUB = (parseFloat(totoalAskRemainingRUB) - parseFloat(currentBidDetails.bidAmountRUB));
            totoalAskRemainingRUB = totoalAskRemainingRUB.minus(currentBidDetails.bidAmountRUB);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
            console.log("start from here totoalAskRemainingRUB == 0::: " + totoalAskRemainingRUB);

            if (totoalAskRemainingRUB == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingRUB == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerRUB
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
                  id: askDetails.askownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerRUB :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
              //var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(currentBidDetails.bidAmountRUB));
              var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(currentBidDetails.bidAmountRUB);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 RUB Update user " + updatedRUBbalanceBidder);
              //var txFeesBidderRUB = (parseFloat(currentBidDetails.bidAmountRUB) * parseFloat(txFeeWithdrawSuccessRUB));

              // var txFeesBidderRUB = new BigNumber(currentBidDetails.bidAmountRUB);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);
              // console.log("After deduct TX Fees of RUB Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingRUB " + totoalAskRemainingRUB);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerRUB
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  RUBbalance: updatedRUBbalanceBidder
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
              //var updatedFreezedRUBbalanceAsker = parseFloat(totoalAskRemainingRUB);
              //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(totoalAskRemainingRUB));
              //var updatedFreezedRUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(userAskAmountRUB)) + parseFloat(totoalAskRemainingRUB));
              var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(userAskAmountRUB);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.plus(totoalAskRemainingRUB);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainRUB totoalAskRemainingRUB " + totoalAskRemainingRUB);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainRUB userAllDetailsInDBAsker.FreezedRUBbalance " + userAllDetailsInDBAsker.FreezedRUBbalance);
              console.log("Total Ask RemainRUB updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
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

              console.log("After deduct TX Fees of RUB Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedRUBbalanceAsker ::: " + updatedFreezedRUBbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingRUB " + totoalAskRemainingRUB);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerRUB
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
                  FreezedRUBbalance: updatedFreezedRUBbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidRUB.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidRUB.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidRUB.update({
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskRUB.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskRUB.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskRUB.update({
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
              sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingRUB == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerRUB " + currentBidDetails.bidownerRUB);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerRUB
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

              //var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(currentBidDetails.bidAmountRUB));
              var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(currentBidDetails.bidAmountRUB);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of RUB Update user " + updatedRUBbalanceBidder);
              //var txFeesBidderRUB = (parseFloat(currentBidDetails.bidAmountRUB) * parseFloat(txFeeWithdrawSuccessRUB));
              // var txFeesBidderRUB = new BigNumber(currentBidDetails.bidAmountRUB);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);
              // console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedRUBbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingRUB " + totoalAskRemainingRUB);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerRUB
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  RUBbalance: updatedRUBbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidRUB.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidRUB.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.RUB_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerRUB
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
            //var updatedBidAmountRUB = (parseFloat(currentBidDetails.bidAmountRUB) - parseFloat(totoalAskRemainingRUB));
            var updatedBidAmountRUB = new BigNumber(currentBidDetails.bidAmountRUB);
            updatedBidAmountRUB = updatedBidAmountRUB.minus(totoalAskRemainingRUB);

            try {
              var updatedaskDetails = await BidRUB.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
                bidAmountRUB: updatedBidAmountRUB,
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
            sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerRUB
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


            //var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.RUBbalance) + parseFloat(totoalAskRemainingRUB));

            var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.RUBbalance);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(totoalAskRemainingRUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of RUB Update user " + updatedRUBbalanceBidder);
            //var RUBAmountSucess = parseFloat(totoalAskRemainingRUB);
            //var RUBAmountSucess = new BigNumber(totoalAskRemainingRUB);
            //var txFeesBidderRUB = (parseFloat(RUBAmountSucess) * parseFloat(txFeeWithdrawSuccessRUB));
            //var txFeesBidderRUB = (parseFloat(totoalAskRemainingRUB) * parseFloat(txFeeWithdrawSuccessRUB));



            // var txFeesBidderRUB = new BigNumber(totoalAskRemainingRUB);
            // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
            //
            // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
            // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

            //Need to change here ...111...............askDetails
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

            console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedRUBbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerRUB
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                RUBbalance: updatedRUBbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerRUB");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(userAskAmountRUB));
            var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(userAskAmountRUB);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of RUB Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedRUBbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerRUB
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedRUBbalance: updatedFreezedRUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskRUB.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskRUB.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskRUB.update({
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
            //emitting event for RUB_ask destruction
            sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
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
  addBidRUBMarket: async function(req, res) {
    console.log("Enter into ask api addBidRUBMarket :: " + JSON.stringify(req.body));
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountRUB = new BigNumber(req.body.bidAmountRUB);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountRUB = parseFloat(userBidAmountRUB);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountRUB || !userBidAmountLTC ||
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
      var bidDetails = await BidRUB.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountRUB: userBidAmountRUB,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountRUB: userBidAmountRUB,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        bidownerRUB: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.RUB_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskRUB.find({
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
        var totoalBidRemainingRUB = new BigNumber(userBidAmountRUB);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of RUB
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountRUB;
        }
        if (total_ask <= totoalBidRemainingRUB) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingRUB :: " + totoalBidRemainingRUB);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingRUB = totoalBidRemainingRUB - allAsksFromdb[i].bidAmountRUB;
            //totoalBidRemainingRUB = (parseFloat(totoalBidRemainingRUB) - parseFloat(currentAskDetails.askAmountRUB));
            totoalBidRemainingRUB = totoalBidRemainingRUB.minus(currentAskDetails.askAmountRUB);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
            console.log("start from here totoalBidRemainingRUB == 0::: " + totoalBidRemainingRUB);
            if (totoalBidRemainingRUB == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingRUB == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerRUB totoalBidRemainingRUB == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(currentAskDetails.askAmountRUB));
              var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(currentAskDetails.askAmountRUB);
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
              console.log("After deduct TX Fees of RUB Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedRUBbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerRUB
                }, {
                  FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
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
                  id: bidDetails.bidownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedLTCbalance of bidder deduct and RUB  give to bidder
              //var updatedRUBbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.RUBbalance) + parseFloat(totoalBidRemainingRUB)) - parseFloat(totoalBidRemainingLTC);
              //var updatedRUBbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.RUBbalance) + parseFloat(userBidAmountRUB)) - parseFloat(totoalBidRemainingRUB));
              var updatedRUBbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(userBidAmountRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(totoalBidRemainingRUB);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainRUB totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainRUB BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainRUB updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
              //var RUBAmountSucess = (parseFloat(userBidAmountRUB) - parseFloat(totoalBidRemainingRUB));
              // var RUBAmountSucess = new BigNumber(userBidAmountRUB);
              // RUBAmountSucess = RUBAmountSucess.minus(totoalBidRemainingRUB);
              //
              // //var txFeesBidderRUB = (parseFloat(RUBAmountSucess) * parseFloat(txFeeWithdrawSuccessRUB));
              // var txFeesBidderRUB = new BigNumber(RUBAmountSucess);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              //
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingRUB == 0updatedRUBbalanceBidder ::: " + updatedRUBbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingRUB asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerRUB
                }, {
                  RUBbalance: updatedRUBbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingRUB == 0BidRUB.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidRUB.destroy({
              //   id: bidDetails.bidownerRUB
              // });
              try {
                var bidDestroy = await BidRUB.update({
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0AskRUB.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskRUB.destroy({
              //   id: currentAskDetails.askownerRUB
              // });
              try {
                var askDestroy = await AskRUB.update({
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
              sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0  enter into else of totoalBidRemainingRUB == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0start User.findOne currentAskDetails.bidownerRUB ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(currentAskDetails.askAmountRUB));
              var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(currentAskDetails.askAmountRUB);
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

              console.log("After deduct TX Fees of RUB Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerRUB
                }, {
                  FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskRUB.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskRUB.update({
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

              sails.sockets.blast(constants.RUB_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingRUB == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerRUB");
              //var updatedRUBbalanceBidder = ((parseFloat(userAllDetailsInDBBid.RUBbalance) + parseFloat(userBidAmountRUB)) - parseFloat(totoalBidRemainingRUB));
              var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBid.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(userBidAmountRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(totoalBidRemainingRUB);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainRUB totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainRUB BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainRUB updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
              //var RUBAmountSucess = (parseFloat(userBidAmountRUB) - parseFloat(totoalBidRemainingRUB));
              // var RUBAmountSucess = new BigNumber(userBidAmountRUB);
              // RUBAmountSucess = RUBAmountSucess.minus(totoalBidRemainingRUB);
              //
              // //var txFeesBidderRUB = (parseFloat(RUBAmountSucess) * parseFloat(txFeeWithdrawSuccessRUB));
              // var txFeesBidderRUB = new BigNumber(RUBAmountSucess);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              //
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);
              // console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedRUBbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerRUB
                }, {
                  RUBbalance: updatedRUBbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountRUB totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidRUB.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
                  bidAmountRUB: totoalBidRemainingRUB,
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingRUB :: " + totoalBidRemainingRUB);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingRUB = totoalBidRemainingRUB - allAsksFromdb[i].bidAmountRUB;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingRUB = totoalBidRemainingRUB.minus(currentAskDetails.askAmountRUB);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingRUB == 0::: " + totoalBidRemainingRUB);

              if (totoalBidRemainingRUB == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingRUB == 0Enter into totoalBidRemainingRUB == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerRUB
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
                    id: bidDetails.bidownerRUB
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingRUB == 0userAll bidDetails.askownerRUB :: ");
                console.log(" totoalBidRemainingRUB == 0Update value of Bidder and asker");
                //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(currentAskDetails.askAmountRUB));
                var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
                updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(currentAskDetails.askAmountRUB);

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

                console.log("After deduct TX Fees of RUB Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingRUB == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingRUB == 0updatedFreezedRUBbalanceAsker ::: " + updatedFreezedRUBbalanceAsker);
                console.log(" totoalBidRemainingRUB == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingRUB " + totoalBidRemainingRUB);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerRUB
                  }, {
                    FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedRUBbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(userBidAmountRUB)) - parseFloat(totoalBidRemainingRUB));

                var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
                updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(userBidAmountRUB);
                updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(totoalBidRemainingRUB);

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainRUB totoalAskRemainingRUB " + totoalBidRemainingLTC);
                console.log("Total Ask RemainRUB BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainRUB updatedFreezedRUBbalanceAsker " + updatedFreezedLTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
                //var RUBAmountSucess = (parseFloat(userBidAmountRUB) - parseFloat(totoalBidRemainingRUB));
                // var RUBAmountSucess = new BigNumber(userBidAmountRUB);
                // RUBAmountSucess = RUBAmountSucess.minus(totoalBidRemainingRUB);
                //
                //
                // //var txFeesBidderRUB = (parseFloat(RUBAmountSucess) * parseFloat(txFeeWithdrawSuccessRUB));
                // var txFeesBidderRUB = new BigNumber(RUBAmountSucess);
                // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
                // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
                // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
                // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
                //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
                updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);



                console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0 updatedFreezedRUBbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingRUB " + totoalBidRemainingRUB);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerRUB
                  }, {
                    RUBbalance: updatedRUBbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0 BidRUB.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskRUB.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskRUB.update({
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
                sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0 AskRUB.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidRUB.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidRUB.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0 enter into else of totoalBidRemainingRUB == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0totoalBidRemainingRUB == 0 start User.findOne currentAskDetails.bidownerRUB " + currentAskDetails.bidownerRUB);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerRUB
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(currentAskDetails.askAmountRUB));

                var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
                updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(currentAskDetails.askAmountRUB);

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
                console.log("After deduct TX Fees of RUB Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0 updatedFreezedRUBbalanceAsker:: " + updatedFreezedRUBbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingRUB " + totoalBidRemainingRUB);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerRUB
                  }, {
                    FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskRUB.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskRUB.update({
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
                sails.sockets.blast(constants.RUB_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountRUB = (parseFloat(currentAskDetails.askAmountRUB) - parseFloat(totoalBidRemainingRUB));

              var updatedAskAmountRUB = new BigNumber(currentAskDetails.askAmountRUB);
              updatedAskAmountRUB = updatedAskAmountRUB.minus(totoalBidRemainingRUB);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskRUB.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
                  askAmountRUB: updatedAskAmountRUB,
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
              sails.sockets.blast(constants.RUB_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(totoalBidRemainingRUB));
              var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(totoalBidRemainingRUB);

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainRUB totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainRUB userAllDetailsInDBAsker.FreezedRUBbalance " + userAllDetailsInDBAsker.FreezedRUBbalance);
              console.log("Total Ask RemainRUB updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of RUB Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedRUBbalanceAsker:: " + updatedFreezedRUBbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerRUB
                }, {
                  FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
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
                  id: bidDetails.bidownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerRUB");
              //var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(userBidAmountRUB));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountRUB " + userBidAmountRUB);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.RUBbalance " + userAllDetailsInDBBidder.RUBbalance);

              var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(userBidAmountRUB);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
              //var txFeesBidderRUB = (parseFloat(updatedRUBbalanceBidder) * parseFloat(txFeeWithdrawSuccessRUB));
              // var txFeesBidderRUB = new BigNumber(userBidAmountRUB);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              //
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);

              var txFeesBidderRUB = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedRUBbalanceBidder ::: " + updatedRUBbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerRUB
                }, {
                  RUBbalance: updatedRUBbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidRUB.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidRUB.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidRUB.update({
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
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
  removeBidRUBMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdRUB;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidRUB.findOne({
      bidownerRUB: bidownerId,
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
            BidRUB.update({
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskRUBMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdRUB;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskRUB.findOne({
      askownerRUB: askownerId,
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
        var userRUBBalanceInDb = parseFloat(user.RUBbalance);
        var askAmountOfRUBInAskTableDB = parseFloat(askDetails.askAmountRUB);
        var userFreezedRUBbalanceInDB = parseFloat(user.FreezedRUBbalance);
        console.log("userRUBBalanceInDb :" + userRUBBalanceInDb);
        console.log("askAmountOfRUBInAskTableDB :" + askAmountOfRUBInAskTableDB);
        console.log("userFreezedRUBbalanceInDB :" + userFreezedRUBbalanceInDB);
        var updateFreezedRUBBalance = (parseFloat(userFreezedRUBbalanceInDB) - parseFloat(askAmountOfRUBInAskTableDB));
        var updateUserRUBBalance = (parseFloat(userRUBBalanceInDb) + parseFloat(askAmountOfRUBInAskTableDB));
        User.update({
            id: askownerId
          }, {
            RUBbalance: parseFloat(updateUserRUBBalance),
            FreezedRUBbalance: parseFloat(updateFreezedRUBBalance)
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
            AskRUB.update({
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
              sails.sockets.blast(constants.RUB_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidRUB: function(req, res) {
    console.log("Enter into ask api getAllBidRUB :: ");
    BidRUB.find({
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
            BidRUB.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountRUB')
              .exec(function(err, bidAmountRUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountRUBSum",
                    statusCode: 401
                  });
                }
                BidRUB.find({
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
                        "message": "Error to sum Of bidAmountRUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsRUB: allAskDetailsToExecute,
                      bidAmountRUBSum: bidAmountRUBSum[0].bidAmountRUB,
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
  getAllAskRUB: function(req, res) {
    console.log("Enter into ask api getAllAskRUB :: ");
    AskRUB.find({
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
            AskRUB.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountRUB')
              .exec(function(err, askAmountRUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountRUBSum",
                    statusCode: 401
                  });
                }
                AskRUB.find({
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
                        "message": "Error to sum Of askAmountRUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksRUB: allAskDetailsToExecute,
                      askAmountRUBSum: askAmountRUBSum[0].askAmountRUB,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskRUB Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsRUBSuccess: function(req, res) {
    console.log("Enter into ask api getBidsRUBSuccess :: ");
    BidRUB.find({
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
            BidRUB.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountRUB')
              .exec(function(err, bidAmountRUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountRUBSum",
                    statusCode: 401
                  });
                }
                BidRUB.find({
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
                        "message": "Error to sum Of bidAmountRUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsRUB: allAskDetailsToExecute,
                      bidAmountRUBSum: bidAmountRUBSum[0].bidAmountRUB,
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
  getAsksRUBSuccess: function(req, res) {
    console.log("Enter into ask api getAsksRUBSuccess :: ");
    AskRUB.find({
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
            AskRUB.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountRUB')
              .exec(function(err, askAmountRUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountRUBSum",
                    statusCode: 401
                  });
                }
                AskRUB.find({
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
                        "message": "Error to sum Of askAmountRUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksRUB: allAskDetailsToExecute,
                      askAmountRUBSum: askAmountRUBSum[0].askAmountRUB,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskRUB Found!!",
              statusCode: 401
            });
          }
        }
      });
  },


};