/**
 * TrademarketLTCPLNController
 *
 * @description :: Server-side logic for managing trademarketltcplns
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


  addAskPLNMarket: async function(req, res) {
    console.log("Enter into ask api addAskPLNMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountPLN = new BigNumber(req.body.askAmountPLN);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountPLN || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountPLN < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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
    var userPLNBalanceInDb = new BigNumber(userAsker.PLNbalance);
    var userFreezedPLNBalanceInDb = new BigNumber(userAsker.FreezedPLNbalance);

    userPLNBalanceInDb = parseFloat(userPLNBalanceInDb);
    userFreezedPLNBalanceInDb = parseFloat(userFreezedPLNBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountPLN.greaterThanOrEqualTo(userPLNBalanceInDb)) {
      return res.json({
        "message": "You have insufficient PLN Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountPLN :: " + userAskAmountPLN);
    console.log("userPLNBalanceInDb :: " + userPLNBalanceInDb);
    // if (userAskAmountPLN >= userPLNBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient PLN Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountPLN = parseFloat(userAskAmountPLN);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskPLN.create({
        askAmountLTC: userAskAmountLTC,
        askAmountPLN: userAskAmountPLN,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountPLN: userAskAmountPLN,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        askownerPLN: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.PLN_ASK_ADDED, askDetails);
    // var updateUserPLNBalance = (parseFloat(userPLNBalanceInDb) - parseFloat(userAskAmountPLN));
    // var updateFreezedPLNBalance = (parseFloat(userFreezedPLNBalanceInDb) + parseFloat(userAskAmountPLN));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userPLNBalanceInDb = new BigNumber(userPLNBalanceInDb);
    var updateUserPLNBalance = userPLNBalanceInDb.minus(userAskAmountPLN);
    updateUserPLNBalance = parseFloat(updateUserPLNBalance);
    userFreezedPLNBalanceInDb = new BigNumber(userFreezedPLNBalanceInDb);
    var updateFreezedPLNBalance = userFreezedPLNBalanceInDb.plus(userAskAmountPLN);
    updateFreezedPLNBalance = parseFloat(updateFreezedPLNBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedPLNbalance: updateFreezedPLNBalance,
        PLNbalance: updateUserPLNBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidPLN.find({
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
        message: 'Failed to find PLN bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingPLN = new BigNumber(userAskAmountPLN);
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
      //this loop for sum of all Bids amount of PLN
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountPLN;
      }
      if (total_bid <= totoalAskRemainingPLN) {
        console.log("Inside of total_bid <= totoalAskRemainingPLN");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingPLN");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingPLN :: " + totoalAskRemainingPLN);
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingPLN = (parseFloat(totoalAskRemainingPLN) - parseFloat(currentBidDetails.bidAmountPLN));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingPLN = totoalAskRemainingPLN.minus(currentBidDetails.bidAmountPLN);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingPLN :: " + totoalAskRemainingPLN);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

          if (totoalAskRemainingPLN == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingPLN == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerPLN
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPLN
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(currentBidDetails.bidAmountPLN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of PLN Update user " + updatedPLNbalanceBidder);
            //var txFeesBidderPLN = (parseFloat(currentBidDetails.bidAmountPLN) * parseFloat(txFeeWithdrawSuccessPLN));
            // var txFeesBidderPLN = new BigNumber(currentBidDetails.bidAmountPLN);
            //
            // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN)
            // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
            // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


            //updatedPLNbalanceBidder =  parseFloat(updatedPLNbalanceBidder);

            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                PLNbalance: updatedPLNbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and PLN balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedPLNbalanceAsker = parseFloat(totoalAskRemainingPLN);
            //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);

            //updatedFreezedPLNbalanceAsker =  parseFloat(updatedFreezedPLNbalanceAsker);
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
            console.log("After deduct TX Fees of PLN Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedPLNbalance: updatedFreezedPLNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed PLNBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidPLN:: ");
            try {
              var bidDestroy = await BidPLN.update({
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
            sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskPLN.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskPLN.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskPLN',
                statusCode: 401
              });
            }
            //emitting event of destruction of PLN_ask
            sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingPLN == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerPLN " + currentBidDetails.bidownerPLN);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerPLN
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(currentBidDetails.bidAmountPLN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of PLN 089089Update user " + updatedPLNbalanceBidder);
            // var txFeesBidderPLN = (parseFloat(currentBidDetails.bidAmountPLN) * parseFloat(txFeeWithdrawSuccessPLN));
            // var txFeesBidderPLN = new BigNumber(currentBidDetails.bidAmountPLN);
            // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
            // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            // // updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
            // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedPLNbalanceBidder:: " + updatedPLNbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                PLNbalance: updatedPLNbalanceBidder
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
              var desctroyCurrentBid = await BidPLN.update({
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
            sails.sockets.blast(constants.PLN_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPLN
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerPLN");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(totoalAskRemainingPLN));
            //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
            console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
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
            console.log("After deduct TX Fees of PLN Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedPLNbalance: updatedFreezedPLNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskPLN.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
                askAmountPLN: parseFloat(totoalAskRemainingPLN),
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
            sails.sockets.blast(constants.PLN_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingPLN :: " + totoalAskRemainingPLN);
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingPLN = totoalAskRemainingPLN - allBidsFromdb[i].bidAmountPLN;
          if (totoalAskRemainingPLN >= currentBidDetails.bidAmountPLN) {
            //totoalAskRemainingPLN = (parseFloat(totoalAskRemainingPLN) - parseFloat(currentBidDetails.bidAmountPLN));
            totoalAskRemainingPLN = totoalAskRemainingPLN.minus(currentBidDetails.bidAmountPLN);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
            console.log("start from here totoalAskRemainingPLN == 0::: " + totoalAskRemainingPLN);

            if (totoalAskRemainingPLN == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingPLN == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerPLN
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
                  id: askDetails.askownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerPLN :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
              //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));
              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(currentBidDetails.bidAmountPLN);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 PLN Update user " + updatedPLNbalanceBidder);
              //var txFeesBidderPLN = (parseFloat(currentBidDetails.bidAmountPLN) * parseFloat(txFeeWithdrawSuccessPLN));

              // var txFeesBidderPLN = new BigNumber(currentBidDetails.bidAmountPLN);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);
              // console.log("After deduct TX Fees of PLN Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerPLN
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  PLNbalance: updatedPLNbalanceBidder
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
              //var updatedFreezedPLNbalanceAsker = parseFloat(totoalAskRemainingPLN);
              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(totoalAskRemainingPLN));
              //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
              console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
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

              console.log("After deduct TX Fees of PLN Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerPLN
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidPLN.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidPLN.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidPLN.update({
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskPLN.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskPLN.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskPLN.update({
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
              sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingPLN == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerPLN " + currentBidDetails.bidownerPLN);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerPLN
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

              //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));
              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(currentBidDetails.bidAmountPLN);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var txFeesBidderPLN = (parseFloat(currentBidDetails.bidAmountPLN) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(currentBidDetails.bidAmountPLN);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);
              // console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedPLNbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerPLN
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  PLNbalance: updatedPLNbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidPLN.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidPLN.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.PLN_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPLN
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
            //var updatedBidAmountPLN = (parseFloat(currentBidDetails.bidAmountPLN) - parseFloat(totoalAskRemainingPLN));
            var updatedBidAmountPLN = new BigNumber(currentBidDetails.bidAmountPLN);
            updatedBidAmountPLN = updatedBidAmountPLN.minus(totoalAskRemainingPLN);

            try {
              var updatedaskDetails = await BidPLN.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
                bidAmountPLN: updatedBidAmountPLN,
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
            sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerPLN
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


            //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.PLNbalance) + parseFloat(totoalAskRemainingPLN));

            var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.PLNbalance);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(totoalAskRemainingPLN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of PLN Update user " + updatedPLNbalanceBidder);
            //var PLNAmountSucess = parseFloat(totoalAskRemainingPLN);
            //var PLNAmountSucess = new BigNumber(totoalAskRemainingPLN);
            //var txFeesBidderPLN = (parseFloat(PLNAmountSucess) * parseFloat(txFeeWithdrawSuccessPLN));
            //var txFeesBidderPLN = (parseFloat(totoalAskRemainingPLN) * parseFloat(txFeeWithdrawSuccessPLN));



            // var txFeesBidderPLN = new BigNumber(totoalAskRemainingPLN);
            // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
            //
            // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
            // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            //Need to change here ...111...............askDetails
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedPLNbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                PLNbalance: updatedPLNbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerPLN");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of PLN Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedPLNbalance: updatedFreezedPLNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskPLN.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskPLN.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskPLN.update({
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
            //emitting event for PLN_ask destruction
            sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
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
  addBidPLNMarket: async function(req, res) {
    console.log("Enter into ask api addBidPLNMarket :: " + JSON.stringify(req.body));
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountPLN = new BigNumber(req.body.bidAmountPLN);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountPLN = parseFloat(userBidAmountPLN);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountPLN || !userBidAmountLTC ||
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
      var bidDetails = await BidPLN.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountPLN: userBidAmountPLN,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountPLN: userBidAmountPLN,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
        bidownerPLN: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.PLN_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskPLN.find({
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
        var totoalBidRemainingPLN = new BigNumber(userBidAmountPLN);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of PLN
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountPLN;
        }
        if (total_ask <= totoalBidRemainingPLN) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingPLN :: " + totoalBidRemainingPLN);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingPLN = totoalBidRemainingPLN - allAsksFromdb[i].bidAmountPLN;
            //totoalBidRemainingPLN = (parseFloat(totoalBidRemainingPLN) - parseFloat(currentAskDetails.askAmountPLN));
            totoalBidRemainingPLN = totoalBidRemainingPLN.minus(currentAskDetails.askAmountPLN);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
            console.log("start from here totoalBidRemainingPLN == 0::: " + totoalBidRemainingPLN);
            if (totoalBidRemainingPLN == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingPLN == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerPLN totoalBidRemainingPLN == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(currentAskDetails.askAmountPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(currentAskDetails.askAmountPLN);
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
              console.log("After deduct TX Fees of PLN Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedPLNbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
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
                  id: bidDetails.bidownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedLTCbalance of bidder deduct and PLN  give to bidder
              //var updatedPLNbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.PLNbalance) + parseFloat(totoalBidRemainingPLN)) - parseFloat(totoalBidRemainingLTC);
              //var updatedPLNbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.PLNbalance) + parseFloat(userBidAmountPLN)) - parseFloat(totoalBidRemainingPLN));
              var updatedPLNbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(totoalBidRemainingPLN);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainPLN updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var PLNAmountSucess = (parseFloat(userBidAmountPLN) - parseFloat(totoalBidRemainingPLN));
              // var PLNAmountSucess = new BigNumber(userBidAmountPLN);
              // PLNAmountSucess = PLNAmountSucess.minus(totoalBidRemainingPLN);
              //
              // //var txFeesBidderPLN = (parseFloat(PLNAmountSucess) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(PLNAmountSucess);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              //
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingPLN == 0updatedPLNbalanceBidder ::: " + updatedPLNbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingPLN asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingPLN == 0BidPLN.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidPLN.destroy({
              //   id: bidDetails.bidownerPLN
              // });
              try {
                var bidDestroy = await BidPLN.update({
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0AskPLN.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskPLN.destroy({
              //   id: currentAskDetails.askownerPLN
              // });
              try {
                var askDestroy = await AskPLN.update({
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
              sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0  enter into else of totoalBidRemainingPLN == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0start User.findOne currentAskDetails.bidownerPLN ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(currentAskDetails.askAmountPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(currentAskDetails.askAmountPLN);
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

              console.log("After deduct TX Fees of PLN Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskPLN.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskPLN.update({
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

              sails.sockets.blast(constants.PLN_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingPLN == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerPLN");
              //var updatedPLNbalanceBidder = ((parseFloat(userAllDetailsInDBBid.PLNbalance) + parseFloat(userBidAmountPLN)) - parseFloat(totoalBidRemainingPLN));
              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBid.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(totoalBidRemainingPLN);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainPLN updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var PLNAmountSucess = (parseFloat(userBidAmountPLN) - parseFloat(totoalBidRemainingPLN));
              // var PLNAmountSucess = new BigNumber(userBidAmountPLN);
              // PLNAmountSucess = PLNAmountSucess.minus(totoalBidRemainingPLN);
              //
              // //var txFeesBidderPLN = (parseFloat(PLNAmountSucess) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(PLNAmountSucess);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              //
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);
              // console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedPLNbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountPLN totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidPLN.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
                  bidAmountPLN: totoalBidRemainingPLN,
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingPLN :: " + totoalBidRemainingPLN);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingPLN = totoalBidRemainingPLN - allAsksFromdb[i].bidAmountPLN;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingPLN = totoalBidRemainingPLN.minus(currentAskDetails.askAmountPLN);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingPLN == 0::: " + totoalBidRemainingPLN);

              if (totoalBidRemainingPLN == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingPLN == 0Enter into totoalBidRemainingPLN == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerPLN
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
                    id: bidDetails.bidownerPLN
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingPLN == 0userAll bidDetails.askownerPLN :: ");
                console.log(" totoalBidRemainingPLN == 0Update value of Bidder and asker");
                //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(currentAskDetails.askAmountPLN));
                var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
                updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(currentAskDetails.askAmountPLN);

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

                console.log("After deduct TX Fees of PLN Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingPLN == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingPLN == 0updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);
                console.log(" totoalBidRemainingPLN == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerPLN
                  }, {
                    FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedPLNbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(userBidAmountPLN)) - parseFloat(totoalBidRemainingPLN));

                var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
                updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);
                updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(totoalBidRemainingPLN);

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalBidRemainingLTC);
                console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedLTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
                //var PLNAmountSucess = (parseFloat(userBidAmountPLN) - parseFloat(totoalBidRemainingPLN));
                // var PLNAmountSucess = new BigNumber(userBidAmountPLN);
                // PLNAmountSucess = PLNAmountSucess.minus(totoalBidRemainingPLN);
                //
                //
                // //var txFeesBidderPLN = (parseFloat(PLNAmountSucess) * parseFloat(txFeeWithdrawSuccessPLN));
                // var txFeesBidderPLN = new BigNumber(PLNAmountSucess);
                // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
                // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
                // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
                // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
                //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
                updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);



                console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 updatedFreezedPLNbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerPLN
                  }, {
                    PLNbalance: updatedPLNbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 BidPLN.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskPLN.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskPLN.update({
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
                sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 AskPLN.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidPLN.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidPLN.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 enter into else of totoalBidRemainingPLN == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0totoalBidRemainingPLN == 0 start User.findOne currentAskDetails.bidownerPLN " + currentAskDetails.bidownerPLN);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerPLN
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(currentAskDetails.askAmountPLN));

                var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
                updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(currentAskDetails.askAmountPLN);

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
                console.log("After deduct TX Fees of PLN Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 updatedFreezedPLNbalanceAsker:: " + updatedFreezedPLNbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerPLN
                  }, {
                    FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskPLN.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskPLN.update({
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
                sails.sockets.blast(constants.PLN_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountPLN = (parseFloat(currentAskDetails.askAmountPLN) - parseFloat(totoalBidRemainingPLN));

              var updatedAskAmountPLN = new BigNumber(currentAskDetails.askAmountPLN);
              updatedAskAmountPLN = updatedAskAmountPLN.minus(totoalBidRemainingPLN);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskPLN.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
                  askAmountPLN: updatedAskAmountPLN,
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
              sails.sockets.blast(constants.PLN_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(totoalBidRemainingPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(totoalBidRemainingPLN);

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
              console.log("Total Ask RemainPLN updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of PLN Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedPLNbalanceAsker:: " + updatedFreezedPLNbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
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
                  id: bidDetails.bidownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerPLN");
              //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(userBidAmountPLN));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountPLN " + userBidAmountPLN);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.PLNbalance " + userAllDetailsInDBBidder.PLNbalance);

              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var txFeesBidderPLN = (parseFloat(updatedPLNbalanceBidder) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(userBidAmountPLN);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              //
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);

              var txFeesBidderPLN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedPLNbalanceBidder ::: " + updatedPLNbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidPLN.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidPLN.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidPLN.update({
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
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
  removeBidPLNMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdPLN;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidPLN.findOne({
      bidownerPLN: bidownerId,
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
            BidPLN.update({
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskPLNMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdPLN;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskPLN.findOne({
      askownerPLN: askownerId,
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
        var userPLNBalanceInDb = parseFloat(user.PLNbalance);
        var askAmountOfPLNInAskTableDB = parseFloat(askDetails.askAmountPLN);
        var userFreezedPLNbalanceInDB = parseFloat(user.FreezedPLNbalance);
        console.log("userPLNBalanceInDb :" + userPLNBalanceInDb);
        console.log("askAmountOfPLNInAskTableDB :" + askAmountOfPLNInAskTableDB);
        console.log("userFreezedPLNbalanceInDB :" + userFreezedPLNbalanceInDB);
        var updateFreezedPLNBalance = (parseFloat(userFreezedPLNbalanceInDB) - parseFloat(askAmountOfPLNInAskTableDB));
        var updateUserPLNBalance = (parseFloat(userPLNBalanceInDb) + parseFloat(askAmountOfPLNInAskTableDB));
        User.update({
            id: askownerId
          }, {
            PLNbalance: parseFloat(updateUserPLNBalance),
            FreezedPLNbalance: parseFloat(updateFreezedPLNBalance)
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
            AskPLN.update({
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
              sails.sockets.blast(constants.PLN_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidPLN: function(req, res) {
    console.log("Enter into ask api getAllBidPLN :: ");
    BidPLN.find({
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
            BidPLN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountPLN')
              .exec(function(err, bidAmountPLNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountPLNSum",
                    statusCode: 401
                  });
                }
                BidPLN.find({
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
                        "message": "Error to sum Of bidAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsPLN: allAskDetailsToExecute,
                      bidAmountPLNSum: bidAmountPLNSum[0].bidAmountPLN,
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
  getAllAskPLN: function(req, res) {
    console.log("Enter into ask api getAllAskPLN :: ");
    AskPLN.find({
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
            AskPLN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountPLN')
              .exec(function(err, askAmountPLNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountPLNSum",
                    statusCode: 401
                  });
                }
                AskPLN.find({
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
                        "message": "Error to sum Of askAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksPLN: allAskDetailsToExecute,
                      askAmountPLNSum: askAmountPLNSum[0].askAmountPLN,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskPLN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsPLNSuccess: function(req, res) {
    console.log("Enter into ask api getBidsPLNSuccess :: ");
    BidPLN.find({
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
            BidPLN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('bidAmountPLN')
              .exec(function(err, bidAmountPLNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountPLNSum",
                    statusCode: 401
                  });
                }
                BidPLN.find({
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
                        "message": "Error to sum Of bidAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsPLN: allAskDetailsToExecute,
                      bidAmountPLNSum: bidAmountPLNSum[0].bidAmountPLN,
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
  getAsksPLNSuccess: function(req, res) {
    console.log("Enter into ask api getAsksPLNSuccess :: ");
    AskPLN.find({
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
            AskPLN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
                }
              })
              .sum('askAmountPLN')
              .exec(function(err, askAmountPLNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountPLNSum",
                    statusCode: 401
                  });
                }
                AskPLN.find({
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
                        "message": "Error to sum Of askAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksPLN: allAskDetailsToExecute,
                      askAmountPLNSum: askAmountPLNSum[0].askAmountPLN,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskPLN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },


};