/**
 * TrademarketLTCNZDController
 *
 * @description :: Server-side logic for managing trademarketltcnzds
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


  addAskINRMarket: async function(req, res) {
    console.log("Enter into ask api addAskINRMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountINR = new BigNumber(req.body.askAmountINR);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountINR || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountINR < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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
    var userINRBalanceInDb = new BigNumber(userAsker.INRbalance);
    var userFreezedINRBalanceInDb = new BigNumber(userAsker.FreezedINRbalance);

    userINRBalanceInDb = parseFloat(userINRBalanceInDb);
    userFreezedINRBalanceInDb = parseFloat(userFreezedINRBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountINR.greaterThanOrEqualTo(userINRBalanceInDb)) {
      return res.json({
        "message": "You have insufficient INR Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountINR :: " + userAskAmountINR);
    console.log("userINRBalanceInDb :: " + userINRBalanceInDb);
    // if (userAskAmountINR >= userINRBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient INR Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountINR = parseFloat(userAskAmountINR);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskINR.create({
        askAmountLTC: userAskAmountLTC,
        askAmountINR: userAskAmountINR,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountINR: userAskAmountINR,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        askownerINR: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.INR_ASK_ADDED, askDetails);
    // var updateUserINRBalance = (parseFloat(userINRBalanceInDb) - parseFloat(userAskAmountINR));
    // var updateFreezedINRBalance = (parseFloat(userFreezedINRBalanceInDb) + parseFloat(userAskAmountINR));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userINRBalanceInDb = new BigNumber(userINRBalanceInDb);
    var updateUserINRBalance = userINRBalanceInDb.minus(userAskAmountINR);
    updateUserINRBalance = parseFloat(updateUserINRBalance);
    userFreezedINRBalanceInDb = new BigNumber(userFreezedINRBalanceInDb);
    var updateFreezedINRBalance = userFreezedINRBalanceInDb.plus(userAskAmountINR);
    updateFreezedINRBalance = parseFloat(updateFreezedINRBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedINRbalance: updateFreezedINRBalance,
        INRbalance: updateUserINRBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidINR.find({
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
        message: 'Failed to find INR bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingINR = new BigNumber(userAskAmountINR);
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
      //this loop for sum of all Bids amount of INR
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountINR;
      }
      if (total_bid <= totoalAskRemainingINR) {
        console.log("Inside of total_bid <= totoalAskRemainingINR");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingINR");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingINR :: " + totoalAskRemainingINR);
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingINR = (parseFloat(totoalAskRemainingINR) - parseFloat(currentBidDetails.bidAmountINR));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingINR = totoalAskRemainingINR.minus(currentBidDetails.bidAmountINR);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingINR :: " + totoalAskRemainingINR);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

          if (totoalAskRemainingINR == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingINR == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerINR
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerINR
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(currentBidDetails.bidAmountINR));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
            updatedINRbalanceBidder = updatedINRbalanceBidder.plus(currentBidDetails.bidAmountINR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of INR Update user " + updatedINRbalanceBidder);
            //var txFeesBidderINR = (parseFloat(currentBidDetails.bidAmountINR) * parseFloat(txFeeWithdrawSuccessINR));
            // var txFeesBidderINR = new BigNumber(currentBidDetails.bidAmountINR);
            //
            // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR)
            // console.log("txFeesBidderINR :: " + txFeesBidderINR);
            // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
            // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderINR :: " + txFeesBidderINR);
            updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);


            //updatedINRbalanceBidder =  parseFloat(updatedINRbalanceBidder);

            console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedINRbalanceBidder " + updatedINRbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerINR
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                INRbalance: updatedINRbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and INR balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedINRbalanceAsker = parseFloat(totoalAskRemainingINR);
            //var updatedFreezedINRbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(userAskAmountINR)) + parseFloat(totoalAskRemainingINR));
            var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(userAskAmountINR);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.plus(totoalAskRemainingINR);

            //updatedFreezedINRbalanceAsker =  parseFloat(updatedFreezedINRbalanceAsker);
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
            console.log("After deduct TX Fees of INR Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerINR
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedINRbalance: updatedFreezedINRbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed INRBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidINR:: ");
            try {
              var bidDestroy = await BidINR.update({
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
            sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskINR.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskINR.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskINR',
                statusCode: 401
              });
            }
            //emitting event of destruction of INR_ask
            sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingINR == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerINR " + currentBidDetails.bidownerINR);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerINR
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(currentBidDetails.bidAmountINR));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
            updatedINRbalanceBidder = updatedINRbalanceBidder.plus(currentBidDetails.bidAmountINR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of INR 089089Update user " + updatedINRbalanceBidder);
            // var txFeesBidderINR = (parseFloat(currentBidDetails.bidAmountINR) * parseFloat(txFeeWithdrawSuccessINR));
            // var txFeesBidderINR = new BigNumber(currentBidDetails.bidAmountINR);
            // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
            // console.log("txFeesBidderINR :: " + txFeesBidderINR);
            // // updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
            // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderINR :: " + txFeesBidderINR);
            updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);


            console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedINRbalanceBidder:: " + updatedINRbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedINRbalanceBidder " + updatedINRbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerINR
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                INRbalance: updatedINRbalanceBidder
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
              var desctroyCurrentBid = await BidINR.update({
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
            sails.sockets.blast(constants.INR_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerINR
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerINR");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(totoalAskRemainingINR));
            //var updatedFreezedINRbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(userAskAmountINR)) + parseFloat(totoalAskRemainingINR));
            var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(userAskAmountINR);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.plus(totoalAskRemainingINR);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainINR totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainINR userAllDetailsInDBAsker.FreezedINRbalance " + userAllDetailsInDBAsker.FreezedINRbalance);
            console.log("Total Ask RemainINR updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
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
            console.log("After deduct TX Fees of INR Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedINRbalanceAsker ::: " + updatedFreezedINRbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerINR
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedINRbalance: updatedFreezedINRbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountINR totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskINR.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
                askAmountINR: parseFloat(totoalAskRemainingINR),
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
            sails.sockets.blast(constants.INR_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingINR :: " + totoalAskRemainingINR);
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingINR = totoalAskRemainingINR - allBidsFromdb[i].bidAmountINR;
          if (totoalAskRemainingINR >= currentBidDetails.bidAmountINR) {
            //totoalAskRemainingINR = (parseFloat(totoalAskRemainingINR) - parseFloat(currentBidDetails.bidAmountINR));
            totoalAskRemainingINR = totoalAskRemainingINR.minus(currentBidDetails.bidAmountINR);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
            console.log("start from here totoalAskRemainingINR == 0::: " + totoalAskRemainingINR);

            if (totoalAskRemainingINR == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingINR == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerINR
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
                  id: askDetails.askownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerINR :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
              //var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(currentBidDetails.bidAmountINR));
              var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(currentBidDetails.bidAmountINR);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 INR Update user " + updatedINRbalanceBidder);
              //var txFeesBidderINR = (parseFloat(currentBidDetails.bidAmountINR) * parseFloat(txFeeWithdrawSuccessINR));

              // var txFeesBidderINR = new BigNumber(currentBidDetails.bidAmountINR);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);
              // console.log("After deduct TX Fees of INR Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingINR " + totoalAskRemainingINR);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerINR
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  INRbalance: updatedINRbalanceBidder
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
              //var updatedFreezedINRbalanceAsker = parseFloat(totoalAskRemainingINR);
              //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(totoalAskRemainingINR));
              //var updatedFreezedINRbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(userAskAmountINR)) + parseFloat(totoalAskRemainingINR));
              var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(userAskAmountINR);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.plus(totoalAskRemainingINR);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainINR totoalAskRemainingINR " + totoalAskRemainingINR);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainINR userAllDetailsInDBAsker.FreezedINRbalance " + userAllDetailsInDBAsker.FreezedINRbalance);
              console.log("Total Ask RemainINR updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
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

              console.log("After deduct TX Fees of INR Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedINRbalanceAsker ::: " + updatedFreezedINRbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingINR " + totoalAskRemainingINR);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerINR
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
                  FreezedINRbalance: updatedFreezedINRbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidINR.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidINR.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidINR.update({
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskINR.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskINR.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskINR.update({
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
              sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingINR == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerINR " + currentBidDetails.bidownerINR);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerINR
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

              //var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(currentBidDetails.bidAmountINR));
              var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(currentBidDetails.bidAmountINR);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of INR Update user " + updatedINRbalanceBidder);
              //var txFeesBidderINR = (parseFloat(currentBidDetails.bidAmountINR) * parseFloat(txFeeWithdrawSuccessINR));
              // var txFeesBidderINR = new BigNumber(currentBidDetails.bidAmountINR);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);
              // console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedINRbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingINR " + totoalAskRemainingINR);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerINR
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  INRbalance: updatedINRbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidINR.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidINR.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.INR_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerINR
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
            //var updatedBidAmountINR = (parseFloat(currentBidDetails.bidAmountINR) - parseFloat(totoalAskRemainingINR));
            var updatedBidAmountINR = new BigNumber(currentBidDetails.bidAmountINR);
            updatedBidAmountINR = updatedBidAmountINR.minus(totoalAskRemainingINR);

            try {
              var updatedaskDetails = await BidINR.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
                bidAmountINR: updatedBidAmountINR,
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
            sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerINR
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


            //var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.INRbalance) + parseFloat(totoalAskRemainingINR));

            var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.INRbalance);
            updatedINRbalanceBidder = updatedINRbalanceBidder.plus(totoalAskRemainingINR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of INR Update user " + updatedINRbalanceBidder);
            //var INRAmountSucess = parseFloat(totoalAskRemainingINR);
            //var INRAmountSucess = new BigNumber(totoalAskRemainingINR);
            //var txFeesBidderINR = (parseFloat(INRAmountSucess) * parseFloat(txFeeWithdrawSuccessINR));
            //var txFeesBidderINR = (parseFloat(totoalAskRemainingINR) * parseFloat(txFeeWithdrawSuccessINR));



            // var txFeesBidderINR = new BigNumber(totoalAskRemainingINR);
            // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
            //
            // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
            // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

            //Need to change here ...111...............askDetails
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

            console.log("txFeesBidderINR :: " + txFeesBidderINR);
            console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedINRbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedINRbalanceBidder " + updatedINRbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerINR
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                INRbalance: updatedINRbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerINR");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(userAskAmountINR));
            var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(userAskAmountINR);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of INR Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedINRbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerINR
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedINRbalance: updatedFreezedINRbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskINR.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskINR.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskINR.update({
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
            //emitting event for INR_ask destruction
            sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
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
  addBidINRMarket: async function(req, res) {
    console.log("Enter into ask api addBidINRMarket :: " + JSON.stringify(req.body));
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountINR = new BigNumber(req.body.bidAmountINR);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountINR = parseFloat(userBidAmountINR);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountINR || !userBidAmountLTC ||
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
      var bidDetails = await BidINR.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountINR: userBidAmountINR,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountINR: userBidAmountINR,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        bidownerINR: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.INR_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskINR.find({
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
        var totoalBidRemainingINR = new BigNumber(userBidAmountINR);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of INR
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountINR;
        }
        if (total_ask <= totoalBidRemainingINR) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingINR :: " + totoalBidRemainingINR);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingINR = totoalBidRemainingINR - allAsksFromdb[i].bidAmountINR;
            //totoalBidRemainingINR = (parseFloat(totoalBidRemainingINR) - parseFloat(currentAskDetails.askAmountINR));
            totoalBidRemainingINR = totoalBidRemainingINR.minus(currentAskDetails.askAmountINR);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
            console.log("start from here totoalBidRemainingINR == 0::: " + totoalBidRemainingINR);
            if (totoalBidRemainingINR == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingINR == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerINR totoalBidRemainingINR == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(currentAskDetails.askAmountINR));
              var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(currentAskDetails.askAmountINR);
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
              console.log("After deduct TX Fees of INR Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedINRbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerINR
                }, {
                  FreezedINRbalance: updatedFreezedINRbalanceAsker,
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
                  id: bidDetails.bidownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedLTCbalance of bidder deduct and INR  give to bidder
              //var updatedINRbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.INRbalance) + parseFloat(totoalBidRemainingINR)) - parseFloat(totoalBidRemainingLTC);
              //var updatedINRbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.INRbalance) + parseFloat(userBidAmountINR)) - parseFloat(totoalBidRemainingINR));
              var updatedINRbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(userBidAmountINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(totoalBidRemainingINR);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainINR totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainINR BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainINR updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
              //var INRAmountSucess = (parseFloat(userBidAmountINR) - parseFloat(totoalBidRemainingINR));
              // var INRAmountSucess = new BigNumber(userBidAmountINR);
              // INRAmountSucess = INRAmountSucess.minus(totoalBidRemainingINR);
              //
              // //var txFeesBidderINR = (parseFloat(INRAmountSucess) * parseFloat(txFeeWithdrawSuccessINR));
              // var txFeesBidderINR = new BigNumber(INRAmountSucess);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              //
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingINR == 0updatedINRbalanceBidder ::: " + updatedINRbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingINR asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerINR
                }, {
                  INRbalance: updatedINRbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingINR == 0BidINR.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidINR.destroy({
              //   id: bidDetails.bidownerINR
              // });
              try {
                var bidDestroy = await BidINR.update({
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingINR == 0AskINR.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskINR.destroy({
              //   id: currentAskDetails.askownerINR
              // });
              try {
                var askDestroy = await AskINR.update({
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
              sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0  enter into else of totoalBidRemainingINR == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0start User.findOne currentAskDetails.bidownerINR ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(currentAskDetails.askAmountINR));
              var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(currentAskDetails.askAmountINR);
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

              console.log("After deduct TX Fees of INR Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerINR
                }, {
                  FreezedINRbalance: updatedFreezedINRbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskINR.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskINR.update({
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

              sails.sockets.blast(constants.INR_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingINR == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerINR");
              //var updatedINRbalanceBidder = ((parseFloat(userAllDetailsInDBBid.INRbalance) + parseFloat(userBidAmountINR)) - parseFloat(totoalBidRemainingINR));
              var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBid.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(userBidAmountINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(totoalBidRemainingINR);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainINR totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainINR BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainINR updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
              //var INRAmountSucess = (parseFloat(userBidAmountINR) - parseFloat(totoalBidRemainingINR));
              // var INRAmountSucess = new BigNumber(userBidAmountINR);
              // INRAmountSucess = INRAmountSucess.minus(totoalBidRemainingINR);
              //
              // //var txFeesBidderINR = (parseFloat(INRAmountSucess) * parseFloat(txFeeWithdrawSuccessINR));
              // var txFeesBidderINR = new BigNumber(INRAmountSucess);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              //
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);
              // console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedINRbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerINR
                }, {
                  INRbalance: updatedINRbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountINR totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidINR.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
                  bidAmountINR: totoalBidRemainingINR,
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingINR :: " + totoalBidRemainingINR);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingINR = totoalBidRemainingINR - allAsksFromdb[i].bidAmountINR;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingINR = totoalBidRemainingINR.minus(currentAskDetails.askAmountINR);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingINR == 0::: " + totoalBidRemainingINR);

              if (totoalBidRemainingINR == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingINR == 0Enter into totoalBidRemainingINR == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerINR
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
                    id: bidDetails.bidownerINR
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingINR == 0userAll bidDetails.askownerINR :: ");
                console.log(" totoalBidRemainingINR == 0Update value of Bidder and asker");
                //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(currentAskDetails.askAmountINR));
                var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
                updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(currentAskDetails.askAmountINR);

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

                console.log("After deduct TX Fees of INR Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingINR == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingINR == 0updatedFreezedINRbalanceAsker ::: " + updatedFreezedINRbalanceAsker);
                console.log(" totoalBidRemainingINR == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingINR " + totoalBidRemainingINR);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerINR
                  }, {
                    FreezedINRbalance: updatedFreezedINRbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedINRbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(userBidAmountINR)) - parseFloat(totoalBidRemainingINR));

                var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
                updatedINRbalanceBidder = updatedINRbalanceBidder.plus(userBidAmountINR);
                updatedINRbalanceBidder = updatedINRbalanceBidder.minus(totoalBidRemainingINR);

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainINR totoalAskRemainingINR " + totoalBidRemainingLTC);
                console.log("Total Ask RemainINR BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainINR updatedFreezedINRbalanceAsker " + updatedFreezedLTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
                //var INRAmountSucess = (parseFloat(userBidAmountINR) - parseFloat(totoalBidRemainingINR));
                // var INRAmountSucess = new BigNumber(userBidAmountINR);
                // INRAmountSucess = INRAmountSucess.minus(totoalBidRemainingINR);
                //
                //
                // //var txFeesBidderINR = (parseFloat(INRAmountSucess) * parseFloat(txFeeWithdrawSuccessINR));
                // var txFeesBidderINR = new BigNumber(INRAmountSucess);
                // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
                // console.log("txFeesBidderINR :: " + txFeesBidderINR);
                // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
                // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderINR :: " + txFeesBidderINR);
                //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
                updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);



                console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingINR == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingINR == 0 updatedFreezedINRbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedINRbalanceBidder " + updatedINRbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingINR " + totoalBidRemainingINR);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerINR
                  }, {
                    INRbalance: updatedINRbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingINR == 0 BidINR.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskINR.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskINR.update({
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
                sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingINR == 0 AskINR.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidINR.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidINR.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0 enter into else of totoalBidRemainingINR == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0totoalBidRemainingINR == 0 start User.findOne currentAskDetails.bidownerINR " + currentAskDetails.bidownerINR);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerINR
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(currentAskDetails.askAmountINR));

                var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
                updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(currentAskDetails.askAmountINR);

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
                console.log("After deduct TX Fees of INR Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0 updatedFreezedINRbalanceAsker:: " + updatedFreezedINRbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingINR " + totoalBidRemainingINR);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerINR
                  }, {
                    FreezedINRbalance: updatedFreezedINRbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskINR.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskINR.update({
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
                sails.sockets.blast(constants.INR_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountINR = (parseFloat(currentAskDetails.askAmountINR) - parseFloat(totoalBidRemainingINR));

              var updatedAskAmountINR = new BigNumber(currentAskDetails.askAmountINR);
              updatedAskAmountINR = updatedAskAmountINR.minus(totoalBidRemainingINR);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskINR.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
                  askAmountINR: updatedAskAmountINR,
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
              sails.sockets.blast(constants.INR_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(totoalBidRemainingINR));
              var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(totoalBidRemainingINR);

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainINR totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainINR userAllDetailsInDBAsker.FreezedINRbalance " + userAllDetailsInDBAsker.FreezedINRbalance);
              console.log("Total Ask RemainINR updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of INR Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedINRbalanceAsker:: " + updatedFreezedINRbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerINR
                }, {
                  FreezedINRbalance: updatedFreezedINRbalanceAsker,
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
                  id: bidDetails.bidownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerINR");
              //var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(userBidAmountINR));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountINR " + userBidAmountINR);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.INRbalance " + userAllDetailsInDBBidder.INRbalance);

              var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(userBidAmountINR);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
              //var txFeesBidderINR = (parseFloat(updatedINRbalanceBidder) * parseFloat(txFeeWithdrawSuccessINR));
              // var txFeesBidderINR = new BigNumber(userBidAmountINR);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              //
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);

              var txFeesBidderINR = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedINRbalanceBidder ::: " + updatedINRbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerINR
                }, {
                  INRbalance: updatedINRbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidINR.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidINR.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidINR.update({
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
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
  removeBidINRMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdINR;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidINR.findOne({
      bidownerINR: bidownerId,
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
            BidINR.update({
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskINRMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdINR;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskINR.findOne({
      askownerINR: askownerId,
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
        var userINRBalanceInDb = parseFloat(user.INRbalance);
        var askAmountOfINRInAskTableDB = parseFloat(askDetails.askAmountINR);
        var userFreezedINRbalanceInDB = parseFloat(user.FreezedINRbalance);
        console.log("userINRBalanceInDb :" + userINRBalanceInDb);
        console.log("askAmountOfINRInAskTableDB :" + askAmountOfINRInAskTableDB);
        console.log("userFreezedINRbalanceInDB :" + userFreezedINRbalanceInDB);
        var updateFreezedINRBalance = (parseFloat(userFreezedINRbalanceInDB) - parseFloat(askAmountOfINRInAskTableDB));
        var updateUserINRBalance = (parseFloat(userINRBalanceInDb) + parseFloat(askAmountOfINRInAskTableDB));
        User.update({
            id: askownerId
          }, {
            INRbalance: parseFloat(updateUserINRBalance),
            FreezedINRbalance: parseFloat(updateFreezedINRBalance)
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
            AskINR.update({
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
              sails.sockets.blast(constants.INR_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidINR: function(req, res) {
    console.log("Enter into ask api getAllBidINR :: ");
    BidINR.find({
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
            BidINR.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountINR')
              .exec(function(err, bidAmountINRSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountINRSum",
                    statusCode: 401
                  });
                }
                BidINR.find({
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
                        "message": "Error to sum Of bidAmountINRSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsINR: allAskDetailsToExecute,
                      bidAmountINRSum: bidAmountINRSum[0].bidAmountINR,
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
  getAllAskINR: function(req, res) {
    console.log("Enter into ask api getAllAskINR :: ");
    AskINR.find({
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
            AskINR.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountINR')
              .exec(function(err, askAmountINRSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountINRSum",
                    statusCode: 401
                  });
                }
                AskINR.find({
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
                        "message": "Error to sum Of askAmountINRSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksINR: allAskDetailsToExecute,
                      askAmountINRSum: askAmountINRSum[0].askAmountINR,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskINR Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsINRSuccess: function(req, res) {
    console.log("Enter into ask api getBidsINRSuccess :: ");
    BidINR.find({
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
            BidINR.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountINR')
              .exec(function(err, bidAmountINRSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountINRSum",
                    statusCode: 401
                  });
                }
                BidINR.find({
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
                        "message": "Error to sum Of bidAmountINRSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsINR: allAskDetailsToExecute,
                      bidAmountINRSum: bidAmountINRSum[0].bidAmountINR,
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
  getAsksINRSuccess: function(req, res) {
    console.log("Enter into ask api getAsksINRSuccess :: ");
    AskINR.find({
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
            AskINR.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountINR')
              .exec(function(err, askAmountINRSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountINRSum",
                    statusCode: 401
                  });
                }
                AskINR.find({
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
                        "message": "Error to sum Of askAmountINRSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksINR: allAskDetailsToExecute,
                      askAmountINRSum: askAmountINRSum[0].askAmountINR,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskINR Found!!",
              statusCode: 401
            });
          }
        }
      });
  },


};