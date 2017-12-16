/**
 * TrademarketBCHCZKController
 *
 * @description :: Server-side logic for managing trademarketbchczks
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

  addAskCZKMarket: async function(req, res) {
    console.log("Enter into ask api addAskCZKMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountCZK = new BigNumber(req.body.askAmountCZK);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountCZK || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountCZK < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userCZKBalanceInDb = new BigNumber(userAsker.CZKbalance);
    var userFreezedCZKBalanceInDb = new BigNumber(userAsker.FreezedCZKbalance);

    userCZKBalanceInDb = parseFloat(userCZKBalanceInDb);
    userFreezedCZKBalanceInDb = parseFloat(userFreezedCZKBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountCZK.greaterThanOrEqualTo(userCZKBalanceInDb)) {
      return res.json({
        "message": "You have insufficient CZK Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountCZK :: " + userAskAmountCZK);
    console.log("userCZKBalanceInDb :: " + userCZKBalanceInDb);
    // if (userAskAmountCZK >= userCZKBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient CZK Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountCZK = parseFloat(userAskAmountCZK);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskCZK.create({
        askAmountBCH: userAskAmountBCH,
        askAmountCZK: userAskAmountCZK,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountCZK: userAskAmountCZK,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerCZK: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.CZK_ASK_ADDED, askDetails);
    // var updateUserCZKBalance = (parseFloat(userCZKBalanceInDb) - parseFloat(userAskAmountCZK));
    // var updateFreezedCZKBalance = (parseFloat(userFreezedCZKBalanceInDb) + parseFloat(userAskAmountCZK));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userCZKBalanceInDb = new BigNumber(userCZKBalanceInDb);
    var updateUserCZKBalance = userCZKBalanceInDb.minus(userAskAmountCZK);
    updateUserCZKBalance = parseFloat(updateUserCZKBalance);
    userFreezedCZKBalanceInDb = new BigNumber(userFreezedCZKBalanceInDb);
    var updateFreezedCZKBalance = userFreezedCZKBalanceInDb.plus(userAskAmountCZK);
    updateFreezedCZKBalance = parseFloat(updateFreezedCZKBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedCZKbalance: updateFreezedCZKBalance,
        CZKbalance: updateUserCZKBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidCZK.find({
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
        message: 'Failed to find CZK bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingCZK = new BigNumber(userAskAmountCZK);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of CZK
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountCZK;
      }
      if (total_bid <= totoalAskRemainingCZK) {
        console.log("Inside of total_bid <= totoalAskRemainingCZK");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingCZK");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingCZK :: " + totoalAskRemainingCZK);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingCZK = (parseFloat(totoalAskRemainingCZK) - parseFloat(currentBidDetails.bidAmountCZK));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingCZK = totoalAskRemainingCZK.minus(currentBidDetails.bidAmountCZK);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingCZK :: " + totoalAskRemainingCZK);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingCZK == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingCZK == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerCZK
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCZK
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(currentBidDetails.bidAmountCZK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of CZK Update user " + updatedCZKbalanceBidder);
            //var txFeesBidderCZK = (parseFloat(currentBidDetails.bidAmountCZK) * parseFloat(txFeeWithdrawSuccessCZK));
            // var txFeesBidderCZK = new BigNumber(currentBidDetails.bidAmountCZK);
            //
            // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK)
            // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
            // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


            //updatedCZKbalanceBidder =  parseFloat(updatedCZKbalanceBidder);

            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                CZKbalance: updatedCZKbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and CZK balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedCZKbalanceAsker = parseFloat(totoalAskRemainingCZK);
            //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);

            //updatedFreezedCZKbalanceAsker =  parseFloat(updatedFreezedCZKbalanceAsker);
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
            console.log("After deduct TX Fees of CZK Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedCZKbalance: updatedFreezedCZKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed CZKBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidCZK:: ");
            try {
              var bidDestroy = await BidCZK.update({
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
            sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskCZK.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskCZK.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskCZK',
                statusCode: 401
              });
            }
            //emitting event of destruction of CZK_ask
            sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCZK == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCZK " + currentBidDetails.bidownerCZK);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerCZK
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(currentBidDetails.bidAmountCZK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of CZK 089089Update user " + updatedCZKbalanceBidder);
            // var txFeesBidderCZK = (parseFloat(currentBidDetails.bidAmountCZK) * parseFloat(txFeeWithdrawSuccessCZK));
            // var txFeesBidderCZK = new BigNumber(currentBidDetails.bidAmountCZK);
            // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
            // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            // // updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
            // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedCZKbalanceBidder:: " + updatedCZKbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                CZKbalance: updatedCZKbalanceBidder
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
              var desctroyCurrentBid = await BidCZK.update({
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
            sails.sockets.blast(constants.CZK_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCZK
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerCZK");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(totoalAskRemainingCZK));
            //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
            console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
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
            console.log("After deduct TX Fees of CZK Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedCZKbalance: updatedFreezedCZKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskCZK.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountCZK: parseFloat(totoalAskRemainingCZK),
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
            sails.sockets.blast(constants.CZK_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingCZK :: " + totoalAskRemainingCZK);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingCZK = totoalAskRemainingCZK - allBidsFromdb[i].bidAmountCZK;
          if (totoalAskRemainingCZK >= currentBidDetails.bidAmountCZK) {
            //totoalAskRemainingCZK = (parseFloat(totoalAskRemainingCZK) - parseFloat(currentBidDetails.bidAmountCZK));
            totoalAskRemainingCZK = totoalAskRemainingCZK.minus(currentBidDetails.bidAmountCZK);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingCZK == 0::: " + totoalAskRemainingCZK);

            if (totoalAskRemainingCZK == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingCZK == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCZK
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
                  id: askDetails.askownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerCZK :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));
              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(currentBidDetails.bidAmountCZK);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 CZK Update user " + updatedCZKbalanceBidder);
              //var txFeesBidderCZK = (parseFloat(currentBidDetails.bidAmountCZK) * parseFloat(txFeeWithdrawSuccessCZK));

              // var txFeesBidderCZK = new BigNumber(currentBidDetails.bidAmountCZK);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);
              // console.log("After deduct TX Fees of CZK Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerCZK
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  CZKbalance: updatedCZKbalanceBidder
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
              //var updatedFreezedCZKbalanceAsker = parseFloat(totoalAskRemainingCZK);
              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(totoalAskRemainingCZK));
              //var updatedFreezedCZKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK)) + parseFloat(totoalAskRemainingCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.plus(totoalAskRemainingCZK);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
              console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
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

              console.log("After deduct TX Fees of CZK Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerCZK
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidCZK.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidCZK.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidCZK.update({
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskCZK.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskCZK.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskCZK.update({
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
              sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCZK == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCZK " + currentBidDetails.bidownerCZK);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCZK
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

              //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(currentBidDetails.bidAmountCZK));
              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(currentBidDetails.bidAmountCZK);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var txFeesBidderCZK = (parseFloat(currentBidDetails.bidAmountCZK) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(currentBidDetails.bidAmountCZK);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);
              // console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedCZKbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingCZK " + totoalAskRemainingCZK);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerCZK
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  CZKbalance: updatedCZKbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidCZK.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidCZK.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.CZK_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCZK
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
            //var updatedBidAmountCZK = (parseFloat(currentBidDetails.bidAmountCZK) - parseFloat(totoalAskRemainingCZK));
            var updatedBidAmountCZK = new BigNumber(currentBidDetails.bidAmountCZK);
            updatedBidAmountCZK = updatedBidAmountCZK.minus(totoalAskRemainingCZK);

            try {
              var updatedaskDetails = await BidCZK.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountCZK: updatedBidAmountCZK,
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
            sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerCZK
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


            //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.CZKbalance) + parseFloat(totoalAskRemainingCZK));

            var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.CZKbalance);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(totoalAskRemainingCZK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of CZK Update user " + updatedCZKbalanceBidder);
            //var CZKAmountSucess = parseFloat(totoalAskRemainingCZK);
            //var CZKAmountSucess = new BigNumber(totoalAskRemainingCZK);
            //var txFeesBidderCZK = (parseFloat(CZKAmountSucess) * parseFloat(txFeeWithdrawSuccessCZK));
            //var txFeesBidderCZK = (parseFloat(totoalAskRemainingCZK) * parseFloat(txFeeWithdrawSuccessCZK));



            // var txFeesBidderCZK = new BigNumber(totoalAskRemainingCZK);
            // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
            //
            // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
            // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

            console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
            console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedCZKbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCZK
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                CZKbalance: updatedCZKbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerCZK");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(userAskAmountCZK));
            var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
            updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(userAskAmountCZK);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of CZK Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCZKbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingCZK " + totoalAskRemainingCZK);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCZK
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedCZKbalance: updatedFreezedCZKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskCZK.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskCZK.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskCZK.update({
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
            //emitting event for CZK_ask destruction
            sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
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
  addBidCZKMarket: async function(req, res) {
    console.log("Enter into ask api addBidCZKMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountCZK = new BigNumber(req.body.bidAmountCZK);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountCZK = parseFloat(userBidAmountCZK);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountCZK || !userBidAmountBCH ||
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
      var bidDetails = await BidCZK.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountCZK: userBidAmountCZK,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountCZK: userBidAmountCZK,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerCZK: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.CZK_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskCZK.find({
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
        var totoalBidRemainingCZK = new BigNumber(userBidAmountCZK);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of CZK
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountCZK;
        }
        if (total_ask <= totoalBidRemainingCZK) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingCZK :: " + totoalBidRemainingCZK);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingCZK = totoalBidRemainingCZK - allAsksFromdb[i].bidAmountCZK;
            //totoalBidRemainingCZK = (parseFloat(totoalBidRemainingCZK) - parseFloat(currentAskDetails.askAmountCZK));
            totoalBidRemainingCZK = totoalBidRemainingCZK.minus(currentAskDetails.askAmountCZK);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingCZK == 0::: " + totoalBidRemainingCZK);
            if (totoalBidRemainingCZK == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingCZK == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerCZK totoalBidRemainingCZK == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(currentAskDetails.askAmountCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(currentAskDetails.askAmountCZK);
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
              console.log("After deduct TX Fees of CZK Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedCZKbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
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
                  id: bidDetails.bidownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and CZK  give to bidder
              //var updatedCZKbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.CZKbalance) + parseFloat(totoalBidRemainingCZK)) - parseFloat(totoalBidRemainingBCH);
              //var updatedCZKbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.CZKbalance) + parseFloat(userBidAmountCZK)) - parseFloat(totoalBidRemainingCZK));
              var updatedCZKbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(totoalBidRemainingCZK);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainCZK updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var CZKAmountSucess = (parseFloat(userBidAmountCZK) - parseFloat(totoalBidRemainingCZK));
              // var CZKAmountSucess = new BigNumber(userBidAmountCZK);
              // CZKAmountSucess = CZKAmountSucess.minus(totoalBidRemainingCZK);
              //
              // //var txFeesBidderCZK = (parseFloat(CZKAmountSucess) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(CZKAmountSucess);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              //
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingCZK == 0updatedCZKbalanceBidder ::: " + updatedCZKbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingCZK asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingCZK == 0BidCZK.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidCZK.destroy({
              //   id: bidDetails.bidownerCZK
              // });
              try {
                var bidDestroy = await BidCZK.update({
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0AskCZK.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskCZK.destroy({
              //   id: currentAskDetails.askownerCZK
              // });
              try {
                var askDestroy = await AskCZK.update({
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
              sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0  enter into else of totoalBidRemainingCZK == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0start User.findOne currentAskDetails.bidownerCZK ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(currentAskDetails.askAmountCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(currentAskDetails.askAmountCZK);
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

              console.log("After deduct TX Fees of CZK Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskCZK.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskCZK.update({
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

              sails.sockets.blast(constants.CZK_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCZK == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingCZK == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerCZK");
              //var updatedCZKbalanceBidder = ((parseFloat(userAllDetailsInDBBid.CZKbalance) + parseFloat(userBidAmountCZK)) - parseFloat(totoalBidRemainingCZK));
              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBid.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(totoalBidRemainingCZK);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainCZK updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var CZKAmountSucess = (parseFloat(userBidAmountCZK) - parseFloat(totoalBidRemainingCZK));
              // var CZKAmountSucess = new BigNumber(userBidAmountCZK);
              // CZKAmountSucess = CZKAmountSucess.minus(totoalBidRemainingCZK);
              //
              // //var txFeesBidderCZK = (parseFloat(CZKAmountSucess) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(CZKAmountSucess);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              //
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);
              // console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedCZKbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountCZK totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidCZK.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountCZK: totoalBidRemainingCZK,
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingCZK :: " + totoalBidRemainingCZK);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingCZK = totoalBidRemainingCZK - allAsksFromdb[i].bidAmountCZK;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingCZK = totoalBidRemainingCZK.minus(currentAskDetails.askAmountCZK);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingCZK == 0::: " + totoalBidRemainingCZK);

              if (totoalBidRemainingCZK == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingCZK == 0Enter into totoalBidRemainingCZK == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCZK
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
                    id: bidDetails.bidownerCZK
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingCZK == 0userAll bidDetails.askownerCZK :: ");
                console.log(" totoalBidRemainingCZK == 0Update value of Bidder and asker");
                //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(currentAskDetails.askAmountCZK));
                var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
                updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(currentAskDetails.askAmountCZK);

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

                console.log("After deduct TX Fees of CZK Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingCZK == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingCZK == 0updatedFreezedCZKbalanceAsker ::: " + updatedFreezedCZKbalanceAsker);
                console.log(" totoalBidRemainingCZK == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerCZK
                  }, {
                    FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedCZKbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(userBidAmountCZK)) - parseFloat(totoalBidRemainingCZK));

                var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
                updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);
                updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(totoalBidRemainingCZK);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainCZK totoalAskRemainingCZK " + totoalBidRemainingBCH);
                console.log("Total Ask RemainCZK BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainCZK updatedFreezedCZKbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
                //var CZKAmountSucess = (parseFloat(userBidAmountCZK) - parseFloat(totoalBidRemainingCZK));
                // var CZKAmountSucess = new BigNumber(userBidAmountCZK);
                // CZKAmountSucess = CZKAmountSucess.minus(totoalBidRemainingCZK);
                //
                //
                // //var txFeesBidderCZK = (parseFloat(CZKAmountSucess) * parseFloat(txFeeWithdrawSuccessCZK));
                // var txFeesBidderCZK = new BigNumber(CZKAmountSucess);
                // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
                // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
                // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
                // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
                //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
                updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);



                console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 updatedFreezedCZKbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerCZK
                  }, {
                    CZKbalance: updatedCZKbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 BidCZK.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskCZK.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskCZK.update({
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
                sails.sockets.blast(constants.CZK_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingCZK == 0 AskCZK.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidCZK.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidCZK.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 enter into else of totoalBidRemainingCZK == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0totoalBidRemainingCZK == 0 start User.findOne currentAskDetails.bidownerCZK " + currentAskDetails.bidownerCZK);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCZK
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(currentAskDetails.askAmountCZK));

                var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
                updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(currentAskDetails.askAmountCZK);

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
                console.log("After deduct TX Fees of CZK Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 updatedFreezedCZKbalanceAsker:: " + updatedFreezedCZKbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingCZK " + totoalBidRemainingCZK);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerCZK
                  }, {
                    FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCZK == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskCZK.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskCZK.update({
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
                sails.sockets.blast(constants.CZK_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountCZK = (parseFloat(currentAskDetails.askAmountCZK) - parseFloat(totoalBidRemainingCZK));

              var updatedAskAmountCZK = new BigNumber(currentAskDetails.askAmountCZK);
              updatedAskAmountCZK = updatedAskAmountCZK.minus(totoalBidRemainingCZK);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskCZK.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountCZK: updatedAskAmountCZK,
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
              sails.sockets.blast(constants.CZK_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedCZKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCZKbalance) - parseFloat(totoalBidRemainingCZK));
              var updatedFreezedCZKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCZKbalance);
              updatedFreezedCZKbalanceAsker = updatedFreezedCZKbalanceAsker.minus(totoalBidRemainingCZK);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCZK totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainCZK userAllDetailsInDBAsker.FreezedCZKbalance " + userAllDetailsInDBAsker.FreezedCZKbalance);
              console.log("Total Ask RemainCZK updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of CZK Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedCZKbalanceAsker:: " + updatedFreezedCZKbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedCZKbalanceAsker " + updatedFreezedCZKbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCZK
                }, {
                  FreezedCZKbalance: updatedFreezedCZKbalanceAsker,
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
                  id: bidDetails.bidownerCZK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerCZK");
              //var updatedCZKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CZKbalance) + parseFloat(userBidAmountCZK));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountCZK " + userBidAmountCZK);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.CZKbalance " + userAllDetailsInDBBidder.CZKbalance);

              var updatedCZKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CZKbalance);
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.plus(userBidAmountCZK);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);
              //var txFeesBidderCZK = (parseFloat(updatedCZKbalanceBidder) * parseFloat(txFeeWithdrawSuccessCZK));
              // var txFeesBidderCZK = new BigNumber(userBidAmountCZK);
              // txFeesBidderCZK = txFeesBidderCZK.times(txFeeWithdrawSuccessCZK);
              //
              // console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              // //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              // updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);

              var txFeesBidderCZK = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCZK :: " + txFeesBidderCZK);
              //updatedCZKbalanceBidder = (parseFloat(updatedCZKbalanceBidder) - parseFloat(txFeesBidderCZK));
              updatedCZKbalanceBidder = updatedCZKbalanceBidder.minus(txFeesBidderCZK);

              console.log("After deduct TX Fees of CZK Update user " + updatedCZKbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedCZKbalanceBidder ::: " + updatedCZKbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedCZKbalanceBidder " + updatedCZKbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingCZK " + totoalBidRemainingCZK);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCZK
                }, {
                  CZKbalance: updatedCZKbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidCZK.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidCZK.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidCZK.update({
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, bidDestroy);
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
  removeBidCZKMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdCZK;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidCZK.findOne({
      bidownerCZK: bidownerId,
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
            BidCZK.update({
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
              sails.sockets.blast(constants.CZK_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskCZKMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdCZK;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskCZK.findOne({
      askownerCZK: askownerId,
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
        var userCZKBalanceInDb = parseFloat(user.CZKbalance);
        var askAmountOfCZKInAskTableDB = parseFloat(askDetails.askAmountCZK);
        var userFreezedCZKbalanceInDB = parseFloat(user.FreezedCZKbalance);
        console.log("userCZKBalanceInDb :" + userCZKBalanceInDb);
        console.log("askAmountOfCZKInAskTableDB :" + askAmountOfCZKInAskTableDB);
        console.log("userFreezedCZKbalanceInDB :" + userFreezedCZKbalanceInDB);
        var updateFreezedCZKBalance = (parseFloat(userFreezedCZKbalanceInDB) - parseFloat(askAmountOfCZKInAskTableDB));
        var updateUserCZKBalance = (parseFloat(userCZKBalanceInDb) + parseFloat(askAmountOfCZKInAskTableDB));
        User.update({
            id: askownerId
          }, {
            CZKbalance: parseFloat(updateUserCZKBalance),
            FreezedCZKbalance: parseFloat(updateFreezedCZKBalance)
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
            AskCZK.update({
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
              sails.sockets.blast(constants.CZK_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidCZK: function(req, res) {
    console.log("Enter into ask api getAllBidCZK :: ");
    BidCZK.find({
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
            BidCZK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountCZK')
              .exec(function(err, bidAmountCZKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCZKSum",
                    statusCode: 401
                  });
                }
                BidCZK.find({
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
                        "message": "Error to sum Of bidAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCZK: allAskDetailsToExecute,
                      bidAmountCZKSum: bidAmountCZKSum[0].bidAmountCZK,
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
  getAllAskCZK: function(req, res) {
    console.log("Enter into ask api getAllAskCZK :: ");
    AskCZK.find({
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
            AskCZK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountCZK')
              .exec(function(err, askAmountCZKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCZKSum",
                    statusCode: 401
                  });
                }
                AskCZK.find({
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
                        "message": "Error to sum Of askAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCZK: allAskDetailsToExecute,
                      askAmountCZKSum: askAmountCZKSum[0].askAmountCZK,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCZK Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsCZKSuccess: function(req, res) {
    console.log("Enter into ask api getBidsCZKSuccess :: ");
    BidCZK.find({
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
            BidCZK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountCZK')
              .exec(function(err, bidAmountCZKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCZKSum",
                    statusCode: 401
                  });
                }
                BidCZK.find({
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
                        "message": "Error to sum Of bidAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCZK: allAskDetailsToExecute,
                      bidAmountCZKSum: bidAmountCZKSum[0].bidAmountCZK,
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
  getAsksCZKSuccess: function(req, res) {
    console.log("Enter into ask api getAsksCZKSuccess :: ");
    AskCZK.find({
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
            AskCZK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountCZK')
              .exec(function(err, askAmountCZKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCZKSum",
                    statusCode: 401
                  });
                }
                AskCZK.find({
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
                        "message": "Error to sum Of askAmountCZKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCZK: allAskDetailsToExecute,
                      askAmountCZKSum: askAmountCZKSum[0].askAmountCZK,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCZK Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
};