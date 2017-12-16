/**
 * TrademarketBTCGBPController
 *
 * @description :: Server-side logic for managing trademarketbtcgbps
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

  addAskGBPMarket: async function(req, res) {
    console.log("Enter into ask api addAskGBPMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountGBP = new BigNumber(req.body.askAmountGBP);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountGBP || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountGBP < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userGBPBalanceInDb = new BigNumber(userAsker.GBPbalance);
    var userFreezedGBPBalanceInDb = new BigNumber(userAsker.FreezedGBPbalance);

    userGBPBalanceInDb = parseFloat(userGBPBalanceInDb);
    userFreezedGBPBalanceInDb = parseFloat(userFreezedGBPBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountGBP.greaterThanOrEqualTo(userGBPBalanceInDb)) {
      return res.json({
        "message": "You have insufficient GBP Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountGBP :: " + userAskAmountGBP);
    console.log("userGBPBalanceInDb :: " + userGBPBalanceInDb);
    // if (userAskAmountGBP >= userGBPBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient GBP Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountGBP = parseFloat(userAskAmountGBP);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskGBP.create({
        askAmountBTC: userAskAmountBTC,
        askAmountGBP: userAskAmountGBP,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountGBP: userAskAmountGBP,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerGBP: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.GBP_ASK_ADDED, askDetails);
    // var updateUserGBPBalance = (parseFloat(userGBPBalanceInDb) - parseFloat(userAskAmountGBP));
    // var updateFreezedGBPBalance = (parseFloat(userFreezedGBPBalanceInDb) + parseFloat(userAskAmountGBP));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userGBPBalanceInDb = new BigNumber(userGBPBalanceInDb);
    var updateUserGBPBalance = userGBPBalanceInDb.minus(userAskAmountGBP);
    updateUserGBPBalance = parseFloat(updateUserGBPBalance);
    userFreezedGBPBalanceInDb = new BigNumber(userFreezedGBPBalanceInDb);
    var updateFreezedGBPBalance = userFreezedGBPBalanceInDb.plus(userAskAmountGBP);
    updateFreezedGBPBalance = parseFloat(updateFreezedGBPBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedGBPbalance: updateFreezedGBPBalance,
        GBPbalance: updateUserGBPBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidGBP.find({
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
        message: 'Failed to find GBP bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingGBP = new BigNumber(userAskAmountGBP);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of GBP
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountGBP;
      }
      if (total_bid <= totoalAskRemainingGBP) {
        console.log("Inside of total_bid <= totoalAskRemainingGBP");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingGBP");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingGBP :: " + totoalAskRemainingGBP);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingGBP = (parseFloat(totoalAskRemainingGBP) - parseFloat(currentBidDetails.bidAmountGBP));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingGBP = totoalAskRemainingGBP.minus(currentBidDetails.bidAmountGBP);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingGBP :: " + totoalAskRemainingGBP);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingGBP == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingGBP == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerGBP
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerGBP
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(currentBidDetails.bidAmountGBP));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBidder.GBPbalance);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(currentBidDetails.bidAmountGBP);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of GBP Update user " + updatedGBPbalanceBidder);
            //var txFeesBidderGBP = (parseFloat(currentBidDetails.bidAmountGBP) * parseFloat(txFeeWithdrawSuccessGBP));
            // var txFeesBidderGBP = new BigNumber(currentBidDetails.bidAmountGBP);
            //
            // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP)
            // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
            // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


            //updatedGBPbalanceBidder =  parseFloat(updatedGBPbalanceBidder);

            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                GBPbalance: updatedGBPbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and GBP balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedGBPbalanceAsker = parseFloat(totoalAskRemainingGBP);
            //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);

            //updatedFreezedGBPbalanceAsker =  parseFloat(updatedFreezedGBPbalanceAsker);
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
            console.log("After deduct TX Fees of GBP Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedGBPbalance: updatedFreezedGBPbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed GBPBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidGBP:: ");
            try {
              var bidDestroy = await BidGBP.update({
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
            sails.sockets.blast(constants.GBP_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskGBP.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskGBP.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskGBP',
                statusCode: 401
              });
            }
            //emitting event of destruction of GBP_ask
            sails.sockets.blast(constants.GBP_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingGBP == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerGBP " + currentBidDetails.bidownerGBP);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerGBP
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(currentBidDetails.bidAmountGBP));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBidder.GBPbalance);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(currentBidDetails.bidAmountGBP);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of GBP 089089Update user " + updatedGBPbalanceBidder);
            // var txFeesBidderGBP = (parseFloat(currentBidDetails.bidAmountGBP) * parseFloat(txFeeWithdrawSuccessGBP));
            // var txFeesBidderGBP = new BigNumber(currentBidDetails.bidAmountGBP);
            // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
            // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            // // updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
            // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedGBPbalanceBidder:: " + updatedGBPbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                GBPbalance: updatedGBPbalanceBidder
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
              var desctroyCurrentBid = await BidGBP.update({
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
            sails.sockets.blast(constants.GBP_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerGBP
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerGBP");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(totoalAskRemainingGBP));
            //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
            console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
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
            console.log("After deduct TX Fees of GBP Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedGBPbalance: updatedFreezedGBPbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskGBP.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountGBP: parseFloat(totoalAskRemainingGBP),
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
            sails.sockets.blast(constants.GBP_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingGBP :: " + totoalAskRemainingGBP);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingGBP = totoalAskRemainingGBP - allBidsFromdb[i].bidAmountGBP;
          if (totoalAskRemainingGBP >= currentBidDetails.bidAmountGBP) {
            //totoalAskRemainingGBP = (parseFloat(totoalAskRemainingGBP) - parseFloat(currentBidDetails.bidAmountGBP));
            totoalAskRemainingGBP = totoalAskRemainingGBP.minus(currentBidDetails.bidAmountGBP);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingGBP == 0::: " + totoalAskRemainingGBP);

            if (totoalAskRemainingGBP == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingGBP == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerGBP
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
                  id: askDetails.askownerGBP
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerGBP :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(currentBidDetails.bidAmountGBP));
              var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBidder.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(currentBidDetails.bidAmountGBP);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 GBP Update user " + updatedGBPbalanceBidder);
              //var txFeesBidderGBP = (parseFloat(currentBidDetails.bidAmountGBP) * parseFloat(txFeeWithdrawSuccessGBP));

              // var txFeesBidderGBP = new BigNumber(currentBidDetails.bidAmountGBP);
              // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
              // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);
              // console.log("After deduct TX Fees of GBP Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerGBP
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  GBPbalance: updatedGBPbalanceBidder
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
              //var updatedFreezedGBPbalanceAsker = parseFloat(totoalAskRemainingGBP);
              //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(totoalAskRemainingGBP));
              //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
              var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
              console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
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

              console.log("After deduct TX Fees of GBP Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerGBP
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidGBP.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidGBP.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidGBP.update({
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
              sails.sockets.blast(constants.GBP_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskGBP.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskGBP.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskGBP.update({
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
              sails.sockets.blast(constants.GBP_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingGBP == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerGBP " + currentBidDetails.bidownerGBP);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerGBP
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

              //var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(currentBidDetails.bidAmountGBP));
              var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBidder.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(currentBidDetails.bidAmountGBP);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of GBP Update user " + updatedGBPbalanceBidder);
              //var txFeesBidderGBP = (parseFloat(currentBidDetails.bidAmountGBP) * parseFloat(txFeeWithdrawSuccessGBP));
              // var txFeesBidderGBP = new BigNumber(currentBidDetails.bidAmountGBP);
              // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
              // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);
              // console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedGBPbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerGBP
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  GBPbalance: updatedGBPbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidGBP.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidGBP.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.GBP_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerGBP
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
            //var updatedBidAmountGBP = (parseFloat(currentBidDetails.bidAmountGBP) - parseFloat(totoalAskRemainingGBP));
            var updatedBidAmountGBP = new BigNumber(currentBidDetails.bidAmountGBP);
            updatedBidAmountGBP = updatedBidAmountGBP.minus(totoalAskRemainingGBP);

            try {
              var updatedaskDetails = await BidGBP.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountGBP: updatedBidAmountGBP,
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
            sails.sockets.blast(constants.GBP_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerGBP
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


            //var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.GBPbalance) + parseFloat(totoalAskRemainingGBP));

            var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.GBPbalance);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(totoalAskRemainingGBP);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of GBP Update user " + updatedGBPbalanceBidder);
            //var GBPAmountSucess = parseFloat(totoalAskRemainingGBP);
            //var GBPAmountSucess = new BigNumber(totoalAskRemainingGBP);
            //var txFeesBidderGBP = (parseFloat(GBPAmountSucess) * parseFloat(txFeeWithdrawSuccessGBP));
            //var txFeesBidderGBP = (parseFloat(totoalAskRemainingGBP) * parseFloat(txFeeWithdrawSuccessGBP));



            // var txFeesBidderGBP = new BigNumber(totoalAskRemainingGBP);
            // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
            //
            // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
            // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedGBPbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                GBPbalance: updatedGBPbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerGBP");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of GBP Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedGBPbalance: updatedFreezedGBPbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskGBP.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskGBP.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskGBP.update({
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
            //emitting event for GBP_ask destruction
            sails.sockets.blast(constants.GBP_ASK_DESTROYED, askDestroy);
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
  addBidGBPMarket: async function(req, res) {
    console.log("Enter into ask api addBidGBPMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountGBP = new BigNumber(req.body.bidAmountGBP);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountGBP = parseFloat(userBidAmountGBP);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountGBP || !userBidAmountBTC ||
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
      var bidDetails = await BidGBP.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountGBP: userBidAmountGBP,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountGBP: userBidAmountGBP,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerGBP: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.GBP_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskGBP.find({
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
        var totoalBidRemainingGBP = new BigNumber(userBidAmountGBP);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of GBP
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountGBP;
        }
        if (total_ask <= totoalBidRemainingGBP) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingGBP :: " + totoalBidRemainingGBP);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingGBP = totoalBidRemainingGBP - allAsksFromdb[i].bidAmountGBP;
            //totoalBidRemainingGBP = (parseFloat(totoalBidRemainingGBP) - parseFloat(currentAskDetails.askAmountGBP));
            totoalBidRemainingGBP = totoalBidRemainingGBP.minus(currentAskDetails.askAmountGBP);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingGBP == 0::: " + totoalBidRemainingGBP);
            if (totoalBidRemainingGBP == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingGBP == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerGBP
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerGBP totoalBidRemainingGBP == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(currentAskDetails.askAmountGBP));
              var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(currentAskDetails.askAmountGBP);
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
              console.log("After deduct TX Fees of GBP Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedGBPbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
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
                  id: bidDetails.bidownerGBP
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and GBP  give to bidder
              //var updatedGBPbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.GBPbalance) + parseFloat(totoalBidRemainingGBP)) - parseFloat(totoalBidRemainingBTC);
              //var updatedGBPbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.GBPbalance) + parseFloat(userBidAmountGBP)) - parseFloat(totoalBidRemainingGBP));
              var updatedGBPbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(totoalBidRemainingGBP);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainGBP updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
              //var GBPAmountSucess = (parseFloat(userBidAmountGBP) - parseFloat(totoalBidRemainingGBP));
              // var GBPAmountSucess = new BigNumber(userBidAmountGBP);
              // GBPAmountSucess = GBPAmountSucess.minus(totoalBidRemainingGBP);
              //
              // //var txFeesBidderGBP = (parseFloat(GBPAmountSucess) * parseFloat(txFeeWithdrawSuccessGBP));
              // var txFeesBidderGBP = new BigNumber(GBPAmountSucess);
              // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
              //
              // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingGBP == 0updatedGBPbalanceBidder ::: " + updatedGBPbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingGBP asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingGBP == 0BidGBP.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidGBP.destroy({
              //   id: bidDetails.bidownerGBP
              // });
              try {
                var bidDestroy = await BidGBP.update({
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
              sails.sockets.blast(constants.GBP_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0AskGBP.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskGBP.destroy({
              //   id: currentAskDetails.askownerGBP
              // });
              try {
                var askDestroy = await AskGBP.update({
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
              sails.sockets.blast(constants.GBP_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0  enter into else of totoalBidRemainingGBP == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == 0start User.findOne currentAskDetails.bidownerGBP ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerGBP
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(currentAskDetails.askAmountGBP));
              var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(currentAskDetails.askAmountGBP);
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

              console.log("After deduct TX Fees of GBP Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskGBP.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskGBP.update({
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

              sails.sockets.blast(constants.GBP_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingGBP == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerGBP
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerGBP");
              //var updatedGBPbalanceBidder = ((parseFloat(userAllDetailsInDBBid.GBPbalance) + parseFloat(userBidAmountGBP)) - parseFloat(totoalBidRemainingGBP));
              var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBid.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(totoalBidRemainingGBP);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainGBP updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
              //var GBPAmountSucess = (parseFloat(userBidAmountGBP) - parseFloat(totoalBidRemainingGBP));
              // var GBPAmountSucess = new BigNumber(userBidAmountGBP);
              // GBPAmountSucess = GBPAmountSucess.minus(totoalBidRemainingGBP);
              //
              // //var txFeesBidderGBP = (parseFloat(GBPAmountSucess) * parseFloat(txFeeWithdrawSuccessGBP));
              // var txFeesBidderGBP = new BigNumber(GBPAmountSucess);
              // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
              //
              // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);
              // console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedGBPbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountGBP totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidGBP.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountGBP: totoalBidRemainingGBP,
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
              sails.sockets.blast(constants.GBP_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingGBP :: " + totoalBidRemainingGBP);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingGBP = totoalBidRemainingGBP - allAsksFromdb[i].bidAmountGBP;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingGBP = totoalBidRemainingGBP.minus(currentAskDetails.askAmountGBP);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingGBP == 0::: " + totoalBidRemainingGBP);

              if (totoalBidRemainingGBP == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingGBP == 0Enter into totoalBidRemainingGBP == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerGBP
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
                    id: bidDetails.bidownerGBP
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingGBP == 0userAll bidDetails.askownerGBP :: ");
                console.log(" totoalBidRemainingGBP == 0Update value of Bidder and asker");
                //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(currentAskDetails.askAmountGBP));
                var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
                updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(currentAskDetails.askAmountGBP);

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

                console.log("After deduct TX Fees of GBP Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingGBP == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingGBP == 0updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);
                console.log(" totoalBidRemainingGBP == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerGBP
                  }, {
                    FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedGBPbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(userBidAmountGBP)) - parseFloat(totoalBidRemainingGBP));

                var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBidder.GBPbalance);
                updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);
                updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(totoalBidRemainingGBP);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalBidRemainingBTC);
                console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
                //var GBPAmountSucess = (parseFloat(userBidAmountGBP) - parseFloat(totoalBidRemainingGBP));
                // var GBPAmountSucess = new BigNumber(userBidAmountGBP);
                // GBPAmountSucess = GBPAmountSucess.minus(totoalBidRemainingGBP);
                //
                //
                // //var txFeesBidderGBP = (parseFloat(GBPAmountSucess) * parseFloat(txFeeWithdrawSuccessGBP));
                // var txFeesBidderGBP = new BigNumber(GBPAmountSucess);
                // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
                // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
                // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
                // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
                //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
                updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);



                console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0 updatedFreezedGBPbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerGBP
                  }, {
                    GBPbalance: updatedGBPbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0 BidGBP.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskGBP.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskGBP.update({
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
                sails.sockets.blast(constants.GBP_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0 AskGBP.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidGBP.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidGBP.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.GBP_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0 enter into else of totoalBidRemainingGBP == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0totoalBidRemainingGBP == 0 start User.findOne currentAskDetails.bidownerGBP " + currentAskDetails.bidownerGBP);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerGBP
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(currentAskDetails.askAmountGBP));

                var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
                updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(currentAskDetails.askAmountGBP);

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
                console.log("After deduct TX Fees of GBP Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0 updatedFreezedGBPbalanceAsker:: " + updatedFreezedGBPbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerGBP
                  }, {
                    FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskGBP.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskGBP.update({
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
                sails.sockets.blast(constants.GBP_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountGBP = (parseFloat(currentAskDetails.askAmountGBP) - parseFloat(totoalBidRemainingGBP));

              var updatedAskAmountGBP = new BigNumber(currentAskDetails.askAmountGBP);
              updatedAskAmountGBP = updatedAskAmountGBP.minus(totoalBidRemainingGBP);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskGBP.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountGBP: updatedAskAmountGBP,
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
              sails.sockets.blast(constants.GBP_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerGBP
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(totoalBidRemainingGBP));
              var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(totoalBidRemainingGBP);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
              console.log("Total Ask RemainGBP updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of GBP Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedGBPbalanceAsker:: " + updatedFreezedGBPbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
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
                  id: bidDetails.bidownerGBP
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerGBP");
              //var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(userBidAmountGBP));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountGBP " + userBidAmountGBP);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.GBPbalance " + userAllDetailsInDBBidder.GBPbalance);

              var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBidder.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
              //var txFeesBidderGBP = (parseFloat(updatedGBPbalanceBidder) * parseFloat(txFeeWithdrawSuccessGBP));
              // var txFeesBidderGBP = new BigNumber(userBidAmountGBP);
              // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
              //
              // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderGBP = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedGBPbalanceBidder ::: " + updatedGBPbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidGBP.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidGBP.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidGBP.update({
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
              sails.sockets.blast(constants.GBP_BID_DESTROYED, bidDestroy);
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
  removeBidGBPMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdGBP;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidGBP.findOne({
      bidownerGBP: bidownerId,
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
            BidGBP.update({
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
              sails.sockets.blast(constants.GBP_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskGBPMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdGBP;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskGBP.findOne({
      askownerGBP: askownerId,
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
        var userGBPBalanceInDb = parseFloat(user.GBPbalance);
        var askAmountOfGBPInAskTableDB = parseFloat(askDetails.askAmountGBP);
        var userFreezedGBPbalanceInDB = parseFloat(user.FreezedGBPbalance);
        console.log("userGBPBalanceInDb :" + userGBPBalanceInDb);
        console.log("askAmountOfGBPInAskTableDB :" + askAmountOfGBPInAskTableDB);
        console.log("userFreezedGBPbalanceInDB :" + userFreezedGBPbalanceInDB);
        var updateFreezedGBPBalance = (parseFloat(userFreezedGBPbalanceInDB) - parseFloat(askAmountOfGBPInAskTableDB));
        var updateUserGBPBalance = (parseFloat(userGBPBalanceInDb) + parseFloat(askAmountOfGBPInAskTableDB));
        User.update({
            id: askownerId
          }, {
            GBPbalance: parseFloat(updateUserGBPBalance),
            FreezedGBPbalance: parseFloat(updateFreezedGBPBalance)
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
            AskGBP.update({
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
              sails.sockets.blast(constants.GBP_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidGBP: function(req, res) {
    console.log("Enter into ask api getAllBidGBP :: ");
    BidGBP.find({
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
            BidGBP.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountGBP')
              .exec(function(err, bidAmountGBPSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountGBPSum",
                    statusCode: 401
                  });
                }
                BidGBP.find({
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
                        "message": "Error to sum Of bidAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGBP: allAskDetailsToExecute,
                      bidAmountGBPSum: bidAmountGBPSum[0].bidAmountGBP,
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
  getAllAskGBP: function(req, res) {
    console.log("Enter into ask api getAllAskGBP :: ");
    AskGBP.find({
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
            AskGBP.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountGBP')
              .exec(function(err, askAmountGBPSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountGBPSum",
                    statusCode: 401
                  });
                }
                AskGBP.find({
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
                        "message": "Error to sum Of askAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGBP: allAskDetailsToExecute,
                      askAmountGBPSum: askAmountGBPSum[0].askAmountGBP,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskGBP Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsGBPSuccess: function(req, res) {
    console.log("Enter into ask api getBidsGBPSuccess :: ");
    BidGBP.find({
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
            BidGBP.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountGBP')
              .exec(function(err, bidAmountGBPSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountGBPSum",
                    statusCode: 401
                  });
                }
                BidGBP.find({
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
                        "message": "Error to sum Of bidAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGBP: allAskDetailsToExecute,
                      bidAmountGBPSum: bidAmountGBPSum[0].bidAmountGBP,
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
  getAsksGBPSuccess: function(req, res) {
    console.log("Enter into ask api getAsksGBPSuccess :: ");
    AskGBP.find({
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
            AskGBP.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountGBP')
              .exec(function(err, askAmountGBPSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountGBPSum",
                    statusCode: 401
                  });
                }
                AskGBP.find({
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
                        "message": "Error to sum Of askAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGBP: allAskDetailsToExecute,
                      askAmountGBPSum: askAmountGBPSum[0].askAmountGBP,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskGBP Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};