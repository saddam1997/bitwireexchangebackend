/**
 * TrademarketLTCGBPController
 *GBP
 * @description :: Server-side logic for managing trademarketltcgbps
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

  addAskGBPMarket: async function(req, res) {
    console.log("Enter into ask api addAskGBPMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountGBP = new BigNumber(req.body.askAmountGBP);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountGBP || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountGBP < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountGBP = parseFloat(userAskAmountGBP);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskGBP.create({
        askAmountLTC: userAskAmountLTC,
        askAmountGBP: userAskAmountGBP,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountGBP: userAskAmountGBP,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingGBP = (parseFloat(totoalAskRemainingGBP) - parseFloat(currentBidDetails.bidAmountGBP));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingGBP = totoalAskRemainingGBP.minus(currentBidDetails.bidAmountGBP);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingGBP :: " + totoalAskRemainingGBP);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(currentBidDetails.bidAmountGBP));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


            //updatedGBPbalanceBidder =  parseFloat(updatedGBPbalanceBidder);

            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedGBPbalanceAsker = parseFloat(totoalAskRemainingGBP);
            //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);

            //updatedFreezedGBPbalanceAsker =  parseFloat(updatedFreezedGBPbalanceAsker);
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
            console.log("After deduct TX Fees of GBP Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedGBPbalance: updatedFreezedGBPbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed GBPBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(currentBidDetails.bidAmountGBP));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedGBPbalanceBidder:: " + updatedGBPbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerGBP");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(totoalAskRemainingGBP));
            //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
            console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
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
            console.log("After deduct TX Fees of GBP Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedGBPbalance: updatedFreezedGBPbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskGBP.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingGBP = totoalAskRemainingGBP - allBidsFromdb[i].bidAmountGBP;
          if (totoalAskRemainingGBP >= currentBidDetails.bidAmountGBP) {
            //totoalAskRemainingGBP = (parseFloat(totoalAskRemainingGBP) - parseFloat(currentBidDetails.bidAmountGBP));
            totoalAskRemainingGBP = totoalAskRemainingGBP.minus(currentBidDetails.bidAmountGBP);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of GBP Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerGBP
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  GBPbalance: updatedGBPbalanceBidder
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
              //var updatedFreezedGBPbalanceAsker = parseFloat(totoalAskRemainingGBP);
              //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(totoalAskRemainingGBP));
              //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
              var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
              console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
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

              console.log("After deduct TX Fees of GBP Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerGBP
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedGBPbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerGBP
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountGBP = (parseFloat(currentBidDetails.bidAmountGBP) - parseFloat(totoalAskRemainingGBP));
            var updatedBidAmountGBP = new BigNumber(currentBidDetails.bidAmountGBP);
            updatedBidAmountGBP = updatedBidAmountGBP.minus(totoalAskRemainingGBP);

            try {
              var updatedaskDetails = await BidGBP.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedGBPbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerGBP");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of GBP Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountGBP = new BigNumber(req.body.bidAmountGBP);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountGBP = parseFloat(userBidAmountGBP);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountGBP || !userBidAmountLTC ||
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
      var bidDetails = await BidGBP.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountGBP: userBidAmountGBP,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountGBP: userBidAmountGBP,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskGBP.find({
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
        var totoalBidRemainingGBP = new BigNumber(userBidAmountGBP);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of GBP
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountGBP;
        }
        if (total_ask <= totoalBidRemainingGBP) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingGBP :: " + totoalBidRemainingGBP);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingGBP = totoalBidRemainingGBP - allAsksFromdb[i].bidAmountGBP;
            //totoalBidRemainingGBP = (parseFloat(totoalBidRemainingGBP) - parseFloat(currentAskDetails.askAmountGBP));
            totoalBidRemainingGBP = totoalBidRemainingGBP.minus(currentAskDetails.askAmountGBP);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of GBP Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedGBPbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and GBP  give to bidder
              //var updatedGBPbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.GBPbalance) + parseFloat(totoalBidRemainingGBP)) - parseFloat(totoalBidRemainingLTC);
              //var updatedGBPbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.GBPbalance) + parseFloat(userBidAmountGBP)) - parseFloat(totoalBidRemainingGBP));
              var updatedGBPbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(totoalBidRemainingGBP);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainGBP updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingGBP == 0updatedGBPbalanceBidder ::: " + updatedGBPbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingGBP asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of GBP Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerGBP");
              //var updatedGBPbalanceBidder = ((parseFloat(userAllDetailsInDBBid.GBPbalance) + parseFloat(userBidAmountGBP)) - parseFloat(totoalBidRemainingGBP));
              var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBid.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(totoalBidRemainingGBP);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainGBP updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedGBPbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountGBP totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidGBP.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingGBP = totoalBidRemainingGBP - allAsksFromdb[i].bidAmountGBP;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingGBP = totoalBidRemainingGBP.minus(currentAskDetails.askAmountGBP);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of GBP Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingGBP == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingGBP == 0updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);
                console.log(" totoalBidRemainingGBP == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerGBP
                  }, {
                    FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalBidRemainingLTC);
                console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
                //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
                updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);



                console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0 updatedFreezedGBPbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerGBP
                  }, {
                    GBPbalance: updatedGBPbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of GBP Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0 updatedFreezedGBPbalanceAsker:: " + updatedFreezedGBPbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerGBP
                  }, {
                    FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountGBP = (parseFloat(currentAskDetails.askAmountGBP) - parseFloat(totoalBidRemainingGBP));

              var updatedAskAmountGBP = new BigNumber(currentAskDetails.askAmountGBP);
              updatedAskAmountGBP = updatedAskAmountGBP.minus(totoalBidRemainingGBP);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskGBP.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
              console.log("Total Ask RemainGBP updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of GBP Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedGBPbalanceAsker:: " + updatedFreezedGBPbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerGBP");
              //var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(userBidAmountGBP));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountGBP " + userBidAmountGBP);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.GBPbalance " + userAllDetailsInDBBidder.GBPbalance);

              var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBidder.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
              //var txFeesBidderGBP = (parseFloat(updatedGBPbalanceBidder) * parseFloat(txFeeWithdrawSuccessGBP));
              // var txFeesBidderGBP = new BigNumber(userBidAmountGBP);
              // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
              //
              // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderGBP = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedGBPbalanceBidder ::: " + updatedGBPbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidGBP.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
          'like': LTCMARKETID
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
            BidGBP.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGBP: allAskDetailsToExecute,
                      bidAmountGBPSum: bidAmountGBPSum[0].bidAmountGBP,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
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
  getAllAskGBP: function(req, res) {
    console.log("Enter into ask api getAllAskGBP :: ");
    AskGBP.find({
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
            AskGBP.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGBP: allAskDetailsToExecute,
                      askAmountGBPSum: askAmountGBPSum[0].askAmountGBP,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
          'like': LTCMARKETID
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
            BidGBP.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGBP: allAskDetailsToExecute,
                      bidAmountGBPSum: bidAmountGBPSum[0].bidAmountGBP,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
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
  getAsksGBPSuccess: function(req, res) {
    console.log("Enter into ask api getAsksGBPSuccess :: ");
    AskGBP.find({
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
            AskGBP.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGBP: allAskDetailsToExecute,
                      askAmountGBPSum: askAmountGBPSum[0].askAmountGBP,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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