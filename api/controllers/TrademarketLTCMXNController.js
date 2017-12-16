/**
 * TrademarketLTCMXNController
 *MXN
 * @description :: Server-side logic for managing trademarketltcmxns
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

  addAskMXNMarket: async function(req, res) {
    console.log("Enter into ask api addAskMXNMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountMXN = new BigNumber(req.body.askAmountMXN);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountMXN || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountMXN < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountMXN = parseFloat(userAskAmountMXN);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskMXN.create({
        askAmountLTC: userAskAmountLTC,
        askAmountMXN: userAskAmountMXN,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountMXN: userAskAmountMXN,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingMXN = (parseFloat(totoalAskRemainingMXN) - parseFloat(currentBidDetails.bidAmountMXN));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingMXN = totoalAskRemainingMXN.minus(currentBidDetails.bidAmountMXN);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingMXN :: " + totoalAskRemainingMXN);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(currentBidDetails.bidAmountMXN));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);


            //updatedMXNbalanceBidder =  parseFloat(updatedMXNbalanceBidder);

            console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerMXN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedMXNbalanceAsker = parseFloat(totoalAskRemainingMXN);
            //var updatedFreezedMXNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(userAskAmountMXN)) + parseFloat(totoalAskRemainingMXN));
            var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(userAskAmountMXN);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.plus(totoalAskRemainingMXN);

            //updatedFreezedMXNbalanceAsker =  parseFloat(updatedFreezedMXNbalanceAsker);
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
            console.log("After deduct TX Fees of MXN Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerMXN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedMXNbalance: updatedFreezedMXNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed MXNBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(currentBidDetails.bidAmountMXN));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);


            console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedMXNbalanceBidder:: " + updatedMXNbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerMXN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerMXN");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(totoalAskRemainingMXN));
            //var updatedFreezedMXNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(userAskAmountMXN)) + parseFloat(totoalAskRemainingMXN));
            var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(userAskAmountMXN);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.plus(totoalAskRemainingMXN);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainMXN totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainMXN userAllDetailsInDBAsker.FreezedMXNbalance " + userAllDetailsInDBAsker.FreezedMXNbalance);
            console.log("Total Ask RemainMXN updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
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
            console.log("After deduct TX Fees of MXN Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedMXNbalanceAsker ::: " + updatedFreezedMXNbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerMXN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedMXNbalance: updatedFreezedMXNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountMXN totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskMXN.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingMXN = totoalAskRemainingMXN - allBidsFromdb[i].bidAmountMXN;
          if (totoalAskRemainingMXN >= currentBidDetails.bidAmountMXN) {
            //totoalAskRemainingMXN = (parseFloat(totoalAskRemainingMXN) - parseFloat(currentBidDetails.bidAmountMXN));
            totoalAskRemainingMXN = totoalAskRemainingMXN.minus(currentBidDetails.bidAmountMXN);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of MXN Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingMXN " + totoalAskRemainingMXN);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerMXN
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  MXNbalance: updatedMXNbalanceBidder
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
              //var updatedFreezedMXNbalanceAsker = parseFloat(totoalAskRemainingMXN);
              //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(totoalAskRemainingMXN));
              //var updatedFreezedMXNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(userAskAmountMXN)) + parseFloat(totoalAskRemainingMXN));
              var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
              updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(userAskAmountMXN);
              updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.plus(totoalAskRemainingMXN);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainMXN totoalAskRemainingMXN " + totoalAskRemainingMXN);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainMXN userAllDetailsInDBAsker.FreezedMXNbalance " + userAllDetailsInDBAsker.FreezedMXNbalance);
              console.log("Total Ask RemainMXN updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
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

              console.log("After deduct TX Fees of MXN Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedMXNbalanceAsker ::: " + updatedFreezedMXNbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingMXN " + totoalAskRemainingMXN);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerMXN
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedMXNbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingMXN " + totoalAskRemainingMXN);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerMXN
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountMXN = (parseFloat(currentBidDetails.bidAmountMXN) - parseFloat(totoalAskRemainingMXN));
            var updatedBidAmountMXN = new BigNumber(currentBidDetails.bidAmountMXN);
            updatedBidAmountMXN = updatedBidAmountMXN.minus(totoalAskRemainingMXN);

            try {
              var updatedaskDetails = await BidMXN.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

            console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
            console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedMXNbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerMXN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerMXN");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedMXNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedMXNbalance) - parseFloat(userAskAmountMXN));
            var updatedFreezedMXNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedMXNbalance);
            updatedFreezedMXNbalanceAsker = updatedFreezedMXNbalanceAsker.minus(userAskAmountMXN);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of MXN Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedMXNbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingMXN " + totoalAskRemainingMXN);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerMXN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountMXN = new BigNumber(req.body.bidAmountMXN);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountMXN = parseFloat(userBidAmountMXN);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountMXN || !userBidAmountLTC ||
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
      var bidDetails = await BidMXN.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountMXN: userBidAmountMXN,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountMXN: userBidAmountMXN,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskMXN.find({
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
        var totoalBidRemainingMXN = new BigNumber(userBidAmountMXN);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of MXN
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountMXN;
        }
        if (total_ask <= totoalBidRemainingMXN) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingMXN :: " + totoalBidRemainingMXN);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingMXN = totoalBidRemainingMXN - allAsksFromdb[i].bidAmountMXN;
            //totoalBidRemainingMXN = (parseFloat(totoalBidRemainingMXN) - parseFloat(currentAskDetails.askAmountMXN));
            totoalBidRemainingMXN = totoalBidRemainingMXN.minus(currentAskDetails.askAmountMXN);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of MXN Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedMXNbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerMXN
                }, {
                  FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and MXN  give to bidder
              //var updatedMXNbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.MXNbalance) + parseFloat(totoalBidRemainingMXN)) - parseFloat(totoalBidRemainingLTC);
              //var updatedMXNbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.MXNbalance) + parseFloat(userBidAmountMXN)) - parseFloat(totoalBidRemainingMXN));
              var updatedMXNbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.MXNbalance);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(userBidAmountMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(totoalBidRemainingMXN);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainMXN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainMXN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainMXN updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingMXN == 0updatedMXNbalanceBidder ::: " + updatedMXNbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingMXN asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerMXN
                }, {
                  MXNbalance: updatedMXNbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of MXN Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingMXN == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingMXN == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerMXN
                }, {
                  FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerMXN");
              //var updatedMXNbalanceBidder = ((parseFloat(userAllDetailsInDBBid.MXNbalance) + parseFloat(userBidAmountMXN)) - parseFloat(totoalBidRemainingMXN));
              var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBid.MXNbalance);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(userBidAmountMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(totoalBidRemainingMXN);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainMXN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainMXN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainMXN updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedMXNbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerMXN
                }, {
                  MXNbalance: updatedMXNbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountMXN totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidMXN.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingMXN = totoalBidRemainingMXN - allAsksFromdb[i].bidAmountMXN;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingMXN = totoalBidRemainingMXN.minus(currentAskDetails.askAmountMXN);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of MXN Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingMXN == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingMXN == 0updatedFreezedMXNbalanceAsker ::: " + updatedFreezedMXNbalanceAsker);
                console.log(" totoalBidRemainingMXN == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingMXN " + totoalBidRemainingMXN);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerMXN
                  }, {
                    FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainMXN totoalAskRemainingMXN " + totoalBidRemainingLTC);
                console.log("Total Ask RemainMXN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainMXN updatedFreezedMXNbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
                //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
                updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);



                console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingMXN == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingMXN == 0 updatedFreezedMXNbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingMXN " + totoalBidRemainingMXN);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerMXN
                  }, {
                    MXNbalance: updatedMXNbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of MXN Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0 updatedFreezedMXNbalanceAsker:: " + updatedFreezedMXNbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingMXN == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingMXN " + totoalBidRemainingMXN);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerMXN
                  }, {
                    FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountMXN = (parseFloat(currentAskDetails.askAmountMXN) - parseFloat(totoalBidRemainingMXN));

              var updatedAskAmountMXN = new BigNumber(currentAskDetails.askAmountMXN);
              updatedAskAmountMXN = updatedAskAmountMXN.minus(totoalBidRemainingMXN);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskMXN.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainMXN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainMXN userAllDetailsInDBAsker.FreezedMXNbalance " + userAllDetailsInDBAsker.FreezedMXNbalance);
              console.log("Total Ask RemainMXN updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of MXN Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedMXNbalanceAsker:: " + updatedFreezedMXNbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedMXNbalanceAsker " + updatedFreezedMXNbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerMXN
                }, {
                  FreezedMXNbalance: updatedFreezedMXNbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerMXN");
              //var updatedMXNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.MXNbalance) + parseFloat(userBidAmountMXN));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountMXN " + userBidAmountMXN);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.MXNbalance " + userAllDetailsInDBBidder.MXNbalance);

              var updatedMXNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.MXNbalance);
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.plus(userBidAmountMXN);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);
              //var txFeesBidderMXN = (parseFloat(updatedMXNbalanceBidder) * parseFloat(txFeeWithdrawSuccessMXN));
              // var txFeesBidderMXN = new BigNumber(userBidAmountMXN);
              // txFeesBidderMXN = txFeesBidderMXN.times(txFeeWithdrawSuccessMXN);
              //
              // console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              // //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              // updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderMXN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderMXN :: " + txFeesBidderMXN);
              //updatedMXNbalanceBidder = (parseFloat(updatedMXNbalanceBidder) - parseFloat(txFeesBidderMXN));
              updatedMXNbalanceBidder = updatedMXNbalanceBidder.minus(txFeesBidderMXN);

              console.log("After deduct TX Fees of MXN Update user " + updatedMXNbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedMXNbalanceBidder ::: " + updatedMXNbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedMXNbalanceBidder " + updatedMXNbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingMXN " + totoalBidRemainingMXN);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerMXN
                }, {
                  MXNbalance: updatedMXNbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidMXN.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
            BidMXN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountMXNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsMXN: allAskDetailsToExecute,
                      bidAmountMXNSum: bidAmountMXNSum[0].bidAmountMXN,
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
  getAllAskMXN: function(req, res) {
    console.log("Enter into ask api getAllAskMXN :: ");
    AskMXN.find({
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
            AskMXN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountMXNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksMXN: allAskDetailsToExecute,
                      askAmountMXNSum: askAmountMXNSum[0].askAmountMXN,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
            BidMXN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountMXNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsMXN: allAskDetailsToExecute,
                      bidAmountMXNSum: bidAmountMXNSum[0].bidAmountMXN,
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
  getAsksMXNSuccess: function(req, res) {
    console.log("Enter into ask api getAsksMXNSuccess :: ");
    AskMXN.find({
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
            AskMXN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountMXNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksMXN: allAskDetailsToExecute,
                      askAmountMXNSum: askAmountMXNSum[0].askAmountMXN,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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