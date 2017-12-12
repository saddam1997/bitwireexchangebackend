/**
 * TradePYYMarketController
 *
 * @description :: Server-side logic for managing tradepyymarkets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

var statusZero = sails.config.company.statusZero;
var statusOne = sails.config.company.statusOne;
var statusTwo = sails.config.company.statusTwo;

var statusZeroCreated = sails.config.company.statusZeroCreated;
var statusOneSuccessfull = sails.config.company.statusOneSuccessfull;
var statusTwoPending = sails.config.company.statusTwoPending;
var constants = require('./../../config/constants');

const txFeePYYWithdrawSuccess = sails.config.common.txFeePYYWithdrawSuccess;
const txFeeBTCWithdrawSuccess = sails.config.common.txFeeBTCWithdrawSuccess;

module.exports = {
  addAskPYYMarket: async function(req, res) {
    console.log("Enter into ask api addAskPYYMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountPYY = new BigNumber(req.body.askAmountPYY);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountPYY || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountPYY < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userPYYBalanceInDb = new BigNumber(userAsker.PYYbalance);
    var userFreezedPYYBalanceInDb = new BigNumber(userAsker.FreezedPYYbalance);

    userPYYBalanceInDb =  parseFloat(userPYYBalanceInDb);
    userFreezedPYYBalanceInDb =  parseFloat(userFreezedPYYBalanceInDb);

    var userIdInDb = userAsker.id;
    if (userAskAmountPYY.greaterThanOrEqualTo(userPYYBalanceInDb)) {
      return res.json({
        "message": "You have insufficient PYY Balance",
        statusCode: 401
      });
    }
    console.log("userAskAmountPYY :: " + userAskAmountPYY);
    console.log("userPYYBalanceInDb :: " + userPYYBalanceInDb);
    // if (userAskAmountPYY >= userPYYBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient PYY Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC =  parseFloat(userAskAmountBTC);
    userAskAmountPYY =  parseFloat(userAskAmountPYY);
    userAskRate =  parseFloat(userAskRate);
    try {
      var askDetails = await AskPYY.create({
        askAmountBTC: userAskAmountBTC,
        askAmountPYY: userAskAmountPYY,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountPYY: userAskAmountPYY,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        askownerPYY: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.PYY_ASK_ADDED, askDetails);
    // var updateUserPYYBalance = (parseFloat(userPYYBalanceInDb) - parseFloat(userAskAmountPYY));
    // var updateFreezedPYYBalance = (parseFloat(userFreezedPYYBalanceInDb) + parseFloat(userAskAmountPYY));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userPYYBalanceInDb = new BigNumber(userPYYBalanceInDb);
    var updateUserPYYBalance = userPYYBalanceInDb.minus(userAskAmountPYY);
    updateUserPYYBalance =  parseFloat(updateUserPYYBalance);
    userFreezedPYYBalanceInDb = new BigNumber(userFreezedPYYBalanceInDb);
    var updateFreezedPYYBalance = userFreezedPYYBalanceInDb.plus(userAskAmountPYY);
    updateFreezedPYYBalance =  parseFloat(updateFreezedPYYBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedPYYbalance: updateFreezedPYYBalance,
        PYYbalance: updateUserPYYBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidPYY.find({
        bidRate: {
          'like': parseFloat(userAskRate)
        },
        status: {
          '!': statusOne
        }
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to find bch bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingPYY = new BigNumber(userAskAmountPYY);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of PYY
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountPYY;
      }
      if (total_bid <= totoalAskRemainingPYY) {
        console.log("Inside of total_bid <= totoalAskRemainingPYY");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingPYY");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingPYY :: " + totoalAskRemainingPYY);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingPYY = (parseFloat(totoalAskRemainingPYY) - parseFloat(currentBidDetails.bidAmountPYY));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingPYY = totoalAskRemainingPYY.minus(currentBidDetails.bidAmountPYY);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingPYY :: " + totoalAskRemainingPYY);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingPYY == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingPYY == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerPYY
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPYY
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedPYYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PYYbalance) + parseFloat(currentBidDetails.bidAmountPYY));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedPYYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PYYbalance);
            updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(currentBidDetails.bidAmountPYY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of PYY Update user " + updatedPYYbalanceBidder);
            //var txFeesBidderPYY = (parseFloat(currentBidDetails.bidAmountPYY) * parseFloat(txFeePYYWithdrawSuccess));
            // var txFeesBidderPYY = new BigNumber(currentBidDetails.bidAmountPYY);
            //
            // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess)
            // console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
            // //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
            // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
            var  txFeesBidderPYY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
            updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);


            //updatedPYYbalanceBidder =  parseFloat(updatedPYYbalanceBidder);

            console.log("After deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingPYY " + totoalAskRemainingPYY);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerPYY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                PYYbalance: updatedPYYbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and bch balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedPYYbalanceAsker = parseFloat(totoalAskRemainingPYY);
            //var updatedFreezedPYYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(userAskAmountPYY)) + parseFloat(totoalAskRemainingPYY));
            var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
            updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(userAskAmountPYY);
            updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.plus(totoalAskRemainingPYY);

            //updatedFreezedPYYbalanceAsker =  parseFloat(updatedFreezedPYYbalanceAsker);
            //Deduct Transation Fee Asker
            //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var btcAmountSucess = new BigNumber(userAskAmountBTC);
            btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount BTC updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(btcAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log("After deduct TX Fees of PYY Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingPYY " + totoalAskRemainingPYY);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPYY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedPYYbalance: updatedFreezedPYYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed PYYBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidPYY:: ");
            try {
              var bidDestroy = await BidPYY.update({
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
            sails.sockets.blast(constants.PYY_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskPYY.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskPYY.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskPYY',
                statusCode: 401
              });
            }
            //emitting event of destruction of bch_ask
            sails.sockets.blast(constants.PYY_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingPYY == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerPYY " + currentBidDetails.bidownerPYY);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerPYY
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedPYYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PYYbalance) + parseFloat(currentBidDetails.bidAmountPYY));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedPYYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PYYbalance);
            updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(currentBidDetails.bidAmountPYY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of PYY 089089Update user " + updatedPYYbalanceBidder);
            // var txFeesBidderPYY = (parseFloat(currentBidDetails.bidAmountPYY) * parseFloat(txFeePYYWithdrawSuccess));
            // var txFeesBidderPYY = new BigNumber(currentBidDetails.bidAmountPYY);
            // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess);
            // console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
            // // updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
            // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
            var  txFeesBidderPYY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
            updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);


            console.log("After deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedPYYbalanceBidder:: " + updatedPYYbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingPYY " + totoalAskRemainingPYY);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerPYY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                PYYbalance: updatedPYYbalanceBidder
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
              var desctroyCurrentBid = await BidPYY.update({
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
            sails.sockets.blast(constants.PYY_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPYY
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerPYY");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedPYYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(totoalAskRemainingPYY));
            //var updatedFreezedPYYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(userAskAmountPYY)) + parseFloat(totoalAskRemainingPYY));
            var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
            updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(userAskAmountPYY);
            updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.plus(totoalAskRemainingPYY);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainPYY totoalAskRemainingPYY " + totoalAskRemainingPYY);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainPYY userAllDetailsInDBAsker.FreezedPYYbalance " + userAllDetailsInDBAsker.FreezedPYYbalance);
            console.log("Total Ask RemainPYY updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var btcAmountSucess = new BigNumber(userAskAmountBTC);
            btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);

            //var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(btcAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of PYY Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedPYYbalanceAsker ::: " + updatedFreezedPYYbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingPYY " + totoalAskRemainingPYY);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPYY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedPYYbalance: updatedFreezedPYYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountPYY totoalAskRemainingPYY " + totoalAskRemainingPYY);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskPYY.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountPYY: parseFloat(totoalAskRemainingPYY),
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
            sails.sockets.blast(constants.PYY_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingPYY :: " + totoalAskRemainingPYY);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingPYY = totoalAskRemainingPYY - allBidsFromdb[i].bidAmountPYY;
          if (totoalAskRemainingPYY >= currentBidDetails.bidAmountPYY) {
            //totoalAskRemainingPYY = (parseFloat(totoalAskRemainingPYY) - parseFloat(currentBidDetails.bidAmountPYY));
            totoalAskRemainingPYY = totoalAskRemainingPYY.minus(currentBidDetails.bidAmountPYY);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingPYY == 0::: " + totoalAskRemainingPYY);

            if (totoalAskRemainingPYY == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingPYY == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerPYY
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
                  id: askDetails.askownerPYY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerPYY :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedPYYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PYYbalance) + parseFloat(currentBidDetails.bidAmountPYY));
              var updatedPYYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PYYbalance);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(currentBidDetails.bidAmountPYY);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 PYY Update user " + updatedPYYbalanceBidder);
              //var txFeesBidderPYY = (parseFloat(currentBidDetails.bidAmountPYY) * parseFloat(txFeePYYWithdrawSuccess));

              // var txFeesBidderPYY = new BigNumber(currentBidDetails.bidAmountPYY);
              // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess);
              // console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              // //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
              // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);
              // console.log("After deduct TX Fees of PYY Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
              var  txFeesBidderPYY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingPYY " + totoalAskRemainingPYY);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerPYY
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  PYYbalance: updatedPYYbalanceBidder
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
              //var updatedFreezedPYYbalanceAsker = parseFloat(totoalAskRemainingPYY);
              //var updatedFreezedPYYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(totoalAskRemainingPYY));
              //var updatedFreezedPYYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(userAskAmountPYY)) + parseFloat(totoalAskRemainingPYY));
              var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
              updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(userAskAmountPYY);
              updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.plus(totoalAskRemainingPYY);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPYY totoalAskRemainingPYY " + totoalAskRemainingPYY);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainPYY userAllDetailsInDBAsker.FreezedPYYbalance " + userAllDetailsInDBAsker.FreezedPYYbalance);
              console.log("Total Ask RemainPYY updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
              var btcAmountSucess = new BigNumber(userAskAmountBTC);
              btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);
              //var txFeesAskerBTC = (parseFloat(updatedBTCbalanceAsker) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(updatedBTCbalanceAsker);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of PYY Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedPYYbalanceAsker ::: " + updatedFreezedPYYbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingPYY " + totoalAskRemainingPYY);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerPYY
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedPYYbalance: updatedFreezedPYYbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidPYY.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidPYY.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidPYY.update({
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
              sails.sockets.blast(constants.PYY_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskPYY.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskPYY.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskPYY.update({
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
              sails.sockets.blast(constants.PYY_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingPYY == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerPYY " + currentBidDetails.bidownerPYY);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerPYY
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

              //var updatedPYYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PYYbalance) + parseFloat(currentBidDetails.bidAmountPYY));
              var updatedPYYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PYYbalance);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(currentBidDetails.bidAmountPYY);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of PYY Update user " + updatedPYYbalanceBidder);
              //var txFeesBidderPYY = (parseFloat(currentBidDetails.bidAmountPYY) * parseFloat(txFeePYYWithdrawSuccess));
              // var txFeesBidderPYY = new BigNumber(currentBidDetails.bidAmountPYY);
              // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess);
              // console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              // //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
              // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);
              // console.log("After deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
              var  txFeesBidderPYY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedPYYbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingPYY " + totoalAskRemainingPYY);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerPYY
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  PYYbalance: updatedPYYbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidPYY.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidPYY.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.PYY_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPYY
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
            //var updatedBidAmountPYY = (parseFloat(currentBidDetails.bidAmountPYY) - parseFloat(totoalAskRemainingPYY));
            var updatedBidAmountPYY = new BigNumber(currentBidDetails.bidAmountPYY);
            updatedBidAmountPYY = updatedBidAmountPYY.minus(totoalAskRemainingPYY);

            try {
              var updatedaskDetails = await BidPYY.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountPYY: updatedBidAmountPYY,
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
            sails.sockets.blast(constants.PYY_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerPYY
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


            //var updatedPYYbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.PYYbalance) + parseFloat(totoalAskRemainingPYY));

            var updatedPYYbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.PYYbalance);
            updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(totoalAskRemainingPYY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of PYY Update user " + updatedPYYbalanceBidder);
            //var bchAmountSucess = parseFloat(totoalAskRemainingPYY);
            //var bchAmountSucess = new BigNumber(totoalAskRemainingPYY);
            //var txFeesBidderPYY = (parseFloat(bchAmountSucess) * parseFloat(txFeePYYWithdrawSuccess));
            //var txFeesBidderPYY = (parseFloat(totoalAskRemainingPYY) * parseFloat(txFeePYYWithdrawSuccess));



            // var txFeesBidderPYY = new BigNumber(totoalAskRemainingPYY);
            // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess);
            //
            // //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
            // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
            var txFeesBidderPYY = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

            console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
            console.log("After deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedPYYbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingPYY " + totoalAskRemainingPYY);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerPYY
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                PYYbalance: updatedPYYbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerPYY");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedPYYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(userAskAmountPYY));
            var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
            updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(userAskAmountPYY);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of PYY Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedPYYbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingPYY " + totoalAskRemainingPYY);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPYY
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedPYYbalance: updatedFreezedPYYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskPYY.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskPYY.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskPYY.update({
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
            //emitting event for bch_ask destruction
            sails.sockets.blast(constants.PYY_ASK_DESTROYED, askDestroy);
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
  addBidPYYMarket: async function(req, res) {
    console.log("Enter into ask api addBidPYYMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountPYY = new BigNumber(req.body.bidAmountPYY);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC =  parseFloat(userBidAmountBTC);
    userBidAmountPYY =  parseFloat(userBidAmountPYY);
    userBidRate =  parseFloat(userBidRate);


    if (!userBidAmountPYY || !userBidAmountBTC ||
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
    userBidAmountBTC =  parseFloat(userBidAmountBTC);
    try {
      var bidDetails = await BidPYY.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountPYY: userBidAmountPYY,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountPYY: userBidAmountPYY,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        bidownerPYY: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.PYY_BID_ADDED, bidDetails);

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
        FreezedBTCbalance:  parseFloat(updateFreezedBTCBalance),
        BTCbalance:  parseFloat(updateUserBTCBalance),
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    try {
      var allAsksFromdb = await AskPYY.find({
        askRate: {
          'like': parseFloat(userBidRate)
        },
        status: {
          '!': statusOne
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
        var totoalBidRemainingPYY = new BigNumber(userBidAmountPYY);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of PYY
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountPYY;
        }
        if (total_ask <= totoalBidRemainingPYY) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingPYY :: " + totoalBidRemainingPYY);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingPYY = totoalBidRemainingPYY - allAsksFromdb[i].bidAmountPYY;
            //totoalBidRemainingPYY = (parseFloat(totoalBidRemainingPYY) - parseFloat(currentAskDetails.askAmountPYY));
            totoalBidRemainingPYY = totoalBidRemainingPYY.minus(currentAskDetails.askAmountPYY);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingPYY == 0::: " + totoalBidRemainingPYY);
            if (totoalBidRemainingPYY == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingPYY == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPYY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerPYY totoalBidRemainingPYY == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedPYYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(currentAskDetails.askAmountPYY));
              var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
              updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(currentAskDetails.askAmountPYY);
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of PYY Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedPYYbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingPYY " + totoalBidRemainingPYY);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerPYY
                }, {
                  FreezedPYYbalance: updatedFreezedPYYbalanceAsker,
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
                  id: bidDetails.bidownerPYY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and PYY  give to bidder
              //var updatedPYYbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.PYYbalance) + parseFloat(totoalBidRemainingPYY)) - parseFloat(totoalBidRemainingBTC);
              //var updatedPYYbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.PYYbalance) + parseFloat(userBidAmountPYY)) - parseFloat(totoalBidRemainingPYY));
              var updatedPYYbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.PYYbalance);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(userBidAmountPYY);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(totoalBidRemainingPYY);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPYY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainPYY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainPYY updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);
              //var bchAmountSucess = (parseFloat(userBidAmountPYY) - parseFloat(totoalBidRemainingPYY));
              // var bchAmountSucess = new BigNumber(userBidAmountPYY);
              // bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingPYY);
              //
              // //var txFeesBidderPYY = (parseFloat(bchAmountSucess) * parseFloat(txFeePYYWithdrawSuccess));
              // var txFeesBidderPYY = new BigNumber(bchAmountSucess);
              // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess);
              //
              // console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              // //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
              // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
              var txFeesBidderPYY=txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

              console.log("After deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingPYY == 0updatedPYYbalanceBidder ::: " + updatedPYYbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingPYY asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingPYY " + totoalBidRemainingPYY);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPYY
                }, {
                  PYYbalance: updatedPYYbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingPYY == 0BidPYY.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidPYY.destroy({
              //   id: bidDetails.bidownerPYY
              // });
              try {
                var bidDestroy = await BidPYY.update({
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
              sails.sockets.blast(constants.PYY_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingPYY == 0AskPYY.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskPYY.destroy({
              //   id: currentAskDetails.askownerPYY
              // });
              try {
                var askDestroy = await AskPYY.update({
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
              sails.sockets.blast(constants.PYY_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingPYY == 0  enter into else of totoalBidRemainingPYY == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPYY == 0start User.findOne currentAskDetails.bidownerPYY ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPYY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPYY == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedPYYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(currentAskDetails.askAmountPYY));
              var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
              updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(currentAskDetails.askAmountPYY);
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of PYY Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingPYY == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPYY == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingPYY " + totoalBidRemainingPYY);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerPYY
                }, {
                  FreezedPYYbalance: updatedFreezedPYYbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPYY == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskPYY.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskPYY.update({
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

              sails.sockets.blast(constants.PYY_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingPYY == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingPYY == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerPYY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerPYY");
              //var updatedPYYbalanceBidder = ((parseFloat(userAllDetailsInDBBid.PYYbalance) + parseFloat(userBidAmountPYY)) - parseFloat(totoalBidRemainingPYY));
              var updatedPYYbalanceBidder = new BigNumber(userAllDetailsInDBBid.PYYbalance);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(userBidAmountPYY);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(totoalBidRemainingPYY);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPYY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainPYY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainPYY updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);
              //var bchAmountSucess = (parseFloat(userBidAmountPYY) - parseFloat(totoalBidRemainingPYY));
              // var bchAmountSucess = new BigNumber(userBidAmountPYY);
              // bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingPYY);
              //
              // //var txFeesBidderPYY = (parseFloat(bchAmountSucess) * parseFloat(txFeePYYWithdrawSuccess));
              // var txFeesBidderPYY = new BigNumber(bchAmountSucess);
              // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess);
              //
              // console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              // //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
              // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);
              // console.log("After deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
              var txFeesBidderPYY=txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedPYYbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingPYY " + totoalBidRemainingPYY);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPYY
                }, {
                  PYYbalance: updatedPYYbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountPYY totoalBidRemainingPYY " + totoalBidRemainingPYY);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidPYY.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountPYY: totoalBidRemainingPYY,
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
              sails.sockets.blast(constants.PYY_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingPYY :: " + totoalBidRemainingPYY);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingPYY = totoalBidRemainingPYY - allAsksFromdb[i].bidAmountPYY;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingPYY = totoalBidRemainingPYY.minus(currentAskDetails.askAmountPYY);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingPYY == 0::: " + totoalBidRemainingPYY);

              if (totoalBidRemainingPYY == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingPYY == 0Enter into totoalBidRemainingPYY == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerPYY
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
                    id: bidDetails.bidownerPYY
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingPYY == 0userAll bidDetails.askownerPYY :: ");
                console.log(" totoalBidRemainingPYY == 0Update value of Bidder and asker");
                //var updatedFreezedPYYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(currentAskDetails.askAmountPYY));
                var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
                updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(currentAskDetails.askAmountPYY);

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

                console.log("After deduct TX Fees of PYY Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingPYY == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingPYY == 0updatedFreezedPYYbalanceAsker ::: " + updatedFreezedPYYbalanceAsker);
                console.log(" totoalBidRemainingPYY == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingPYY " + totoalBidRemainingPYY);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerPYY
                  }, {
                    FreezedPYYbalance: updatedFreezedPYYbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedPYYbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.PYYbalance) + parseFloat(userBidAmountPYY)) - parseFloat(totoalBidRemainingPYY));

                var updatedPYYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PYYbalance);
                updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(userBidAmountPYY);
                updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(totoalBidRemainingPYY);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainPYY totoalAskRemainingPYY " + totoalBidRemainingBTC);
                console.log("Total Ask RemainPYY BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainPYY updatedFreezedPYYbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);
                //var bchAmountSucess = (parseFloat(userBidAmountPYY) - parseFloat(totoalBidRemainingPYY));
                // var bchAmountSucess = new BigNumber(userBidAmountPYY);
                // bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingPYY);
                //
                //
                // //var txFeesBidderPYY = (parseFloat(bchAmountSucess) * parseFloat(txFeePYYWithdrawSuccess));
                // var txFeesBidderPYY = new BigNumber(bchAmountSucess);
                // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess);
                // console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
                // //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
                // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
                var txFeesBidderPYY=txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
                //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
                updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);



                console.log("After deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingPYY == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingPYY == 0 updatedFreezedPYYbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingPYY " + totoalBidRemainingPYY);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerPYY
                  }, {
                    PYYbalance: updatedPYYbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingPYY == 0 BidPYY.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskPYY.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskPYY.update({
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
                sails.sockets.blast(constants.PYY_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingPYY == 0 AskPYY.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidPYY.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidPYY.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.PYY_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingPYY == 0 enter into else of totoalBidRemainingPYY == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingPYY == 0totoalBidRemainingPYY == 0 start User.findOne currentAskDetails.bidownerPYY " + currentAskDetails.bidownerPYY);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerPYY
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingPYY == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedPYYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(currentAskDetails.askAmountPYY));

                var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
                updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(currentAskDetails.askAmountPYY);

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
                console.log("After deduct TX Fees of PYY Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingPYY == 0 updatedFreezedPYYbalanceAsker:: " + updatedFreezedPYYbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingPYY == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingPYY " + totoalBidRemainingPYY);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerPYY
                  }, {
                    FreezedPYYbalance: updatedFreezedPYYbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingPYY == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskPYY.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskPYY.update({
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
                sails.sockets.blast(constants.PYY_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountPYY = (parseFloat(currentAskDetails.askAmountPYY) - parseFloat(totoalBidRemainingPYY));

              var updatedAskAmountPYY = new BigNumber(currentAskDetails.askAmountPYY);
              updatedAskAmountPYY = updatedAskAmountPYY.minus(totoalBidRemainingPYY);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskPYY.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountPYY: updatedAskAmountPYY,
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
              sails.sockets.blast(constants.PYY_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPYY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedPYYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPYYbalance) - parseFloat(totoalBidRemainingPYY));
              var updatedFreezedPYYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPYYbalance);
              updatedFreezedPYYbalanceAsker = updatedFreezedPYYbalanceAsker.minus(totoalBidRemainingPYY);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPYY totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainPYY userAllDetailsInDBAsker.FreezedPYYbalance " + userAllDetailsInDBAsker.FreezedPYYbalance);
              console.log("Total Ask RemainPYY updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of PYY Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedPYYbalanceAsker:: " + updatedFreezedPYYbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedPYYbalanceAsker " + updatedFreezedPYYbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingPYY " + totoalBidRemainingPYY);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerPYY
                }, {
                  FreezedPYYbalance: updatedFreezedPYYbalanceAsker,
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
                  id: bidDetails.bidownerPYY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerPYY");
              //var updatedPYYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PYYbalance) + parseFloat(userBidAmountPYY));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountPYY " + userBidAmountPYY);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.PYYbalance " + userAllDetailsInDBBidder.PYYbalance);

              var updatedPYYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PYYbalance);
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.plus(userBidAmountPYY);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);
              //var txFeesBidderPYY = (parseFloat(updatedPYYbalanceBidder) * parseFloat(txFeePYYWithdrawSuccess));
              // var txFeesBidderPYY = new BigNumber(userBidAmountPYY);
              // txFeesBidderPYY = txFeesBidderPYY.times(txFeePYYWithdrawSuccess);
              //
              // console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              // //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
              // updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);

              var txFeesBidderPYY=txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPYY :: " + txFeesBidderPYY);
              //updatedPYYbalanceBidder = (parseFloat(updatedPYYbalanceBidder) - parseFloat(txFeesBidderPYY));
              updatedPYYbalanceBidder = updatedPYYbalanceBidder.minus(txFeesBidderPYY);

              console.log("After deduct TX Fees of PYY Update user " + updatedPYYbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedPYYbalanceBidder ::: " + updatedPYYbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedPYYbalanceBidder " + updatedPYYbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingPYY " + totoalBidRemainingPYY);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPYY
                }, {
                  PYYbalance: updatedPYYbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidPYY.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidPYY.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidPYY.update({
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
              sails.sockets.blast(constants.PYY_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC Bid destroy successfully desctroyCurrentBid ::");
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            }
          }
        }
      }
      console.log("Total Bid ::: " + total_ask);
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
  removeBidPYYMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdPYY;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidPYY.findOne({
      bidownerPYY: bidownerId,
      id: userBidId,
      status: {
        '!': statusOne
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
            BidPYY.destroy({
              id: userBidId
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }

              sails.sockets.blast(constants.PYY_BID_DESTROYED, bid);


              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  removeAskPYYMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdPYY;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskPYY.findOne({
      askownerPYY: askownerId,
      id: userAskId,
      status: {
        '!': statusOne
      }
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
        var userPYYBalanceInDb = parseFloat(user.PYYbalance);
        var askAmountOfPYYInAskTableDB = parseFloat(askDetails.askAmountPYY);
        var userFreezedPYYbalanceInDB = parseFloat(user.FreezedPYYbalance);
        console.log("userPYYBalanceInDb :" + userPYYBalanceInDb);
        console.log("askAmountOfPYYInAskTableDB :" + askAmountOfPYYInAskTableDB);
        console.log("userFreezedPYYbalanceInDB :" + userFreezedPYYbalanceInDB);
        var updateFreezedPYYBalance = (parseFloat(userFreezedPYYbalanceInDB) - parseFloat(askAmountOfPYYInAskTableDB));
        var updateUserPYYBalance = (parseFloat(userPYYBalanceInDb) + parseFloat(askAmountOfPYYInAskTableDB));
        User.update({
            id: askownerId
          }, {
            PYYbalance: parseFloat(updateUserPYYBalance),
            FreezedPYYbalance: parseFloat(updateFreezedPYYBalance)
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
            AskPYY.destroy({
              id: userAskId
            }).exec(function(err, ask) {
              if (err) {
                return res.json({
                  "message": "Error to remove ask",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.PYY_ASK_DESTROYED, ask);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidPYY: function(req, res) {
    console.log("Enter into ask api getAllBidPYY :: ");
    BidPYY.find()
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
            BidPYY.find({
                status: {
                  '!': statusOne
                }
              })
              .sum('bidAmountPYY')
              .exec(function(err, bidAmountPYYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountPYYSum",
                    statusCode: 401
                  });
                }
                BidPYY.find({
                    status: {
                      '!': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountPYYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsPYY: allAskDetailsToExecute,
                      bidAmountPYYSum: bidAmountPYYSum[0].bidAmountPYY,
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
  getAllAskPYY: function(req, res) {
    console.log("Enter into ask api getAllAskPYY :: ");
    AskPYY.find()
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
            AskPYY.find({
                status: {
                  '!': statusOne
                }
              })
              .sum('askAmountPYY')
              .exec(function(err, askAmountPYYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountPYYSum",
                    statusCode: 401
                  });
                }
                AskPYY.find({
                    status: {
                      '!': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountPYYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksPYY: allAskDetailsToExecute,
                      askAmountPYYSum: askAmountPYYSum[0].askAmountPYY,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskPYY Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsPYYSuccess: function(req, res) {
    console.log("Enter into ask api getBidsPYYSuccess :: ");
    BidPYY.find({
        status: {
          'like': statusOne
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
            BidPYY.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('bidAmountPYY')
              .exec(function(err, bidAmountPYYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountPYYSum",
                    statusCode: 401
                  });
                }
                BidPYY.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountPYYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsPYY: allAskDetailsToExecute,
                      bidAmountPYYSum: bidAmountPYYSum[0].bidAmountPYY,
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
  getAsksPYYSuccess: function(req, res) {
    console.log("Enter into ask api getAsksPYYSuccess :: ");
    AskPYY.find({
        status: {
          'like': statusOne
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
            AskPYY.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('askAmountPYY')
              .exec(function(err, askAmountPYYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountPYYSum",
                    statusCode: 401
                  });
                }
                AskPYY.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountPYYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksPYY: allAskDetailsToExecute,
                      askAmountPYYSum: askAmountPYYSum[0].askAmountPYY,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskPYY Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
};
