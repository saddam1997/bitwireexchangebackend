/**
 * TrademarketBTCMXNController
 *
 * @description :: Server-side logic for managing trademarketbtcmxns
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

  addAskMXNMarket: async function(req, res) {
    console.log("Enter into ask api addAskMXNMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountMXN = new BigNumber(req.body.askAmountMXN);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountMXN || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountMXN < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userMXNBalanceInDb = new BigNumber(userAsker.MXNbalance);
    var userFreezedMXNBalanceInDb = new BigNumber(userAsker.FreezedMXNbalance);

    userMXNBalanceInDb = parseFloat(userMXNBalanceInDb);
    userFreezedMXNBalanceInDb = parseFloat(userFreezedMXNBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountMXN.greaterThanOrEqualTo(userMXNBalanceInDb)) {
      return res.json({
        "message": "You have insufficient MXN Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountMXN :: " + userAskAmountMXN);
    console.log("userMXNBalanceInDb :: " + userMXNBalanceInDb);
    // if (userAskAmountMXN >= userMXNBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient MXN Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountMXN = parseFloat(userAskAmountMXN);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskMXN.create({
        askAmountBTC: userAskAmountBTC,
        askAmountMXN: userAskAmountMXN,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountMXN: userAskAmountMXN,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerMXN: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.MXN_ASK_ADDED, askDetails);
    // var updateUserMXNBalance = (parseFloat(userMXNBalanceInDb) - parseFloat(userAskAmountMXN));
    // var updateFreezedMXNBalance = (parseFloat(userFreezedMXNBalanceInDb) + parseFloat(userAskAmountMXN));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userMXNBalanceInDb = new BigNumber(userMXNBalanceInDb);
    var updateUserMXNBalance = userMXNBalanceInDb.minus(userAskAmountMXN);
    updateUserMXNBalance = parseFloat(updateUserMXNBalance);
    userFreezedMXNBalanceInDb = new BigNumber(userFreezedMXNBalanceInDb);
    var updateFreezedMXNBalance = userFreezedMXNBalanceInDb.plus(userAskAmountMXN);
    updateFreezedMXNBalance = parseFloat(updateFreezedMXNBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedMXNbalance: updateFreezedMXNBalance,
        MXNbalance: updateUserMXNBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidMXN.find({
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
        message: 'Failed to find MXN bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingMXN = new BigNumber(userAskAmountMXN);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of MXN
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountMXN;
      }
      if (total_bid <= totoalAskRemainingMXN) {
        console.log("Inside of total_bid <= totoalAskRemainingMXN");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingMXN");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingMXN :: " + totoalAskRemainingMXN);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingMXN = (parseFloat(totoalAskRemainingMXN) - parseFloat(currentBidDetails.bidAmountMXN));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingMXN = totoalAskRemainingMXN.minus(currentBidDetails.bidAmountMXN);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingMXN :: " + totoalAskRemainingMXN);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingMXN == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingMXN == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerMXN
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerMXN
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(currentBidDetails.bidAmountMXN));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.MXNbalance);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(currentBidDetails.bidAmountMXN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of MXN Update user " + updatedMXNbalanceBidder);
            //var txFeesBidderMXN = (parseFloat(currentBidDetails.bidAmountMXN) * parseFloat(txFeeWithdrawSuccessMXN));
            // var txFeesBidderMXN = new BigNumber(currentBidDetails.bidAmountMXN);
            //
            // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN)
            // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
            // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
            // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);


            //updatedMXNbalanceBidder =  parseFloat(updatedMXNbalanceBidder);

            console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerMXN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                MXNbalance: updatedMXNbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and MXN balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedMXNbalanceAsker = parseFloat(totoalAskRemainingMXN);
            //var updatedFreezedMXNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(userAskAmountMXN)) + parseFloat(totoalAskRemainingMXN));
            var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(userAskAmountMXN);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.plus(totoalAskRemainingMXN);

            //updatedFreezedMXNbalanceAsker =  parseFloat(updatedFreezedMXNbalanceAsker);
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
            console.log("After deduct TX Fees of MXN Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerMXN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedMXNbalance: updatedFreezedMXNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed MXNBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidMXN:: ");
            try {
              var bidDestroy = await BidMXN.update({
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
            sails.sockets.blast(constants.MXN_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskMXN.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskMXN.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskMXN',
                statusCode: 401
              });
            }
            //emitting event of destruction of MXN_ask
            sails.sockets.blast(constants.MXN_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingMXN == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerMXN " + currentBidDetails.bidownerMXN);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerMXN
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(currentBidDetails.bidAmountMXN));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.MXNbalance);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(currentBidDetails.bidAmountMXN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of MXN 089089Update user " + updatedMXNbalanceBidder);
            // var txFeesBidderMXN = (parseFloat(currentBidDetails.bidAmountMXN) * parseFloat(txFeeWithdrawSuccessMXN));
            // var txFeesBidderMXN = new BigNumber(currentBidDetails.bidAmountMXN);
            // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
            // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
            // // updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
            // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);


            console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedMXNbalanceBidder:: " + updatedMXNbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerMXN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                MXNbalance: updatedMXNbalanceBidder
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
              var desctroyCurrentBid = await BidMXN.update({
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
            sails.sockets.blast(constants.MXN_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerMXN
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerMXN");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(totoalAskRemainingMXN));
            //var updatedFreezedMXNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(userAskAmountMXN)) + parseFloat(totoalAskRemainingMXN));
            var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(userAskAmountMXN);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.plus(totoalAskRemainingMXN);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainMXN totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainMXN userAllDetailsInDBAsker.FreezedMXNbalance " + userAllDetailsInDBAsker.FreezedMXNbalance);
            console.log("Total Ask RemainMXN updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
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
            console.log("After deduct TX Fees of MXN Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedMXNbalanceAsker ::: " + updatedFreezedMXNbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerMXN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedMXNbalance: updatedFreezedMXNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountMXN totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskMXN.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountMXN: parseFloat(totoalAskRemainingMXN),
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
            sails.sockets.blast(constants.MXN_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingMXN :: " + totoalAskRemainingMXN);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingMXN = totoalAskRemainingMXN - allBidsFromdb[i].bidAmountMXN;
          if (totoalAskRemainingMXN >= currentBidDetails.bidAmountMXN) {
            //totoalAskRemainingMXN = (parseFloat(totoalAskRemainingMXN) - parseFloat(currentBidDetails.bidAmountMXN));
            totoalAskRemainingMXN = totoalAskRemainingMXN.minus(currentBidDetails.bidAmountMXN);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingMXN == 0::: " + totoalAskRemainingMXN);

            if (totoalAskRemainingMXN == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingMXN == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerMXN
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
                  id: askDetails.askownerMXN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerMXN :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(currentBidDetails.bidAmountMXN));
              var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.MXNbalance);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(currentBidDetails.bidAmountMXN);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 MXN Update user " + updatedMXNbalanceBidder);
              //var txFeesBidderMXN = (parseFloat(currentBidDetails.bidAmountMXN) * parseFloat(txFeeWithdrawSuccessMXN));

              // var txFeesBidderMXN = new BigNumber(currentBidDetails.bidAmountMXN);
              // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
              // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);
              // console.log("After deduct TX Fees of MXN Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingMXN " + totoalAskRemainingMXN);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerMXN
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  MXNbalance: updatedMXNbalanceBidder
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
              //var updatedFreezedMXNbalanceAsker = parseFloat(totoalAskRemainingMXN);
              //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(totoalAskRemainingMXN));
              //var updatedFreezedMXNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(userAskAmountMXN)) + parseFloat(totoalAskRemainingMXN));
              var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
              updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(userAskAmountMXN);
              updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.plus(totoalAskRemainingMXN);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainMXN totoalAskRemainingMXN " + totoalAskRemainingMXN);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainMXN userAllDetailsInDBAsker.FreezedMXNbalance " + userAllDetailsInDBAsker.FreezedMXNbalance);
              console.log("Total Ask RemainMXN updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
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

              console.log("After deduct TX Fees of MXN Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedMXNbalanceAsker ::: " + updatedFreezedMXNbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingMXN " + totoalAskRemainingMXN);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerMXN
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedMXNbalance: updatedFreezedMXNbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidMXN.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidMXN.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidMXN.update({
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
              sails.sockets.blast(constants.MXN_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskMXN.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskMXN.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskMXN.update({
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
              sails.sockets.blast(constants.MXN_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingMXN == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerMXN " + currentBidDetails.bidownerMXN);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerMXN
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

              //var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(currentBidDetails.bidAmountMXN));
              var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.MXNbalance);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(currentBidDetails.bidAmountMXN);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of MXN Update user " + updatedMXNbalanceBidder);
              //var txFeesBidderMXN = (parseFloat(currentBidDetails.bidAmountMXN) * parseFloat(txFeeWithdrawSuccessMXN));
              // var txFeesBidderMXN = new BigNumber(currentBidDetails.bidAmountMXN);
              // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
              // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);
              // console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedMXNbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingMXN " + totoalAskRemainingMXN);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerMXN
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  MXNbalance: updatedMXNbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidMXN.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidMXN.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.MXN_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerMXN
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
            //var updatedBidAmountMXN = (parseFloat(currentBidDetails.bidAmountMXN) - parseFloat(totoalAskRemainingMXN));
            var updatedBidAmountMXN = new BigNumber(currentBidDetails.bidAmountMXN);
            updatedBidAmountMXN = updatedBidAmountMXN.minus(totoalAskRemainingMXN);

            try {
              var updatedaskDetails = await BidMXN.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountMXN: updatedBidAmountMXN,
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
            sails.sockets.blast(constants.MXN_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerMXN
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


            //var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.MXNbalance) + parseFloat(totoalAskRemainingMXN));

            var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.MXNbalance);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(totoalAskRemainingMXN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of MXN Update user " + updatedMXNbalanceBidder);
            //var MXNAmountSucess = parseFloat(totoalAskRemainingMXN);
            //var MXNAmountSucess = new BigNumber(totoalAskRemainingMXN);
            //var txFeesBidderMXN = (parseFloat(MXNAmountSucess) * parseFloat(txFeeWithdrawSuccessMXN));
            //var txFeesBidderMXN = (parseFloat(totoalAskRemainingMXN) * parseFloat(txFeeWithdrawSuccessMXN));



            // var txFeesBidderMXN = new BigNumber(totoalAskRemainingMXN);
            // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
            //
            // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
            // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

            console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
            console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedMXNbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerMXN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                MXNbalance: updatedMXNbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerMXN");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(userAskAmountMXN));
            var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(userAskAmountMXN);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of MXN Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedMXNbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerMXN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedMXNbalance: updatedFreezedMXNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskMXN.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskMXN.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskMXN.update({
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
            //emitting event for MXN_ask destruction
            sails.sockets.blast(constants.MXN_ASK_DESTROYED, askDestroy);
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
  addBidMXNMarket: async function(req, res) {
    console.log("Enter into ask api addBidMXNMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountMXN = new BigNumber(req.body.bidAmountMXN);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountMXN = parseFloat(userBidAmountMXN);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountMXN || !userBidAmountBTC ||
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
      var bidDetails = await BidMXN.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountMXN: userBidAmountMXN,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountMXN: userBidAmountMXN,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerMXN: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.MXN_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskMXN.find({
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
        var totoalBidRemainingMXN = new BigNumber(userBidAmountMXN);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of MXN
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountMXN;
        }
        if (total_ask <= totoalBidRemainingMXN) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingMXN :: " + totoalBidRemainingMXN);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingMXN = totoalBidRemainingMXN - allAsksFromdb[i].bidAmountMXN;
            //totoalBidRemainingMXN = (parseFloat(totoalBidRemainingMXN) - parseFloat(currentAskDetails.askAmountMXN));
            totoalBidRemainingMXN = totoalBidRemainingMXN.minus(currentAskDetails.askAmountMXN);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingMXN == 0::: " + totoalBidRemainingMXN);
            if (totoalBidRemainingMXN == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingMXN == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerMXN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerMXN totoalBidRemainingMXN == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(currentAskDetails.askAmountMXN));
              var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
              updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(currentAskDetails.askAmountMXN);
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
              console.log("After deduct TX Fees of MXN Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedMXNbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerMXN
                }, {
                  FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
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
                  id: bidDetails.bidownerMXN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and MXN  give to bidder
              //var updatedMXNbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.MXNbalance) + parseFloat(totoalBidRemainingMXN)) - parseFloat(totoalBidRemainingBTC);
              //var updatedMXNbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.MXNbalance) + parseFloat(userBidAmountMXN)) - parseFloat(totoalBidRemainingMXN));
              var updatedMXNbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.MXNbalance);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(userBidAmountMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(totoalBidRemainingMXN);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainMXN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainMXN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainMXN updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
              //var MXNAmountSucess = (parseFloat(userBidAmountMXN) - parseFloat(totoalBidRemainingMXN));
              // var MXNAmountSucess = new BigNumber(userBidAmountMXN);
              // MXNAmountSucess = MXNAmountSucess.minus(totoalBidRemainingMXN);
              //
              // //var txFeesBidderMXN = (parseFloat(MXNAmountSucess) * parseFloat(txFeeWithdrawSuccessMXN));
              // var txFeesBidderMXN = new BigNumber(MXNAmountSucess);
              // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
              //
              // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingMXN == 0updatedMXNbalanceBidder ::: " + updatedMXNbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingMXN asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerMXN
                }, {
                  MXNbalance: updatedMXNbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingMXN == 0BidMXN.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidMXN.destroy({
              //   id: bidDetails.bidownerMXN
              // });
              try {
                var bidDestroy = await BidMXN.update({
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
              sails.sockets.blast(constants.MXN_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingMXN == 0AskMXN.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskMXN.destroy({
              //   id: currentAskDetails.askownerMXN
              // });
              try {
                var askDestroy = await AskMXN.update({
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
              sails.sockets.blast(constants.MXN_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0  enter into else of totoalBidRemainingMXN == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingMXN == 0start User.findOne currentAskDetails.bidownerMXN ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerMXN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingMXN == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(currentAskDetails.askAmountMXN));
              var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
              updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(currentAskDetails.askAmountMXN);
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

              console.log("After deduct TX Fees of MXN Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingMXN == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingMXN == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerMXN
                }, {
                  FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingMXN == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskMXN.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskMXN.update({
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

              sails.sockets.blast(constants.MXN_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingMXN == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingMXN == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerMXN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerMXN");
              //var updatedMXNbalanceBidder = ((parseFloat(userAllDetailsInDBBid.MXNbalance) + parseFloat(userBidAmountMXN)) - parseFloat(totoalBidRemainingMXN));
              var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBid.MXNbalance);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(userBidAmountMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(totoalBidRemainingMXN);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainMXN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainMXN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainMXN updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
              //var MXNAmountSucess = (parseFloat(userBidAmountMXN) - parseFloat(totoalBidRemainingMXN));
              // var MXNAmountSucess = new BigNumber(userBidAmountMXN);
              // MXNAmountSucess = MXNAmountSucess.minus(totoalBidRemainingMXN);
              //
              // //var txFeesBidderMXN = (parseFloat(MXNAmountSucess) * parseFloat(txFeeWithdrawSuccessMXN));
              // var txFeesBidderMXN = new BigNumber(MXNAmountSucess);
              // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
              //
              // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);
              // console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedMXNbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerMXN
                }, {
                  MXNbalance: updatedMXNbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountMXN totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidMXN.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountMXN: totoalBidRemainingMXN,
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
              sails.sockets.blast(constants.MXN_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingMXN :: " + totoalBidRemainingMXN);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingMXN = totoalBidRemainingMXN - allAsksFromdb[i].bidAmountMXN;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingMXN = totoalBidRemainingMXN.minus(currentAskDetails.askAmountMXN);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingMXN == 0::: " + totoalBidRemainingMXN);

              if (totoalBidRemainingMXN == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingMXN == 0Enter into totoalBidRemainingMXN == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerMXN
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
                    id: bidDetails.bidownerMXN
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingMXN == 0userAll bidDetails.askownerMXN :: ");
                console.log(" totoalBidRemainingMXN == 0Update value of Bidder and asker");
                //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(currentAskDetails.askAmountMXN));
                var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
                updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(currentAskDetails.askAmountMXN);

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

                console.log("After deduct TX Fees of MXN Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingMXN == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingMXN == 0updatedFreezedMXNbalanceAsker ::: " + updatedFreezedMXNbalanceAsker);
                console.log(" totoalBidRemainingMXN == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingMXN " + totoalBidRemainingMXN);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerMXN
                  }, {
                    FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedMXNbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(userBidAmountMXN)) - parseFloat(totoalBidRemainingMXN));

                var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.MXNbalance);
                updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(userBidAmountMXN);
                updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(totoalBidRemainingMXN);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainMXN totoalAskRemainingMXN " + totoalBidRemainingBTC);
                console.log("Total Ask RemainMXN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainMXN updatedFreezedMXNbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
                //var MXNAmountSucess = (parseFloat(userBidAmountMXN) - parseFloat(totoalBidRemainingMXN));
                // var MXNAmountSucess = new BigNumber(userBidAmountMXN);
                // MXNAmountSucess = MXNAmountSucess.minus(totoalBidRemainingMXN);
                //
                //
                // //var txFeesBidderMXN = (parseFloat(MXNAmountSucess) * parseFloat(txFeeWithdrawSuccessMXN));
                // var txFeesBidderMXN = new BigNumber(MXNAmountSucess);
                // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
                // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
                // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
                // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
                //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
                updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);



                console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingMXN == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingMXN == 0 updatedFreezedMXNbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingMXN " + totoalBidRemainingMXN);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerMXN
                  }, {
                    MXNbalance: updatedMXNbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingMXN == 0 BidMXN.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskMXN.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskMXN.update({
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
                sails.sockets.blast(constants.MXN_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingMXN == 0 AskMXN.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidMXN.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidMXN.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.MXN_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0 enter into else of totoalBidRemainingMXN == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0totoalBidRemainingMXN == 0 start User.findOne currentAskDetails.bidownerMXN " + currentAskDetails.bidownerMXN);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerMXN
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(currentAskDetails.askAmountMXN));

                var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
                updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(currentAskDetails.askAmountMXN);

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
                console.log("After deduct TX Fees of MXN Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0 updatedFreezedMXNbalanceAsker:: " + updatedFreezedMXNbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingMXN " + totoalBidRemainingMXN);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerMXN
                  }, {
                    FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskMXN.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskMXN.update({
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
                sails.sockets.blast(constants.MXN_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountMXN = (parseFloat(currentAskDetails.askAmountMXN) - parseFloat(totoalBidRemainingMXN));

              var updatedAskAmountMXN = new BigNumber(currentAskDetails.askAmountMXN);
              updatedAskAmountMXN = updatedAskAmountMXN.minus(totoalBidRemainingMXN);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskMXN.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountMXN: updatedAskAmountMXN,
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
              sails.sockets.blast(constants.MXN_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerMXN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(totoalBidRemainingMXN));
              var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
              updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(totoalBidRemainingMXN);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainMXN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainMXN userAllDetailsInDBAsker.FreezedMXNbalance " + userAllDetailsInDBAsker.FreezedMXNbalance);
              console.log("Total Ask RemainMXN updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of MXN Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedMXNbalanceAsker:: " + updatedFreezedMXNbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerMXN
                }, {
                  FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
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
                  id: bidDetails.bidownerMXN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerMXN");
              //var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(userBidAmountMXN));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountMXN " + userBidAmountMXN);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.MXNbalance " + userAllDetailsInDBBidder.MXNbalance);

              var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.MXNbalance);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(userBidAmountMXN);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
              //var txFeesBidderMXN = (parseFloat(updatedMXNbalanceBidder) * parseFloat(txFeeWithdrawSuccessMXN));
              // var txFeesBidderMXN = new BigNumber(userBidAmountMXN);
              // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
              //
              // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderMXN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedMXNbalanceBidder ::: " + updatedMXNbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerMXN
                }, {
                  MXNbalance: updatedMXNbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidMXN.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidMXN.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidMXN.update({
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
              sails.sockets.blast(constants.MXN_BID_DESTROYED, bidDestroy);
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
  removeBidMXNMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdMXN;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidMXN.findOne({
      bidownerMXN: bidownerId,
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
            BidMXN.update({
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
              sails.sockets.blast(constants.MXN_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskMXNMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdMXN;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskMXN.findOne({
      askownerMXN: askownerId,
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
        var userMXNBalanceInDb = parseFloat(user.MXNbalance);
        var askAmountOfMXNInAskTableDB = parseFloat(askDetails.askAmountMXN);
        var userFreezedMXNbalanceInDB = parseFloat(user.FreezedMXNbalance);
        console.log("userMXNBalanceInDb :" + userMXNBalanceInDb);
        console.log("askAmountOfMXNInAskTableDB :" + askAmountOfMXNInAskTableDB);
        console.log("userFreezedMXNbalanceInDB :" + userFreezedMXNbalanceInDB);
        var updateFreezedMXNBalance = (parseFloat(userFreezedMXNbalanceInDB) - parseFloat(askAmountOfMXNInAskTableDB));
        var updateUserMXNBalance = (parseFloat(userMXNBalanceInDb) + parseFloat(askAmountOfMXNInAskTableDB));
        User.update({
            id: askownerId
          }, {
            MXNbalance: parseFloat(updateUserMXNBalance),
            FreezedMXNbalance: parseFloat(updateFreezedMXNBalance)
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
            AskMXN.update({
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
              sails.sockets.blast(constants.MXN_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidMXN: function(req, res) {
    console.log("Enter into ask api getAllBidMXN :: ");
    BidMXN.find({
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
            BidMXN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountMXN')
              .exec(function(err, bidAmountMXNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountMXNSum",
                    statusCode: 401
                  });
                }
                BidMXN.find({
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
                        "message": "Error to sum Of bidAmountMXNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsMXN: allAskDetailsToExecute,
                      bidAmountMXNSum: bidAmountMXNSum[0].bidAmountMXN,
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
  getAllAskMXN: function(req, res) {
    console.log("Enter into ask api getAllAskMXN :: ");
    AskMXN.find({
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
            AskMXN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountMXN')
              .exec(function(err, askAmountMXNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountMXNSum",
                    statusCode: 401
                  });
                }
                AskMXN.find({
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
                        "message": "Error to sum Of askAmountMXNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksMXN: allAskDetailsToExecute,
                      askAmountMXNSum: askAmountMXNSum[0].askAmountMXN,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskMXN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsMXNSuccess: function(req, res) {
    console.log("Enter into ask api getBidsMXNSuccess :: ");
    BidMXN.find({
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
            BidMXN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountMXN')
              .exec(function(err, bidAmountMXNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountMXNSum",
                    statusCode: 401
                  });
                }
                BidMXN.find({
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
                        "message": "Error to sum Of bidAmountMXNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsMXN: allAskDetailsToExecute,
                      bidAmountMXNSum: bidAmountMXNSum[0].bidAmountMXN,
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
  getAsksMXNSuccess: function(req, res) {
    console.log("Enter into ask api getAsksMXNSuccess :: ");
    AskMXN.find({
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
            AskMXN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountMXN')
              .exec(function(err, askAmountMXNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountMXNSum",
                    statusCode: 401
                  });
                }
                AskMXN.find({
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
                        "message": "Error to sum Of askAmountMXNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksMXN: allAskDetailsToExecute,
                      askAmountMXNSum: askAmountMXNSum[0].askAmountMXN,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskMXN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};