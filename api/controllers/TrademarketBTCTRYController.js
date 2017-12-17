/**
 * TrademarketBTCTRYController
 *
 * @description :: Server-side logic for managing trademarketbtctries
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

  addAskTRYMarket: async function(req, res) {
    console.log("Enter into ask api addAskTRYMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountTRY = new BigNumber(req.body.askAmountTRY);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountTRY || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountTRY < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userTRYBalanceInDb = new BigNumber(userAsker.TRYbalance);
    var userFreezedTRYBalanceInDb = new BigNumber(userAsker.FreezedTRYbalance);

    userTRYBalanceInDb = parseFloat(userTRYBalanceInDb);
    userFreezedTRYBalanceInDb = parseFloat(userFreezedTRYBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountTRY.greaterThanOrEqualTo(userTRYBalanceInDb)) {
      return res.json({
        "message": "You have insufficient TRY Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountTRY :: " + userAskAmountTRY);
    console.log("userTRYBalanceInDb :: " + userTRYBalanceInDb);
    // if (userAskAmountTRY >= userTRYBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient TRY Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountTRY = parseFloat(userAskAmountTRY);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskTRY.create({
        askAmountBTC: userAskAmountBTC,
        askAmountTRY: userAskAmountTRY,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountTRY: userAskAmountTRY,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerTRY: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.TRY_ASK_ADDED, askDetails);
    // var updateUserTRYBalance = (parseFloat(userTRYBalanceInDb) - parseFloat(userAskAmountTRY));
    // var updateFreezedTRYBalance = (parseFloat(userFreezedTRYBalanceInDb) + parseFloat(userAskAmountTRY));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userTRYBalanceInDb = new BigNumber(userTRYBalanceInDb);
    var updateUserTRYBalance = userTRYBalanceInDb.minus(userAskAmountTRY);
    updateUserTRYBalance = parseFloat(updateUserTRYBalance);
    userFreezedTRYBalanceInDb = new BigNumber(userFreezedTRYBalanceInDb);
    var updateFreezedTRYBalance = userFreezedTRYBalanceInDb.plus(userAskAmountTRY);
    updateFreezedTRYBalance = parseFloat(updateFreezedTRYBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedTRYbalance: updateFreezedTRYBalance,
        TRYbalance: updateUserTRYBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidTRY.find({
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
        message: 'Failed to find TRY bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingTRY = new BigNumber(userAskAmountTRY);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of TRY
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountTRY;
      }
      if (total_bid <= totoalAskRemainingTRY) {
        console.log("Inside of total_bid <= totoalAskRemainingTRY");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingTRY");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingTRY :: " + totoalAskRemainingTRY);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingTRY = (parseFloat(totoalAskRemainingTRY) - parseFloat(currentBidDetails.bidAmountTRY));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingTRY = totoalAskRemainingTRY.minus(currentBidDetails.bidAmountTRY);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingTRY :: " + totoalAskRemainingTRY);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingTRY == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingTRY == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerTRY
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerTRY
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(currentBidDetails.bidAmountTRY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of TRY Update user " + updatedTRYbalanceBidder);
            //var txFeesBidderTRY = (parseFloat(currentBidDetails.bidAmountTRY) * parseFloat(txFeeWithdrawSuccessTRY));
            // var txFeesBidderTRY = new BigNumber(currentBidDetails.bidAmountTRY);
            //
            // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY)
            // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
            // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


            //updatedTRYbalanceBidder =  parseFloat(updatedTRYbalanceBidder);

            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                TRYbalance: updatedTRYbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and TRY balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedTRYbalanceAsker = parseFloat(totoalAskRemainingTRY);
            //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);

            //updatedFreezedTRYbalanceAsker =  parseFloat(updatedFreezedTRYbalanceAsker);
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
            console.log("After deduct TX Fees of TRY Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedTRYbalance: updatedFreezedTRYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed TRYBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidTRY:: ");
            try {
              var bidDestroy = await BidTRY.update({
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
            sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskTRY.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskTRY.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskTRY',
                statusCode: 401
              });
            }
            //emitting event of destruction of TRY_ask
            sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingTRY == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerTRY " + currentBidDetails.bidownerTRY);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerTRY
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(currentBidDetails.bidAmountTRY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of TRY 089089Update user " + updatedTRYbalanceBidder);
            // var txFeesBidderTRY = (parseFloat(currentBidDetails.bidAmountTRY) * parseFloat(txFeeWithdrawSuccessTRY));
            // var txFeesBidderTRY = new BigNumber(currentBidDetails.bidAmountTRY);
            // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
            // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            // // updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
            // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedTRYbalanceBidder:: " + updatedTRYbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                TRYbalance: updatedTRYbalanceBidder
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
              var desctroyCurrentBid = await BidTRY.update({
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
            sails.sockets.blast(constants.TRY_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerTRY
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerTRY");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(totoalAskRemainingTRY));
            //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
            console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
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
            console.log("After deduct TX Fees of TRY Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedTRYbalance: updatedFreezedTRYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskTRY.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountTRY: parseFloat(totoalAskRemainingTRY),
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
            sails.sockets.blast(constants.TRY_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingTRY :: " + totoalAskRemainingTRY);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingTRY = totoalAskRemainingTRY - allBidsFromdb[i].bidAmountTRY;
          if (totoalAskRemainingTRY >= currentBidDetails.bidAmountTRY) {
            //totoalAskRemainingTRY = (parseFloat(totoalAskRemainingTRY) - parseFloat(currentBidDetails.bidAmountTRY));
            totoalAskRemainingTRY = totoalAskRemainingTRY.minus(currentBidDetails.bidAmountTRY);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingTRY == 0::: " + totoalAskRemainingTRY);

            if (totoalAskRemainingTRY == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingTRY == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerTRY
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
                  id: askDetails.askownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerTRY :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));
              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(currentBidDetails.bidAmountTRY);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 TRY Update user " + updatedTRYbalanceBidder);
              //var txFeesBidderTRY = (parseFloat(currentBidDetails.bidAmountTRY) * parseFloat(txFeeWithdrawSuccessTRY));

              // var txFeesBidderTRY = new BigNumber(currentBidDetails.bidAmountTRY);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);
              // console.log("After deduct TX Fees of TRY Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerTRY
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  TRYbalance: updatedTRYbalanceBidder
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
              //var updatedFreezedTRYbalanceAsker = parseFloat(totoalAskRemainingTRY);
              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(totoalAskRemainingTRY));
              //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
              console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
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

              console.log("After deduct TX Fees of TRY Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerTRY
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidTRY.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidTRY.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidTRY.update({
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskTRY.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskTRY.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskTRY.update({
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
              sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingTRY == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerTRY " + currentBidDetails.bidownerTRY);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerTRY
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

              //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));
              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(currentBidDetails.bidAmountTRY);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var txFeesBidderTRY = (parseFloat(currentBidDetails.bidAmountTRY) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(currentBidDetails.bidAmountTRY);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);
              // console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedTRYbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerTRY
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  TRYbalance: updatedTRYbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidTRY.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidTRY.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.TRY_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerTRY
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
            //var updatedBidAmountTRY = (parseFloat(currentBidDetails.bidAmountTRY) - parseFloat(totoalAskRemainingTRY));
            var updatedBidAmountTRY = new BigNumber(currentBidDetails.bidAmountTRY);
            updatedBidAmountTRY = updatedBidAmountTRY.minus(totoalAskRemainingTRY);

            try {
              var updatedaskDetails = await BidTRY.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountTRY: updatedBidAmountTRY,
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
            sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerTRY
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


            //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.TRYbalance) + parseFloat(totoalAskRemainingTRY));

            var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.TRYbalance);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(totoalAskRemainingTRY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of TRY Update user " + updatedTRYbalanceBidder);
            //var TRYAmountSucess = parseFloat(totoalAskRemainingTRY);
            //var TRYAmountSucess = new BigNumber(totoalAskRemainingTRY);
            //var txFeesBidderTRY = (parseFloat(TRYAmountSucess) * parseFloat(txFeeWithdrawSuccessTRY));
            //var txFeesBidderTRY = (parseFloat(totoalAskRemainingTRY) * parseFloat(txFeeWithdrawSuccessTRY));



            // var txFeesBidderTRY = new BigNumber(totoalAskRemainingTRY);
            // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
            //
            // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
            // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedTRYbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                TRYbalance: updatedTRYbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerTRY");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of TRY Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedTRYbalance: updatedFreezedTRYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskTRY.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskTRY.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskTRY.update({
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
            //emitting event for TRY_ask destruction
            sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
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
  addBidTRYMarket: async function(req, res) {
    console.log("Enter into ask api addBidTRYMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountTRY = new BigNumber(req.body.bidAmountTRY);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountTRY = parseFloat(userBidAmountTRY);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountTRY || !userBidAmountBTC ||
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
      var bidDetails = await BidTRY.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountTRY: userBidAmountTRY,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountTRY: userBidAmountTRY,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerTRY: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.TRY_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskTRY.find({
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
        var totoalBidRemainingTRY = new BigNumber(userBidAmountTRY);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of TRY
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountTRY;
        }
        if (total_ask <= totoalBidRemainingTRY) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingTRY :: " + totoalBidRemainingTRY);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingTRY = totoalBidRemainingTRY - allAsksFromdb[i].bidAmountTRY;
            //totoalBidRemainingTRY = (parseFloat(totoalBidRemainingTRY) - parseFloat(currentAskDetails.askAmountTRY));
            totoalBidRemainingTRY = totoalBidRemainingTRY.minus(currentAskDetails.askAmountTRY);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingTRY == 0::: " + totoalBidRemainingTRY);
            if (totoalBidRemainingTRY == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingTRY == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerTRY totoalBidRemainingTRY == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(currentAskDetails.askAmountTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(currentAskDetails.askAmountTRY);
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
              console.log("After deduct TX Fees of TRY Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedTRYbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
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
                  id: bidDetails.bidownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and TRY  give to bidder
              //var updatedTRYbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.TRYbalance) + parseFloat(totoalBidRemainingTRY)) - parseFloat(totoalBidRemainingBTC);
              //var updatedTRYbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.TRYbalance) + parseFloat(userBidAmountTRY)) - parseFloat(totoalBidRemainingTRY));
              var updatedTRYbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(totoalBidRemainingTRY);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainTRY updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var TRYAmountSucess = (parseFloat(userBidAmountTRY) - parseFloat(totoalBidRemainingTRY));
              // var TRYAmountSucess = new BigNumber(userBidAmountTRY);
              // TRYAmountSucess = TRYAmountSucess.minus(totoalBidRemainingTRY);
              //
              // //var txFeesBidderTRY = (parseFloat(TRYAmountSucess) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(TRYAmountSucess);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              //
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingTRY == 0updatedTRYbalanceBidder ::: " + updatedTRYbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingTRY asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingTRY == 0BidTRY.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidTRY.destroy({
              //   id: bidDetails.bidownerTRY
              // });
              try {
                var bidDestroy = await BidTRY.update({
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0AskTRY.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskTRY.destroy({
              //   id: currentAskDetails.askownerTRY
              // });
              try {
                var askDestroy = await AskTRY.update({
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
              sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0  enter into else of totoalBidRemainingTRY == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0start User.findOne currentAskDetails.bidownerTRY ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(currentAskDetails.askAmountTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(currentAskDetails.askAmountTRY);
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

              console.log("After deduct TX Fees of TRY Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskTRY.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskTRY.update({
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

              sails.sockets.blast(constants.TRY_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingTRY == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerTRY");
              //var updatedTRYbalanceBidder = ((parseFloat(userAllDetailsInDBBid.TRYbalance) + parseFloat(userBidAmountTRY)) - parseFloat(totoalBidRemainingTRY));
              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBid.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(totoalBidRemainingTRY);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainTRY updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var TRYAmountSucess = (parseFloat(userBidAmountTRY) - parseFloat(totoalBidRemainingTRY));
              // var TRYAmountSucess = new BigNumber(userBidAmountTRY);
              // TRYAmountSucess = TRYAmountSucess.minus(totoalBidRemainingTRY);
              //
              // //var txFeesBidderTRY = (parseFloat(TRYAmountSucess) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(TRYAmountSucess);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              //
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);
              // console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedTRYbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountTRY totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidTRY.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountTRY: totoalBidRemainingTRY,
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingTRY :: " + totoalBidRemainingTRY);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingTRY = totoalBidRemainingTRY - allAsksFromdb[i].bidAmountTRY;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingTRY = totoalBidRemainingTRY.minus(currentAskDetails.askAmountTRY);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingTRY == 0::: " + totoalBidRemainingTRY);

              if (totoalBidRemainingTRY == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingTRY == 0Enter into totoalBidRemainingTRY == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerTRY
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
                    id: bidDetails.bidownerTRY
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingTRY == 0userAll bidDetails.askownerTRY :: ");
                console.log(" totoalBidRemainingTRY == 0Update value of Bidder and asker");
                //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(currentAskDetails.askAmountTRY));
                var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
                updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(currentAskDetails.askAmountTRY);

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

                console.log("After deduct TX Fees of TRY Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingTRY == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingTRY == 0updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);
                console.log(" totoalBidRemainingTRY == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerTRY
                  }, {
                    FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedTRYbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(userBidAmountTRY)) - parseFloat(totoalBidRemainingTRY));

                var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
                updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);
                updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(totoalBidRemainingTRY);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalBidRemainingBTC);
                console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
                //var TRYAmountSucess = (parseFloat(userBidAmountTRY) - parseFloat(totoalBidRemainingTRY));
                // var TRYAmountSucess = new BigNumber(userBidAmountTRY);
                // TRYAmountSucess = TRYAmountSucess.minus(totoalBidRemainingTRY);
                //
                //
                // //var txFeesBidderTRY = (parseFloat(TRYAmountSucess) * parseFloat(txFeeWithdrawSuccessTRY));
                // var txFeesBidderTRY = new BigNumber(TRYAmountSucess);
                // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
                // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
                // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
                // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
                //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
                updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);



                console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 updatedFreezedTRYbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerTRY
                  }, {
                    TRYbalance: updatedTRYbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 BidTRY.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskTRY.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskTRY.update({
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
                sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 AskTRY.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidTRY.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidTRY.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 enter into else of totoalBidRemainingTRY == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0totoalBidRemainingTRY == 0 start User.findOne currentAskDetails.bidownerTRY " + currentAskDetails.bidownerTRY);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerTRY
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(currentAskDetails.askAmountTRY));

                var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
                updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(currentAskDetails.askAmountTRY);

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
                console.log("After deduct TX Fees of TRY Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 updatedFreezedTRYbalanceAsker:: " + updatedFreezedTRYbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerTRY
                  }, {
                    FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskTRY.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskTRY.update({
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
                sails.sockets.blast(constants.TRY_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountTRY = (parseFloat(currentAskDetails.askAmountTRY) - parseFloat(totoalBidRemainingTRY));

              var updatedAskAmountTRY = new BigNumber(currentAskDetails.askAmountTRY);
              updatedAskAmountTRY = updatedAskAmountTRY.minus(totoalBidRemainingTRY);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskTRY.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountTRY: updatedAskAmountTRY,
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
              sails.sockets.blast(constants.TRY_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(totoalBidRemainingTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(totoalBidRemainingTRY);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
              console.log("Total Ask RemainTRY updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of TRY Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedTRYbalanceAsker:: " + updatedFreezedTRYbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
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
                  id: bidDetails.bidownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerTRY");
              //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(userBidAmountTRY));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountTRY " + userBidAmountTRY);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.TRYbalance " + userAllDetailsInDBBidder.TRYbalance);

              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var txFeesBidderTRY = (parseFloat(updatedTRYbalanceBidder) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(userBidAmountTRY);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              //
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderTRY = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedTRYbalanceBidder ::: " + updatedTRYbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidTRY.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidTRY.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidTRY.update({
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
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
  removeBidTRYMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdTRY;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidTRY.findOne({
      bidownerTRY: bidownerId,
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
            BidTRY.update({
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskTRYMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdTRY;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskTRY.findOne({
      askownerTRY: askownerId,
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
        var userTRYBalanceInDb = parseFloat(user.TRYbalance);
        var askAmountOfTRYInAskTableDB = parseFloat(askDetails.askAmountTRY);
        var userFreezedTRYbalanceInDB = parseFloat(user.FreezedTRYbalance);
        console.log("userTRYBalanceInDb :" + userTRYBalanceInDb);
        console.log("askAmountOfTRYInAskTableDB :" + askAmountOfTRYInAskTableDB);
        console.log("userFreezedTRYbalanceInDB :" + userFreezedTRYbalanceInDB);
        var updateFreezedTRYBalance = (parseFloat(userFreezedTRYbalanceInDB) - parseFloat(askAmountOfTRYInAskTableDB));
        var updateUserTRYBalance = (parseFloat(userTRYBalanceInDb) + parseFloat(askAmountOfTRYInAskTableDB));
        User.update({
            id: askownerId
          }, {
            TRYbalance: parseFloat(updateUserTRYBalance),
            FreezedTRYbalance: parseFloat(updateFreezedTRYBalance)
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
            AskTRY.update({
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
              sails.sockets.blast(constants.TRY_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidTRY: function(req, res) {
    console.log("Enter into ask api getAllBidTRY :: ");
    BidTRY.find({
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
            BidTRY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountTRY')
              .exec(function(err, bidAmountTRYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountTRYSum",
                    statusCode: 401
                  });
                }
                BidTRY.find({
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
                        "message": "Error to sum Of bidAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsTRY: allAskDetailsToExecute,
                      bidAmountTRYSum: bidAmountTRYSum[0].bidAmountTRY,
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
  getAllAskTRY: function(req, res) {
    console.log("Enter into ask api getAllAskTRY :: ");
    AskTRY.find({
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
            AskTRY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountTRY')
              .exec(function(err, askAmountTRYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountTRYSum",
                    statusCode: 401
                  });
                }
                AskTRY.find({
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
                        "message": "Error to sum Of askAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksTRY: allAskDetailsToExecute,
                      askAmountTRYSum: askAmountTRYSum[0].askAmountTRY,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskTRY Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsTRYSuccess: function(req, res) {
    console.log("Enter into ask api getBidsTRYSuccess :: ");
    BidTRY.find({
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
            BidTRY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountTRY')
              .exec(function(err, bidAmountTRYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountTRYSum",
                    statusCode: 401
                  });
                }
                BidTRY.find({
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
                        "message": "Error to sum Of bidAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsTRY: allAskDetailsToExecute,
                      bidAmountTRYSum: bidAmountTRYSum[0].bidAmountTRY,
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
  getAsksTRYSuccess: function(req, res) {
    console.log("Enter into ask api getAsksTRYSuccess :: ");
    AskTRY.find({
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
            AskTRY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountTRY')
              .exec(function(err, askAmountTRYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountTRYSum",
                    statusCode: 401
                  });
                }
                AskTRY.find({
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
                        "message": "Error to sum Of askAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksTRY: allAskDetailsToExecute,
                      askAmountTRYSum: askAmountTRYSum[0].askAmountTRY,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskTRY Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};