/**
 * TrademarketBTCPLNController
 *
 * @description :: Server-side logic for managing trademarketbtcplns
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

  addAskPLNMarket: async function(req, res) {
    console.log("Enter into ask api addAskPLNMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountPLN = new BigNumber(req.body.askAmountPLN);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountPLN || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountPLN < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountPLN = parseFloat(userAskAmountPLN);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskPLN.create({
        askAmountBTC: userAskAmountBTC,
        askAmountPLN: userAskAmountPLN,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountPLN: userAskAmountPLN,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
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
          'like': BTCMARKETID
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
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingPLN = (parseFloat(totoalAskRemainingPLN) - parseFloat(currentBidDetails.bidAmountPLN));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingPLN = totoalAskRemainingPLN.minus(currentBidDetails.bidAmountPLN);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingPLN :: " + totoalAskRemainingPLN);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
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

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


            //updatedPLNbalanceBidder =  parseFloat(updatedPLNbalanceBidder);

            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedPLNbalanceAsker = parseFloat(totoalAskRemainingPLN);
            //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);

            //updatedFreezedPLNbalanceAsker =  parseFloat(updatedFreezedPLNbalanceAsker);
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
            console.log("After deduct TX Fees of PLN Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedPLNbalance: updatedFreezedPLNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed PLNBalance',
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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
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

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedPLNbalanceBidder:: " + updatedPLNbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerPLN");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(totoalAskRemainingPLN));
            //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
            console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
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
            console.log("After deduct TX Fees of PLN Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedPLNbalance: updatedFreezedPLNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskPLN.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingPLN = totoalAskRemainingPLN - allBidsFromdb[i].bidAmountPLN;
          if (totoalAskRemainingPLN >= currentBidDetails.bidAmountPLN) {
            //totoalAskRemainingPLN = (parseFloat(totoalAskRemainingPLN) - parseFloat(currentBidDetails.bidAmountPLN));
            totoalAskRemainingPLN = totoalAskRemainingPLN.minus(currentBidDetails.bidAmountPLN);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
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
              // console.log("After deduct TX Fees of PLN Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerPLN
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  PLNbalance: updatedPLNbalanceBidder
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
              //var updatedFreezedPLNbalanceAsker = parseFloat(totoalAskRemainingPLN);
              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(totoalAskRemainingPLN));
              //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
              console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
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

              console.log("After deduct TX Fees of PLN Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerPLN
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);

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

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedPLNbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerPLN
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            //var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var updatedBidAmountBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            updatedBidAmountBTC = updatedBidAmountBTC.minus(totoalAskRemainingBTC);
            //var updatedBidAmountPLN = (parseFloat(currentBidDetails.bidAmountPLN) - parseFloat(totoalAskRemainingPLN));
            var updatedBidAmountPLN = new BigNumber(currentBidDetails.bidAmountPLN);
            updatedBidAmountPLN = updatedBidAmountPLN.minus(totoalAskRemainingPLN);

            try {
              var updatedaskDetails = await BidPLN.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
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
            //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance) - parseFloat(totoalAskRemainingBTC));
            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(totoalAskRemainingBTC);


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
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedPLNbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerPLN");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of PLN Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
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
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountPLN = new BigNumber(req.body.bidAmountPLN);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountPLN = parseFloat(userBidAmountPLN);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountPLN || !userBidAmountBTC ||
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
      var bidDetails = await BidPLN.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountPLN: userBidAmountPLN,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountPLN: userBidAmountPLN,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
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
      var allAsksFromdb = await AskPLN.find({
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
        var totoalBidRemainingPLN = new BigNumber(userBidAmountPLN);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of PLN
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountPLN;
        }
        if (total_ask <= totoalBidRemainingPLN) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingPLN :: " + totoalBidRemainingPLN);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingPLN = totoalBidRemainingPLN - allAsksFromdb[i].bidAmountPLN;
            //totoalBidRemainingPLN = (parseFloat(totoalBidRemainingPLN) - parseFloat(currentAskDetails.askAmountPLN));
            totoalBidRemainingPLN = totoalBidRemainingPLN.minus(currentAskDetails.askAmountPLN);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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
              console.log("After deduct TX Fees of PLN Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedPLNbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
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
              //Bid FreezedBTCbalance of bidder deduct and PLN  give to bidder
              //var updatedPLNbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.PLNbalance) + parseFloat(totoalBidRemainingPLN)) - parseFloat(totoalBidRemainingBTC);
              //var updatedPLNbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.PLNbalance) + parseFloat(userBidAmountPLN)) - parseFloat(totoalBidRemainingPLN));
              var updatedPLNbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(totoalBidRemainingPLN);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainPLN updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
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

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingPLN == 0updatedPLNbalanceBidder ::: " + updatedPLNbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingPLN asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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

              console.log("After deduct TX Fees of PLN Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerPLN");
              //var updatedPLNbalanceBidder = ((parseFloat(userAllDetailsInDBBid.PLNbalance) + parseFloat(userBidAmountPLN)) - parseFloat(totoalBidRemainingPLN));
              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBid.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(totoalBidRemainingPLN);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainPLN updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
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



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedPLNbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountPLN totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidPLN.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingPLN = totoalBidRemainingPLN - allAsksFromdb[i].bidAmountPLN;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingPLN = totoalBidRemainingPLN.minus(currentAskDetails.askAmountPLN);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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

                console.log("After deduct TX Fees of PLN Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingPLN == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingPLN == 0updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);
                console.log(" totoalBidRemainingPLN == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerPLN
                  }, {
                    FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalBidRemainingBTC);
                console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedBTCbalanceBidder);
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

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
                //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
                updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);



                console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 updatedFreezedPLNbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerPLN
                  }, {
                    PLNbalance: updatedPLNbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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
                console.log("After deduct TX Fees of PLN Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 updatedFreezedPLNbalanceAsker:: " + updatedFreezedPLNbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerPLN
                  }, {
                    FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountPLN = (parseFloat(currentAskDetails.askAmountPLN) - parseFloat(totoalBidRemainingPLN));

              var updatedAskAmountPLN = new BigNumber(currentAskDetails.askAmountPLN);
              updatedAskAmountPLN = updatedAskAmountPLN.minus(totoalBidRemainingPLN);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskPLN.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
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

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
              console.log("Total Ask RemainPLN updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of PLN Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedPLNbalanceAsker:: " + updatedFreezedPLNbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerPLN");
              //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(userBidAmountPLN));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountPLN " + userBidAmountPLN);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.PLNbalance " + userAllDetailsInDBBidder.PLNbalance);

              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var txFeesBidderPLN = (parseFloat(updatedPLNbalanceBidder) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(userBidAmountPLN);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              //
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderPLN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedPLNbalanceBidder ::: " + updatedPLNbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidPLN.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user BTC balance");
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
            BidPLN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsPLN: allAskDetailsToExecute,
                      bidAmountPLNSum: bidAmountPLNSum[0].bidAmountPLN,
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
  getAllAskPLN: function(req, res) {
    console.log("Enter into ask api getAllAskPLN :: ");
    AskPLN.find({
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
            AskPLN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksPLN: allAskDetailsToExecute,
                      askAmountPLNSum: askAmountPLNSum[0].askAmountPLN,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
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
            BidPLN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsPLN: allAskDetailsToExecute,
                      bidAmountPLNSum: bidAmountPLNSum[0].bidAmountPLN,
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
  getAsksPLNSuccess: function(req, res) {
    console.log("Enter into ask api getAsksPLNSuccess :: ");
    AskPLN.find({
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
            AskPLN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksPLN: allAskDetailsToExecute,
                      askAmountPLNSum: askAmountPLNSum[0].askAmountPLN,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
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