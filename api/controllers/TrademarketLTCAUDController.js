/**
 * TrademarketLTCAUDController
 *AUD
 * @description :: Server-side logic for managing trademarketltcauds
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

  addAskAUDMarket: async function(req, res) {
    console.log("Enter into ask api addAskAUDMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountAUD = new BigNumber(req.body.askAmountAUD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountAUD || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountAUD < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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
    var userAUDBalanceInDb = new BigNumber(userAsker.AUDbalance);
    var userFreezedAUDBalanceInDb = new BigNumber(userAsker.FreezedAUDbalance);

    userAUDBalanceInDb = parseFloat(userAUDBalanceInDb);
    userFreezedAUDBalanceInDb = parseFloat(userFreezedAUDBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountAUD.greaterThanOrEqualTo(userAUDBalanceInDb)) {
      return res.json({
        "message": "You have insufficient AUD Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountAUD :: " + userAskAmountAUD);
    console.log("userAUDBalanceInDb :: " + userAUDBalanceInDb);
    // if (userAskAmountAUD >= userAUDBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient AUD Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountAUD = parseFloat(userAskAmountAUD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskAUD.create({
        askAmountLTC: userAskAmountLTC,
        askAmountAUD: userAskAmountAUD,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountAUD: userAskAmountAUD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        askownerAUD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.AUD_ASK_ADDED, askDetails);
    // var updateUserAUDBalance = (parseFloat(userAUDBalanceInDb) - parseFloat(userAskAmountAUD));
    // var updateFreezedAUDBalance = (parseFloat(userFreezedAUDBalanceInDb) + parseFloat(userAskAmountAUD));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userAUDBalanceInDb = new BigNumber(userAUDBalanceInDb);
    var updateUserAUDBalance = userAUDBalanceInDb.minus(userAskAmountAUD);
    updateUserAUDBalance = parseFloat(updateUserAUDBalance);
    userFreezedAUDBalanceInDb = new BigNumber(userFreezedAUDBalanceInDb);
    var updateFreezedAUDBalance = userFreezedAUDBalanceInDb.plus(userAskAmountAUD);
    updateFreezedAUDBalance = parseFloat(updateFreezedAUDBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedAUDbalance: updateFreezedAUDBalance,
        AUDbalance: updateUserAUDBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidAUD.find({
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
        message: 'Failed to find AUD bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingAUD = new BigNumber(userAskAmountAUD);
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
      //this loop for sum of all Bids amount of AUD
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountAUD;
      }
      if (total_bid <= totoalAskRemainingAUD) {
        console.log("Inside of total_bid <= totoalAskRemainingAUD");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingAUD");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingAUD :: " + totoalAskRemainingAUD);
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingAUD = (parseFloat(totoalAskRemainingAUD) - parseFloat(currentBidDetails.bidAmountAUD));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingAUD = totoalAskRemainingAUD.minus(currentBidDetails.bidAmountAUD);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingAUD :: " + totoalAskRemainingAUD);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

          if (totoalAskRemainingAUD == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingAUD == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerAUD
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerAUD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(currentBidDetails.bidAmountAUD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of AUD Update user " + updatedAUDbalanceBidder);
            //var txFeesBidderAUD = (parseFloat(currentBidDetails.bidAmountAUD) * parseFloat(txFeeWithdrawSuccessAUD));
            // var txFeesBidderAUD = new BigNumber(currentBidDetails.bidAmountAUD);
            //
            // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD)
            // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
            // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


            //updatedAUDbalanceBidder =  parseFloat(updatedAUDbalanceBidder);

            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                AUDbalance: updatedAUDbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and AUD balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedAUDbalanceAsker = parseFloat(totoalAskRemainingAUD);
            //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);

            //updatedFreezedAUDbalanceAsker =  parseFloat(updatedFreezedAUDbalanceAsker);
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
            console.log("After deduct TX Fees of AUD Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedAUDbalance: updatedFreezedAUDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed AUDBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidAUD:: ");
            try {
              var bidDestroy = await BidAUD.update({
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
            sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskAUD.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskAUD.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskAUD',
                statusCode: 401
              });
            }
            //emitting event of destruction of AUD_ask
            sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingAUD == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerAUD " + currentBidDetails.bidownerAUD);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerAUD
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(currentBidDetails.bidAmountAUD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of AUD 089089Update user " + updatedAUDbalanceBidder);
            // var txFeesBidderAUD = (parseFloat(currentBidDetails.bidAmountAUD) * parseFloat(txFeeWithdrawSuccessAUD));
            // var txFeesBidderAUD = new BigNumber(currentBidDetails.bidAmountAUD);
            // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
            // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            // // updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
            // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedAUDbalanceBidder:: " + updatedAUDbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                AUDbalance: updatedAUDbalanceBidder
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
              var desctroyCurrentBid = await BidAUD.update({
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
            sails.sockets.blast(constants.AUD_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerAUD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerAUD");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(totoalAskRemainingAUD));
            //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
            console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
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
            console.log("After deduct TX Fees of AUD Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedAUDbalance: updatedFreezedAUDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskAUD.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
                askAmountAUD: parseFloat(totoalAskRemainingAUD),
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
            sails.sockets.blast(constants.AUD_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingAUD :: " + totoalAskRemainingAUD);
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingAUD = totoalAskRemainingAUD - allBidsFromdb[i].bidAmountAUD;
          if (totoalAskRemainingAUD >= currentBidDetails.bidAmountAUD) {
            //totoalAskRemainingAUD = (parseFloat(totoalAskRemainingAUD) - parseFloat(currentBidDetails.bidAmountAUD));
            totoalAskRemainingAUD = totoalAskRemainingAUD.minus(currentBidDetails.bidAmountAUD);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
            console.log("start from here totoalAskRemainingAUD == 0::: " + totoalAskRemainingAUD);

            if (totoalAskRemainingAUD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingAUD == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerAUD
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
                  id: askDetails.askownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerAUD :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
              //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));
              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(currentBidDetails.bidAmountAUD);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 AUD Update user " + updatedAUDbalanceBidder);
              //var txFeesBidderAUD = (parseFloat(currentBidDetails.bidAmountAUD) * parseFloat(txFeeWithdrawSuccessAUD));

              // var txFeesBidderAUD = new BigNumber(currentBidDetails.bidAmountAUD);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);
              // console.log("After deduct TX Fees of AUD Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerAUD
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  AUDbalance: updatedAUDbalanceBidder
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
              //var updatedFreezedAUDbalanceAsker = parseFloat(totoalAskRemainingAUD);
              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(totoalAskRemainingAUD));
              //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
              console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
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

              console.log("After deduct TX Fees of AUD Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerAUD
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidAUD.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidAUD.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidAUD.update({
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskAUD.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskAUD.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskAUD.update({
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
              sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingAUD == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerAUD " + currentBidDetails.bidownerAUD);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerAUD
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

              //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));
              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(currentBidDetails.bidAmountAUD);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var txFeesBidderAUD = (parseFloat(currentBidDetails.bidAmountAUD) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(currentBidDetails.bidAmountAUD);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);
              // console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedAUDbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerAUD
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  AUDbalance: updatedAUDbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidAUD.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidAUD.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.AUD_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerAUD
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
            //var updatedBidAmountAUD = (parseFloat(currentBidDetails.bidAmountAUD) - parseFloat(totoalAskRemainingAUD));
            var updatedBidAmountAUD = new BigNumber(currentBidDetails.bidAmountAUD);
            updatedBidAmountAUD = updatedBidAmountAUD.minus(totoalAskRemainingAUD);

            try {
              var updatedaskDetails = await BidAUD.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
                bidAmountAUD: updatedBidAmountAUD,
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
            sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerAUD
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


            //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.AUDbalance) + parseFloat(totoalAskRemainingAUD));

            var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.AUDbalance);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(totoalAskRemainingAUD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of AUD Update user " + updatedAUDbalanceBidder);
            //var AUDAmountSucess = parseFloat(totoalAskRemainingAUD);
            //var AUDAmountSucess = new BigNumber(totoalAskRemainingAUD);
            //var txFeesBidderAUD = (parseFloat(AUDAmountSucess) * parseFloat(txFeeWithdrawSuccessAUD));
            //var txFeesBidderAUD = (parseFloat(totoalAskRemainingAUD) * parseFloat(txFeeWithdrawSuccessAUD));



            // var txFeesBidderAUD = new BigNumber(totoalAskRemainingAUD);
            // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
            //
            // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
            // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            //Need to change here ...111...............askDetails
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedAUDbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                AUDbalance: updatedAUDbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerAUD");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of AUD Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedAUDbalance: updatedFreezedAUDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskAUD.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskAUD.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskAUD.update({
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
            //emitting event for AUD_ask destruction
            sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
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
  addBidAUDMarket: async function(req, res) {
    console.log("Enter into ask api addBidAUDMarket :: " + JSON.stringify(req.body));
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountAUD = new BigNumber(req.body.bidAmountAUD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountAUD = parseFloat(userBidAmountAUD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountAUD || !userBidAmountLTC ||
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
      var bidDetails = await BidAUD.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountAUD: userBidAmountAUD,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountAUD: userBidAmountAUD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        bidownerAUD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.AUD_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskAUD.find({
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
        var totoalBidRemainingAUD = new BigNumber(userBidAmountAUD);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of AUD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountAUD;
        }
        if (total_ask <= totoalBidRemainingAUD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingAUD :: " + totoalBidRemainingAUD);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingAUD = totoalBidRemainingAUD - allAsksFromdb[i].bidAmountAUD;
            //totoalBidRemainingAUD = (parseFloat(totoalBidRemainingAUD) - parseFloat(currentAskDetails.askAmountAUD));
            totoalBidRemainingAUD = totoalBidRemainingAUD.minus(currentAskDetails.askAmountAUD);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
            console.log("start from here totoalBidRemainingAUD == 0::: " + totoalBidRemainingAUD);
            if (totoalBidRemainingAUD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingAUD == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerAUD totoalBidRemainingAUD == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(currentAskDetails.askAmountAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(currentAskDetails.askAmountAUD);
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
              console.log("After deduct TX Fees of AUD Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedAUDbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
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
                  id: bidDetails.bidownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedLTCbalance of bidder deduct and AUD  give to bidder
              //var updatedAUDbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.AUDbalance) + parseFloat(totoalBidRemainingAUD)) - parseFloat(totoalBidRemainingLTC);
              //var updatedAUDbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.AUDbalance) + parseFloat(userBidAmountAUD)) - parseFloat(totoalBidRemainingAUD));
              var updatedAUDbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(totoalBidRemainingAUD);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainAUD updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var AUDAmountSucess = (parseFloat(userBidAmountAUD) - parseFloat(totoalBidRemainingAUD));
              // var AUDAmountSucess = new BigNumber(userBidAmountAUD);
              // AUDAmountSucess = AUDAmountSucess.minus(totoalBidRemainingAUD);
              //
              // //var txFeesBidderAUD = (parseFloat(AUDAmountSucess) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(AUDAmountSucess);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              //
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingAUD == 0updatedAUDbalanceBidder ::: " + updatedAUDbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingAUD asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingAUD == 0BidAUD.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidAUD.destroy({
              //   id: bidDetails.bidownerAUD
              // });
              try {
                var bidDestroy = await BidAUD.update({
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0AskAUD.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskAUD.destroy({
              //   id: currentAskDetails.askownerAUD
              // });
              try {
                var askDestroy = await AskAUD.update({
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
              sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0  enter into else of totoalBidRemainingAUD == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0start User.findOne currentAskDetails.bidownerAUD ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(currentAskDetails.askAmountAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(currentAskDetails.askAmountAUD);
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

              console.log("After deduct TX Fees of AUD Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskAUD.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskAUD.update({
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

              sails.sockets.blast(constants.AUD_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingAUD == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerAUD");
              //var updatedAUDbalanceBidder = ((parseFloat(userAllDetailsInDBBid.AUDbalance) + parseFloat(userBidAmountAUD)) - parseFloat(totoalBidRemainingAUD));
              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBid.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(totoalBidRemainingAUD);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainAUD updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var AUDAmountSucess = (parseFloat(userBidAmountAUD) - parseFloat(totoalBidRemainingAUD));
              // var AUDAmountSucess = new BigNumber(userBidAmountAUD);
              // AUDAmountSucess = AUDAmountSucess.minus(totoalBidRemainingAUD);
              //
              // //var txFeesBidderAUD = (parseFloat(AUDAmountSucess) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(AUDAmountSucess);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              //
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);
              // console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedAUDbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountAUD totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidAUD.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
                  bidAmountAUD: totoalBidRemainingAUD,
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingAUD :: " + totoalBidRemainingAUD);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingAUD = totoalBidRemainingAUD - allAsksFromdb[i].bidAmountAUD;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingAUD = totoalBidRemainingAUD.minus(currentAskDetails.askAmountAUD);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingAUD == 0::: " + totoalBidRemainingAUD);

              if (totoalBidRemainingAUD == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingAUD == 0Enter into totoalBidRemainingAUD == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerAUD
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
                    id: bidDetails.bidownerAUD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingAUD == 0userAll bidDetails.askownerAUD :: ");
                console.log(" totoalBidRemainingAUD == 0Update value of Bidder and asker");
                //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(currentAskDetails.askAmountAUD));
                var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
                updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(currentAskDetails.askAmountAUD);

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

                console.log("After deduct TX Fees of AUD Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingAUD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingAUD == 0updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);
                console.log(" totoalBidRemainingAUD == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerAUD
                  }, {
                    FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedAUDbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(userBidAmountAUD)) - parseFloat(totoalBidRemainingAUD));

                var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
                updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);
                updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(totoalBidRemainingAUD);

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalBidRemainingLTC);
                console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedLTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
                //var AUDAmountSucess = (parseFloat(userBidAmountAUD) - parseFloat(totoalBidRemainingAUD));
                // var AUDAmountSucess = new BigNumber(userBidAmountAUD);
                // AUDAmountSucess = AUDAmountSucess.minus(totoalBidRemainingAUD);
                //
                //
                // //var txFeesBidderAUD = (parseFloat(AUDAmountSucess) * parseFloat(txFeeWithdrawSuccessAUD));
                // var txFeesBidderAUD = new BigNumber(AUDAmountSucess);
                // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
                // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
                // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
                // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
                //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
                updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);



                console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 updatedFreezedAUDbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerAUD
                  }, {
                    AUDbalance: updatedAUDbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 BidAUD.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskAUD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskAUD.update({
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
                sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 AskAUD.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidAUD.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidAUD.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 enter into else of totoalBidRemainingAUD == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0totoalBidRemainingAUD == 0 start User.findOne currentAskDetails.bidownerAUD " + currentAskDetails.bidownerAUD);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerAUD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(currentAskDetails.askAmountAUD));

                var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
                updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(currentAskDetails.askAmountAUD);

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
                console.log("After deduct TX Fees of AUD Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 updatedFreezedAUDbalanceAsker:: " + updatedFreezedAUDbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerAUD
                  }, {
                    FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskAUD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskAUD.update({
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
                sails.sockets.blast(constants.AUD_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountAUD = (parseFloat(currentAskDetails.askAmountAUD) - parseFloat(totoalBidRemainingAUD));

              var updatedAskAmountAUD = new BigNumber(currentAskDetails.askAmountAUD);
              updatedAskAmountAUD = updatedAskAmountAUD.minus(totoalBidRemainingAUD);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskAUD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
                  askAmountAUD: updatedAskAmountAUD,
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
              sails.sockets.blast(constants.AUD_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(totoalBidRemainingAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(totoalBidRemainingAUD);

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
              console.log("Total Ask RemainAUD updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of AUD Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedAUDbalanceAsker:: " + updatedFreezedAUDbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
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
                  id: bidDetails.bidownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerAUD");
              //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(userBidAmountAUD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountAUD " + userBidAmountAUD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.AUDbalance " + userAllDetailsInDBBidder.AUDbalance);

              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var txFeesBidderAUD = (parseFloat(updatedAUDbalanceBidder) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(userBidAmountAUD);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              //
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderAUD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedAUDbalanceBidder ::: " + updatedAUDbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidAUD.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidAUD.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidAUD.update({
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
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
  removeBidAUDMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdAUD;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidAUD.findOne({
      bidownerAUD: bidownerId,
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
            BidAUD.update({
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskAUDMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdAUD;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskAUD.findOne({
      askownerAUD: askownerId,
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
        var userAUDBalanceInDb = parseFloat(user.AUDbalance);
        var askAmountOfAUDInAskTableDB = parseFloat(askDetails.askAmountAUD);
        var userFreezedAUDbalanceInDB = parseFloat(user.FreezedAUDbalance);
        console.log("userAUDBalanceInDb :" + userAUDBalanceInDb);
        console.log("askAmountOfAUDInAskTableDB :" + askAmountOfAUDInAskTableDB);
        console.log("userFreezedAUDbalanceInDB :" + userFreezedAUDbalanceInDB);
        var updateFreezedAUDBalance = (parseFloat(userFreezedAUDbalanceInDB) - parseFloat(askAmountOfAUDInAskTableDB));
        var updateUserAUDBalance = (parseFloat(userAUDBalanceInDb) + parseFloat(askAmountOfAUDInAskTableDB));
        User.update({
            id: askownerId
          }, {
            AUDbalance: parseFloat(updateUserAUDBalance),
            FreezedAUDbalance: parseFloat(updateFreezedAUDBalance)
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
            AskAUD.update({
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
              sails.sockets.blast(constants.AUD_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidAUD: function(req, res) {
    console.log("Enter into ask api getAllBidAUD :: ");
    BidAUD.find({
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
            BidAUD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountAUD')
              .exec(function(err, bidAmountAUDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountAUDSum",
                    statusCode: 401
                  });
                }
                BidAUD.find({
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
                        "message": "Error to sum Of bidAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsAUD: allAskDetailsToExecute,
                      bidAmountAUDSum: bidAmountAUDSum[0].bidAmountAUD,
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
  getAllAskAUD: function(req, res) {
    console.log("Enter into ask api getAllAskAUD :: ");
    AskAUD.find({
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
            AskAUD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountAUD')
              .exec(function(err, askAmountAUDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountAUDSum",
                    statusCode: 401
                  });
                }
                AskAUD.find({
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
                        "message": "Error to sum Of askAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksAUD: allAskDetailsToExecute,
                      askAmountAUDSum: askAmountAUDSum[0].askAmountAUD,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskAUD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsAUDSuccess: function(req, res) {
    console.log("Enter into ask api getBidsAUDSuccess :: ");
    BidAUD.find({
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
            BidAUD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountAUD')
              .exec(function(err, bidAmountAUDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountAUDSum",
                    statusCode: 401
                  });
                }
                BidAUD.find({
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
                        "message": "Error to sum Of bidAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsAUD: allAskDetailsToExecute,
                      bidAmountAUDSum: bidAmountAUDSum[0].bidAmountAUD,
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
  getAsksAUDSuccess: function(req, res) {
    console.log("Enter into ask api getAsksAUDSuccess :: ");
    AskAUD.find({
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
            AskAUD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountAUD')
              .exec(function(err, askAmountAUDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountAUDSum",
                    statusCode: 401
                  });
                }
                AskAUD.find({
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
                        "message": "Error to sum Of askAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksAUD: allAskDetailsToExecute,
                      askAmountAUDSum: askAmountAUDSum[0].askAmountAUD,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskAUD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};