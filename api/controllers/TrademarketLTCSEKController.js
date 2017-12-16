/**
 * TrademarketLTCSEKController
 *
 * @description :: Server-side logic for managing trademarketltcseks
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


  addAskSEKMarket: async function(req, res) {
    console.log("Enter into ask api addAskSEKMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountSEK = new BigNumber(req.body.askAmountSEK);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountSEK || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountSEK < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountSEK = parseFloat(userAskAmountSEK);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskSEK.create({
        askAmountLTC: userAskAmountLTC,
        askAmountSEK: userAskAmountSEK,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountSEK: userAskAmountSEK,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingSEK = (parseFloat(totoalAskRemainingSEK) - parseFloat(currentBidDetails.bidAmountSEK));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingSEK = totoalAskRemainingSEK.minus(currentBidDetails.bidAmountSEK);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingSEK :: " + totoalAskRemainingSEK);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


            //updatedSEKbalanceBidder =  parseFloat(updatedSEKbalanceBidder);

            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedSEKbalanceAsker = parseFloat(totoalAskRemainingSEK);
            //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);

            //updatedFreezedSEKbalanceAsker =  parseFloat(updatedFreezedSEKbalanceAsker);
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
            console.log("After deduct TX Fees of SEK Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedSEKbalance: updatedFreezedSEKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed SEKBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedSEKbalanceBidder:: " + updatedSEKbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerSEK");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(totoalAskRemainingSEK));
            //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
            console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
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
            console.log("After deduct TX Fees of SEK Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedSEKbalance: updatedFreezedSEKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskSEK.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingSEK = totoalAskRemainingSEK - allBidsFromdb[i].bidAmountSEK;
          if (totoalAskRemainingSEK >= currentBidDetails.bidAmountSEK) {
            //totoalAskRemainingSEK = (parseFloat(totoalAskRemainingSEK) - parseFloat(currentBidDetails.bidAmountSEK));
            totoalAskRemainingSEK = totoalAskRemainingSEK.minus(currentBidDetails.bidAmountSEK);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of SEK Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerSEK
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  SEKbalance: updatedSEKbalanceBidder
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
              //var updatedFreezedSEKbalanceAsker = parseFloat(totoalAskRemainingSEK);
              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(totoalAskRemainingSEK));
              //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
              console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
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

              console.log("After deduct TX Fees of SEK Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerSEK
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedSEKbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerSEK
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountSEK = (parseFloat(currentBidDetails.bidAmountSEK) - parseFloat(totoalAskRemainingSEK));
            var updatedBidAmountSEK = new BigNumber(currentBidDetails.bidAmountSEK);
            updatedBidAmountSEK = updatedBidAmountSEK.minus(totoalAskRemainingSEK);

            try {
              var updatedaskDetails = await BidSEK.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedSEKbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerSEK");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of SEK Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountSEK = new BigNumber(req.body.bidAmountSEK);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountSEK = parseFloat(userBidAmountSEK);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountSEK || !userBidAmountLTC ||
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
      var bidDetails = await BidSEK.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountSEK: userBidAmountSEK,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountSEK: userBidAmountSEK,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskSEK.find({
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
        var totoalBidRemainingSEK = new BigNumber(userBidAmountSEK);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of SEK
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountSEK;
        }
        if (total_ask <= totoalBidRemainingSEK) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingSEK :: " + totoalBidRemainingSEK);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingSEK = totoalBidRemainingSEK - allAsksFromdb[i].bidAmountSEK;
            //totoalBidRemainingSEK = (parseFloat(totoalBidRemainingSEK) - parseFloat(currentAskDetails.askAmountSEK));
            totoalBidRemainingSEK = totoalBidRemainingSEK.minus(currentAskDetails.askAmountSEK);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of SEK Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedSEKbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and SEK  give to bidder
              //var updatedSEKbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.SEKbalance) + parseFloat(totoalBidRemainingSEK)) - parseFloat(totoalBidRemainingLTC);
              //var updatedSEKbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.SEKbalance) + parseFloat(userBidAmountSEK)) - parseFloat(totoalBidRemainingSEK));
              var updatedSEKbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(totoalBidRemainingSEK);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainSEK updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingSEK == 0updatedSEKbalanceBidder ::: " + updatedSEKbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingSEK asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of SEK Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerSEK");
              //var updatedSEKbalanceBidder = ((parseFloat(userAllDetailsInDBBid.SEKbalance) + parseFloat(userBidAmountSEK)) - parseFloat(totoalBidRemainingSEK));
              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBid.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(totoalBidRemainingSEK);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainSEK updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedSEKbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountSEK totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidSEK.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingSEK = totoalBidRemainingSEK - allAsksFromdb[i].bidAmountSEK;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingSEK = totoalBidRemainingSEK.minus(currentAskDetails.askAmountSEK);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of SEK Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingSEK == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingSEK == 0updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);
                console.log(" totoalBidRemainingSEK == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerSEK
                  }, {
                    FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalBidRemainingLTC);
                console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
                //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
                updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);



                console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 updatedFreezedSEKbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerSEK
                  }, {
                    SEKbalance: updatedSEKbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of SEK Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 updatedFreezedSEKbalanceAsker:: " + updatedFreezedSEKbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerSEK
                  }, {
                    FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountSEK = (parseFloat(currentAskDetails.askAmountSEK) - parseFloat(totoalBidRemainingSEK));

              var updatedAskAmountSEK = new BigNumber(currentAskDetails.askAmountSEK);
              updatedAskAmountSEK = updatedAskAmountSEK.minus(totoalBidRemainingSEK);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskSEK.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
              console.log("Total Ask RemainSEK updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of SEK Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedSEKbalanceAsker:: " + updatedFreezedSEKbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerSEK");
              //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(userBidAmountSEK));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountSEK " + userBidAmountSEK);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.SEKbalance " + userAllDetailsInDBBidder.SEKbalance);

              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var txFeesBidderSEK = (parseFloat(updatedSEKbalanceBidder) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(userBidAmountSEK);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              //
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);

              var txFeesBidderSEK = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedSEKbalanceBidder ::: " + updatedSEKbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidSEK.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
            BidSEK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsSEK: allAskDetailsToExecute,
                      bidAmountSEKSum: bidAmountSEKSum[0].bidAmountSEK,
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
  getAllAskSEK: function(req, res) {
    console.log("Enter into ask api getAllAskSEK :: ");
    AskSEK.find({
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
            AskSEK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksSEK: allAskDetailsToExecute,
                      askAmountSEKSum: askAmountSEKSum[0].askAmountSEK,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
            BidSEK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsSEK: allAskDetailsToExecute,
                      bidAmountSEKSum: bidAmountSEKSum[0].bidAmountSEK,
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
  getAsksSEKSuccess: function(req, res) {
    console.log("Enter into ask api getAsksSEKSuccess :: ");
    AskSEK.find({
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
            AskSEK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksSEK: allAskDetailsToExecute,
                      askAmountSEKSum: askAmountSEKSum[0].askAmountSEK,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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