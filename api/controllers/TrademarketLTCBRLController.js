/**
 * TrademarketLTCBRLController
 *BRL
 * @description :: Server-side logic for managing trademarketltcbrls
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

  addAskBRLMarket: async function(req, res) {
    console.log("Enter into ask api addAskBRLMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountBRL = new BigNumber(req.body.askAmountBRL);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountBRL || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountBRL < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountBRL = parseFloat(userAskAmountBRL);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskBRL.create({
        askAmountLTC: userAskAmountLTC,
        askAmountBRL: userAskAmountBRL,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountBRL: userAskAmountBRL,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingBRL = (parseFloat(totoalAskRemainingBRL) - parseFloat(currentBidDetails.bidAmountBRL));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingBRL = totoalAskRemainingBRL.minus(currentBidDetails.bidAmountBRL);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingBRL :: " + totoalAskRemainingBRL);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(currentBidDetails.bidAmountBRL));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


            //updatedBRLbalanceBidder =  parseFloat(updatedBRLbalanceBidder);

            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedBRLbalanceAsker = parseFloat(totoalAskRemainingBRL);
            //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);

            //updatedFreezedBRLbalanceAsker =  parseFloat(updatedFreezedBRLbalanceAsker);
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
            console.log("After deduct TX Fees of BRL Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedBRLbalance: updatedFreezedBRLbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed BRLBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(currentBidDetails.bidAmountBRL));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedBRLbalanceBidder:: " + updatedBRLbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerBRL");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(totoalAskRemainingBRL));
            //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
            console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
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
            console.log("After deduct TX Fees of BRL Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedBRLbalance: updatedFreezedBRLbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskBRL.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingBRL = totoalAskRemainingBRL - allBidsFromdb[i].bidAmountBRL;
          if (totoalAskRemainingBRL >= currentBidDetails.bidAmountBRL) {
            //totoalAskRemainingBRL = (parseFloat(totoalAskRemainingBRL) - parseFloat(currentBidDetails.bidAmountBRL));
            totoalAskRemainingBRL = totoalAskRemainingBRL.minus(currentBidDetails.bidAmountBRL);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of BRL Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerBRL
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  BRLbalance: updatedBRLbalanceBidder
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
              //var updatedFreezedBRLbalanceAsker = parseFloat(totoalAskRemainingBRL);
              //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(totoalAskRemainingBRL));
              //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
              var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
              console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
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

              console.log("After deduct TX Fees of BRL Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerBRL
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedBRLbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerBRL
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountBRL = (parseFloat(currentBidDetails.bidAmountBRL) - parseFloat(totoalAskRemainingBRL));
            var updatedBidAmountBRL = new BigNumber(currentBidDetails.bidAmountBRL);
            updatedBidAmountBRL = updatedBidAmountBRL.minus(totoalAskRemainingBRL);

            try {
              var updatedaskDetails = await BidBRL.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedBRLbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerBRL");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of BRL Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountBRL = new BigNumber(req.body.bidAmountBRL);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountBRL = parseFloat(userBidAmountBRL);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountBRL || !userBidAmountLTC ||
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
      var bidDetails = await BidBRL.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountBRL: userBidAmountBRL,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountBRL: userBidAmountBRL,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskBRL.find({
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
        var totoalBidRemainingBRL = new BigNumber(userBidAmountBRL);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of BRL
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountBRL;
        }
        if (total_ask <= totoalBidRemainingBRL) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingBRL :: " + totoalBidRemainingBRL);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingBRL = totoalBidRemainingBRL - allAsksFromdb[i].bidAmountBRL;
            //totoalBidRemainingBRL = (parseFloat(totoalBidRemainingBRL) - parseFloat(currentAskDetails.askAmountBRL));
            totoalBidRemainingBRL = totoalBidRemainingBRL.minus(currentAskDetails.askAmountBRL);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of BRL Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedBRLbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and BRL  give to bidder
              //var updatedBRLbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.BRLbalance) + parseFloat(totoalBidRemainingBRL)) - parseFloat(totoalBidRemainingLTC);
              //var updatedBRLbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.BRLbalance) + parseFloat(userBidAmountBRL)) - parseFloat(totoalBidRemainingBRL));
              var updatedBRLbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(totoalBidRemainingBRL);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainBRL updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingBRL == 0updatedBRLbalanceBidder ::: " + updatedBRLbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingBRL asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of BRL Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerBRL");
              //var updatedBRLbalanceBidder = ((parseFloat(userAllDetailsInDBBid.BRLbalance) + parseFloat(userBidAmountBRL)) - parseFloat(totoalBidRemainingBRL));
              var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBid.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(totoalBidRemainingBRL);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainBRL updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedBRLbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBRL totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidBRL.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingBRL = totoalBidRemainingBRL - allAsksFromdb[i].bidAmountBRL;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingBRL = totoalBidRemainingBRL.minus(currentAskDetails.askAmountBRL);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of BRL Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingBRL == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingBRL == 0updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);
                console.log(" totoalBidRemainingBRL == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerBRL
                  }, {
                    FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalBidRemainingLTC);
                console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
                //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
                updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);



                console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0 updatedFreezedBRLbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerBRL
                  }, {
                    BRLbalance: updatedBRLbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of BRL Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0 updatedFreezedBRLbalanceAsker:: " + updatedFreezedBRLbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerBRL
                  }, {
                    FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountBRL = (parseFloat(currentAskDetails.askAmountBRL) - parseFloat(totoalBidRemainingBRL));

              var updatedAskAmountBRL = new BigNumber(currentAskDetails.askAmountBRL);
              updatedAskAmountBRL = updatedAskAmountBRL.minus(totoalBidRemainingBRL);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskBRL.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
              console.log("Total Ask RemainBRL updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of BRL Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedBRLbalanceAsker:: " + updatedFreezedBRLbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerBRL");
              //var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(userBidAmountBRL));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountBRL " + userBidAmountBRL);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.BRLbalance " + userAllDetailsInDBBidder.BRLbalance);

              var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
              //var txFeesBidderBRL = (parseFloat(updatedBRLbalanceBidder) * parseFloat(txFeeWithdrawSuccessBRL));
              // var txFeesBidderBRL = new BigNumber(userBidAmountBRL);
              // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
              //
              // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderBRL = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedBRLbalanceBidder ::: " + updatedBRLbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidBRL.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
            BidBRL.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBRL: allAskDetailsToExecute,
                      bidAmountBRLSum: bidAmountBRLSum[0].bidAmountBRL,
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
  getAllAskBRL: function(req, res) {
    console.log("Enter into ask api getAllAskBRL :: ");
    AskBRL.find({
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
            AskBRL.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBRL: allAskDetailsToExecute,
                      askAmountBRLSum: askAmountBRLSum[0].askAmountBRL,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
            BidBRL.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBRL: allAskDetailsToExecute,
                      bidAmountBRLSum: bidAmountBRLSum[0].bidAmountBRL,
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
  getAsksBRLSuccess: function(req, res) {
    console.log("Enter into ask api getAsksBRLSuccess :: ");
    AskBRL.find({
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
            AskBRL.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBRL: allAskDetailsToExecute,
                      askAmountBRLSum: askAmountBRLSum[0].askAmountBRL,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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