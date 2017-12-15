/**
 * TrademarketBCHINRController
 *
 * @description :: Server-side logic for managing trademarketbchinrs
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

  addAskINRMarket: async function(req, res) {
    console.log("Enter into ask api addAskINRMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountINR = new BigNumber(req.body.askAmountINR);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountINR || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountINR < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userINRBalanceInDb = new BigNumber(userAsker.INRbalance);
    var userFreezedINRBalanceInDb = new BigNumber(userAsker.FreezedINRbalance);

    userINRBalanceInDb = parseFloat(userINRBalanceInDb);
    userFreezedINRBalanceInDb = parseFloat(userFreezedINRBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountINR.greaterThanOrEqualTo(userINRBalanceInDb)) {
      return res.json({
        "message": "You have insufficient INR Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountINR :: " + userAskAmountINR);
    console.log("userINRBalanceInDb :: " + userINRBalanceInDb);
    // if (userAskAmountINR >= userINRBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient INR Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountINR = parseFloat(userAskAmountINR);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskINR.create({
        askAmountBCH: userAskAmountBCH,
        askAmountINR: userAskAmountINR,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountINR: userAskAmountINR,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerINR: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.INR_ASK_ADDED, askDetails);
    // var updateUserINRBalance = (parseFloat(userINRBalanceInDb) - parseFloat(userAskAmountINR));
    // var updateFreezedINRBalance = (parseFloat(userFreezedINRBalanceInDb) + parseFloat(userAskAmountINR));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userINRBalanceInDb = new BigNumber(userINRBalanceInDb);
    var updateUserINRBalance = userINRBalanceInDb.minus(userAskAmountINR);
    updateUserINRBalance = parseFloat(updateUserINRBalance);
    userFreezedINRBalanceInDb = new BigNumber(userFreezedINRBalanceInDb);
    var updateFreezedINRBalance = userFreezedINRBalanceInDb.plus(userAskAmountINR);
    updateFreezedINRBalance = parseFloat(updateFreezedINRBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedINRbalance: updateFreezedINRBalance,
        INRbalance: updateUserINRBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidINR.find({
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
        message: 'Failed to find INR bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingINR = new BigNumber(userAskAmountINR);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of INR
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountINR;
      }
      if (total_bid <= totoalAskRemainingINR) {
        console.log("Inside of total_bid <= totoalAskRemainingINR");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingINR");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingINR :: " + totoalAskRemainingINR);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingINR = (parseFloat(totoalAskRemainingINR) - parseFloat(currentBidDetails.bidAmountINR));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingINR = totoalAskRemainingINR.minus(currentBidDetails.bidAmountINR);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingINR :: " + totoalAskRemainingINR);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingINR == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingINR == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerINR
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerINR
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(currentBidDetails.bidAmountINR));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
            updatedINRbalanceBidder = updatedINRbalanceBidder.plus(currentBidDetails.bidAmountINR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of INR Update user " + updatedINRbalanceBidder);
            //var txFeesBidderINR = (parseFloat(currentBidDetails.bidAmountINR) * parseFloat(txFeeWithdrawSuccessINR));
            // var txFeesBidderINR = new BigNumber(currentBidDetails.bidAmountINR);
            //
            // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR)
            // console.log("txFeesBidderINR :: " + txFeesBidderINR);
            // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
            // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderINR :: " + txFeesBidderINR);
            updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);


            //updatedINRbalanceBidder =  parseFloat(updatedINRbalanceBidder);

            console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedINRbalanceBidder " + updatedINRbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerINR
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                INRbalance: updatedINRbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and INR balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedINRbalanceAsker = parseFloat(totoalAskRemainingINR);
            //var updatedFreezedINRbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(userAskAmountINR)) + parseFloat(totoalAskRemainingINR));
            var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(userAskAmountINR);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.plus(totoalAskRemainingINR);

            //updatedFreezedINRbalanceAsker =  parseFloat(updatedFreezedINRbalanceAsker);
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
            console.log("After deduct TX Fees of INR Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerINR
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedINRbalance: updatedFreezedINRbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed INRBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidINR:: ");
            try {
              var bidDestroy = await BidINR.update({
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
            sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskINR.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskINR.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskINR',
                statusCode: 401
              });
            }
            //emitting event of destruction of INR_ask
            sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingINR == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerINR " + currentBidDetails.bidownerINR);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerINR
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(currentBidDetails.bidAmountINR));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
            updatedINRbalanceBidder = updatedINRbalanceBidder.plus(currentBidDetails.bidAmountINR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of INR 089089Update user " + updatedINRbalanceBidder);
            // var txFeesBidderINR = (parseFloat(currentBidDetails.bidAmountINR) * parseFloat(txFeeWithdrawSuccessINR));
            // var txFeesBidderINR = new BigNumber(currentBidDetails.bidAmountINR);
            // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
            // console.log("txFeesBidderINR :: " + txFeesBidderINR);
            // // updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
            // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderINR :: " + txFeesBidderINR);
            updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);


            console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedINRbalanceBidder:: " + updatedINRbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedINRbalanceBidder " + updatedINRbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerINR
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                INRbalance: updatedINRbalanceBidder
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
              var desctroyCurrentBid = await BidINR.update({
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
            sails.sockets.blast(constants.INR_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerINR
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerINR");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(totoalAskRemainingINR));
            //var updatedFreezedINRbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(userAskAmountINR)) + parseFloat(totoalAskRemainingINR));
            var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(userAskAmountINR);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.plus(totoalAskRemainingINR);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainINR totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainINR userAllDetailsInDBAsker.FreezedINRbalance " + userAllDetailsInDBAsker.FreezedINRbalance);
            console.log("Total Ask RemainINR updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
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
            console.log("After deduct TX Fees of INR Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedINRbalanceAsker ::: " + updatedFreezedINRbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerINR
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedINRbalance: updatedFreezedINRbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountINR totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskINR.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountINR: parseFloat(totoalAskRemainingINR),
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
            sails.sockets.blast(constants.INR_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingINR :: " + totoalAskRemainingINR);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingINR = totoalAskRemainingINR - allBidsFromdb[i].bidAmountINR;
          if (totoalAskRemainingINR >= currentBidDetails.bidAmountINR) {
            //totoalAskRemainingINR = (parseFloat(totoalAskRemainingINR) - parseFloat(currentBidDetails.bidAmountINR));
            totoalAskRemainingINR = totoalAskRemainingINR.minus(currentBidDetails.bidAmountINR);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingINR == 0::: " + totoalAskRemainingINR);

            if (totoalAskRemainingINR == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingINR == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerINR
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
                  id: askDetails.askownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerINR :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(currentBidDetails.bidAmountINR));
              var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(currentBidDetails.bidAmountINR);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 INR Update user " + updatedINRbalanceBidder);
              //var txFeesBidderINR = (parseFloat(currentBidDetails.bidAmountINR) * parseFloat(txFeeWithdrawSuccessINR));

              // var txFeesBidderINR = new BigNumber(currentBidDetails.bidAmountINR);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);
              // console.log("After deduct TX Fees of INR Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingINR " + totoalAskRemainingINR);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerINR
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  INRbalance: updatedINRbalanceBidder
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
              //var updatedFreezedINRbalanceAsker = parseFloat(totoalAskRemainingINR);
              //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(totoalAskRemainingINR));
              //var updatedFreezedINRbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(userAskAmountINR)) + parseFloat(totoalAskRemainingINR));
              var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(userAskAmountINR);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.plus(totoalAskRemainingINR);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainINR totoalAskRemainingINR " + totoalAskRemainingINR);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainINR userAllDetailsInDBAsker.FreezedINRbalance " + userAllDetailsInDBAsker.FreezedINRbalance);
              console.log("Total Ask RemainINR updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
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

              console.log("After deduct TX Fees of INR Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedINRbalanceAsker ::: " + updatedFreezedINRbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingINR " + totoalAskRemainingINR);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerINR
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedINRbalance: updatedFreezedINRbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidINR.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidINR.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidINR.update({
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskINR.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskINR.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskINR.update({
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
              sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingINR == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerINR " + currentBidDetails.bidownerINR);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerINR
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

              //var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(currentBidDetails.bidAmountINR));
              var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(currentBidDetails.bidAmountINR);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of INR Update user " + updatedINRbalanceBidder);
              //var txFeesBidderINR = (parseFloat(currentBidDetails.bidAmountINR) * parseFloat(txFeeWithdrawSuccessINR));
              // var txFeesBidderINR = new BigNumber(currentBidDetails.bidAmountINR);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);
              // console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedINRbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingINR " + totoalAskRemainingINR);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerINR
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  INRbalance: updatedINRbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidINR.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidINR.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.INR_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerINR
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
            //var updatedBidAmountINR = (parseFloat(currentBidDetails.bidAmountINR) - parseFloat(totoalAskRemainingINR));
            var updatedBidAmountINR = new BigNumber(currentBidDetails.bidAmountINR);
            updatedBidAmountINR = updatedBidAmountINR.minus(totoalAskRemainingINR);

            try {
              var updatedaskDetails = await BidINR.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountINR: updatedBidAmountINR,
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
            sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerINR
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


            //var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.INRbalance) + parseFloat(totoalAskRemainingINR));

            var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.INRbalance);
            updatedINRbalanceBidder = updatedINRbalanceBidder.plus(totoalAskRemainingINR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of INR Update user " + updatedINRbalanceBidder);
            //var INRAmountSucess = parseFloat(totoalAskRemainingINR);
            //var INRAmountSucess = new BigNumber(totoalAskRemainingINR);
            //var txFeesBidderINR = (parseFloat(INRAmountSucess) * parseFloat(txFeeWithdrawSuccessINR));
            //var txFeesBidderINR = (parseFloat(totoalAskRemainingINR) * parseFloat(txFeeWithdrawSuccessINR));



            // var txFeesBidderINR = new BigNumber(totoalAskRemainingINR);
            // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
            //
            // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
            // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

            console.log("txFeesBidderINR :: " + txFeesBidderINR);
            console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedINRbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedINRbalanceBidder " + updatedINRbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerINR
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                INRbalance: updatedINRbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerINR");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(userAskAmountINR));
            var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
            updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(userAskAmountINR);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of INR Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedINRbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingINR " + totoalAskRemainingINR);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerINR
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedINRbalance: updatedFreezedINRbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskINR.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskINR.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskINR.update({
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
            //emitting event for INR_ask destruction
            sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
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
  addBidINRMarket: async function(req, res) {
    console.log("Enter into ask api addBidINRMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountINR = new BigNumber(req.body.bidAmountINR);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountINR = parseFloat(userBidAmountINR);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountINR || !userBidAmountBCH ||
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
      var bidDetails = await BidINR.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountINR: userBidAmountINR,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountINR: userBidAmountINR,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerINR: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.INR_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskINR.find({
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
        var totoalBidRemainingINR = new BigNumber(userBidAmountINR);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of INR
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountINR;
        }
        if (total_ask <= totoalBidRemainingINR) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingINR :: " + totoalBidRemainingINR);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingINR = totoalBidRemainingINR - allAsksFromdb[i].bidAmountINR;
            //totoalBidRemainingINR = (parseFloat(totoalBidRemainingINR) - parseFloat(currentAskDetails.askAmountINR));
            totoalBidRemainingINR = totoalBidRemainingINR.minus(currentAskDetails.askAmountINR);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingINR == 0::: " + totoalBidRemainingINR);
            if (totoalBidRemainingINR == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingINR == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerINR totoalBidRemainingINR == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(currentAskDetails.askAmountINR));
              var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(currentAskDetails.askAmountINR);
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
              console.log("After deduct TX Fees of INR Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedINRbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerINR
                }, {
                  FreezedINRbalance: updatedFreezedINRbalanceAsker,
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
                  id: bidDetails.bidownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and INR  give to bidder
              //var updatedINRbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.INRbalance) + parseFloat(totoalBidRemainingINR)) - parseFloat(totoalBidRemainingBCH);
              //var updatedINRbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.INRbalance) + parseFloat(userBidAmountINR)) - parseFloat(totoalBidRemainingINR));
              var updatedINRbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(userBidAmountINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(totoalBidRemainingINR);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainINR totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainINR BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainINR updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
              //var INRAmountSucess = (parseFloat(userBidAmountINR) - parseFloat(totoalBidRemainingINR));
              // var INRAmountSucess = new BigNumber(userBidAmountINR);
              // INRAmountSucess = INRAmountSucess.minus(totoalBidRemainingINR);
              //
              // //var txFeesBidderINR = (parseFloat(INRAmountSucess) * parseFloat(txFeeWithdrawSuccessINR));
              // var txFeesBidderINR = new BigNumber(INRAmountSucess);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              //
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingINR == 0updatedINRbalanceBidder ::: " + updatedINRbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingINR asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerINR
                }, {
                  INRbalance: updatedINRbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingINR == 0BidINR.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidINR.destroy({
              //   id: bidDetails.bidownerINR
              // });
              try {
                var bidDestroy = await BidINR.update({
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingINR == 0AskINR.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskINR.destroy({
              //   id: currentAskDetails.askownerINR
              // });
              try {
                var askDestroy = await AskINR.update({
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
              sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0  enter into else of totoalBidRemainingINR == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0start User.findOne currentAskDetails.bidownerINR ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(currentAskDetails.askAmountINR));
              var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(currentAskDetails.askAmountINR);
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

              console.log("After deduct TX Fees of INR Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerINR
                }, {
                  FreezedINRbalance: updatedFreezedINRbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskINR.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskINR.update({
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

              sails.sockets.blast(constants.INR_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingINR == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingINR == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerINR");
              //var updatedINRbalanceBidder = ((parseFloat(userAllDetailsInDBBid.INRbalance) + parseFloat(userBidAmountINR)) - parseFloat(totoalBidRemainingINR));
              var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBid.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(userBidAmountINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(totoalBidRemainingINR);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainINR totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainINR BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainINR updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
              //var INRAmountSucess = (parseFloat(userBidAmountINR) - parseFloat(totoalBidRemainingINR));
              // var INRAmountSucess = new BigNumber(userBidAmountINR);
              // INRAmountSucess = INRAmountSucess.minus(totoalBidRemainingINR);
              //
              // //var txFeesBidderINR = (parseFloat(INRAmountSucess) * parseFloat(txFeeWithdrawSuccessINR));
              // var txFeesBidderINR = new BigNumber(INRAmountSucess);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              //
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);
              // console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedINRbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerINR
                }, {
                  INRbalance: updatedINRbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountINR totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidINR.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountINR: totoalBidRemainingINR,
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingINR :: " + totoalBidRemainingINR);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingINR = totoalBidRemainingINR - allAsksFromdb[i].bidAmountINR;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingINR = totoalBidRemainingINR.minus(currentAskDetails.askAmountINR);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingINR == 0::: " + totoalBidRemainingINR);

              if (totoalBidRemainingINR == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingINR == 0Enter into totoalBidRemainingINR == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerINR
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
                    id: bidDetails.bidownerINR
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingINR == 0userAll bidDetails.askownerINR :: ");
                console.log(" totoalBidRemainingINR == 0Update value of Bidder and asker");
                //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(currentAskDetails.askAmountINR));
                var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
                updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(currentAskDetails.askAmountINR);

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

                console.log("After deduct TX Fees of INR Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingINR == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingINR == 0updatedFreezedINRbalanceAsker ::: " + updatedFreezedINRbalanceAsker);
                console.log(" totoalBidRemainingINR == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingINR " + totoalBidRemainingINR);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerINR
                  }, {
                    FreezedINRbalance: updatedFreezedINRbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedINRbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(userBidAmountINR)) - parseFloat(totoalBidRemainingINR));

                var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
                updatedINRbalanceBidder = updatedINRbalanceBidder.plus(userBidAmountINR);
                updatedINRbalanceBidder = updatedINRbalanceBidder.minus(totoalBidRemainingINR);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainINR totoalAskRemainingINR " + totoalBidRemainingBCH);
                console.log("Total Ask RemainINR BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainINR updatedFreezedINRbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
                //var INRAmountSucess = (parseFloat(userBidAmountINR) - parseFloat(totoalBidRemainingINR));
                // var INRAmountSucess = new BigNumber(userBidAmountINR);
                // INRAmountSucess = INRAmountSucess.minus(totoalBidRemainingINR);
                //
                //
                // //var txFeesBidderINR = (parseFloat(INRAmountSucess) * parseFloat(txFeeWithdrawSuccessINR));
                // var txFeesBidderINR = new BigNumber(INRAmountSucess);
                // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
                // console.log("txFeesBidderINR :: " + txFeesBidderINR);
                // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
                // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderINR :: " + txFeesBidderINR);
                //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
                updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);



                console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingINR == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingINR == 0 updatedFreezedINRbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedINRbalanceBidder " + updatedINRbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingINR " + totoalBidRemainingINR);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerINR
                  }, {
                    INRbalance: updatedINRbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingINR == 0 BidINR.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskINR.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskINR.update({
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
                sails.sockets.blast(constants.INR_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingINR == 0 AskINR.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidINR.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidINR.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0 enter into else of totoalBidRemainingINR == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0totoalBidRemainingINR == 0 start User.findOne currentAskDetails.bidownerINR " + currentAskDetails.bidownerINR);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerINR
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(currentAskDetails.askAmountINR));

                var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
                updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(currentAskDetails.askAmountINR);

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
                console.log("After deduct TX Fees of INR Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0 updatedFreezedINRbalanceAsker:: " + updatedFreezedINRbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingINR " + totoalBidRemainingINR);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerINR
                  }, {
                    FreezedINRbalance: updatedFreezedINRbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingINR == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskINR.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskINR.update({
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
                sails.sockets.blast(constants.INR_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountINR = (parseFloat(currentAskDetails.askAmountINR) - parseFloat(totoalBidRemainingINR));

              var updatedAskAmountINR = new BigNumber(currentAskDetails.askAmountINR);
              updatedAskAmountINR = updatedAskAmountINR.minus(totoalBidRemainingINR);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskINR.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountINR: updatedAskAmountINR,
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
              sails.sockets.blast(constants.INR_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedINRbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedINRbalance) - parseFloat(totoalBidRemainingINR));
              var updatedFreezedINRbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedINRbalance);
              updatedFreezedINRbalanceAsker = updatedFreezedINRbalanceAsker.minus(totoalBidRemainingINR);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainINR totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainINR userAllDetailsInDBAsker.FreezedINRbalance " + userAllDetailsInDBAsker.FreezedINRbalance);
              console.log("Total Ask RemainINR updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of INR Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedINRbalanceAsker:: " + updatedFreezedINRbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedINRbalanceAsker " + updatedFreezedINRbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerINR
                }, {
                  FreezedINRbalance: updatedFreezedINRbalanceAsker,
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
                  id: bidDetails.bidownerINR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerINR");
              //var updatedINRbalanceBidder = (parseFloat(userAllDetailsInDBBidder.INRbalance) + parseFloat(userBidAmountINR));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountINR " + userBidAmountINR);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.INRbalance " + userAllDetailsInDBBidder.INRbalance);

              var updatedINRbalanceBidder = new BigNumber(userAllDetailsInDBBidder.INRbalance);
              updatedINRbalanceBidder = updatedINRbalanceBidder.plus(userBidAmountINR);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of INR Update user " + updatedINRbalanceBidder);
              //var txFeesBidderINR = (parseFloat(updatedINRbalanceBidder) * parseFloat(txFeeWithdrawSuccessINR));
              // var txFeesBidderINR = new BigNumber(userBidAmountINR);
              // txFeesBidderINR = txFeesBidderINR.times(txFeeWithdrawSuccessINR);
              //
              // console.log("txFeesBidderINR :: " + txFeesBidderINR);
              // //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              // updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);

              var txFeesBidderINR = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderINR :: " + txFeesBidderINR);
              //updatedINRbalanceBidder = (parseFloat(updatedINRbalanceBidder) - parseFloat(txFeesBidderINR));
              updatedINRbalanceBidder = updatedINRbalanceBidder.minus(txFeesBidderINR);

              console.log("After deduct TX Fees of INR Update user " + updatedINRbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedINRbalanceBidder ::: " + updatedINRbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedINRbalanceBidder " + updatedINRbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingINR " + totoalBidRemainingINR);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerINR
                }, {
                  INRbalance: updatedINRbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidINR.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidINR.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidINR.update({
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, bidDestroy);
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
  removeBidINRMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdINR;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidINR.findOne({
      bidownerINR: bidownerId,
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
            BidINR.update({
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
              sails.sockets.blast(constants.INR_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskINRMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdINR;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskINR.findOne({
      askownerINR: askownerId,
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
        var userINRBalanceInDb = parseFloat(user.INRbalance);
        var askAmountOfINRInAskTableDB = parseFloat(askDetails.askAmountINR);
        var userFreezedINRbalanceInDB = parseFloat(user.FreezedINRbalance);
        console.log("userINRBalanceInDb :" + userINRBalanceInDb);
        console.log("askAmountOfINRInAskTableDB :" + askAmountOfINRInAskTableDB);
        console.log("userFreezedINRbalanceInDB :" + userFreezedINRbalanceInDB);
        var updateFreezedINRBalance = (parseFloat(userFreezedINRbalanceInDB) - parseFloat(askAmountOfINRInAskTableDB));
        var updateUserINRBalance = (parseFloat(userINRBalanceInDb) + parseFloat(askAmountOfINRInAskTableDB));
        User.update({
            id: askownerId
          }, {
            INRbalance: parseFloat(updateUserINRBalance),
            FreezedINRbalance: parseFloat(updateFreezedINRBalance)
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
            AskINR.update({
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
              sails.sockets.blast(constants.INR_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidINR: function(req, res) {
    console.log("Enter into ask api getAllBidINR :: ");
    BidINR.find({
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
            BidINR.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountINR')
              .exec(function(err, bidAmountINRSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountINRSum",
                    statusCode: 401
                  });
                }
                BidINR.find({
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
                        "message": "Error to sum Of bidAmountINRSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsINR: allAskDetailsToExecute,
                      bidAmountINRSum: bidAmountINRSum[0].bidAmountINR,
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
  getAllAskINR: function(req, res) {
    console.log("Enter into ask api getAllAskINR :: ");
    AskINR.find({
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
            AskINR.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountINR')
              .exec(function(err, askAmountINRSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountINRSum",
                    statusCode: 401
                  });
                }
                AskINR.find({
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
                        "message": "Error to sum Of askAmountINRSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksINR: allAskDetailsToExecute,
                      askAmountINRSum: askAmountINRSum[0].askAmountINR,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskINR Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsINRSuccess: function(req, res) {
    console.log("Enter into ask api getBidsINRSuccess :: ");
    BidINR.find({
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
            BidINR.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountINR')
              .exec(function(err, bidAmountINRSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountINRSum",
                    statusCode: 401
                  });
                }
                BidINR.find({
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
                        "message": "Error to sum Of bidAmountINRSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsINR: allAskDetailsToExecute,
                      bidAmountINRSum: bidAmountINRSum[0].bidAmountINR,
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
  getAsksINRSuccess: function(req, res) {
    console.log("Enter into ask api getAsksINRSuccess :: ");
    AskINR.find({
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
            AskINR.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountINR')
              .exec(function(err, askAmountINRSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountINRSum",
                    statusCode: 401
                  });
                }
                AskINR.find({
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
                        "message": "Error to sum Of askAmountINRSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksINR: allAskDetailsToExecute,
                      askAmountINRSum: askAmountINRSum[0].askAmountINR,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskINR Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};