/**
 * TrademarketBTCJPYController
 *
 * @description :: Server-side logic for managing trademarketbtcjpies
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

  addAskJPYMarket: async function(req, res) {
    console.log("Enter into ask api addAskJPYMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountJPY = new BigNumber(req.body.askAmountJPY);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountJPY || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountJPY < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userJPYBalanceInDb = new BigNumber(userAsker.JPYbalance);
    var userFreezedJPYBalanceInDb = new BigNumber(userAsker.FreezedJPYbalance);

    userJPYBalanceInDb = parseFloat(userJPYBalanceInDb);
    userFreezedJPYBalanceInDb = parseFloat(userFreezedJPYBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountJPY.greaterThanOrEqualTo(userJPYBalanceInDb)) {
      return res.json({
        "message": "You have insufficient JPY Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountJPY :: " + userAskAmountJPY);
    console.log("userJPYBalanceInDb :: " + userJPYBalanceInDb);
    // if (userAskAmountJPY >= userJPYBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient JPY Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountJPY = parseFloat(userAskAmountJPY);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskJPY.create({
        askAmountBTC: userAskAmountBTC,
        askAmountJPY: userAskAmountJPY,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountJPY: userAskAmountJPY,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerJPY: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.JPY_ASK_ADDED, askDetails);
    // var updateUserJPYBalance = (parseFloat(userJPYBalanceInDb) - parseFloat(userAskAmountJPY));
    // var updateFreezedJPYBalance = (parseFloat(userFreezedJPYBalanceInDb) + parseFloat(userAskAmountJPY));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userJPYBalanceInDb = new BigNumber(userJPYBalanceInDb);
    var updateUserJPYBalance = userJPYBalanceInDb.minus(userAskAmountJPY);
    updateUserJPYBalance = parseFloat(updateUserJPYBalance);
    userFreezedJPYBalanceInDb = new BigNumber(userFreezedJPYBalanceInDb);
    var updateFreezedJPYBalance = userFreezedJPYBalanceInDb.plus(userAskAmountJPY);
    updateFreezedJPYBalance = parseFloat(updateFreezedJPYBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedJPYbalance: updateFreezedJPYBalance,
        JPYbalance: updateUserJPYBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidJPY.find({
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
        message: 'Failed to find JPY bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingJPY = new BigNumber(userAskAmountJPY);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of JPY
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountJPY;
      }
      if (total_bid <= totoalAskRemainingJPY) {
        console.log("Inside of total_bid <= totoalAskRemainingJPY");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingJPY");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingJPY :: " + totoalAskRemainingJPY);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingJPY = (parseFloat(totoalAskRemainingJPY) - parseFloat(currentBidDetails.bidAmountJPY));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingJPY = totoalAskRemainingJPY.minus(currentBidDetails.bidAmountJPY);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingJPY :: " + totoalAskRemainingJPY);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingJPY == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingJPY == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerJPY
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerJPY
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(currentBidDetails.bidAmountJPY));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.JPYbalance);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(currentBidDetails.bidAmountJPY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of JPY Update user " + updatedJPYbalanceBidder);
            //var txFeesBidderJPY = (parseFloat(currentBidDetails.bidAmountJPY) * parseFloat(txFeeWithdrawSuccessJPY));
            // var txFeesBidderJPY = new BigNumber(currentBidDetails.bidAmountJPY);
            //
            // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY)
            // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
            // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
            // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);


            //updatedJPYbalanceBidder =  parseFloat(updatedJPYbalanceBidder);

            console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerJPY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                JPYbalance: updatedJPYbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and JPY balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedJPYbalanceAsker = parseFloat(totoalAskRemainingJPY);
            //var updatedFreezedJPYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(userAskAmountJPY)) + parseFloat(totoalAskRemainingJPY));
            var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(userAskAmountJPY);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.plus(totoalAskRemainingJPY);

            //updatedFreezedJPYbalanceAsker =  parseFloat(updatedFreezedJPYbalanceAsker);
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
            console.log("After deduct TX Fees of JPY Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerJPY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedJPYbalance: updatedFreezedJPYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed JPYBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidJPY:: ");
            try {
              var bidDestroy = await BidJPY.update({
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
            sails.sockets.blast(constants.JPY_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskJPY.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskJPY.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskJPY',
                statusCode: 401
              });
            }
            //emitting event of destruction of JPY_ask
            sails.sockets.blast(constants.JPY_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingJPY == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerJPY " + currentBidDetails.bidownerJPY);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerJPY
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(currentBidDetails.bidAmountJPY));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.JPYbalance);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(currentBidDetails.bidAmountJPY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of JPY 089089Update user " + updatedJPYbalanceBidder);
            // var txFeesBidderJPY = (parseFloat(currentBidDetails.bidAmountJPY) * parseFloat(txFeeWithdrawSuccessJPY));
            // var txFeesBidderJPY = new BigNumber(currentBidDetails.bidAmountJPY);
            // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
            // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
            // // updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
            // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);


            console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedJPYbalanceBidder:: " + updatedJPYbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerJPY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                JPYbalance: updatedJPYbalanceBidder
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
              var desctroyCurrentBid = await BidJPY.update({
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
            sails.sockets.blast(constants.JPY_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerJPY
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerJPY");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(totoalAskRemainingJPY));
            //var updatedFreezedJPYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(userAskAmountJPY)) + parseFloat(totoalAskRemainingJPY));
            var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(userAskAmountJPY);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.plus(totoalAskRemainingJPY);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainJPY totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainJPY userAllDetailsInDBAsker.FreezedJPYbalance " + userAllDetailsInDBAsker.FreezedJPYbalance);
            console.log("Total Ask RemainJPY updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
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
            console.log("After deduct TX Fees of JPY Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedJPYbalanceAsker ::: " + updatedFreezedJPYbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerJPY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedJPYbalance: updatedFreezedJPYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountJPY totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskJPY.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountJPY: parseFloat(totoalAskRemainingJPY),
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
            sails.sockets.blast(constants.JPY_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingJPY :: " + totoalAskRemainingJPY);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingJPY = totoalAskRemainingJPY - allBidsFromdb[i].bidAmountJPY;
          if (totoalAskRemainingJPY >= currentBidDetails.bidAmountJPY) {
            //totoalAskRemainingJPY = (parseFloat(totoalAskRemainingJPY) - parseFloat(currentBidDetails.bidAmountJPY));
            totoalAskRemainingJPY = totoalAskRemainingJPY.minus(currentBidDetails.bidAmountJPY);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingJPY == 0::: " + totoalAskRemainingJPY);

            if (totoalAskRemainingJPY == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingJPY == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerJPY
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
                  id: askDetails.askownerJPY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerJPY :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(currentBidDetails.bidAmountJPY));
              var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.JPYbalance);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(currentBidDetails.bidAmountJPY);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 JPY Update user " + updatedJPYbalanceBidder);
              //var txFeesBidderJPY = (parseFloat(currentBidDetails.bidAmountJPY) * parseFloat(txFeeWithdrawSuccessJPY));

              // var txFeesBidderJPY = new BigNumber(currentBidDetails.bidAmountJPY);
              // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
              // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);
              // console.log("After deduct TX Fees of JPY Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingJPY " + totoalAskRemainingJPY);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerJPY
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  JPYbalance: updatedJPYbalanceBidder
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
              //var updatedFreezedJPYbalanceAsker = parseFloat(totoalAskRemainingJPY);
              //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(totoalAskRemainingJPY));
              //var updatedFreezedJPYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(userAskAmountJPY)) + parseFloat(totoalAskRemainingJPY));
              var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
              updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(userAskAmountJPY);
              updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.plus(totoalAskRemainingJPY);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainJPY totoalAskRemainingJPY " + totoalAskRemainingJPY);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainJPY userAllDetailsInDBAsker.FreezedJPYbalance " + userAllDetailsInDBAsker.FreezedJPYbalance);
              console.log("Total Ask RemainJPY updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
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

              console.log("After deduct TX Fees of JPY Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedJPYbalanceAsker ::: " + updatedFreezedJPYbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingJPY " + totoalAskRemainingJPY);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerJPY
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedJPYbalance: updatedFreezedJPYbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidJPY.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidJPY.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidJPY.update({
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
              sails.sockets.blast(constants.JPY_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskJPY.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskJPY.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskJPY.update({
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
              sails.sockets.blast(constants.JPY_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingJPY == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerJPY " + currentBidDetails.bidownerJPY);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerJPY
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

              //var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(currentBidDetails.bidAmountJPY));
              var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.JPYbalance);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(currentBidDetails.bidAmountJPY);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of JPY Update user " + updatedJPYbalanceBidder);
              //var txFeesBidderJPY = (parseFloat(currentBidDetails.bidAmountJPY) * parseFloat(txFeeWithdrawSuccessJPY));
              // var txFeesBidderJPY = new BigNumber(currentBidDetails.bidAmountJPY);
              // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
              // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);
              // console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedJPYbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingJPY " + totoalAskRemainingJPY);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerJPY
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  JPYbalance: updatedJPYbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidJPY.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidJPY.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.JPY_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerJPY
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
            //var updatedBidAmountJPY = (parseFloat(currentBidDetails.bidAmountJPY) - parseFloat(totoalAskRemainingJPY));
            var updatedBidAmountJPY = new BigNumber(currentBidDetails.bidAmountJPY);
            updatedBidAmountJPY = updatedBidAmountJPY.minus(totoalAskRemainingJPY);

            try {
              var updatedaskDetails = await BidJPY.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountJPY: updatedBidAmountJPY,
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
            sails.sockets.blast(constants.JPY_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerJPY
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


            //var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.JPYbalance) + parseFloat(totoalAskRemainingJPY));

            var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.JPYbalance);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(totoalAskRemainingJPY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of JPY Update user " + updatedJPYbalanceBidder);
            //var JPYAmountSucess = parseFloat(totoalAskRemainingJPY);
            //var JPYAmountSucess = new BigNumber(totoalAskRemainingJPY);
            //var txFeesBidderJPY = (parseFloat(JPYAmountSucess) * parseFloat(txFeeWithdrawSuccessJPY));
            //var txFeesBidderJPY = (parseFloat(totoalAskRemainingJPY) * parseFloat(txFeeWithdrawSuccessJPY));



            // var txFeesBidderJPY = new BigNumber(totoalAskRemainingJPY);
            // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
            //
            // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
            // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

            console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
            console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedJPYbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerJPY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                JPYbalance: updatedJPYbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerJPY");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(userAskAmountJPY));
            var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(userAskAmountJPY);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of JPY Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedJPYbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerJPY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedJPYbalance: updatedFreezedJPYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskJPY.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskJPY.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskJPY.update({
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
            //emitting event for JPY_ask destruction
            sails.sockets.blast(constants.JPY_ASK_DESTROYED, askDestroy);
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
  addBidJPYMarket: async function(req, res) {
    console.log("Enter into ask api addBidJPYMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountJPY = new BigNumber(req.body.bidAmountJPY);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountJPY = parseFloat(userBidAmountJPY);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountJPY || !userBidAmountBTC ||
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
      var bidDetails = await BidJPY.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountJPY: userBidAmountJPY,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountJPY: userBidAmountJPY,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerJPY: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.JPY_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskJPY.find({
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
        var totoalBidRemainingJPY = new BigNumber(userBidAmountJPY);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of JPY
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountJPY;
        }
        if (total_ask <= totoalBidRemainingJPY) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingJPY :: " + totoalBidRemainingJPY);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingJPY = totoalBidRemainingJPY - allAsksFromdb[i].bidAmountJPY;
            //totoalBidRemainingJPY = (parseFloat(totoalBidRemainingJPY) - parseFloat(currentAskDetails.askAmountJPY));
            totoalBidRemainingJPY = totoalBidRemainingJPY.minus(currentAskDetails.askAmountJPY);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingJPY == 0::: " + totoalBidRemainingJPY);
            if (totoalBidRemainingJPY == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingJPY == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerJPY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerJPY totoalBidRemainingJPY == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(currentAskDetails.askAmountJPY));
              var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
              updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(currentAskDetails.askAmountJPY);
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
              console.log("After deduct TX Fees of JPY Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedJPYbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerJPY
                }, {
                  FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
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
                  id: bidDetails.bidownerJPY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and JPY  give to bidder
              //var updatedJPYbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.JPYbalance) + parseFloat(totoalBidRemainingJPY)) - parseFloat(totoalBidRemainingBTC);
              //var updatedJPYbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.JPYbalance) + parseFloat(userBidAmountJPY)) - parseFloat(totoalBidRemainingJPY));
              var updatedJPYbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.JPYbalance);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(userBidAmountJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(totoalBidRemainingJPY);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainJPY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainJPY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainJPY updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
              //var JPYAmountSucess = (parseFloat(userBidAmountJPY) - parseFloat(totoalBidRemainingJPY));
              // var JPYAmountSucess = new BigNumber(userBidAmountJPY);
              // JPYAmountSucess = JPYAmountSucess.minus(totoalBidRemainingJPY);
              //
              // //var txFeesBidderJPY = (parseFloat(JPYAmountSucess) * parseFloat(txFeeWithdrawSuccessJPY));
              // var txFeesBidderJPY = new BigNumber(JPYAmountSucess);
              // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
              //
              // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingJPY == 0updatedJPYbalanceBidder ::: " + updatedJPYbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingJPY asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerJPY
                }, {
                  JPYbalance: updatedJPYbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingJPY == 0BidJPY.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidJPY.destroy({
              //   id: bidDetails.bidownerJPY
              // });
              try {
                var bidDestroy = await BidJPY.update({
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
              sails.sockets.blast(constants.JPY_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingJPY == 0AskJPY.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskJPY.destroy({
              //   id: currentAskDetails.askownerJPY
              // });
              try {
                var askDestroy = await AskJPY.update({
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
              sails.sockets.blast(constants.JPY_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0  enter into else of totoalBidRemainingJPY == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingJPY == 0start User.findOne currentAskDetails.bidownerJPY ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerJPY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingJPY == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(currentAskDetails.askAmountJPY));
              var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
              updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(currentAskDetails.askAmountJPY);
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

              console.log("After deduct TX Fees of JPY Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingJPY == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingJPY == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerJPY
                }, {
                  FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingJPY == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskJPY.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskJPY.update({
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

              sails.sockets.blast(constants.JPY_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingJPY == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingJPY == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerJPY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerJPY");
              //var updatedJPYbalanceBidder = ((parseFloat(userAllDetailsInDBBid.JPYbalance) + parseFloat(userBidAmountJPY)) - parseFloat(totoalBidRemainingJPY));
              var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBid.JPYbalance);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(userBidAmountJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(totoalBidRemainingJPY);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainJPY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainJPY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainJPY updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
              //var JPYAmountSucess = (parseFloat(userBidAmountJPY) - parseFloat(totoalBidRemainingJPY));
              // var JPYAmountSucess = new BigNumber(userBidAmountJPY);
              // JPYAmountSucess = JPYAmountSucess.minus(totoalBidRemainingJPY);
              //
              // //var txFeesBidderJPY = (parseFloat(JPYAmountSucess) * parseFloat(txFeeWithdrawSuccessJPY));
              // var txFeesBidderJPY = new BigNumber(JPYAmountSucess);
              // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
              //
              // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);
              // console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedJPYbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerJPY
                }, {
                  JPYbalance: updatedJPYbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountJPY totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidJPY.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountJPY: totoalBidRemainingJPY,
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
              sails.sockets.blast(constants.JPY_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingJPY :: " + totoalBidRemainingJPY);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingJPY = totoalBidRemainingJPY - allAsksFromdb[i].bidAmountJPY;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingJPY = totoalBidRemainingJPY.minus(currentAskDetails.askAmountJPY);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingJPY == 0::: " + totoalBidRemainingJPY);

              if (totoalBidRemainingJPY == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingJPY == 0Enter into totoalBidRemainingJPY == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerJPY
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
                    id: bidDetails.bidownerJPY
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingJPY == 0userAll bidDetails.askownerJPY :: ");
                console.log(" totoalBidRemainingJPY == 0Update value of Bidder and asker");
                //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(currentAskDetails.askAmountJPY));
                var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
                updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(currentAskDetails.askAmountJPY);

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

                console.log("After deduct TX Fees of JPY Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingJPY == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingJPY == 0updatedFreezedJPYbalanceAsker ::: " + updatedFreezedJPYbalanceAsker);
                console.log(" totoalBidRemainingJPY == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingJPY " + totoalBidRemainingJPY);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerJPY
                  }, {
                    FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedJPYbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(userBidAmountJPY)) - parseFloat(totoalBidRemainingJPY));

                var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.JPYbalance);
                updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(userBidAmountJPY);
                updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(totoalBidRemainingJPY);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainJPY totoalAskRemainingJPY " + totoalBidRemainingBTC);
                console.log("Total Ask RemainJPY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainJPY updatedFreezedJPYbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
                //var JPYAmountSucess = (parseFloat(userBidAmountJPY) - parseFloat(totoalBidRemainingJPY));
                // var JPYAmountSucess = new BigNumber(userBidAmountJPY);
                // JPYAmountSucess = JPYAmountSucess.minus(totoalBidRemainingJPY);
                //
                //
                // //var txFeesBidderJPY = (parseFloat(JPYAmountSucess) * parseFloat(txFeeWithdrawSuccessJPY));
                // var txFeesBidderJPY = new BigNumber(JPYAmountSucess);
                // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
                // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
                // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
                // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
                //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
                updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);



                console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingJPY == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingJPY == 0 updatedFreezedJPYbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingJPY " + totoalBidRemainingJPY);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerJPY
                  }, {
                    JPYbalance: updatedJPYbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingJPY == 0 BidJPY.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskJPY.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskJPY.update({
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
                sails.sockets.blast(constants.JPY_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingJPY == 0 AskJPY.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidJPY.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidJPY.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.JPY_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0 enter into else of totoalBidRemainingJPY == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0totoalBidRemainingJPY == 0 start User.findOne currentAskDetails.bidownerJPY " + currentAskDetails.bidownerJPY);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerJPY
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(currentAskDetails.askAmountJPY));

                var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
                updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(currentAskDetails.askAmountJPY);

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
                console.log("After deduct TX Fees of JPY Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0 updatedFreezedJPYbalanceAsker:: " + updatedFreezedJPYbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingJPY " + totoalBidRemainingJPY);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerJPY
                  }, {
                    FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskJPY.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskJPY.update({
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
                sails.sockets.blast(constants.JPY_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountJPY = (parseFloat(currentAskDetails.askAmountJPY) - parseFloat(totoalBidRemainingJPY));

              var updatedAskAmountJPY = new BigNumber(currentAskDetails.askAmountJPY);
              updatedAskAmountJPY = updatedAskAmountJPY.minus(totoalBidRemainingJPY);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskJPY.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountJPY: updatedAskAmountJPY,
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
              sails.sockets.blast(constants.JPY_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerJPY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(totoalBidRemainingJPY));
              var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
              updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(totoalBidRemainingJPY);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainJPY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainJPY userAllDetailsInDBAsker.FreezedJPYbalance " + userAllDetailsInDBAsker.FreezedJPYbalance);
              console.log("Total Ask RemainJPY updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of JPY Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedJPYbalanceAsker:: " + updatedFreezedJPYbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerJPY
                }, {
                  FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
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
                  id: bidDetails.bidownerJPY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerJPY");
              //var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(userBidAmountJPY));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountJPY " + userBidAmountJPY);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.JPYbalance " + userAllDetailsInDBBidder.JPYbalance);

              var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.JPYbalance);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(userBidAmountJPY);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
              //var txFeesBidderJPY = (parseFloat(updatedJPYbalanceBidder) * parseFloat(txFeeWithdrawSuccessJPY));
              // var txFeesBidderJPY = new BigNumber(userBidAmountJPY);
              // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
              //
              // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderJPY = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedJPYbalanceBidder ::: " + updatedJPYbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerJPY
                }, {
                  JPYbalance: updatedJPYbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidJPY.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidJPY.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidJPY.update({
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
              sails.sockets.blast(constants.JPY_BID_DESTROYED, bidDestroy);
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
  removeBidJPYMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdJPY;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidJPY.findOne({
      bidownerJPY: bidownerId,
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
            BidJPY.update({
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
              sails.sockets.blast(constants.JPY_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskJPYMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdJPY;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskJPY.findOne({
      askownerJPY: askownerId,
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
        var userJPYBalanceInDb = parseFloat(user.JPYbalance);
        var askAmountOfJPYInAskTableDB = parseFloat(askDetails.askAmountJPY);
        var userFreezedJPYbalanceInDB = parseFloat(user.FreezedJPYbalance);
        console.log("userJPYBalanceInDb :" + userJPYBalanceInDb);
        console.log("askAmountOfJPYInAskTableDB :" + askAmountOfJPYInAskTableDB);
        console.log("userFreezedJPYbalanceInDB :" + userFreezedJPYbalanceInDB);
        var updateFreezedJPYBalance = (parseFloat(userFreezedJPYbalanceInDB) - parseFloat(askAmountOfJPYInAskTableDB));
        var updateUserJPYBalance = (parseFloat(userJPYBalanceInDb) + parseFloat(askAmountOfJPYInAskTableDB));
        User.update({
            id: askownerId
          }, {
            JPYbalance: parseFloat(updateUserJPYBalance),
            FreezedJPYbalance: parseFloat(updateFreezedJPYBalance)
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
            AskJPY.update({
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
              sails.sockets.blast(constants.JPY_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidJPY: function(req, res) {
    console.log("Enter into ask api getAllBidJPY :: ");
    BidJPY.find({
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
            BidJPY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountJPY')
              .exec(function(err, bidAmountJPYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountJPYSum",
                    statusCode: 401
                  });
                }
                BidJPY.find({
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
                        "message": "Error to sum Of bidAmountJPYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsJPY: allAskDetailsToExecute,
                      bidAmountJPYSum: bidAmountJPYSum[0].bidAmountJPY,
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
  getAllAskJPY: function(req, res) {
    console.log("Enter into ask api getAllAskJPY :: ");
    AskJPY.find({
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
            AskJPY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountJPY')
              .exec(function(err, askAmountJPYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountJPYSum",
                    statusCode: 401
                  });
                }
                AskJPY.find({
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
                        "message": "Error to sum Of askAmountJPYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksJPY: allAskDetailsToExecute,
                      askAmountJPYSum: askAmountJPYSum[0].askAmountJPY,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskJPY Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsJPYSuccess: function(req, res) {
    console.log("Enter into ask api getBidsJPYSuccess :: ");
    BidJPY.find({
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
            BidJPY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountJPY')
              .exec(function(err, bidAmountJPYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountJPYSum",
                    statusCode: 401
                  });
                }
                BidJPY.find({
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
                        "message": "Error to sum Of bidAmountJPYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsJPY: allAskDetailsToExecute,
                      bidAmountJPYSum: bidAmountJPYSum[0].bidAmountJPY,
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
  getAsksJPYSuccess: function(req, res) {
    console.log("Enter into ask api getAsksJPYSuccess :: ");
    AskJPY.find({
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
            AskJPY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountJPY')
              .exec(function(err, askAmountJPYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountJPYSum",
                    statusCode: 401
                  });
                }
                AskJPY.find({
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
                        "message": "Error to sum Of askAmountJPYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksJPY: allAskDetailsToExecute,
                      askAmountJPYSum: askAmountJPYSum[0].askAmountJPY,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskJPY Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};