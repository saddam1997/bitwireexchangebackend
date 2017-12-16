/**
 * TrademarketBTCAUDController
 *
 * @description :: Server-side logic for managing trademarketbtcauds
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


const txFeeWithdrawSuccessBTC = sails.config.common.txFeeWithdrawSuccessBTC;
const BTCMARKETID = sails.config.common.BTCMARKETID;
module.exports = {

  addAskAUDMarket: async function(req, res) {
    console.log("Enter into ask api addAskAUDMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountAUD = new BigNumber(req.body.askAmountAUD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountAUD || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountAUD < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountAUD = parseFloat(userAskAmountAUD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskAUD.create({
        askAmountBTC: userAskAmountBTC,
        askAmountAUD: userAskAmountAUD,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountAUD: userAskAmountAUD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
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
          'like': BTCMARKETID
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
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingAUD = (parseFloat(totoalAskRemainingAUD) - parseFloat(currentBidDetails.bidAmountAUD));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingAUD = totoalAskRemainingAUD.minus(currentBidDetails.bidAmountAUD);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingAUD :: " + totoalAskRemainingAUD);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
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

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


            //updatedAUDbalanceBidder =  parseFloat(updatedAUDbalanceBidder);

            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedAUDbalanceAsker = parseFloat(totoalAskRemainingAUD);
            //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);

            //updatedFreezedAUDbalanceAsker =  parseFloat(updatedFreezedAUDbalanceAsker);
            //Deduct Transation Fee Asker
            //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var BTCAmountSucess = new BigNumber(userAskAmountBTC);
            BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount BTC updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(BTCAmountSucess) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            updatedBTCbalanceAsker = parseFloat(updatedBTCbalanceAsker);
            console.log("After deduct TX Fees of AUD Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedAUDbalance: updatedFreezedAUDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed AUDBalance',
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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
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

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedAUDbalanceBidder:: " + updatedAUDbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerAUD");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(totoalAskRemainingAUD));
            //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
            console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var BTCAmountSucess = new BigNumber(userAskAmountBTC);
            BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);

            //var txFeesAskerBTC = (parseFloat(BTCAmountSucess) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of AUD Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedAUDbalance: updatedFreezedAUDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskAUD.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingAUD = totoalAskRemainingAUD - allBidsFromdb[i].bidAmountAUD;
          if (totoalAskRemainingAUD >= currentBidDetails.bidAmountAUD) {
            //totoalAskRemainingAUD = (parseFloat(totoalAskRemainingAUD) - parseFloat(currentBidDetails.bidAmountAUD));
            totoalAskRemainingAUD = totoalAskRemainingAUD.minus(currentBidDetails.bidAmountAUD);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
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
              // console.log("After deduct TX Fees of AUD Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerAUD
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  AUDbalance: updatedAUDbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
              //var updatedFreezedAUDbalanceAsker = parseFloat(totoalAskRemainingAUD);
              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(totoalAskRemainingAUD));
              //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
              console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
              var BTCAmountSucess = new BigNumber(userAskAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);
              //var txFeesAskerBTC = (parseFloat(updatedBTCbalanceAsker) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of AUD Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerAUD
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);

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

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedAUDbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerAUD
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            //var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var updatedBidAmountBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            updatedBidAmountBTC = updatedBidAmountBTC.minus(totoalAskRemainingBTC);
            //var updatedBidAmountAUD = (parseFloat(currentBidDetails.bidAmountAUD) - parseFloat(totoalAskRemainingAUD));
            var updatedBidAmountAUD = new BigNumber(currentBidDetails.bidAmountAUD);
            updatedBidAmountAUD = updatedBidAmountAUD.minus(totoalAskRemainingAUD);

            try {
              var updatedaskDetails = await BidAUD.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
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
            //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance) - parseFloat(totoalAskRemainingBTC));
            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(totoalAskRemainingBTC);


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
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedAUDbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerAUD");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of AUD Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
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
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountAUD = new BigNumber(req.body.bidAmountAUD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountAUD = parseFloat(userBidAmountAUD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountAUD || !userBidAmountBTC ||
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
    var userBTCBalanceInDb = new BigNumber(userBidder.BTCbalance);
    var userFreezedBTCBalanceInDb = new BigNumber(userBidder.FreezedBTCbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountBTC = new BigNumber(userBidAmountBTC);
    if (userBidAmountBTC.greaterThanOrEqualTo(userBTCBalanceInDb)) {
      return res.json({
        "message": "You have insufficient BTC Balance",
        statusCode: 401
      });
    }
    userBidAmountBTC = parseFloat(userBidAmountBTC);
    try {
      var bidDetails = await BidAUD.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountAUD: userBidAmountAUD,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountAUD: userBidAmountAUD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
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
    //var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) - parseFloat(userBidAmountBTC));
    var updateUserBTCBalance = new BigNumber(userBTCBalanceInDb);
    updateUserBTCBalance = updateUserBTCBalance.minus(userBidAmountBTC);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBidAmountBTC));
    var updateFreezedBTCBalance = new BigNumber(userBidder.FreezedBTCbalance);
    updateFreezedBTCBalance = updateFreezedBTCBalance.plus(userBidAmountBTC);

    console.log("Updating user's bid details sdfyrtyupdateFreezedBTCBalance  " + updateFreezedBTCBalance);
    console.log("Updating user's bid details asdfasdf updateUserBTCBalance  " + updateUserBTCBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedBTCbalance: parseFloat(updateFreezedBTCBalance),
        BTCbalance: parseFloat(updateUserBTCBalance),
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
          'like': BTCMARKETID
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
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of AUD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountAUD;
        }
        if (total_ask <= totoalBidRemainingAUD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingAUD :: " + totoalBidRemainingAUD);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingAUD = totoalBidRemainingAUD - allAsksFromdb[i].bidAmountAUD;
            //totoalBidRemainingAUD = (parseFloat(totoalBidRemainingAUD) - parseFloat(currentAskDetails.askAmountAUD));
            totoalBidRemainingAUD = totoalBidRemainingAUD.minus(currentAskDetails.askAmountAUD);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of AUD Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedAUDbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              //Bid FreezedBTCbalance of bidder deduct and AUD  give to bidder
              //var updatedAUDbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.AUDbalance) + parseFloat(totoalBidRemainingAUD)) - parseFloat(totoalBidRemainingBTC);
              //var updatedAUDbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.AUDbalance) + parseFloat(userBidAmountAUD)) - parseFloat(totoalBidRemainingAUD));
              var updatedAUDbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(totoalBidRemainingAUD);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainAUD updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
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

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingAUD == 0updatedAUDbalanceBidder ::: " + updatedAUDbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingAUD asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of AUD Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerAUD");
              //var updatedAUDbalanceBidder = ((parseFloat(userAllDetailsInDBBid.AUDbalance) + parseFloat(userBidAmountAUD)) - parseFloat(totoalBidRemainingAUD));
              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBid.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(totoalBidRemainingAUD);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainAUD updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
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



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedAUDbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountAUD totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidAUD.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingAUD = totoalBidRemainingAUD - allAsksFromdb[i].bidAmountAUD;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingAUD = totoalBidRemainingAUD.minus(currentAskDetails.askAmountAUD);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

                console.log("After deduct TX Fees of AUD Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingAUD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingAUD == 0updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);
                console.log(" totoalBidRemainingAUD == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerAUD
                  }, {
                    FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalBidRemainingBTC);
                console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedBTCbalanceBidder);
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

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
                //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
                updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);



                console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 updatedFreezedAUDbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerAUD
                  }, {
                    AUDbalance: updatedAUDbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
                console.log("After deduct TX Fees of AUD Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 updatedFreezedAUDbalanceAsker:: " + updatedFreezedAUDbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerAUD
                  }, {
                    FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountAUD = (parseFloat(currentAskDetails.askAmountAUD) - parseFloat(totoalBidRemainingAUD));

              var updatedAskAmountAUD = new BigNumber(currentAskDetails.askAmountAUD);
              updatedAskAmountAUD = updatedAskAmountAUD.minus(totoalBidRemainingAUD);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskAUD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
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

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
              console.log("Total Ask RemainAUD updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of AUD Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedAUDbalanceAsker:: " + updatedFreezedAUDbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerAUD");
              //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(userBidAmountAUD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountAUD " + userBidAmountAUD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.AUDbalance " + userAllDetailsInDBBidder.AUDbalance);

              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var txFeesBidderAUD = (parseFloat(updatedAUDbalanceBidder) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(userBidAmountAUD);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              //
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderAUD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedAUDbalanceBidder ::: " + updatedAUDbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidAUD.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC Bid destroy successfully desctroyCurrentBid ::");
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
        'like': BTCMARKETID
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
        var userBTCBalanceInDb = parseFloat(user.BTCbalance);
        var bidAmountOfBTCInBidTableDB = parseFloat(bidDetails.bidAmountBTC);
        var userFreezedBTCbalanceInDB = parseFloat(user.FreezedBTCbalance);
        var updateFreezedBalance = (parseFloat(userFreezedBTCbalanceInDB) - parseFloat(bidAmountOfBTCInBidTableDB));
        var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) + parseFloat(bidAmountOfBTCInBidTableDB));
        console.log("userBTCBalanceInDb :" + userBTCBalanceInDb);
        console.log("bidAmountOfBTCInBidTableDB :" + bidAmountOfBTCInBidTableDB);
        console.log("userFreezedBTCbalanceInDB :" + userFreezedBTCbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserBTCBalance :" + updateUserBTCBalance);

        User.update({
            id: bidownerId
          }, {
            BTCbalance: parseFloat(updateUserBTCBalance),
            FreezedBTCbalance: parseFloat(updateFreezedBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BTC balance");
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
        'like': BTCMARKETID
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
              console.log("Error to update user BTC balance");
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
          'like': BTCMARKETID
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
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsAUD: allAskDetailsToExecute,
                      bidAmountAUDSum: bidAmountAUDSum[0].bidAmountAUD,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
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
          'like': BTCMARKETID
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
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksAUD: allAskDetailsToExecute,
                      askAmountAUDSum: askAmountAUDSum[0].askAmountAUD,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
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
          'like': BTCMARKETID
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
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsAUD: allAskDetailsToExecute,
                      bidAmountAUDSum: bidAmountAUDSum[0].bidAmountAUD,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
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
          'like': BTCMARKETID
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
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksAUD: allAskDetailsToExecute,
                      askAmountAUDSum: askAmountAUDSum[0].askAmountAUD,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
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