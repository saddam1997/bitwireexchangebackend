/**
 * TrademarketBTCCZKController
 *
 * @description :: Server-side logic for managing trademarketbtcczks
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

  addAskCZKMarket: async function(req, res) {
    console.log("Enter into ask api addAskCZKMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountCZK = new BigNumber(req.body.askAmountCZK);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountCZK || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountCZK < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userCZKBalanceInDb = new BigNumber(userAsker.CZKbalance);
    var userFreezedCZKBalanceInDb = new BigNumber(userAsker.FreezedCZKbalance);

    userCZKBalanceInDb = parseFloat(userCZKBalanceInDb);
    userFreezedCZKBalanceInDb = parseFloat(userFreezedCZKBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountCZK.greaterThanOrEqualTo(userCZKBalanceInDb)) {
      return res.json({
        "message": "You have insufficient CZK Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountCZK :: " + userAskAmountCZK);
    console.log("userCZKBalanceInDb :: " + userCZKBalanceInDb);
    // if (userAskAmountCZK >= userCZKBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient CZK Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountCZK = parseFloat(userAskAmountCZK);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskCZK.create({
        askAmountBTC: userAskAmountBTC,
        askAmountCZK: userAskAmountCZK,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountCZK: userAskAmountCZK,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerCZK: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.CZK_ASK_ADDED, askDetails);
    // var updateUserCZKBalance = (parseFloat(userCZKBalanceInDb) - parseFloat(userAskAmountCZK));
    // var updateFreezedCZKBalance = (parseFloat(userFreezedCZKBalanceInDb) + parseFloat(userAskAmountCZK));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userCZKBalanceInDb = new BigNumber(userCZKBalanceInDb);
    var updateUserCZKBalance = userCZKBalanceInDb.minus(userAskAmountCZK);
    updateUserCZKBalance = parseFloat(updateUserCZKBalance);
    userFreezedCZKBalanceInDb = new BigNumber(userFreezedCZKBalanceInDb);
    var updateFreezedCZKBalance = userFreezedCZKBalanceInDb.plus(userAskAmountCZK);
    updateFreezedCZKBalance = parseFloat(updateFreezedCZKBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedCZKbalance: updateFreezedCZKBalance,
        CZKbalance: updateUserCZKBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidCZK.find({
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
        message: 'Failed to find CZK bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingCZK = new BigNumber(userAskAmountCZK);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of CZK
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountCZK;
      }
      if (total_bid <= totoalAskRemainingCZK) {
        console.log("Inside of total_bid <= totoalAskRemainingCZK");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingCZK");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingCZK :: " + totoalAskRemainingCZK);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingCZK = (parseFloat(totoalAskRemainingCZK) - parseFloat(currentBidDetails.bidAmountCZK));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingCZK = totoalAskRemainingCZK.minus(currentBidDetails.bidAmountCZK);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingCZK :: " + totoalAskRemainingCZK);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingCZK == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingCZK == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerCZK
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCZK
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(currentBidDetails.bidAmountCZK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of CZK Update user " + updatedCZKbalanceBidder);
            //var txFeesBidderCZK = (parseFloat(currentBidDetails.bidAmountCZK) * parseFloat(txFeeWithdrawSuccessCZK));
            // var txFeesBidderCZK = new BigNumber(currentBidDetails.bidAmountCZK);
            //
            // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK)
            // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
            // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


            //updatedCZKbalanceBidder =  parseFloat(updatedCZKbalanceBidder);

            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                CZKbalance: updatedCZKbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and CZK balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedCZKbalanceAsker = parseFloat(totoalAskRemainingCZK);
            //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);

            //updatedFreezedCZKbalanceAsker =  parseFloat(updatedFreezedCZKbalanceAsker);
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
            console.log("After deduct TX Fees of CZK Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedCZKbalance: updatedFreezedCZKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed CZKBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidCZK:: ");
            try {
              var bidDestroy = await BidCZK.update({
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
            sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskCZK.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskCZK.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskCZK',
                statusCode: 401
              });
            }
            //emitting event of destruction of CZK_ask
            sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCZK == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCZK " + currentBidDetails.bidownerCZK);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerCZK
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(currentBidDetails.bidAmountCZK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of CZK 089089Update user " + updatedCZKbalanceBidder);
            // var txFeesBidderCZK = (parseFloat(currentBidDetails.bidAmountCZK) * parseFloat(txFeeWithdrawSuccessCZK));
            // var txFeesBidderCZK = new BigNumber(currentBidDetails.bidAmountCZK);
            // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
            // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            // // updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
            // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCZKbalanceBidder:: " + updatedCZKbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                CZKbalance: updatedCZKbalanceBidder
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
              var desctroyCurrentBid = await BidCZK.update({
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
            sails.sockets.blast(constants.CZK_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCZK
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerCZK");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(totoalAskRemainingCZK));
            //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
            console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
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
            console.log("After deduct TX Fees of CZK Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedCZKbalance: updatedFreezedCZKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskCZK.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountCZK: parseFloat(totoalAskRemainingCZK),
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
            sails.sockets.blast(constants.CZK_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingCZK :: " + totoalAskRemainingCZK);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingCZK = totoalAskRemainingCZK - allBidsFromdb[i].bidAmountCZK;
          if (totoalAskRemainingCZK >= currentBidDetails.bidAmountCZK) {
            //totoalAskRemainingCZK = (parseFloat(totoalAskRemainingCZK) - parseFloat(currentBidDetails.bidAmountCZK));
            totoalAskRemainingCZK = totoalAskRemainingCZK.minus(currentBidDetails.bidAmountCZK);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingCZK == 0::: " + totoalAskRemainingCZK);

            if (totoalAskRemainingCZK == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingCZK == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCZK
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
                  id: askDetails.askownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerCZK :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));
              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(currentBidDetails.bidAmountCZK);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 CZK Update user " + updatedCZKbalanceBidder);
              //var txFeesBidderCZK = (parseFloat(currentBidDetails.bidAmountCZK) * parseFloat(txFeeWithdrawSuccessCZK));

              // var txFeesBidderCZK = new BigNumber(currentBidDetails.bidAmountCZK);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);
              // console.log("After deduct TX Fees of CZK Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerCZK
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  CZKbalance: updatedCZKbalanceBidder
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
              //var updatedFreezedCZKbalanceAsker = parseFloat(totoalAskRemainingCZK);
              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(totoalAskRemainingCZK));
              //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
              console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
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

              console.log("After deduct TX Fees of CZK Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerCZK
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidCZK.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidCZK.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidCZK.update({
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskCZK.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskCZK.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskCZK.update({
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
              sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCZK == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCZK " + currentBidDetails.bidownerCZK);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCZK
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

              //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));
              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(currentBidDetails.bidAmountCZK);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var txFeesBidderCZK = (parseFloat(currentBidDetails.bidAmountCZK) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(currentBidDetails.bidAmountCZK);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);
              // console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedCZKbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerCZK
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  CZKbalance: updatedCZKbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidCZK.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidCZK.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.CZK_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCZK
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
            //var updatedBidAmountCZK = (parseFloat(currentBidDetails.bidAmountCZK) - parseFloat(totoalAskRemainingCZK));
            var updatedBidAmountCZK = new BigNumber(currentBidDetails.bidAmountCZK);
            updatedBidAmountCZK = updatedBidAmountCZK.minus(totoalAskRemainingCZK);

            try {
              var updatedaskDetails = await BidCZK.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountCZK: updatedBidAmountCZK,
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
            sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerCZK
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


            //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.CZKbalance) + parseFloat(totoalAskRemainingCZK));

            var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.CZKbalance);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(totoalAskRemainingCZK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of CZK Update user " + updatedCZKbalanceBidder);
            //var CZKAmountSucess = parseFloat(totoalAskRemainingCZK);
            //var CZKAmountSucess = new BigNumber(totoalAskRemainingCZK);
            //var txFeesBidderCZK = (parseFloat(CZKAmountSucess) * parseFloat(txFeeWithdrawSuccessCZK));
            //var txFeesBidderCZK = (parseFloat(totoalAskRemainingCZK) * parseFloat(txFeeWithdrawSuccessCZK));



            // var txFeesBidderCZK = new BigNumber(totoalAskRemainingCZK);
            // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
            //
            // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
            // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCZKbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                CZKbalance: updatedCZKbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerCZK");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of CZK Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedCZKbalance: updatedFreezedCZKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskCZK.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskCZK.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskCZK.update({
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
            //emitting event for CZK_ask destruction
            sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
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
  addBidCZKMarket: async function(req, res) {
    console.log("Enter into ask api addBidCZKMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountCZK = new BigNumber(req.body.bidAmountCZK);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountCZK = parseFloat(userBidAmountCZK);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountCZK || !userBidAmountBTC ||
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
      var bidDetails = await BidCZK.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountCZK: userBidAmountCZK,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountCZK: userBidAmountCZK,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerCZK: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.CZK_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskCZK.find({
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
        var totoalBidRemainingCZK = new BigNumber(userBidAmountCZK);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of CZK
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountCZK;
        }
        if (total_ask <= totoalBidRemainingCZK) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingCZK :: " + totoalBidRemainingCZK);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingCZK = totoalBidRemainingCZK - allAsksFromdb[i].bidAmountCZK;
            //totoalBidRemainingCZK = (parseFloat(totoalBidRemainingCZK) - parseFloat(currentAskDetails.askAmountCZK));
            totoalBidRemainingCZK = totoalBidRemainingCZK.minus(currentAskDetails.askAmountCZK);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingCZK == 0::: " + totoalBidRemainingCZK);
            if (totoalBidRemainingCZK == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingCZK == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerCZK totoalBidRemainingCZK == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(currentAskDetails.askAmountCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(currentAskDetails.askAmountCZK);
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
              console.log("After deduct TX Fees of CZK Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedCZKbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
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
                  id: bidDetails.bidownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and CZK  give to bidder
              //var updatedCZKbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.CZKbalance) + parseFloat(totoalBidRemainingCZK)) - parseFloat(totoalBidRemainingBTC);
              //var updatedCZKbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.CZKbalance) + parseFloat(userBidAmountCZK)) - parseFloat(totoalBidRemainingCZK));
              var updatedCZKbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(totoalBidRemainingCZK);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainCZK updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var CZKAmountSucess = (parseFloat(userBidAmountCZK) - parseFloat(totoalBidRemainingCZK));
              // var CZKAmountSucess = new BigNumber(userBidAmountCZK);
              // CZKAmountSucess = CZKAmountSucess.minus(totoalBidRemainingCZK);
              //
              // //var txFeesBidderCZK = (parseFloat(CZKAmountSucess) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(CZKAmountSucess);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              //
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingCZK == 0updatedCZKbalanceBidder ::: " + updatedCZKbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingCZK asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingCZK == 0BidCZK.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidCZK.destroy({
              //   id: bidDetails.bidownerCZK
              // });
              try {
                var bidDestroy = await BidCZK.update({
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0AskCZK.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskCZK.destroy({
              //   id: currentAskDetails.askownerCZK
              // });
              try {
                var askDestroy = await AskCZK.update({
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
              sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0  enter into else of totoalBidRemainingCZK == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0start User.findOne currentAskDetails.bidownerCZK ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(currentAskDetails.askAmountCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(currentAskDetails.askAmountCZK);
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

              console.log("After deduct TX Fees of CZK Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskCZK.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskCZK.update({
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

              sails.sockets.blast(constants.CZK_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingCZK == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerCZK");
              //var updatedCZKbalanceBidder = ((parseFloat(userAllDetailsInDBBid.CZKbalance) + parseFloat(userBidAmountCZK)) - parseFloat(totoalBidRemainingCZK));
              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBid.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(totoalBidRemainingCZK);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainCZK updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var CZKAmountSucess = (parseFloat(userBidAmountCZK) - parseFloat(totoalBidRemainingCZK));
              // var CZKAmountSucess = new BigNumber(userBidAmountCZK);
              // CZKAmountSucess = CZKAmountSucess.minus(totoalBidRemainingCZK);
              //
              // //var txFeesBidderCZK = (parseFloat(CZKAmountSucess) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(CZKAmountSucess);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              //
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);
              // console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedCZKbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountCZK totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidCZK.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountCZK: totoalBidRemainingCZK,
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingCZK :: " + totoalBidRemainingCZK);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingCZK = totoalBidRemainingCZK - allAsksFromdb[i].bidAmountCZK;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingCZK = totoalBidRemainingCZK.minus(currentAskDetails.askAmountCZK);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingCZK == 0::: " + totoalBidRemainingCZK);

              if (totoalBidRemainingCZK == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingCZK == 0Enter into totoalBidRemainingCZK == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCZK
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
                    id: bidDetails.bidownerCZK
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingCZK == 0userAll bidDetails.askownerCZK :: ");
                console.log(" totoalBidRemainingCZK == 0Update value of Bidder and asker");
                //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(currentAskDetails.askAmountCZK));
                var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
                updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(currentAskDetails.askAmountCZK);

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

                console.log("After deduct TX Fees of CZK Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingCZK == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingCZK == 0updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);
                console.log(" totoalBidRemainingCZK == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerCZK
                  }, {
                    FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedCZKbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(userBidAmountCZK)) - parseFloat(totoalBidRemainingCZK));

                var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
                updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);
                updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(totoalBidRemainingCZK);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalBidRemainingBTC);
                console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
                //var CZKAmountSucess = (parseFloat(userBidAmountCZK) - parseFloat(totoalBidRemainingCZK));
                // var CZKAmountSucess = new BigNumber(userBidAmountCZK);
                // CZKAmountSucess = CZKAmountSucess.minus(totoalBidRemainingCZK);
                //
                //
                // //var txFeesBidderCZK = (parseFloat(CZKAmountSucess) * parseFloat(txFeeWithdrawSuccessCZK));
                // var txFeesBidderCZK = new BigNumber(CZKAmountSucess);
                // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
                // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
                // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
                // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
                //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
                updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);



                console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 updatedFreezedCZKbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerCZK
                  }, {
                    CZKbalance: updatedCZKbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 BidCZK.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskCZK.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskCZK.update({
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
                sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 AskCZK.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidCZK.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidCZK.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 enter into else of totoalBidRemainingCZK == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0totoalBidRemainingCZK == 0 start User.findOne currentAskDetails.bidownerCZK " + currentAskDetails.bidownerCZK);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCZK
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(currentAskDetails.askAmountCZK));

                var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
                updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(currentAskDetails.askAmountCZK);

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
                console.log("After deduct TX Fees of CZK Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 updatedFreezedCZKbalanceAsker:: " + updatedFreezedCZKbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerCZK
                  }, {
                    FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskCZK.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskCZK.update({
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
                sails.sockets.blast(constants.CZK_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountCZK = (parseFloat(currentAskDetails.askAmountCZK) - parseFloat(totoalBidRemainingCZK));

              var updatedAskAmountCZK = new BigNumber(currentAskDetails.askAmountCZK);
              updatedAskAmountCZK = updatedAskAmountCZK.minus(totoalBidRemainingCZK);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskCZK.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountCZK: updatedAskAmountCZK,
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
              sails.sockets.blast(constants.CZK_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(totoalBidRemainingCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(totoalBidRemainingCZK);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
              console.log("Total Ask RemainCZK updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of CZK Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedCZKbalanceAsker:: " + updatedFreezedCZKbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
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
                  id: bidDetails.bidownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerCZK");
              //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(userBidAmountCZK));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountCZK " + userBidAmountCZK);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.CZKbalance " + userAllDetailsInDBBidder.CZKbalance);

              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var txFeesBidderCZK = (parseFloat(updatedCZKbalanceBidder) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(userBidAmountCZK);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              //
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCZK = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedCZKbalanceBidder ::: " + updatedCZKbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidCZK.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidCZK.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidCZK.update({
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
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
  removeBidCZKMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdCZK;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidCZK.findOne({
      bidownerCZK: bidownerId,
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
            BidCZK.update({
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskCZKMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdCZK;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskCZK.findOne({
      askownerCZK: askownerId,
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
        var userCZKBalanceInDb = parseFloat(user.CZKbalance);
        var askAmountOfCZKInAskTableDB = parseFloat(askDetails.askAmountCZK);
        var userFreezedCZKbalanceInDB = parseFloat(user.FreezedCZKbalance);
        console.log("userCZKBalanceInDb :" + userCZKBalanceInDb);
        console.log("askAmountOfCZKInAskTableDB :" + askAmountOfCZKInAskTableDB);
        console.log("userFreezedCZKbalanceInDB :" + userFreezedCZKbalanceInDB);
        var updateFreezedCZKBalance = (parseFloat(userFreezedCZKbalanceInDB) - parseFloat(askAmountOfCZKInAskTableDB));
        var updateUserCZKBalance = (parseFloat(userCZKBalanceInDb) + parseFloat(askAmountOfCZKInAskTableDB));
        User.update({
            id: askownerId
          }, {
            CZKbalance: parseFloat(updateUserCZKBalance),
            FreezedCZKbalance: parseFloat(updateFreezedCZKBalance)
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
            AskCZK.update({
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
              sails.sockets.blast(constants.CZK_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidCZK: function(req, res) {
    console.log("Enter into ask api getAllBidCZK :: ");
    BidCZK.find({
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
            "message": "Error found to get Ask !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No Ask Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidCZK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountCZK')
              .exec(function(err, bidAmountCZKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCZKSum",
                    statusCode: 401
                  });
                }
                BidCZK.find({
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
                        "message": "Error to sum Of bidAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCZK: allAskDetailsToExecute,
                      bidAmountCZKSum: bidAmountCZKSum[0].bidAmountCZK,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No Ask Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllAskCZK: function(req, res) {
    console.log("Enter into ask api getAllAskCZK :: ");
    AskCZK.find({
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
            "message": "Error found to get Ask !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No Ask Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskCZK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountCZK')
              .exec(function(err, askAmountCZKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCZKSum",
                    statusCode: 401
                  });
                }
                AskCZK.find({
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
                        "message": "Error to sum Of askAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCZK: allAskDetailsToExecute,
                      askAmountCZKSum: askAmountCZKSum[0].askAmountCZK,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCZK Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsCZKSuccess: function(req, res) {
    console.log("Enter into ask api getBidsCZKSuccess :: ");
    BidCZK.find({
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
            "message": "Error found to get Ask !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No Ask Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidCZK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountCZK')
              .exec(function(err, bidAmountCZKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCZKSum",
                    statusCode: 401
                  });
                }
                BidCZK.find({
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
                        "message": "Error to sum Of bidAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCZK: allAskDetailsToExecute,
                      bidAmountCZKSum: bidAmountCZKSum[0].bidAmountCZK,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No Ask Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAsksCZKSuccess: function(req, res) {
    console.log("Enter into ask api getAsksCZKSuccess :: ");
    AskCZK.find({
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
            "message": "Error found to get Ask !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No Ask Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskCZK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountCZK')
              .exec(function(err, askAmountCZKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCZKSum",
                    statusCode: 401
                  });
                }
                AskCZK.find({
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
                        "message": "Error to sum Of askAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCZK: allAskDetailsToExecute,
                      askAmountCZKSum: askAmountCZKSum[0].askAmountCZK,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCZK Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};