/**
 * TrademarketLTCJPYController
 *JPY
 * @description :: Server-side logic for managing trademarketltcjpies
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

  addAskJPYMarket: async function(req, res) {
    console.log("Enter into ask api addAskJPYMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountJPY = new BigNumber(req.body.askAmountJPY);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountJPY || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountJPY < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountJPY = parseFloat(userAskAmountJPY);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskJPY.create({
        askAmountLTC: userAskAmountLTC,
        askAmountJPY: userAskAmountJPY,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountJPY: userAskAmountJPY,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingJPY = (parseFloat(totoalAskRemainingJPY) - parseFloat(currentBidDetails.bidAmountJPY));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingJPY = totoalAskRemainingJPY.minus(currentBidDetails.bidAmountJPY);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingJPY :: " + totoalAskRemainingJPY);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(currentBidDetails.bidAmountJPY));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);


            //updatedJPYbalanceBidder =  parseFloat(updatedJPYbalanceBidder);

            console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerJPY
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedJPYbalanceAsker = parseFloat(totoalAskRemainingJPY);
            //var updatedFreezedJPYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(userAskAmountJPY)) + parseFloat(totoalAskRemainingJPY));
            var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(userAskAmountJPY);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.plus(totoalAskRemainingJPY);

            //updatedFreezedJPYbalanceAsker =  parseFloat(updatedFreezedJPYbalanceAsker);
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
            console.log("After deduct TX Fees of JPY Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerJPY
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedJPYbalance: updatedFreezedJPYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed JPYBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(currentBidDetails.bidAmountJPY));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);


            console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedJPYbalanceBidder:: " + updatedJPYbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerJPY
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerJPY");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(totoalAskRemainingJPY));
            //var updatedFreezedJPYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(userAskAmountJPY)) + parseFloat(totoalAskRemainingJPY));
            var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(userAskAmountJPY);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.plus(totoalAskRemainingJPY);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainJPY totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainJPY userAllDetailsInDBAsker.FreezedJPYbalance " + userAllDetailsInDBAsker.FreezedJPYbalance);
            console.log("Total Ask RemainJPY updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
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
            console.log("After deduct TX Fees of JPY Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedJPYbalanceAsker ::: " + updatedFreezedJPYbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerJPY
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedJPYbalance: updatedFreezedJPYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountJPY totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskJPY.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingJPY = totoalAskRemainingJPY - allBidsFromdb[i].bidAmountJPY;
          if (totoalAskRemainingJPY >= currentBidDetails.bidAmountJPY) {
            //totoalAskRemainingJPY = (parseFloat(totoalAskRemainingJPY) - parseFloat(currentBidDetails.bidAmountJPY));
            totoalAskRemainingJPY = totoalAskRemainingJPY.minus(currentBidDetails.bidAmountJPY);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of JPY Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingJPY " + totoalAskRemainingJPY);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerJPY
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  JPYbalance: updatedJPYbalanceBidder
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
              //var updatedFreezedJPYbalanceAsker = parseFloat(totoalAskRemainingJPY);
              //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(totoalAskRemainingJPY));
              //var updatedFreezedJPYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(userAskAmountJPY)) + parseFloat(totoalAskRemainingJPY));
              var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
              updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(userAskAmountJPY);
              updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.plus(totoalAskRemainingJPY);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainJPY totoalAskRemainingJPY " + totoalAskRemainingJPY);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainJPY userAllDetailsInDBAsker.FreezedJPYbalance " + userAllDetailsInDBAsker.FreezedJPYbalance);
              console.log("Total Ask RemainJPY updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
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

              console.log("After deduct TX Fees of JPY Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedJPYbalanceAsker ::: " + updatedFreezedJPYbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingJPY " + totoalAskRemainingJPY);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerJPY
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedJPYbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingJPY " + totoalAskRemainingJPY);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerJPY
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountJPY = (parseFloat(currentBidDetails.bidAmountJPY) - parseFloat(totoalAskRemainingJPY));
            var updatedBidAmountJPY = new BigNumber(currentBidDetails.bidAmountJPY);
            updatedBidAmountJPY = updatedBidAmountJPY.minus(totoalAskRemainingJPY);

            try {
              var updatedaskDetails = await BidJPY.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

            console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
            console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedJPYbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerJPY
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerJPY");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedJPYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedJPYbalance) - parseFloat(userAskAmountJPY));
            var updatedFreezedJPYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedJPYbalance);
            updatedFreezedJPYbalanceAsker = updatedFreezedJPYbalanceAsker.minus(userAskAmountJPY);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of JPY Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedJPYbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingJPY " + totoalAskRemainingJPY);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerJPY
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountJPY = new BigNumber(req.body.bidAmountJPY);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountJPY = parseFloat(userBidAmountJPY);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountJPY || !userBidAmountLTC ||
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
      var bidDetails = await BidJPY.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountJPY: userBidAmountJPY,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountJPY: userBidAmountJPY,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskJPY.find({
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
        var totoalBidRemainingJPY = new BigNumber(userBidAmountJPY);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of JPY
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountJPY;
        }
        if (total_ask <= totoalBidRemainingJPY) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingJPY :: " + totoalBidRemainingJPY);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingJPY = totoalBidRemainingJPY - allAsksFromdb[i].bidAmountJPY;
            //totoalBidRemainingJPY = (parseFloat(totoalBidRemainingJPY) - parseFloat(currentAskDetails.askAmountJPY));
            totoalBidRemainingJPY = totoalBidRemainingJPY.minus(currentAskDetails.askAmountJPY);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of JPY Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedJPYbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerJPY
                }, {
                  FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and JPY  give to bidder
              //var updatedJPYbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.JPYbalance) + parseFloat(totoalBidRemainingJPY)) - parseFloat(totoalBidRemainingLTC);
              //var updatedJPYbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.JPYbalance) + parseFloat(userBidAmountJPY)) - parseFloat(totoalBidRemainingJPY));
              var updatedJPYbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.JPYbalance);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(userBidAmountJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(totoalBidRemainingJPY);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainJPY totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainJPY BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainJPY updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingJPY == 0updatedJPYbalanceBidder ::: " + updatedJPYbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingJPY asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerJPY
                }, {
                  JPYbalance: updatedJPYbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of JPY Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingJPY == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingJPY == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerJPY
                }, {
                  FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerJPY");
              //var updatedJPYbalanceBidder = ((parseFloat(userAllDetailsInDBBid.JPYbalance) + parseFloat(userBidAmountJPY)) - parseFloat(totoalBidRemainingJPY));
              var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBid.JPYbalance);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(userBidAmountJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(totoalBidRemainingJPY);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainJPY totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainJPY BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainJPY updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedJPYbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerJPY
                }, {
                  JPYbalance: updatedJPYbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountJPY totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidJPY.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingJPY = totoalBidRemainingJPY - allAsksFromdb[i].bidAmountJPY;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingJPY = totoalBidRemainingJPY.minus(currentAskDetails.askAmountJPY);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of JPY Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingJPY == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingJPY == 0updatedFreezedJPYbalanceAsker ::: " + updatedFreezedJPYbalanceAsker);
                console.log(" totoalBidRemainingJPY == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingJPY " + totoalBidRemainingJPY);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerJPY
                  }, {
                    FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainJPY totoalAskRemainingJPY " + totoalBidRemainingLTC);
                console.log("Total Ask RemainJPY BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainJPY updatedFreezedJPYbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
                //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
                updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);



                console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingJPY == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingJPY == 0 updatedFreezedJPYbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingJPY " + totoalBidRemainingJPY);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerJPY
                  }, {
                    JPYbalance: updatedJPYbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of JPY Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0 updatedFreezedJPYbalanceAsker:: " + updatedFreezedJPYbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingJPY == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingJPY " + totoalBidRemainingJPY);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerJPY
                  }, {
                    FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountJPY = (parseFloat(currentAskDetails.askAmountJPY) - parseFloat(totoalBidRemainingJPY));

              var updatedAskAmountJPY = new BigNumber(currentAskDetails.askAmountJPY);
              updatedAskAmountJPY = updatedAskAmountJPY.minus(totoalBidRemainingJPY);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskJPY.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainJPY totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainJPY userAllDetailsInDBAsker.FreezedJPYbalance " + userAllDetailsInDBAsker.FreezedJPYbalance);
              console.log("Total Ask RemainJPY updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of JPY Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedJPYbalanceAsker:: " + updatedFreezedJPYbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedJPYbalanceAsker " + updatedFreezedJPYbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerJPY
                }, {
                  FreezedJPYbalance: updatedFreezedJPYbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerJPY");
              //var updatedJPYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.JPYbalance) + parseFloat(userBidAmountJPY));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountJPY " + userBidAmountJPY);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.JPYbalance " + userAllDetailsInDBBidder.JPYbalance);

              var updatedJPYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.JPYbalance);
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.plus(userBidAmountJPY);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);
              //var txFeesBidderJPY = (parseFloat(updatedJPYbalanceBidder) * parseFloat(txFeeWithdrawSuccessJPY));
              // var txFeesBidderJPY = new BigNumber(userBidAmountJPY);
              // txFeesBidderJPY = txFeesBidderJPY.times(txFeeWithdrawSuccessJPY);
              //
              // console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              // //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              // updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderJPY = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderJPY :: " + txFeesBidderJPY);
              //updatedJPYbalanceBidder = (parseFloat(updatedJPYbalanceBidder) - parseFloat(txFeesBidderJPY));
              updatedJPYbalanceBidder = updatedJPYbalanceBidder.minus(txFeesBidderJPY);

              console.log("After deduct TX Fees of JPY Update user " + updatedJPYbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedJPYbalanceBidder ::: " + updatedJPYbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedJPYbalanceBidder " + updatedJPYbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingJPY " + totoalBidRemainingJPY);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerJPY
                }, {
                  JPYbalance: updatedJPYbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidJPY.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
            BidJPY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountJPYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsJPY: allAskDetailsToExecute,
                      bidAmountJPYSum: bidAmountJPYSum[0].bidAmountJPY,
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
  getAllAskJPY: function(req, res) {
    console.log("Enter into ask api getAllAskJPY :: ");
    AskJPY.find({
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
            AskJPY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountJPYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksJPY: allAskDetailsToExecute,
                      askAmountJPYSum: askAmountJPYSum[0].askAmountJPY,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
            BidJPY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountJPYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsJPY: allAskDetailsToExecute,
                      bidAmountJPYSum: bidAmountJPYSum[0].bidAmountJPY,
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
  getAsksJPYSuccess: function(req, res) {
    console.log("Enter into ask api getAsksJPYSuccess :: ");
    AskJPY.find({
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
            AskJPY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountJPYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksJPY: allAskDetailsToExecute,
                      askAmountJPYSum: askAmountJPYSum[0].askAmountJPY,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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