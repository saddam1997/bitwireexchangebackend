/**
 * TrademarketLTCTRYController
 *
 * @description :: Server-side logic for managing trademarketltctries
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

  addAskTRYMarket: async function(req, res) {
    console.log("Enter into ask api addAskTRYMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountTRY = new BigNumber(req.body.askAmountTRY);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountTRY || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountTRY < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountTRY = parseFloat(userAskAmountTRY);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskTRY.create({
        askAmountLTC: userAskAmountLTC,
        askAmountTRY: userAskAmountTRY,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountTRY: userAskAmountTRY,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingTRY = (parseFloat(totoalAskRemainingTRY) - parseFloat(currentBidDetails.bidAmountTRY));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingTRY = totoalAskRemainingTRY.minus(currentBidDetails.bidAmountTRY);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingTRY :: " + totoalAskRemainingTRY);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


            //updatedTRYbalanceBidder =  parseFloat(updatedTRYbalanceBidder);

            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedTRYbalanceAsker = parseFloat(totoalAskRemainingTRY);
            //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);

            //updatedFreezedTRYbalanceAsker =  parseFloat(updatedFreezedTRYbalanceAsker);
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
            console.log("After deduct TX Fees of TRY Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedTRYbalance: updatedFreezedTRYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed TRYBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedTRYbalanceBidder:: " + updatedTRYbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerTRY");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(totoalAskRemainingTRY));
            //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
            console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
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
            console.log("After deduct TX Fees of TRY Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedTRYbalance: updatedFreezedTRYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskTRY.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingTRY = totoalAskRemainingTRY - allBidsFromdb[i].bidAmountTRY;
          if (totoalAskRemainingTRY >= currentBidDetails.bidAmountTRY) {
            //totoalAskRemainingTRY = (parseFloat(totoalAskRemainingTRY) - parseFloat(currentBidDetails.bidAmountTRY));
            totoalAskRemainingTRY = totoalAskRemainingTRY.minus(currentBidDetails.bidAmountTRY);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of TRY Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerTRY
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  TRYbalance: updatedTRYbalanceBidder
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
              //var updatedFreezedTRYbalanceAsker = parseFloat(totoalAskRemainingTRY);
              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(totoalAskRemainingTRY));
              //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
              console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
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

              console.log("After deduct TX Fees of TRY Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerTRY
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedTRYbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerTRY
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountTRY = (parseFloat(currentBidDetails.bidAmountTRY) - parseFloat(totoalAskRemainingTRY));
            var updatedBidAmountTRY = new BigNumber(currentBidDetails.bidAmountTRY);
            updatedBidAmountTRY = updatedBidAmountTRY.minus(totoalAskRemainingTRY);

            try {
              var updatedaskDetails = await BidTRY.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedTRYbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerTRY");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of TRY Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountTRY = new BigNumber(req.body.bidAmountTRY);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountTRY = parseFloat(userBidAmountTRY);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountTRY || !userBidAmountLTC ||
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
      var bidDetails = await BidTRY.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountTRY: userBidAmountTRY,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountTRY: userBidAmountTRY,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskTRY.find({
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
        var totoalBidRemainingTRY = new BigNumber(userBidAmountTRY);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of TRY
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountTRY;
        }
        if (total_ask <= totoalBidRemainingTRY) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingTRY :: " + totoalBidRemainingTRY);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingTRY = totoalBidRemainingTRY - allAsksFromdb[i].bidAmountTRY;
            //totoalBidRemainingTRY = (parseFloat(totoalBidRemainingTRY) - parseFloat(currentAskDetails.askAmountTRY));
            totoalBidRemainingTRY = totoalBidRemainingTRY.minus(currentAskDetails.askAmountTRY);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of TRY Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedTRYbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and TRY  give to bidder
              //var updatedTRYbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.TRYbalance) + parseFloat(totoalBidRemainingTRY)) - parseFloat(totoalBidRemainingLTC);
              //var updatedTRYbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.TRYbalance) + parseFloat(userBidAmountTRY)) - parseFloat(totoalBidRemainingTRY));
              var updatedTRYbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(totoalBidRemainingTRY);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainTRY updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingTRY == 0updatedTRYbalanceBidder ::: " + updatedTRYbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingTRY asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of TRY Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerTRY");
              //var updatedTRYbalanceBidder = ((parseFloat(userAllDetailsInDBBid.TRYbalance) + parseFloat(userBidAmountTRY)) - parseFloat(totoalBidRemainingTRY));
              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBid.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(totoalBidRemainingTRY);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainTRY updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedTRYbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountTRY totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidTRY.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingTRY = totoalBidRemainingTRY - allAsksFromdb[i].bidAmountTRY;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingTRY = totoalBidRemainingTRY.minus(currentAskDetails.askAmountTRY);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of TRY Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingTRY == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingTRY == 0updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);
                console.log(" totoalBidRemainingTRY == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerTRY
                  }, {
                    FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalBidRemainingLTC);
                console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
                //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
                updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);



                console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 updatedFreezedTRYbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerTRY
                  }, {
                    TRYbalance: updatedTRYbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of TRY Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 updatedFreezedTRYbalanceAsker:: " + updatedFreezedTRYbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerTRY
                  }, {
                    FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountTRY = (parseFloat(currentAskDetails.askAmountTRY) - parseFloat(totoalBidRemainingTRY));

              var updatedAskAmountTRY = new BigNumber(currentAskDetails.askAmountTRY);
              updatedAskAmountTRY = updatedAskAmountTRY.minus(totoalBidRemainingTRY);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskTRY.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
              console.log("Total Ask RemainTRY updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of TRY Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedTRYbalanceAsker:: " + updatedFreezedTRYbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerTRY");
              //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(userBidAmountTRY));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountTRY " + userBidAmountTRY);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.TRYbalance " + userAllDetailsInDBBidder.TRYbalance);

              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var txFeesBidderTRY = (parseFloat(updatedTRYbalanceBidder) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(userBidAmountTRY);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              //
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderTRY = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedTRYbalanceBidder ::: " + updatedTRYbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidTRY.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
            BidTRY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsTRY: allAskDetailsToExecute,
                      bidAmountTRYSum: bidAmountTRYSum[0].bidAmountTRY,
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
  getAllAskTRY: function(req, res) {
    console.log("Enter into ask api getAllAskTRY :: ");
    AskTRY.find({
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
            AskTRY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksTRY: allAskDetailsToExecute,
                      askAmountTRYSum: askAmountTRYSum[0].askAmountTRY,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
            BidTRY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsTRY: allAskDetailsToExecute,
                      bidAmountTRYSum: bidAmountTRYSum[0].bidAmountTRY,
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
  getAsksTRYSuccess: function(req, res) {
    console.log("Enter into ask api getAsksTRYSuccess :: ");
    AskTRY.find({
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
            AskTRY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksTRY: allAskDetailsToExecute,
                      askAmountTRYSum: askAmountTRYSum[0].askAmountTRY,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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