/**
 * TrademarketBTCSEKController
 *
 * @description :: Server-side logic for managing trademarketbtcseks
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

  addAskSEKMarket: async function(req, res) {
    console.log("Enter into ask api addAskSEKMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountSEK = new BigNumber(req.body.askAmountSEK);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountSEK || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountSEK < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userSEKBalanceInDb = new BigNumber(userAsker.SEKbalance);
    var userFreezedSEKBalanceInDb = new BigNumber(userAsker.FreezedSEKbalance);

    userSEKBalanceInDb = parseFloat(userSEKBalanceInDb);
    userFreezedSEKBalanceInDb = parseFloat(userFreezedSEKBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountSEK.greaterThanOrEqualTo(userSEKBalanceInDb)) {
      return res.json({
        "message": "You have insufficient SEK Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountSEK :: " + userAskAmountSEK);
    console.log("userSEKBalanceInDb :: " + userSEKBalanceInDb);
    // if (userAskAmountSEK >= userSEKBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient SEK Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountSEK = parseFloat(userAskAmountSEK);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskSEK.create({
        askAmountBTC: userAskAmountBTC,
        askAmountSEK: userAskAmountSEK,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountSEK: userAskAmountSEK,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerSEK: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.SEK_ASK_ADDED, askDetails);
    // var updateUserSEKBalance = (parseFloat(userSEKBalanceInDb) - parseFloat(userAskAmountSEK));
    // var updateFreezedSEKBalance = (parseFloat(userFreezedSEKBalanceInDb) + parseFloat(userAskAmountSEK));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userSEKBalanceInDb = new BigNumber(userSEKBalanceInDb);
    var updateUserSEKBalance = userSEKBalanceInDb.minus(userAskAmountSEK);
    updateUserSEKBalance = parseFloat(updateUserSEKBalance);
    userFreezedSEKBalanceInDb = new BigNumber(userFreezedSEKBalanceInDb);
    var updateFreezedSEKBalance = userFreezedSEKBalanceInDb.plus(userAskAmountSEK);
    updateFreezedSEKBalance = parseFloat(updateFreezedSEKBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedSEKbalance: updateFreezedSEKBalance,
        SEKbalance: updateUserSEKBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidSEK.find({
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
        message: 'Failed to find SEK bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingSEK = new BigNumber(userAskAmountSEK);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of SEK
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountSEK;
      }
      if (total_bid <= totoalAskRemainingSEK) {
        console.log("Inside of total_bid <= totoalAskRemainingSEK");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingSEK");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingSEK :: " + totoalAskRemainingSEK);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingSEK = (parseFloat(totoalAskRemainingSEK) - parseFloat(currentBidDetails.bidAmountSEK));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingSEK = totoalAskRemainingSEK.minus(currentBidDetails.bidAmountSEK);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingSEK :: " + totoalAskRemainingSEK);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingSEK == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingSEK == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerSEK
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerSEK
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(currentBidDetails.bidAmountSEK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of SEK Update user " + updatedSEKbalanceBidder);
            //var txFeesBidderSEK = (parseFloat(currentBidDetails.bidAmountSEK) * parseFloat(txFeeWithdrawSuccessSEK));
            // var txFeesBidderSEK = new BigNumber(currentBidDetails.bidAmountSEK);
            //
            // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK)
            // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
            // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


            //updatedSEKbalanceBidder =  parseFloat(updatedSEKbalanceBidder);

            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                SEKbalance: updatedSEKbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and SEK balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedSEKbalanceAsker = parseFloat(totoalAskRemainingSEK);
            //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);

            //updatedFreezedSEKbalanceAsker =  parseFloat(updatedFreezedSEKbalanceAsker);
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
            console.log("After deduct TX Fees of SEK Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedSEKbalance: updatedFreezedSEKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed SEKBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidSEK:: ");
            try {
              var bidDestroy = await BidSEK.update({
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
            sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskSEK.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskSEK.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskSEK',
                statusCode: 401
              });
            }
            //emitting event of destruction of SEK_ask
            sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingSEK == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerSEK " + currentBidDetails.bidownerSEK);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerSEK
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(currentBidDetails.bidAmountSEK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of SEK 089089Update user " + updatedSEKbalanceBidder);
            // var txFeesBidderSEK = (parseFloat(currentBidDetails.bidAmountSEK) * parseFloat(txFeeWithdrawSuccessSEK));
            // var txFeesBidderSEK = new BigNumber(currentBidDetails.bidAmountSEK);
            // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
            // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            // // updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
            // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedSEKbalanceBidder:: " + updatedSEKbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                SEKbalance: updatedSEKbalanceBidder
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
              var desctroyCurrentBid = await BidSEK.update({
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
            sails.sockets.blast(constants.SEK_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerSEK
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerSEK");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(totoalAskRemainingSEK));
            //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
            console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
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
            console.log("After deduct TX Fees of SEK Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedSEKbalance: updatedFreezedSEKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskSEK.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountSEK: parseFloat(totoalAskRemainingSEK),
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
            sails.sockets.blast(constants.SEK_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingSEK :: " + totoalAskRemainingSEK);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingSEK = totoalAskRemainingSEK - allBidsFromdb[i].bidAmountSEK;
          if (totoalAskRemainingSEK >= currentBidDetails.bidAmountSEK) {
            //totoalAskRemainingSEK = (parseFloat(totoalAskRemainingSEK) - parseFloat(currentBidDetails.bidAmountSEK));
            totoalAskRemainingSEK = totoalAskRemainingSEK.minus(currentBidDetails.bidAmountSEK);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingSEK == 0::: " + totoalAskRemainingSEK);

            if (totoalAskRemainingSEK == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingSEK == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerSEK
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
                  id: askDetails.askownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerSEK :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));
              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(currentBidDetails.bidAmountSEK);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 SEK Update user " + updatedSEKbalanceBidder);
              //var txFeesBidderSEK = (parseFloat(currentBidDetails.bidAmountSEK) * parseFloat(txFeeWithdrawSuccessSEK));

              // var txFeesBidderSEK = new BigNumber(currentBidDetails.bidAmountSEK);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);
              // console.log("After deduct TX Fees of SEK Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerSEK
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  SEKbalance: updatedSEKbalanceBidder
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
              //var updatedFreezedSEKbalanceAsker = parseFloat(totoalAskRemainingSEK);
              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(totoalAskRemainingSEK));
              //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
              console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
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

              console.log("After deduct TX Fees of SEK Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerSEK
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidSEK.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidSEK.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidSEK.update({
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskSEK.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskSEK.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskSEK.update({
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
              sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingSEK == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerSEK " + currentBidDetails.bidownerSEK);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerSEK
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

              //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));
              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(currentBidDetails.bidAmountSEK);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var txFeesBidderSEK = (parseFloat(currentBidDetails.bidAmountSEK) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(currentBidDetails.bidAmountSEK);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);
              // console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedSEKbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerSEK
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  SEKbalance: updatedSEKbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidSEK.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidSEK.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.SEK_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerSEK
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
            //var updatedBidAmountSEK = (parseFloat(currentBidDetails.bidAmountSEK) - parseFloat(totoalAskRemainingSEK));
            var updatedBidAmountSEK = new BigNumber(currentBidDetails.bidAmountSEK);
            updatedBidAmountSEK = updatedBidAmountSEK.minus(totoalAskRemainingSEK);

            try {
              var updatedaskDetails = await BidSEK.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountSEK: updatedBidAmountSEK,
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
            sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerSEK
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


            //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.SEKbalance) + parseFloat(totoalAskRemainingSEK));

            var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.SEKbalance);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(totoalAskRemainingSEK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of SEK Update user " + updatedSEKbalanceBidder);
            //var SEKAmountSucess = parseFloat(totoalAskRemainingSEK);
            //var SEKAmountSucess = new BigNumber(totoalAskRemainingSEK);
            //var txFeesBidderSEK = (parseFloat(SEKAmountSucess) * parseFloat(txFeeWithdrawSuccessSEK));
            //var txFeesBidderSEK = (parseFloat(totoalAskRemainingSEK) * parseFloat(txFeeWithdrawSuccessSEK));



            // var txFeesBidderSEK = new BigNumber(totoalAskRemainingSEK);
            // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
            //
            // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
            // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedSEKbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                SEKbalance: updatedSEKbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerSEK");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of SEK Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedSEKbalance: updatedFreezedSEKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskSEK.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskSEK.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskSEK.update({
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
            //emitting event for SEK_ask destruction
            sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
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
  addBidSEKMarket: async function(req, res) {
    console.log("Enter into ask api addBidSEKMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountSEK = new BigNumber(req.body.bidAmountSEK);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountSEK = parseFloat(userBidAmountSEK);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountSEK || !userBidAmountBTC ||
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
      var bidDetails = await BidSEK.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountSEK: userBidAmountSEK,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountSEK: userBidAmountSEK,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerSEK: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.SEK_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskSEK.find({
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
        var totoalBidRemainingSEK = new BigNumber(userBidAmountSEK);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of SEK
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountSEK;
        }
        if (total_ask <= totoalBidRemainingSEK) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingSEK :: " + totoalBidRemainingSEK);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingSEK = totoalBidRemainingSEK - allAsksFromdb[i].bidAmountSEK;
            //totoalBidRemainingSEK = (parseFloat(totoalBidRemainingSEK) - parseFloat(currentAskDetails.askAmountSEK));
            totoalBidRemainingSEK = totoalBidRemainingSEK.minus(currentAskDetails.askAmountSEK);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingSEK == 0::: " + totoalBidRemainingSEK);
            if (totoalBidRemainingSEK == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingSEK == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerSEK totoalBidRemainingSEK == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(currentAskDetails.askAmountSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(currentAskDetails.askAmountSEK);
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
              console.log("After deduct TX Fees of SEK Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedSEKbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
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
                  id: bidDetails.bidownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and SEK  give to bidder
              //var updatedSEKbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.SEKbalance) + parseFloat(totoalBidRemainingSEK)) - parseFloat(totoalBidRemainingBTC);
              //var updatedSEKbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.SEKbalance) + parseFloat(userBidAmountSEK)) - parseFloat(totoalBidRemainingSEK));
              var updatedSEKbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(totoalBidRemainingSEK);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainSEK updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var SEKAmountSucess = (parseFloat(userBidAmountSEK) - parseFloat(totoalBidRemainingSEK));
              // var SEKAmountSucess = new BigNumber(userBidAmountSEK);
              // SEKAmountSucess = SEKAmountSucess.minus(totoalBidRemainingSEK);
              //
              // //var txFeesBidderSEK = (parseFloat(SEKAmountSucess) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(SEKAmountSucess);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              //
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingSEK == 0updatedSEKbalanceBidder ::: " + updatedSEKbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingSEK asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingSEK == 0BidSEK.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidSEK.destroy({
              //   id: bidDetails.bidownerSEK
              // });
              try {
                var bidDestroy = await BidSEK.update({
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0AskSEK.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskSEK.destroy({
              //   id: currentAskDetails.askownerSEK
              // });
              try {
                var askDestroy = await AskSEK.update({
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
              sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0  enter into else of totoalBidRemainingSEK == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0start User.findOne currentAskDetails.bidownerSEK ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(currentAskDetails.askAmountSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(currentAskDetails.askAmountSEK);
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

              console.log("After deduct TX Fees of SEK Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskSEK.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskSEK.update({
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

              sails.sockets.blast(constants.SEK_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingSEK == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerSEK");
              //var updatedSEKbalanceBidder = ((parseFloat(userAllDetailsInDBBid.SEKbalance) + parseFloat(userBidAmountSEK)) - parseFloat(totoalBidRemainingSEK));
              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBid.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(totoalBidRemainingSEK);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainSEK updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var SEKAmountSucess = (parseFloat(userBidAmountSEK) - parseFloat(totoalBidRemainingSEK));
              // var SEKAmountSucess = new BigNumber(userBidAmountSEK);
              // SEKAmountSucess = SEKAmountSucess.minus(totoalBidRemainingSEK);
              //
              // //var txFeesBidderSEK = (parseFloat(SEKAmountSucess) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(SEKAmountSucess);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              //
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);
              // console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedSEKbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountSEK totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidSEK.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountSEK: totoalBidRemainingSEK,
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingSEK :: " + totoalBidRemainingSEK);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingSEK = totoalBidRemainingSEK - allAsksFromdb[i].bidAmountSEK;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingSEK = totoalBidRemainingSEK.minus(currentAskDetails.askAmountSEK);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingSEK == 0::: " + totoalBidRemainingSEK);

              if (totoalBidRemainingSEK == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingSEK == 0Enter into totoalBidRemainingSEK == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerSEK
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
                    id: bidDetails.bidownerSEK
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingSEK == 0userAll bidDetails.askownerSEK :: ");
                console.log(" totoalBidRemainingSEK == 0Update value of Bidder and asker");
                //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(currentAskDetails.askAmountSEK));
                var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
                updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(currentAskDetails.askAmountSEK);

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

                console.log("After deduct TX Fees of SEK Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingSEK == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingSEK == 0updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);
                console.log(" totoalBidRemainingSEK == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerSEK
                  }, {
                    FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedSEKbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(userBidAmountSEK)) - parseFloat(totoalBidRemainingSEK));

                var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
                updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);
                updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(totoalBidRemainingSEK);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalBidRemainingBTC);
                console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
                //var SEKAmountSucess = (parseFloat(userBidAmountSEK) - parseFloat(totoalBidRemainingSEK));
                // var SEKAmountSucess = new BigNumber(userBidAmountSEK);
                // SEKAmountSucess = SEKAmountSucess.minus(totoalBidRemainingSEK);
                //
                //
                // //var txFeesBidderSEK = (parseFloat(SEKAmountSucess) * parseFloat(txFeeWithdrawSuccessSEK));
                // var txFeesBidderSEK = new BigNumber(SEKAmountSucess);
                // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
                // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
                // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
                // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
                //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
                updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);



                console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 updatedFreezedSEKbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerSEK
                  }, {
                    SEKbalance: updatedSEKbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 BidSEK.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskSEK.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskSEK.update({
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
                sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 AskSEK.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidSEK.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidSEK.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 enter into else of totoalBidRemainingSEK == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0totoalBidRemainingSEK == 0 start User.findOne currentAskDetails.bidownerSEK " + currentAskDetails.bidownerSEK);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerSEK
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(currentAskDetails.askAmountSEK));

                var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
                updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(currentAskDetails.askAmountSEK);

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
                console.log("After deduct TX Fees of SEK Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 updatedFreezedSEKbalanceAsker:: " + updatedFreezedSEKbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerSEK
                  }, {
                    FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskSEK.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskSEK.update({
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
                sails.sockets.blast(constants.SEK_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountSEK = (parseFloat(currentAskDetails.askAmountSEK) - parseFloat(totoalBidRemainingSEK));

              var updatedAskAmountSEK = new BigNumber(currentAskDetails.askAmountSEK);
              updatedAskAmountSEK = updatedAskAmountSEK.minus(totoalBidRemainingSEK);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskSEK.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountSEK: updatedAskAmountSEK,
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
              sails.sockets.blast(constants.SEK_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(totoalBidRemainingSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(totoalBidRemainingSEK);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
              console.log("Total Ask RemainSEK updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of SEK Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedSEKbalanceAsker:: " + updatedFreezedSEKbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
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
                  id: bidDetails.bidownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerSEK");
              //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(userBidAmountSEK));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountSEK " + userBidAmountSEK);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.SEKbalance " + userAllDetailsInDBBidder.SEKbalance);

              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var txFeesBidderSEK = (parseFloat(updatedSEKbalanceBidder) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(userBidAmountSEK);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              //
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderSEK = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedSEKbalanceBidder ::: " + updatedSEKbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidSEK.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidSEK.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidSEK.update({
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
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
  removeBidSEKMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdSEK;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidSEK.findOne({
      bidownerSEK: bidownerId,
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
            BidSEK.update({
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskSEKMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdSEK;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskSEK.findOne({
      askownerSEK: askownerId,
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
        var userSEKBalanceInDb = parseFloat(user.SEKbalance);
        var askAmountOfSEKInAskTableDB = parseFloat(askDetails.askAmountSEK);
        var userFreezedSEKbalanceInDB = parseFloat(user.FreezedSEKbalance);
        console.log("userSEKBalanceInDb :" + userSEKBalanceInDb);
        console.log("askAmountOfSEKInAskTableDB :" + askAmountOfSEKInAskTableDB);
        console.log("userFreezedSEKbalanceInDB :" + userFreezedSEKbalanceInDB);
        var updateFreezedSEKBalance = (parseFloat(userFreezedSEKbalanceInDB) - parseFloat(askAmountOfSEKInAskTableDB));
        var updateUserSEKBalance = (parseFloat(userSEKBalanceInDb) + parseFloat(askAmountOfSEKInAskTableDB));
        User.update({
            id: askownerId
          }, {
            SEKbalance: parseFloat(updateUserSEKBalance),
            FreezedSEKbalance: parseFloat(updateFreezedSEKBalance)
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
            AskSEK.update({
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
              sails.sockets.blast(constants.SEK_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidSEK: function(req, res) {
    console.log("Enter into ask api getAllBidSEK :: ");
    BidSEK.find({
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
            BidSEK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountSEK')
              .exec(function(err, bidAmountSEKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountSEKSum",
                    statusCode: 401
                  });
                }
                BidSEK.find({
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
                        "message": "Error to sum Of bidAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsSEK: allAskDetailsToExecute,
                      bidAmountSEKSum: bidAmountSEKSum[0].bidAmountSEK,
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
  getAllAskSEK: function(req, res) {
    console.log("Enter into ask api getAllAskSEK :: ");
    AskSEK.find({
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
            AskSEK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountSEK')
              .exec(function(err, askAmountSEKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountSEKSum",
                    statusCode: 401
                  });
                }
                AskSEK.find({
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
                        "message": "Error to sum Of askAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksSEK: allAskDetailsToExecute,
                      askAmountSEKSum: askAmountSEKSum[0].askAmountSEK,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskSEK Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsSEKSuccess: function(req, res) {
    console.log("Enter into ask api getBidsSEKSuccess :: ");
    BidSEK.find({
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
            BidSEK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountSEK')
              .exec(function(err, bidAmountSEKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountSEKSum",
                    statusCode: 401
                  });
                }
                BidSEK.find({
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
                        "message": "Error to sum Of bidAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsSEK: allAskDetailsToExecute,
                      bidAmountSEKSum: bidAmountSEKSum[0].bidAmountSEK,
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
  getAsksSEKSuccess: function(req, res) {
    console.log("Enter into ask api getAsksSEKSuccess :: ");
    AskSEK.find({
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
            AskSEK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountSEK')
              .exec(function(err, askAmountSEKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountSEKSum",
                    statusCode: 401
                  });
                }
                AskSEK.find({
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
                        "message": "Error to sum Of askAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksSEK: allAskDetailsToExecute,
                      askAmountSEKSum: askAmountSEKSum[0].askAmountSEK,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskSEK Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};