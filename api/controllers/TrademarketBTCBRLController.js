/**
 * TrademarketBTCBRLController
 *
 * @description :: Server-side logic for managing trademarketbtcbrls
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


  addAskBRLMarket: async function(req, res) {
    console.log("Enter into ask api addAskBRLMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountBRL = new BigNumber(req.body.askAmountBRL);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountBRL || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountBRL < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userBRLBalanceInDb = new BigNumber(userAsker.BRLbalance);
    var userFreezedBRLBalanceInDb = new BigNumber(userAsker.FreezedBRLbalance);

    userBRLBalanceInDb = parseFloat(userBRLBalanceInDb);
    userFreezedBRLBalanceInDb = parseFloat(userFreezedBRLBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountBRL.greaterThanOrEqualTo(userBRLBalanceInDb)) {
      return res.json({
        "message": "You have insufficient BRL Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountBRL :: " + userAskAmountBRL);
    console.log("userBRLBalanceInDb :: " + userBRLBalanceInDb);
    // if (userAskAmountBRL >= userBRLBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient BRL Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountBRL = parseFloat(userAskAmountBRL);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskBRL.create({
        askAmountBTC: userAskAmountBTC,
        askAmountBRL: userAskAmountBRL,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountBRL: userAskAmountBRL,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerBRL: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.BRL_ASK_ADDED, askDetails);
    // var updateUserBRLBalance = (parseFloat(userBRLBalanceInDb) - parseFloat(userAskAmountBRL));
    // var updateFreezedBRLBalance = (parseFloat(userFreezedBRLBalanceInDb) + parseFloat(userAskAmountBRL));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userBRLBalanceInDb = new BigNumber(userBRLBalanceInDb);
    var updateUserBRLBalance = userBRLBalanceInDb.minus(userAskAmountBRL);
    updateUserBRLBalance = parseFloat(updateUserBRLBalance);
    userFreezedBRLBalanceInDb = new BigNumber(userFreezedBRLBalanceInDb);
    var updateFreezedBRLBalance = userFreezedBRLBalanceInDb.plus(userAskAmountBRL);
    updateFreezedBRLBalance = parseFloat(updateFreezedBRLBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedBRLbalance: updateFreezedBRLBalance,
        BRLbalance: updateUserBRLBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidBRL.find({
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
        message: 'Failed to find BRL bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingBRL = new BigNumber(userAskAmountBRL);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of BRL
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountBRL;
      }
      if (total_bid <= totoalAskRemainingBRL) {
        console.log("Inside of total_bid <= totoalAskRemainingBRL");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingBRL");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingBRL :: " + totoalAskRemainingBRL);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingBRL = (parseFloat(totoalAskRemainingBRL) - parseFloat(currentBidDetails.bidAmountBRL));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingBRL = totoalAskRemainingBRL.minus(currentBidDetails.bidAmountBRL);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingBRL :: " + totoalAskRemainingBRL);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingBRL == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingBRL == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerBRL
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerBRL
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(currentBidDetails.bidAmountBRL));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BRLbalance);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(currentBidDetails.bidAmountBRL);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of BRL Update user " + updatedBRLbalanceBidder);
            //var txFeesBidderBRL = (parseFloat(currentBidDetails.bidAmountBRL) * parseFloat(txFeeWithdrawSuccessBRL));
            // var txFeesBidderBRL = new BigNumber(currentBidDetails.bidAmountBRL);
            //
            // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL)
            // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
            // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


            //updatedBRLbalanceBidder =  parseFloat(updatedBRLbalanceBidder);

            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                BRLbalance: updatedBRLbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and BRL balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedBRLbalanceAsker = parseFloat(totoalAskRemainingBRL);
            //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);

            //updatedFreezedBRLbalanceAsker =  parseFloat(updatedFreezedBRLbalanceAsker);
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
            console.log("After deduct TX Fees of BRL Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedBRLbalance: updatedFreezedBRLbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed BRLBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidBRL:: ");
            try {
              var bidDestroy = await BidBRL.update({
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
            sails.sockets.blast(constants.BRL_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskBRL.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskBRL.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskBRL',
                statusCode: 401
              });
            }
            //emitting event of destruction of BRL_ask
            sails.sockets.blast(constants.BRL_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingBRL == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerBRL " + currentBidDetails.bidownerBRL);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerBRL
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(currentBidDetails.bidAmountBRL));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BRLbalance);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(currentBidDetails.bidAmountBRL);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of BRL 089089Update user " + updatedBRLbalanceBidder);
            // var txFeesBidderBRL = (parseFloat(currentBidDetails.bidAmountBRL) * parseFloat(txFeeWithdrawSuccessBRL));
            // var txFeesBidderBRL = new BigNumber(currentBidDetails.bidAmountBRL);
            // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
            // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            // // updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
            // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedBRLbalanceBidder:: " + updatedBRLbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                BRLbalance: updatedBRLbalanceBidder
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
              var desctroyCurrentBid = await BidBRL.update({
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
            sails.sockets.blast(constants.BRL_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerBRL
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerBRL");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(totoalAskRemainingBRL));
            //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
            console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
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
            console.log("After deduct TX Fees of BRL Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedBRLbalance: updatedFreezedBRLbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskBRL.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountBRL: parseFloat(totoalAskRemainingBRL),
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
            sails.sockets.blast(constants.BRL_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingBRL :: " + totoalAskRemainingBRL);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingBRL = totoalAskRemainingBRL - allBidsFromdb[i].bidAmountBRL;
          if (totoalAskRemainingBRL >= currentBidDetails.bidAmountBRL) {
            //totoalAskRemainingBRL = (parseFloat(totoalAskRemainingBRL) - parseFloat(currentBidDetails.bidAmountBRL));
            totoalAskRemainingBRL = totoalAskRemainingBRL.minus(currentBidDetails.bidAmountBRL);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingBRL == 0::: " + totoalAskRemainingBRL);

            if (totoalAskRemainingBRL == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingBRL == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerBRL
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
                  id: askDetails.askownerBRL
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerBRL :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(currentBidDetails.bidAmountBRL));
              var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(currentBidDetails.bidAmountBRL);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 BRL Update user " + updatedBRLbalanceBidder);
              //var txFeesBidderBRL = (parseFloat(currentBidDetails.bidAmountBRL) * parseFloat(txFeeWithdrawSuccessBRL));

              // var txFeesBidderBRL = new BigNumber(currentBidDetails.bidAmountBRL);
              // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
              // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);
              // console.log("After deduct TX Fees of BRL Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerBRL
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  BRLbalance: updatedBRLbalanceBidder
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
              //var updatedFreezedBRLbalanceAsker = parseFloat(totoalAskRemainingBRL);
              //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(totoalAskRemainingBRL));
              //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
              var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
              console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
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

              console.log("After deduct TX Fees of BRL Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerBRL
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidBRL.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidBRL.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidBRL.update({
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
              sails.sockets.blast(constants.BRL_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskBRL.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskBRL.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskBRL.update({
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
              sails.sockets.blast(constants.BRL_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingBRL == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerBRL " + currentBidDetails.bidownerBRL);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerBRL
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

              //var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(currentBidDetails.bidAmountBRL));
              var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(currentBidDetails.bidAmountBRL);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of BRL Update user " + updatedBRLbalanceBidder);
              //var txFeesBidderBRL = (parseFloat(currentBidDetails.bidAmountBRL) * parseFloat(txFeeWithdrawSuccessBRL));
              // var txFeesBidderBRL = new BigNumber(currentBidDetails.bidAmountBRL);
              // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
              // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);
              // console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedBRLbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerBRL
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  BRLbalance: updatedBRLbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidBRL.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidBRL.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.BRL_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerBRL
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
            //var updatedBidAmountBRL = (parseFloat(currentBidDetails.bidAmountBRL) - parseFloat(totoalAskRemainingBRL));
            var updatedBidAmountBRL = new BigNumber(currentBidDetails.bidAmountBRL);
            updatedBidAmountBRL = updatedBidAmountBRL.minus(totoalAskRemainingBRL);

            try {
              var updatedaskDetails = await BidBRL.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountBRL: updatedBidAmountBRL,
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
            sails.sockets.blast(constants.BRL_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerBRL
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


            //var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.BRLbalance) + parseFloat(totoalAskRemainingBRL));

            var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.BRLbalance);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(totoalAskRemainingBRL);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of BRL Update user " + updatedBRLbalanceBidder);
            //var BRLAmountSucess = parseFloat(totoalAskRemainingBRL);
            //var BRLAmountSucess = new BigNumber(totoalAskRemainingBRL);
            //var txFeesBidderBRL = (parseFloat(BRLAmountSucess) * parseFloat(txFeeWithdrawSuccessBRL));
            //var txFeesBidderBRL = (parseFloat(totoalAskRemainingBRL) * parseFloat(txFeeWithdrawSuccessBRL));



            // var txFeesBidderBRL = new BigNumber(totoalAskRemainingBRL);
            // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
            //
            // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
            // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedBRLbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                BRLbalance: updatedBRLbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerBRL");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of BRL Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedBRLbalance: updatedFreezedBRLbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskBRL.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskBRL.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskBRL.update({
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
            //emitting event for BRL_ask destruction
            sails.sockets.blast(constants.BRL_ASK_DESTROYED, askDestroy);
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
  addBidBRLMarket: async function(req, res) {
    console.log("Enter into ask api addBidBRLMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountBRL = new BigNumber(req.body.bidAmountBRL);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountBRL = parseFloat(userBidAmountBRL);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountBRL || !userBidAmountBTC ||
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
      var bidDetails = await BidBRL.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountBRL: userBidAmountBRL,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountBRL: userBidAmountBRL,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerBRL: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.BRL_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskBRL.find({
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
        var totoalBidRemainingBRL = new BigNumber(userBidAmountBRL);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of BRL
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountBRL;
        }
        if (total_ask <= totoalBidRemainingBRL) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingBRL :: " + totoalBidRemainingBRL);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingBRL = totoalBidRemainingBRL - allAsksFromdb[i].bidAmountBRL;
            //totoalBidRemainingBRL = (parseFloat(totoalBidRemainingBRL) - parseFloat(currentAskDetails.askAmountBRL));
            totoalBidRemainingBRL = totoalBidRemainingBRL.minus(currentAskDetails.askAmountBRL);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingBRL == 0::: " + totoalBidRemainingBRL);
            if (totoalBidRemainingBRL == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingBRL == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBRL
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerBRL totoalBidRemainingBRL == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(currentAskDetails.askAmountBRL));
              var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(currentAskDetails.askAmountBRL);
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
              console.log("After deduct TX Fees of BRL Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedBRLbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
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
                  id: bidDetails.bidownerBRL
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and BRL  give to bidder
              //var updatedBRLbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.BRLbalance) + parseFloat(totoalBidRemainingBRL)) - parseFloat(totoalBidRemainingBTC);
              //var updatedBRLbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.BRLbalance) + parseFloat(userBidAmountBRL)) - parseFloat(totoalBidRemainingBRL));
              var updatedBRLbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(totoalBidRemainingBRL);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainBRL updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
              //var BRLAmountSucess = (parseFloat(userBidAmountBRL) - parseFloat(totoalBidRemainingBRL));
              // var BRLAmountSucess = new BigNumber(userBidAmountBRL);
              // BRLAmountSucess = BRLAmountSucess.minus(totoalBidRemainingBRL);
              //
              // //var txFeesBidderBRL = (parseFloat(BRLAmountSucess) * parseFloat(txFeeWithdrawSuccessBRL));
              // var txFeesBidderBRL = new BigNumber(BRLAmountSucess);
              // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
              //
              // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingBRL == 0updatedBRLbalanceBidder ::: " + updatedBRLbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingBRL asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingBRL == 0BidBRL.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidBRL.destroy({
              //   id: bidDetails.bidownerBRL
              // });
              try {
                var bidDestroy = await BidBRL.update({
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
              sails.sockets.blast(constants.BRL_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0AskBRL.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskBRL.destroy({
              //   id: currentAskDetails.askownerBRL
              // });
              try {
                var askDestroy = await AskBRL.update({
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
              sails.sockets.blast(constants.BRL_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0  enter into else of totoalBidRemainingBRL == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == 0start User.findOne currentAskDetails.bidownerBRL ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBRL
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(currentAskDetails.askAmountBRL));
              var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(currentAskDetails.askAmountBRL);
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

              console.log("After deduct TX Fees of BRL Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskBRL.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskBRL.update({
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

              sails.sockets.blast(constants.BRL_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingBRL == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerBRL
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerBRL");
              //var updatedBRLbalanceBidder = ((parseFloat(userAllDetailsInDBBid.BRLbalance) + parseFloat(userBidAmountBRL)) - parseFloat(totoalBidRemainingBRL));
              var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBid.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(totoalBidRemainingBRL);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainBRL updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
              //var BRLAmountSucess = (parseFloat(userBidAmountBRL) - parseFloat(totoalBidRemainingBRL));
              // var BRLAmountSucess = new BigNumber(userBidAmountBRL);
              // BRLAmountSucess = BRLAmountSucess.minus(totoalBidRemainingBRL);
              //
              // //var txFeesBidderBRL = (parseFloat(BRLAmountSucess) * parseFloat(txFeeWithdrawSuccessBRL));
              // var txFeesBidderBRL = new BigNumber(BRLAmountSucess);
              // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
              //
              // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);
              // console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedBRLbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBRL totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidBRL.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountBRL: totoalBidRemainingBRL,
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
              sails.sockets.blast(constants.BRL_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingBRL :: " + totoalBidRemainingBRL);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingBRL = totoalBidRemainingBRL - allAsksFromdb[i].bidAmountBRL;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingBRL = totoalBidRemainingBRL.minus(currentAskDetails.askAmountBRL);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingBRL == 0::: " + totoalBidRemainingBRL);

              if (totoalBidRemainingBRL == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingBRL == 0Enter into totoalBidRemainingBRL == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerBRL
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
                    id: bidDetails.bidownerBRL
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingBRL == 0userAll bidDetails.askownerBRL :: ");
                console.log(" totoalBidRemainingBRL == 0Update value of Bidder and asker");
                //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(currentAskDetails.askAmountBRL));
                var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
                updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(currentAskDetails.askAmountBRL);

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

                console.log("After deduct TX Fees of BRL Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingBRL == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingBRL == 0updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);
                console.log(" totoalBidRemainingBRL == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerBRL
                  }, {
                    FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedBRLbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(userBidAmountBRL)) - parseFloat(totoalBidRemainingBRL));

                var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BRLbalance);
                updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);
                updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(totoalBidRemainingBRL);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalBidRemainingBTC);
                console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
                //var BRLAmountSucess = (parseFloat(userBidAmountBRL) - parseFloat(totoalBidRemainingBRL));
                // var BRLAmountSucess = new BigNumber(userBidAmountBRL);
                // BRLAmountSucess = BRLAmountSucess.minus(totoalBidRemainingBRL);
                //
                //
                // //var txFeesBidderBRL = (parseFloat(BRLAmountSucess) * parseFloat(txFeeWithdrawSuccessBRL));
                // var txFeesBidderBRL = new BigNumber(BRLAmountSucess);
                // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
                // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
                // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
                // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
                //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
                updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);



                console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0 updatedFreezedBRLbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerBRL
                  }, {
                    BRLbalance: updatedBRLbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0 BidBRL.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskBRL.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskBRL.update({
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
                sails.sockets.blast(constants.BRL_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0 AskBRL.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidBRL.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidBRL.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.BRL_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0 enter into else of totoalBidRemainingBRL == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0totoalBidRemainingBRL == 0 start User.findOne currentAskDetails.bidownerBRL " + currentAskDetails.bidownerBRL);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerBRL
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(currentAskDetails.askAmountBRL));

                var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
                updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(currentAskDetails.askAmountBRL);

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
                console.log("After deduct TX Fees of BRL Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0 updatedFreezedBRLbalanceAsker:: " + updatedFreezedBRLbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerBRL
                  }, {
                    FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskBRL.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskBRL.update({
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
                sails.sockets.blast(constants.BRL_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountBRL = (parseFloat(currentAskDetails.askAmountBRL) - parseFloat(totoalBidRemainingBRL));

              var updatedAskAmountBRL = new BigNumber(currentAskDetails.askAmountBRL);
              updatedAskAmountBRL = updatedAskAmountBRL.minus(totoalBidRemainingBRL);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskBRL.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountBRL: updatedAskAmountBRL,
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
              sails.sockets.blast(constants.BRL_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBRL
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(totoalBidRemainingBRL));
              var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(totoalBidRemainingBRL);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
              console.log("Total Ask RemainBRL updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of BRL Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedBRLbalanceAsker:: " + updatedFreezedBRLbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
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
                  id: bidDetails.bidownerBRL
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerBRL");
              //var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(userBidAmountBRL));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountBRL " + userBidAmountBRL);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.BRLbalance " + userAllDetailsInDBBidder.BRLbalance);

              var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
              //var txFeesBidderBRL = (parseFloat(updatedBRLbalanceBidder) * parseFloat(txFeeWithdrawSuccessBRL));
              // var txFeesBidderBRL = new BigNumber(userBidAmountBRL);
              // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
              //
              // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);

              var txFeesBidderBRL = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedBRLbalanceBidder ::: " + updatedBRLbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidBRL.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidBRL.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidBRL.update({
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
              sails.sockets.blast(constants.BRL_BID_DESTROYED, bidDestroy);
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
  removeBidBRLMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdBRL;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidBRL.findOne({
      bidownerBRL: bidownerId,
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
            BidBRL.update({
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
              sails.sockets.blast(constants.BRL_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskBRLMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdBRL;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskBRL.findOne({
      askownerBRL: askownerId,
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
        var userBRLBalanceInDb = parseFloat(user.BRLbalance);
        var askAmountOfBRLInAskTableDB = parseFloat(askDetails.askAmountBRL);
        var userFreezedBRLbalanceInDB = parseFloat(user.FreezedBRLbalance);
        console.log("userBRLBalanceInDb :" + userBRLBalanceInDb);
        console.log("askAmountOfBRLInAskTableDB :" + askAmountOfBRLInAskTableDB);
        console.log("userFreezedBRLbalanceInDB :" + userFreezedBRLbalanceInDB);
        var updateFreezedBRLBalance = (parseFloat(userFreezedBRLbalanceInDB) - parseFloat(askAmountOfBRLInAskTableDB));
        var updateUserBRLBalance = (parseFloat(userBRLBalanceInDb) + parseFloat(askAmountOfBRLInAskTableDB));
        User.update({
            id: askownerId
          }, {
            BRLbalance: parseFloat(updateUserBRLBalance),
            FreezedBRLbalance: parseFloat(updateFreezedBRLBalance)
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
            AskBRL.update({
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
              sails.sockets.blast(constants.BRL_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidBRL: function(req, res) {
    console.log("Enter into ask api getAllBidBRL :: ");
    BidBRL.find({
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
            BidBRL.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountBRL')
              .exec(function(err, bidAmountBRLSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountBRLSum",
                    statusCode: 401
                  });
                }
                BidBRL.find({
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
                        "message": "Error to sum Of bidAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBRL: allAskDetailsToExecute,
                      bidAmountBRLSum: bidAmountBRLSum[0].bidAmountBRL,
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
  getAllAskBRL: function(req, res) {
    console.log("Enter into ask api getAllAskBRL :: ");
    AskBRL.find({
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
            AskBRL.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountBRL')
              .exec(function(err, askAmountBRLSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountBRLSum",
                    statusCode: 401
                  });
                }
                AskBRL.find({
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
                        "message": "Error to sum Of askAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBRL: allAskDetailsToExecute,
                      askAmountBRLSum: askAmountBRLSum[0].askAmountBRL,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskBRL Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsBRLSuccess: function(req, res) {
    console.log("Enter into ask api getBidsBRLSuccess :: ");
    BidBRL.find({
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
            BidBRL.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountBRL')
              .exec(function(err, bidAmountBRLSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountBRLSum",
                    statusCode: 401
                  });
                }
                BidBRL.find({
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
                        "message": "Error to sum Of bidAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBRL: allAskDetailsToExecute,
                      bidAmountBRLSum: bidAmountBRLSum[0].bidAmountBRL,
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
  getAsksBRLSuccess: function(req, res) {
    console.log("Enter into ask api getAsksBRLSuccess :: ");
    AskBRL.find({
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
            AskBRL.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountBRL')
              .exec(function(err, askAmountBRLSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountBRLSum",
                    statusCode: 401
                  });
                }
                AskBRL.find({
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
                        "message": "Error to sum Of askAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBRL: allAskDetailsToExecute,
                      askAmountBRLSum: askAmountBRLSum[0].askAmountBRL,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskBRL Found!!",
              statusCode: 401
            });
          }
        }
      });
  },


};