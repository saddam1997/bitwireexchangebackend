/**
 * TrademarketBCHRUBController
 *RUB
 * @description :: Server-side logic for managing trademarketbchrubs
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

  addAskRUBMarket: async function(req, res) {
    console.log("Enter into ask api addAskRUBMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountRUB = new BigNumber(req.body.askAmountRUB);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountRUB || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountRUB < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userRUBBalanceInDb = new BigNumber(userAsker.RUBbalance);
    var userFreezedRUBBalanceInDb = new BigNumber(userAsker.FreezedRUBbalance);

    userRUBBalanceInDb = parseFloat(userRUBBalanceInDb);
    userFreezedRUBBalanceInDb = parseFloat(userFreezedRUBBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountRUB.greaterThanOrEqualTo(userRUBBalanceInDb)) {
      return res.json({
        "message": "You have insufficient RUB Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountRUB :: " + userAskAmountRUB);
    console.log("userRUBBalanceInDb :: " + userRUBBalanceInDb);
    // if (userAskAmountRUB >= userRUBBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient RUB Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountRUB = parseFloat(userAskAmountRUB);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskRUB.create({
        askAmountBCH: userAskAmountBCH,
        askAmountRUB: userAskAmountRUB,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountRUB: userAskAmountRUB,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerRUB: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.RUB_ASK_ADDED, askDetails);
    // var updateUserRUBBalance = (parseFloat(userRUBBalanceInDb) - parseFloat(userAskAmountRUB));
    // var updateFreezedRUBBalance = (parseFloat(userFreezedRUBBalanceInDb) + parseFloat(userAskAmountRUB));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userRUBBalanceInDb = new BigNumber(userRUBBalanceInDb);
    var updateUserRUBBalance = userRUBBalanceInDb.minus(userAskAmountRUB);
    updateUserRUBBalance = parseFloat(updateUserRUBBalance);
    userFreezedRUBBalanceInDb = new BigNumber(userFreezedRUBBalanceInDb);
    var updateFreezedRUBBalance = userFreezedRUBBalanceInDb.plus(userAskAmountRUB);
    updateFreezedRUBBalance = parseFloat(updateFreezedRUBBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedRUBbalance: updateFreezedRUBBalance,
        RUBbalance: updateUserRUBBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidRUB.find({
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
        message: 'Failed to find RUB bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingRUB = new BigNumber(userAskAmountRUB);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of RUB
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountRUB;
      }
      if (total_bid <= totoalAskRemainingRUB) {
        console.log("Inside of total_bid <= totoalAskRemainingRUB");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingRUB");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingRUB :: " + totoalAskRemainingRUB);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingRUB = (parseFloat(totoalAskRemainingRUB) - parseFloat(currentBidDetails.bidAmountRUB));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingRUB = totoalAskRemainingRUB.minus(currentBidDetails.bidAmountRUB);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingRUB :: " + totoalAskRemainingRUB);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingRUB == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingRUB == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerRUB
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerRUB
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(currentBidDetails.bidAmountRUB));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(currentBidDetails.bidAmountRUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of RUB Update user " + updatedRUBbalanceBidder);
            //var txFeesBidderRUB = (parseFloat(currentBidDetails.bidAmountRUB) * parseFloat(txFeeWithdrawSuccessRUB));
            // var txFeesBidderRUB = new BigNumber(currentBidDetails.bidAmountRUB);
            //
            // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB)
            // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
            // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);


            //updatedRUBbalanceBidder =  parseFloat(updatedRUBbalanceBidder);

            console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerRUB
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                RUBbalance: updatedRUBbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and RUB balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedRUBbalanceAsker = parseFloat(totoalAskRemainingRUB);
            //var updatedFreezedRUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(userAskAmountRUB)) + parseFloat(totoalAskRemainingRUB));
            var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(userAskAmountRUB);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.plus(totoalAskRemainingRUB);

            //updatedFreezedRUBbalanceAsker =  parseFloat(updatedFreezedRUBbalanceAsker);
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
            console.log("After deduct TX Fees of RUB Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerRUB
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedRUBbalance: updatedFreezedRUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed RUBBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidRUB:: ");
            try {
              var bidDestroy = await BidRUB.update({
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
            sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskRUB.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskRUB.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskRUB',
                statusCode: 401
              });
            }
            //emitting event of destruction of RUB_ask
            sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingRUB == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerRUB " + currentBidDetails.bidownerRUB);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerRUB
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(currentBidDetails.bidAmountRUB));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(currentBidDetails.bidAmountRUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of RUB 089089Update user " + updatedRUBbalanceBidder);
            // var txFeesBidderRUB = (parseFloat(currentBidDetails.bidAmountRUB) * parseFloat(txFeeWithdrawSuccessRUB));
            // var txFeesBidderRUB = new BigNumber(currentBidDetails.bidAmountRUB);
            // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
            // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            // // updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
            // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);


            console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedRUBbalanceBidder:: " + updatedRUBbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerRUB
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                RUBbalance: updatedRUBbalanceBidder
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
              var desctroyCurrentBid = await BidRUB.update({
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
            sails.sockets.blast(constants.RUB_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerRUB
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerRUB");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(totoalAskRemainingRUB));
            //var updatedFreezedRUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(userAskAmountRUB)) + parseFloat(totoalAskRemainingRUB));
            var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(userAskAmountRUB);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.plus(totoalAskRemainingRUB);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainRUB totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainRUB userAllDetailsInDBAsker.FreezedRUBbalance " + userAllDetailsInDBAsker.FreezedRUBbalance);
            console.log("Total Ask RemainRUB updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
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
            console.log("After deduct TX Fees of RUB Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedRUBbalanceAsker ::: " + updatedFreezedRUBbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerRUB
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedRUBbalance: updatedFreezedRUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountRUB totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskRUB.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountRUB: parseFloat(totoalAskRemainingRUB),
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
            sails.sockets.blast(constants.RUB_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingRUB :: " + totoalAskRemainingRUB);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingRUB = totoalAskRemainingRUB - allBidsFromdb[i].bidAmountRUB;
          if (totoalAskRemainingRUB >= currentBidDetails.bidAmountRUB) {
            //totoalAskRemainingRUB = (parseFloat(totoalAskRemainingRUB) - parseFloat(currentBidDetails.bidAmountRUB));
            totoalAskRemainingRUB = totoalAskRemainingRUB.minus(currentBidDetails.bidAmountRUB);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingRUB == 0::: " + totoalAskRemainingRUB);

            if (totoalAskRemainingRUB == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingRUB == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerRUB
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
                  id: askDetails.askownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerRUB :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(currentBidDetails.bidAmountRUB));
              var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(currentBidDetails.bidAmountRUB);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 RUB Update user " + updatedRUBbalanceBidder);
              //var txFeesBidderRUB = (parseFloat(currentBidDetails.bidAmountRUB) * parseFloat(txFeeWithdrawSuccessRUB));

              // var txFeesBidderRUB = new BigNumber(currentBidDetails.bidAmountRUB);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);
              // console.log("After deduct TX Fees of RUB Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingRUB " + totoalAskRemainingRUB);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerRUB
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  RUBbalance: updatedRUBbalanceBidder
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
              //var updatedFreezedRUBbalanceAsker = parseFloat(totoalAskRemainingRUB);
              //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(totoalAskRemainingRUB));
              //var updatedFreezedRUBbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(userAskAmountRUB)) + parseFloat(totoalAskRemainingRUB));
              var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(userAskAmountRUB);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.plus(totoalAskRemainingRUB);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainRUB totoalAskRemainingRUB " + totoalAskRemainingRUB);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainRUB userAllDetailsInDBAsker.FreezedRUBbalance " + userAllDetailsInDBAsker.FreezedRUBbalance);
              console.log("Total Ask RemainRUB updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
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

              console.log("After deduct TX Fees of RUB Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedRUBbalanceAsker ::: " + updatedFreezedRUBbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingRUB " + totoalAskRemainingRUB);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerRUB
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedRUBbalance: updatedFreezedRUBbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidRUB.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidRUB.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidRUB.update({
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskRUB.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskRUB.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskRUB.update({
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
              sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingRUB == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerRUB " + currentBidDetails.bidownerRUB);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerRUB
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

              //var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(currentBidDetails.bidAmountRUB));
              var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(currentBidDetails.bidAmountRUB);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of RUB Update user " + updatedRUBbalanceBidder);
              //var txFeesBidderRUB = (parseFloat(currentBidDetails.bidAmountRUB) * parseFloat(txFeeWithdrawSuccessRUB));
              // var txFeesBidderRUB = new BigNumber(currentBidDetails.bidAmountRUB);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);
              // console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedRUBbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingRUB " + totoalAskRemainingRUB);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerRUB
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  RUBbalance: updatedRUBbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidRUB.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidRUB.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.RUB_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerRUB
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
            //var updatedBidAmountRUB = (parseFloat(currentBidDetails.bidAmountRUB) - parseFloat(totoalAskRemainingRUB));
            var updatedBidAmountRUB = new BigNumber(currentBidDetails.bidAmountRUB);
            updatedBidAmountRUB = updatedBidAmountRUB.minus(totoalAskRemainingRUB);

            try {
              var updatedaskDetails = await BidRUB.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountRUB: updatedBidAmountRUB,
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
            sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerRUB
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


            //var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.RUBbalance) + parseFloat(totoalAskRemainingRUB));

            var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.RUBbalance);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(totoalAskRemainingRUB);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of RUB Update user " + updatedRUBbalanceBidder);
            //var RUBAmountSucess = parseFloat(totoalAskRemainingRUB);
            //var RUBAmountSucess = new BigNumber(totoalAskRemainingRUB);
            //var txFeesBidderRUB = (parseFloat(RUBAmountSucess) * parseFloat(txFeeWithdrawSuccessRUB));
            //var txFeesBidderRUB = (parseFloat(totoalAskRemainingRUB) * parseFloat(txFeeWithdrawSuccessRUB));



            // var txFeesBidderRUB = new BigNumber(totoalAskRemainingRUB);
            // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
            //
            // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
            // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

            console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
            console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedRUBbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerRUB
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                RUBbalance: updatedRUBbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerRUB");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(userAskAmountRUB));
            var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
            updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(userAskAmountRUB);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of RUB Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedRUBbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingRUB " + totoalAskRemainingRUB);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerRUB
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedRUBbalance: updatedFreezedRUBbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskRUB.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskRUB.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskRUB.update({
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
            //emitting event for RUB_ask destruction
            sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
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
  addBidRUBMarket: async function(req, res) {
    console.log("Enter into ask api addBidRUBMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountRUB = new BigNumber(req.body.bidAmountRUB);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountRUB = parseFloat(userBidAmountRUB);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountRUB || !userBidAmountBCH ||
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
      var bidDetails = await BidRUB.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountRUB: userBidAmountRUB,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountRUB: userBidAmountRUB,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerRUB: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.RUB_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskRUB.find({
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
        var totoalBidRemainingRUB = new BigNumber(userBidAmountRUB);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of RUB
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountRUB;
        }
        if (total_ask <= totoalBidRemainingRUB) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingRUB :: " + totoalBidRemainingRUB);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingRUB = totoalBidRemainingRUB - allAsksFromdb[i].bidAmountRUB;
            //totoalBidRemainingRUB = (parseFloat(totoalBidRemainingRUB) - parseFloat(currentAskDetails.askAmountRUB));
            totoalBidRemainingRUB = totoalBidRemainingRUB.minus(currentAskDetails.askAmountRUB);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingRUB == 0::: " + totoalBidRemainingRUB);
            if (totoalBidRemainingRUB == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingRUB == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerRUB totoalBidRemainingRUB == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(currentAskDetails.askAmountRUB));
              var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(currentAskDetails.askAmountRUB);
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
              console.log("After deduct TX Fees of RUB Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedRUBbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerRUB
                }, {
                  FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
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
                  id: bidDetails.bidownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and RUB  give to bidder
              //var updatedRUBbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.RUBbalance) + parseFloat(totoalBidRemainingRUB)) - parseFloat(totoalBidRemainingBCH);
              //var updatedRUBbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.RUBbalance) + parseFloat(userBidAmountRUB)) - parseFloat(totoalBidRemainingRUB));
              var updatedRUBbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(userBidAmountRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(totoalBidRemainingRUB);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainRUB totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainRUB BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainRUB updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
              //var RUBAmountSucess = (parseFloat(userBidAmountRUB) - parseFloat(totoalBidRemainingRUB));
              // var RUBAmountSucess = new BigNumber(userBidAmountRUB);
              // RUBAmountSucess = RUBAmountSucess.minus(totoalBidRemainingRUB);
              //
              // //var txFeesBidderRUB = (parseFloat(RUBAmountSucess) * parseFloat(txFeeWithdrawSuccessRUB));
              // var txFeesBidderRUB = new BigNumber(RUBAmountSucess);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              //
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingRUB == 0updatedRUBbalanceBidder ::: " + updatedRUBbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingRUB asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerRUB
                }, {
                  RUBbalance: updatedRUBbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingRUB == 0BidRUB.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidRUB.destroy({
              //   id: bidDetails.bidownerRUB
              // });
              try {
                var bidDestroy = await BidRUB.update({
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0AskRUB.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskRUB.destroy({
              //   id: currentAskDetails.askownerRUB
              // });
              try {
                var askDestroy = await AskRUB.update({
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
              sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0  enter into else of totoalBidRemainingRUB == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0start User.findOne currentAskDetails.bidownerRUB ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(currentAskDetails.askAmountRUB));
              var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(currentAskDetails.askAmountRUB);
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

              console.log("After deduct TX Fees of RUB Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerRUB
                }, {
                  FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskRUB.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskRUB.update({
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

              sails.sockets.blast(constants.RUB_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingRUB == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingRUB == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerRUB");
              //var updatedRUBbalanceBidder = ((parseFloat(userAllDetailsInDBBid.RUBbalance) + parseFloat(userBidAmountRUB)) - parseFloat(totoalBidRemainingRUB));
              var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBid.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(userBidAmountRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(totoalBidRemainingRUB);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainRUB totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainRUB BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainRUB updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
              //var RUBAmountSucess = (parseFloat(userBidAmountRUB) - parseFloat(totoalBidRemainingRUB));
              // var RUBAmountSucess = new BigNumber(userBidAmountRUB);
              // RUBAmountSucess = RUBAmountSucess.minus(totoalBidRemainingRUB);
              //
              // //var txFeesBidderRUB = (parseFloat(RUBAmountSucess) * parseFloat(txFeeWithdrawSuccessRUB));
              // var txFeesBidderRUB = new BigNumber(RUBAmountSucess);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              //
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);
              // console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedRUBbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerRUB
                }, {
                  RUBbalance: updatedRUBbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountRUB totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidRUB.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountRUB: totoalBidRemainingRUB,
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingRUB :: " + totoalBidRemainingRUB);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingRUB = totoalBidRemainingRUB - allAsksFromdb[i].bidAmountRUB;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingRUB = totoalBidRemainingRUB.minus(currentAskDetails.askAmountRUB);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingRUB == 0::: " + totoalBidRemainingRUB);

              if (totoalBidRemainingRUB == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingRUB == 0Enter into totoalBidRemainingRUB == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerRUB
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
                    id: bidDetails.bidownerRUB
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingRUB == 0userAll bidDetails.askownerRUB :: ");
                console.log(" totoalBidRemainingRUB == 0Update value of Bidder and asker");
                //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(currentAskDetails.askAmountRUB));
                var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
                updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(currentAskDetails.askAmountRUB);

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

                console.log("After deduct TX Fees of RUB Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingRUB == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingRUB == 0updatedFreezedRUBbalanceAsker ::: " + updatedFreezedRUBbalanceAsker);
                console.log(" totoalBidRemainingRUB == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingRUB " + totoalBidRemainingRUB);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerRUB
                  }, {
                    FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedRUBbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(userBidAmountRUB)) - parseFloat(totoalBidRemainingRUB));

                var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
                updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(userBidAmountRUB);
                updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(totoalBidRemainingRUB);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainRUB totoalAskRemainingRUB " + totoalBidRemainingBCH);
                console.log("Total Ask RemainRUB BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainRUB updatedFreezedRUBbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
                //var RUBAmountSucess = (parseFloat(userBidAmountRUB) - parseFloat(totoalBidRemainingRUB));
                // var RUBAmountSucess = new BigNumber(userBidAmountRUB);
                // RUBAmountSucess = RUBAmountSucess.minus(totoalBidRemainingRUB);
                //
                //
                // //var txFeesBidderRUB = (parseFloat(RUBAmountSucess) * parseFloat(txFeeWithdrawSuccessRUB));
                // var txFeesBidderRUB = new BigNumber(RUBAmountSucess);
                // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
                // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
                // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
                // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
                //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
                updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);



                console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0 updatedFreezedRUBbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingRUB " + totoalBidRemainingRUB);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerRUB
                  }, {
                    RUBbalance: updatedRUBbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0 BidRUB.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskRUB.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskRUB.update({
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
                sails.sockets.blast(constants.RUB_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingRUB == 0 AskRUB.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidRUB.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidRUB.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0 enter into else of totoalBidRemainingRUB == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0totoalBidRemainingRUB == 0 start User.findOne currentAskDetails.bidownerRUB " + currentAskDetails.bidownerRUB);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerRUB
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(currentAskDetails.askAmountRUB));

                var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
                updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(currentAskDetails.askAmountRUB);

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
                console.log("After deduct TX Fees of RUB Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0 updatedFreezedRUBbalanceAsker:: " + updatedFreezedRUBbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingRUB " + totoalBidRemainingRUB);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerRUB
                  }, {
                    FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingRUB == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskRUB.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskRUB.update({
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
                sails.sockets.blast(constants.RUB_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountRUB = (parseFloat(currentAskDetails.askAmountRUB) - parseFloat(totoalBidRemainingRUB));

              var updatedAskAmountRUB = new BigNumber(currentAskDetails.askAmountRUB);
              updatedAskAmountRUB = updatedAskAmountRUB.minus(totoalBidRemainingRUB);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskRUB.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountRUB: updatedAskAmountRUB,
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
              sails.sockets.blast(constants.RUB_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedRUBbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedRUBbalance) - parseFloat(totoalBidRemainingRUB));
              var updatedFreezedRUBbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedRUBbalance);
              updatedFreezedRUBbalanceAsker = updatedFreezedRUBbalanceAsker.minus(totoalBidRemainingRUB);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainRUB totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainRUB userAllDetailsInDBAsker.FreezedRUBbalance " + userAllDetailsInDBAsker.FreezedRUBbalance);
              console.log("Total Ask RemainRUB updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of RUB Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedRUBbalanceAsker:: " + updatedFreezedRUBbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedRUBbalanceAsker " + updatedFreezedRUBbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerRUB
                }, {
                  FreezedRUBbalance: updatedFreezedRUBbalanceAsker,
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
                  id: bidDetails.bidownerRUB
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerRUB");
              //var updatedRUBbalanceBidder = (parseFloat(userAllDetailsInDBBidder.RUBbalance) + parseFloat(userBidAmountRUB));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountRUB " + userBidAmountRUB);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.RUBbalance " + userAllDetailsInDBBidder.RUBbalance);

              var updatedRUBbalanceBidder = new BigNumber(userAllDetailsInDBBidder.RUBbalance);
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.plus(userBidAmountRUB);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);
              //var txFeesBidderRUB = (parseFloat(updatedRUBbalanceBidder) * parseFloat(txFeeWithdrawSuccessRUB));
              // var txFeesBidderRUB = new BigNumber(userBidAmountRUB);
              // txFeesBidderRUB = txFeesBidderRUB.times(txFeeWithdrawSuccessRUB);
              //
              // console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              // //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              // updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderRUB = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderRUB :: " + txFeesBidderRUB);
              //updatedRUBbalanceBidder = (parseFloat(updatedRUBbalanceBidder) - parseFloat(txFeesBidderRUB));
              updatedRUBbalanceBidder = updatedRUBbalanceBidder.minus(txFeesBidderRUB);

              console.log("After deduct TX Fees of RUB Update user " + updatedRUBbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedRUBbalanceBidder ::: " + updatedRUBbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedRUBbalanceBidder " + updatedRUBbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingRUB " + totoalBidRemainingRUB);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerRUB
                }, {
                  RUBbalance: updatedRUBbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidRUB.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidRUB.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidRUB.update({
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, bidDestroy);
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
  removeBidRUBMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdRUB;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidRUB.findOne({
      bidownerRUB: bidownerId,
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
            BidRUB.update({
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
              sails.sockets.blast(constants.RUB_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskRUBMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdRUB;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskRUB.findOne({
      askownerRUB: askownerId,
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
        var userRUBBalanceInDb = parseFloat(user.RUBbalance);
        var askAmountOfRUBInAskTableDB = parseFloat(askDetails.askAmountRUB);
        var userFreezedRUBbalanceInDB = parseFloat(user.FreezedRUBbalance);
        console.log("userRUBBalanceInDb :" + userRUBBalanceInDb);
        console.log("askAmountOfRUBInAskTableDB :" + askAmountOfRUBInAskTableDB);
        console.log("userFreezedRUBbalanceInDB :" + userFreezedRUBbalanceInDB);
        var updateFreezedRUBBalance = (parseFloat(userFreezedRUBbalanceInDB) - parseFloat(askAmountOfRUBInAskTableDB));
        var updateUserRUBBalance = (parseFloat(userRUBBalanceInDb) + parseFloat(askAmountOfRUBInAskTableDB));
        User.update({
            id: askownerId
          }, {
            RUBbalance: parseFloat(updateUserRUBBalance),
            FreezedRUBbalance: parseFloat(updateFreezedRUBBalance)
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
            AskRUB.update({
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
              sails.sockets.blast(constants.RUB_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidRUB: function(req, res) {
    console.log("Enter into ask api getAllBidRUB :: ");
    BidRUB.find({
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
            BidRUB.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountRUB')
              .exec(function(err, bidAmountRUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountRUBSum",
                    statusCode: 401
                  });
                }
                BidRUB.find({
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
                        "message": "Error to sum Of bidAmountRUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsRUB: allAskDetailsToExecute,
                      bidAmountRUBSum: bidAmountRUBSum[0].bidAmountRUB,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
  getAllAskRUB: function(req, res) {
    console.log("Enter into ask api getAllAskRUB :: ");
    AskRUB.find({
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
            AskRUB.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountRUB')
              .exec(function(err, askAmountRUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountRUBSum",
                    statusCode: 401
                  });
                }
                AskRUB.find({
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
                        "message": "Error to sum Of askAmountRUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksRUB: allAskDetailsToExecute,
                      askAmountRUBSum: askAmountRUBSum[0].askAmountRUB,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskRUB Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsRUBSuccess: function(req, res) {
    console.log("Enter into ask api getBidsRUBSuccess :: ");
    BidRUB.find({
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
            BidRUB.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountRUB')
              .exec(function(err, bidAmountRUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountRUBSum",
                    statusCode: 401
                  });
                }
                BidRUB.find({
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
                        "message": "Error to sum Of bidAmountRUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsRUB: allAskDetailsToExecute,
                      bidAmountRUBSum: bidAmountRUBSum[0].bidAmountRUB,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
  getAsksRUBSuccess: function(req, res) {
    console.log("Enter into ask api getAsksRUBSuccess :: ");
    AskRUB.find({
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
            AskRUB.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountRUB')
              .exec(function(err, askAmountRUBSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountRUBSum",
                    statusCode: 401
                  });
                }
                AskRUB.find({
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
                        "message": "Error to sum Of askAmountRUBSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksRUB: allAskDetailsToExecute,
                      askAmountRUBSum: askAmountRUBSum[0].askAmountRUB,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskRUB Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};