/**
 * TrademarketLTCCZKController
 *CZK
 * @description :: Server-side logic for managing trademarketltcczks
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

  addAskCZKMarket: async function(req, res) {
    console.log("Enter into ask api addAskCZKMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountCZK = new BigNumber(req.body.askAmountCZK);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountCZK || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountCZK < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountCZK = parseFloat(userAskAmountCZK);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskCZK.create({
        askAmountLTC: userAskAmountLTC,
        askAmountCZK: userAskAmountCZK,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountCZK: userAskAmountCZK,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingCZK = (parseFloat(totoalAskRemainingCZK) - parseFloat(currentBidDetails.bidAmountCZK));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingCZK = totoalAskRemainingCZK.minus(currentBidDetails.bidAmountCZK);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingCZK :: " + totoalAskRemainingCZK);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


            //updatedCZKbalanceBidder =  parseFloat(updatedCZKbalanceBidder);

            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedCZKbalanceAsker = parseFloat(totoalAskRemainingCZK);
            //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);

            //updatedFreezedCZKbalanceAsker =  parseFloat(updatedFreezedCZKbalanceAsker);
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
            console.log("After deduct TX Fees of CZK Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedCZKbalance: updatedFreezedCZKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed CZKBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCZKbalanceBidder:: " + updatedCZKbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerCZK");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(totoalAskRemainingCZK));
            //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
            console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
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
            console.log("After deduct TX Fees of CZK Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedCZKbalance: updatedFreezedCZKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskCZK.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingCZK = totoalAskRemainingCZK - allBidsFromdb[i].bidAmountCZK;
          if (totoalAskRemainingCZK >= currentBidDetails.bidAmountCZK) {
            //totoalAskRemainingCZK = (parseFloat(totoalAskRemainingCZK) - parseFloat(currentBidDetails.bidAmountCZK));
            totoalAskRemainingCZK = totoalAskRemainingCZK.minus(currentBidDetails.bidAmountCZK);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of CZK Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerCZK
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  CZKbalance: updatedCZKbalanceBidder
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
              //var updatedFreezedCZKbalanceAsker = parseFloat(totoalAskRemainingCZK);
              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(totoalAskRemainingCZK));
              //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
              console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
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

              console.log("After deduct TX Fees of CZK Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerCZK
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedCZKbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerCZK
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountCZK = (parseFloat(currentBidDetails.bidAmountCZK) - parseFloat(totoalAskRemainingCZK));
            var updatedBidAmountCZK = new BigNumber(currentBidDetails.bidAmountCZK);
            updatedBidAmountCZK = updatedBidAmountCZK.minus(totoalAskRemainingCZK);

            try {
              var updatedaskDetails = await BidCZK.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCZKbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerCZK");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of CZK Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountCZK = new BigNumber(req.body.bidAmountCZK);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountCZK = parseFloat(userBidAmountCZK);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountCZK || !userBidAmountLTC ||
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
      var bidDetails = await BidCZK.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountCZK: userBidAmountCZK,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountCZK: userBidAmountCZK,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskCZK.find({
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
        var totoalBidRemainingCZK = new BigNumber(userBidAmountCZK);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of CZK
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountCZK;
        }
        if (total_ask <= totoalBidRemainingCZK) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingCZK :: " + totoalBidRemainingCZK);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingCZK = totoalBidRemainingCZK - allAsksFromdb[i].bidAmountCZK;
            //totoalBidRemainingCZK = (parseFloat(totoalBidRemainingCZK) - parseFloat(currentAskDetails.askAmountCZK));
            totoalBidRemainingCZK = totoalBidRemainingCZK.minus(currentAskDetails.askAmountCZK);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of CZK Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedCZKbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and CZK  give to bidder
              //var updatedCZKbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.CZKbalance) + parseFloat(totoalBidRemainingCZK)) - parseFloat(totoalBidRemainingLTC);
              //var updatedCZKbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.CZKbalance) + parseFloat(userBidAmountCZK)) - parseFloat(totoalBidRemainingCZK));
              var updatedCZKbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(totoalBidRemainingCZK);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainCZK updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingCZK == 0updatedCZKbalanceBidder ::: " + updatedCZKbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingCZK asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of CZK Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerCZK");
              //var updatedCZKbalanceBidder = ((parseFloat(userAllDetailsInDBBid.CZKbalance) + parseFloat(userBidAmountCZK)) - parseFloat(totoalBidRemainingCZK));
              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBid.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(totoalBidRemainingCZK);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainCZK updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedCZKbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountCZK totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidCZK.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingCZK = totoalBidRemainingCZK - allAsksFromdb[i].bidAmountCZK;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingCZK = totoalBidRemainingCZK.minus(currentAskDetails.askAmountCZK);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of CZK Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingCZK == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingCZK == 0updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);
                console.log(" totoalBidRemainingCZK == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerCZK
                  }, {
                    FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalBidRemainingLTC);
                console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
                //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
                updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);



                console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 updatedFreezedCZKbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerCZK
                  }, {
                    CZKbalance: updatedCZKbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of CZK Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 updatedFreezedCZKbalanceAsker:: " + updatedFreezedCZKbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerCZK
                  }, {
                    FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountCZK = (parseFloat(currentAskDetails.askAmountCZK) - parseFloat(totoalBidRemainingCZK));

              var updatedAskAmountCZK = new BigNumber(currentAskDetails.askAmountCZK);
              updatedAskAmountCZK = updatedAskAmountCZK.minus(totoalBidRemainingCZK);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskCZK.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
              console.log("Total Ask RemainCZK updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of CZK Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedCZKbalanceAsker:: " + updatedFreezedCZKbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerCZK");
              //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(userBidAmountCZK));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountCZK " + userBidAmountCZK);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.CZKbalance " + userAllDetailsInDBBidder.CZKbalance);

              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var txFeesBidderCZK = (parseFloat(updatedCZKbalanceBidder) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(userBidAmountCZK);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              //
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderCZK = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedCZKbalanceBidder ::: " + updatedCZKbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidCZK.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
            BidCZK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCZK: allAskDetailsToExecute,
                      bidAmountCZKSum: bidAmountCZKSum[0].bidAmountCZK,
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
  getAllAskCZK: function(req, res) {
    console.log("Enter into ask api getAllAskCZK :: ");
    AskCZK.find({
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
            AskCZK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCZK: allAskDetailsToExecute,
                      askAmountCZKSum: askAmountCZKSum[0].askAmountCZK,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
            BidCZK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCZK: allAskDetailsToExecute,
                      bidAmountCZKSum: bidAmountCZKSum[0].bidAmountCZK,
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
  getAsksCZKSuccess: function(req, res) {
    console.log("Enter into ask api getAsksCZKSuccess :: ");
    AskCZK.find({
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
            AskCZK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCZK: allAskDetailsToExecute,
                      askAmountCZKSum: askAmountCZKSum[0].askAmountCZK,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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