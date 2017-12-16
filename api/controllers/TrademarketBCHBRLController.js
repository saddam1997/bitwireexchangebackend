/**
 * TrademarketBCHBRLController
 *
 * @description :: Server-side logic for managing trademarketbchbrls
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

const txFeeWithdrawSuccessBCH = sails.config.common.txFeeWithdrawSuccessBCH;
const BCHMARKETID = sails.config.common.BCHMARKETID;
module.exports = {

  addAskBRLMarket: async function(req, res) {
    console.log("Enter into ask api addAskBRLMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountBRL = new BigNumber(req.body.askAmountBRL);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountBRL || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountBRL < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountBRL = parseFloat(userAskAmountBRL);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskBRL.create({
        askAmountBCH: userAskAmountBCH,
        askAmountBRL: userAskAmountBRL,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountBRL: userAskAmountBRL,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
          'like': BCHMARKETID
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
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingBRL = (parseFloat(totoalAskRemainingBRL) - parseFloat(currentBidDetails.bidAmountBRL));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingBRL = totoalAskRemainingBRL.minus(currentBidDetails.bidAmountBRL);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingBRL :: " + totoalAskRemainingBRL);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(currentBidDetails.bidAmountBRL));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


            //updatedBRLbalanceBidder =  parseFloat(updatedBRLbalanceBidder);

            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedBRLbalanceAsker = parseFloat(totoalAskRemainingBRL);
            //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);

            //updatedFreezedBRLbalanceAsker =  parseFloat(updatedFreezedBRLbalanceAsker);
            //Deduct Transation Fee Asker
            //var BCHAmountSucess = (parseFloat(userAskAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var BCHAmountSucess = new BigNumber(userAskAmountBCH);
            BCHAmountSucess = BCHAmountSucess.minus(totoalAskRemainingBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Before deduct TX Fees of Update Asker Amount BCH updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(BCHAmountSucess) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(BCHAmountSucess);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);
            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
            updatedBCHbalanceAsker = parseFloat(updatedBCHbalanceAsker);
            console.log("After deduct TX Fees of BRL Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedBRLbalance: updatedFreezedBRLbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed BRLBalance',
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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(currentBidDetails.bidAmountBRL));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedBRLbalanceBidder:: " + updatedBRLbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerBRL");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(totoalAskRemainingBRL));
            //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
            console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var BCHAmountSucess = (parseFloat(userAskAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var BCHAmountSucess = new BigNumber(userAskAmountBCH);
            BCHAmountSucess = BCHAmountSucess.minus(totoalAskRemainingBCH);

            //var txFeesAskerBCH = (parseFloat(BCHAmountSucess) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(BCHAmountSucess);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);
            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of BRL Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedBRLbalance: updatedFreezedBRLbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskBRL.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingBRL = totoalAskRemainingBRL - allBidsFromdb[i].bidAmountBRL;
          if (totoalAskRemainingBRL >= currentBidDetails.bidAmountBRL) {
            //totoalAskRemainingBRL = (parseFloat(totoalAskRemainingBRL) - parseFloat(currentBidDetails.bidAmountBRL));
            totoalAskRemainingBRL = totoalAskRemainingBRL.minus(currentBidDetails.bidAmountBRL);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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
              // console.log("After deduct TX Fees of BRL Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerBRL
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  BRLbalance: updatedBRLbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
              //var updatedFreezedBRLbalanceAsker = parseFloat(totoalAskRemainingBRL);
              //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(totoalAskRemainingBRL));
              //var updatedFreezedBRLbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL)) + parseFloat(totoalAskRemainingBRL));
              var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);
              updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.plus(totoalAskRemainingBRL);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
              console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var BCHAmountSucess = (parseFloat(userAskAmountBCH) - parseFloat(totoalAskRemainingBCH));
              var BCHAmountSucess = new BigNumber(userAskAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalAskRemainingBCH);
              //var txFeesAskerBCH = (parseFloat(updatedBCHbalanceAsker) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(BCHAmountSucess);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

              console.log("After deduct TX Fees of BRL Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerBRL
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);

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

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedBRLbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingBRL " + totoalAskRemainingBRL);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerBRL
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBidAmountBCH = (parseFloat(currentBidDetails.bidAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var updatedBidAmountBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            updatedBidAmountBCH = updatedBidAmountBCH.minus(totoalAskRemainingBCH);
            //var updatedBidAmountBRL = (parseFloat(currentBidDetails.bidAmountBRL) - parseFloat(totoalAskRemainingBRL));
            var updatedBidAmountBRL = new BigNumber(currentBidDetails.bidAmountBRL);
            updatedBidAmountBRL = updatedBidAmountBRL.minus(totoalAskRemainingBRL);

            try {
              var updatedaskDetails = await BidBRL.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
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
            //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBCHbalance) - parseFloat(totoalAskRemainingBCH));
            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(totoalAskRemainingBCH);


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
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

            console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
            console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedBRLbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerBRL
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerBRL");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedBRLbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBRLbalance) - parseFloat(userAskAmountBRL));
            var updatedFreezedBRLbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBRLbalance);
            updatedFreezedBRLbalanceAsker = updatedFreezedBRLbalanceAsker.minus(userAskAmountBRL);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of BRL Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedBRLbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingBRL " + totoalAskRemainingBRL);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBRL
              }, {
                BCHbalance: updatedBCHbalanceAsker,
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
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountBRL = new BigNumber(req.body.bidAmountBRL);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountBRL = parseFloat(userBidAmountBRL);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountBRL || !userBidAmountBCH ||
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
    var userBCHBalanceInDb = new BigNumber(userBidder.BCHbalance);
    var userFreezedBCHBalanceInDb = new BigNumber(userBidder.FreezedBCHbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountBCH = new BigNumber(userBidAmountBCH);
    if (userBidAmountBCH.greaterThanOrEqualTo(userBCHBalanceInDb)) {
      return res.json({
        "message": "You have insufficient BCH Balance",
        statusCode: 401
      });
    }
    userBidAmountBCH = parseFloat(userBidAmountBCH);
    try {
      var bidDetails = await BidBRL.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountBRL: userBidAmountBRL,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountBRL: userBidAmountBRL,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
    //var updateUserBCHBalance = (parseFloat(userBCHBalanceInDb) - parseFloat(userBidAmountBCH));
    var updateUserBCHBalance = new BigNumber(userBCHBalanceInDb);
    updateUserBCHBalance = updateUserBCHBalance.minus(userBidAmountBCH);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedBCHBalance = (parseFloat(userFreezedBCHBalanceInDb) + parseFloat(userBidAmountBCH));
    var updateFreezedBCHBalance = new BigNumber(userBidder.FreezedBCHbalance);
    updateFreezedBCHBalance = updateFreezedBCHBalance.plus(userBidAmountBCH);

    console.log("Updating user's bid details sdfyrtyupdateFreezedBCHBalance  " + updateFreezedBCHBalance);
    console.log("Updating user's bid details asdfasdf updateUserBCHBalance  " + updateUserBCHBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedBCHbalance: parseFloat(updateFreezedBCHBalance),
        BCHbalance: parseFloat(updateUserBCHBalance),
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
          'like': BCHMARKETID
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
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of BRL
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountBRL;
        }
        if (total_ask <= totoalBidRemainingBRL) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingBRL :: " + totoalBidRemainingBRL);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingBRL = totoalBidRemainingBRL - allAsksFromdb[i].bidAmountBRL;
            //totoalBidRemainingBRL = (parseFloat(totoalBidRemainingBRL) - parseFloat(currentAskDetails.askAmountBRL));
            totoalBidRemainingBRL = totoalBidRemainingBRL.minus(currentAskDetails.askAmountBRL);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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
              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.askAmountBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(currentAskDetails.askAmountBCH);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(currentAskDetails.askAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(currentAskDetails.askAmountBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);
              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of BRL Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedBRLbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              //Bid FreezedBCHbalance of bidder deduct and BRL  give to bidder
              //var updatedBRLbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.BRLbalance) + parseFloat(totoalBidRemainingBRL)) - parseFloat(totoalBidRemainingBCH);
              //var updatedBRLbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.BRLbalance) + parseFloat(userBidAmountBRL)) - parseFloat(totoalBidRemainingBRL));
              var updatedBRLbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(totoalBidRemainingBRL);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainBRL updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingBRL == 0updatedBRLbalanceBidder ::: " + updatedBRLbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingBRL asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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
              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.askAmountBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(currentAskDetails.askAmountBCH);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(currentAskDetails.askAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(currentAskDetails.askAmountBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);
              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

              console.log("After deduct TX Fees of BRL Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBRL == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerBRL");
              //var updatedBRLbalanceBidder = ((parseFloat(userAllDetailsInDBBid.BRLbalance) + parseFloat(userBidAmountBRL)) - parseFloat(totoalBidRemainingBRL));
              var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBid.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(totoalBidRemainingBRL);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainBRL updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedBRLbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBCH totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBRL totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidBRL.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingBRL = totoalBidRemainingBRL - allAsksFromdb[i].bidAmountBRL;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingBRL = totoalBidRemainingBRL.minus(currentAskDetails.askAmountBRL);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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

                //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.askAmountBCH));
                var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
                updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(currentAskDetails.askAmountBCH);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                //var txFeesAskerBCH = (parseFloat(currentAskDetails.askAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
                var txFeesAskerBCH = new BigNumber(currentAskDetails.askAmountBCH);
                txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

                console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
                //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
                updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

                console.log("After deduct TX Fees of BRL Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingBRL == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingBRL == 0updatedFreezedBRLbalanceAsker ::: " + updatedFreezedBRLbalanceAsker);
                console.log(" totoalBidRemainingBRL == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerBRL
                  }, {
                    FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainBRL totoalAskRemainingBRL " + totoalBidRemainingBCH);
                console.log("Total Ask RemainBRL BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainBRL updatedFreezedBRLbalanceAsker " + updatedFreezedBCHbalanceBidder);
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

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
                //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
                updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);



                console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingBRL == 0 updatedFreezedBRLbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerBRL
                  }, {
                    BRLbalance: updatedBRLbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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

                //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.askAmountBCH));
                var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
                updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(currentAskDetails.askAmountBCH);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                //var txFeesAskerBCH = (parseFloat(currentAskDetails.askAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
                var txFeesAskerBCH = new BigNumber(currentAskDetails.askAmountBCH);
                txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

                console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
                //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
                updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
                console.log("After deduct TX Fees of BRL Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0 updatedFreezedBRLbalanceAsker:: " + updatedFreezedBRLbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingBRL == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBRL " + totoalBidRemainingBRL);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerBRL
                  }, {
                    FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountBRL = (parseFloat(currentAskDetails.askAmountBRL) - parseFloat(totoalBidRemainingBRL));

              var updatedAskAmountBRL = new BigNumber(currentAskDetails.askAmountBRL);
              updatedAskAmountBRL = updatedAskAmountBRL.minus(totoalBidRemainingBRL);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskBRL.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
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

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBRL totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainBRL userAllDetailsInDBAsker.FreezedBRLbalance " + userAllDetailsInDBAsker.FreezedBRLbalance);
              console.log("Total Ask RemainBRL updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of BRL Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedBRLbalanceAsker:: " + updatedFreezedBRLbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedBRLbalanceAsker " + updatedFreezedBRLbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBRL
                }, {
                  FreezedBRLbalance: updatedFreezedBRLbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerBRL");
              //var updatedBRLbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BRLbalance) + parseFloat(userBidAmountBRL));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountBRL " + userBidAmountBRL);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.BRLbalance " + userAllDetailsInDBBidder.BRLbalance);

              var updatedBRLbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BRLbalance);
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.plus(userBidAmountBRL);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);
              //var txFeesBidderBRL = (parseFloat(updatedBRLbalanceBidder) * parseFloat(txFeeWithdrawSuccessBRL));
              // var txFeesBidderBRL = new BigNumber(userBidAmountBRL);
              // txFeesBidderBRL = txFeesBidderBRL.times(txFeeWithdrawSuccessBRL);
              //
              // console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              // //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              // updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);

              var txFeesBidderBRL = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBRL :: " + txFeesBidderBRL);
              //updatedBRLbalanceBidder = (parseFloat(updatedBRLbalanceBidder) - parseFloat(txFeesBidderBRL));
              updatedBRLbalanceBidder = updatedBRLbalanceBidder.minus(txFeesBidderBRL);

              console.log("After deduct TX Fees of BRL Update user " + updatedBRLbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedBRLbalanceBidder ::: " + updatedBRLbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedBRLbalanceBidder " + updatedBRLbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBRL " + totoalBidRemainingBRL);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBRL
                }, {
                  BRLbalance: updatedBRLbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidBRL.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH Bid destroy successfully desctroyCurrentBid ::");
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
        'like': BCHMARKETID
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
        var userBCHBalanceInDb = parseFloat(user.BCHbalance);
        var bidAmountOfBCHInBidTableDB = parseFloat(bidDetails.bidAmountBCH);
        var userFreezedBCHbalanceInDB = parseFloat(user.FreezedBCHbalance);
        var updateFreezedBalance = (parseFloat(userFreezedBCHbalanceInDB) - parseFloat(bidAmountOfBCHInBidTableDB));
        var updateUserBCHBalance = (parseFloat(userBCHBalanceInDb) + parseFloat(bidAmountOfBCHInBidTableDB));
        console.log("userBCHBalanceInDb :" + userBCHBalanceInDb);
        console.log("bidAmountOfBCHInBidTableDB :" + bidAmountOfBCHInBidTableDB);
        console.log("userFreezedBCHbalanceInDB :" + userFreezedBCHbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserBCHBalance :" + updateUserBCHBalance);

        User.update({
            id: bidownerId
          }, {
            BCHbalance: parseFloat(updateUserBCHBalance),
            FreezedBCHbalance: parseFloat(updateFreezedBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BCH balance");
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
        'like': BCHMARKETID
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
              console.log("Error to update user BCH balance");
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
          'like': BCHMARKETID
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
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBRL: allAskDetailsToExecute,
                      bidAmountBRLSum: bidAmountBRLSum[0].bidAmountBRL,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
          'like': BCHMARKETID
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
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBRL: allAskDetailsToExecute,
                      askAmountBRLSum: askAmountBRLSum[0].askAmountBRL,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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
          'like': BCHMARKETID
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
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBRL: allAskDetailsToExecute,
                      bidAmountBRLSum: bidAmountBRLSum[0].bidAmountBRL,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
          'like': BCHMARKETID
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
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountBRLSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBRL: allAskDetailsToExecute,
                      askAmountBRLSum: askAmountBRLSum[0].askAmountBRL,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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