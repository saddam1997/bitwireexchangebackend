/**
 * TrademarketBCHGBPController
 *GBP
 * @description :: Server-side logic for managing trademarketbchgbps
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

  addAskGBPMarket: async function(req, res) {
    console.log("Enter into ask api addAskGBPMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountGBP = new BigNumber(req.body.askAmountGBP);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountGBP || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountGBP < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountGBP = parseFloat(userAskAmountGBP);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskGBP.create({
        askAmountBCH: userAskAmountBCH,
        askAmountGBP: userAskAmountGBP,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountGBP: userAskAmountGBP,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
          'like': BCHMARKETID
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
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingGBP = (parseFloat(totoalAskRemainingGBP) - parseFloat(currentBidDetails.bidAmountGBP));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingGBP = totoalAskRemainingGBP.minus(currentBidDetails.bidAmountGBP);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingGBP :: " + totoalAskRemainingGBP);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(currentBidDetails.bidAmountGBP));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


            //updatedGBPbalanceBidder =  parseFloat(updatedGBPbalanceBidder);

            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedGBPbalanceAsker = parseFloat(totoalAskRemainingGBP);
            //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);

            //updatedFreezedGBPbalanceAsker =  parseFloat(updatedFreezedGBPbalanceAsker);
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
            console.log("After deduct TX Fees of GBP Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedGBPbalance: updatedFreezedGBPbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed GBPBalance',
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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(currentBidDetails.bidAmountGBP));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedGBPbalanceBidder:: " + updatedGBPbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerGBP");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(totoalAskRemainingGBP));
            //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
            console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
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
            console.log("After deduct TX Fees of GBP Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedGBPbalance: updatedFreezedGBPbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskGBP.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingGBP = totoalAskRemainingGBP - allBidsFromdb[i].bidAmountGBP;
          if (totoalAskRemainingGBP >= currentBidDetails.bidAmountGBP) {
            //totoalAskRemainingGBP = (parseFloat(totoalAskRemainingGBP) - parseFloat(currentBidDetails.bidAmountGBP));
            totoalAskRemainingGBP = totoalAskRemainingGBP.minus(currentBidDetails.bidAmountGBP);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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
              // console.log("After deduct TX Fees of GBP Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerGBP
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  GBPbalance: updatedGBPbalanceBidder
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
              //var updatedFreezedGBPbalanceAsker = parseFloat(totoalAskRemainingGBP);
              //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(totoalAskRemainingGBP));
              //var updatedFreezedGBPbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP)) + parseFloat(totoalAskRemainingGBP));
              var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);
              updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.plus(totoalAskRemainingGBP);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
              console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
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

              console.log("After deduct TX Fees of GBP Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerGBP
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);

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

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedGBPbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingGBP " + totoalAskRemainingGBP);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerGBP
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBidAmountBCH = (parseFloat(currentBidDetails.bidAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var updatedBidAmountBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            updatedBidAmountBCH = updatedBidAmountBCH.minus(totoalAskRemainingBCH);
            //var updatedBidAmountGBP = (parseFloat(currentBidDetails.bidAmountGBP) - parseFloat(totoalAskRemainingGBP));
            var updatedBidAmountGBP = new BigNumber(currentBidDetails.bidAmountGBP);
            updatedBidAmountGBP = updatedBidAmountGBP.minus(totoalAskRemainingGBP);

            try {
              var updatedaskDetails = await BidGBP.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
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
            //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBCHbalance) - parseFloat(totoalAskRemainingBCH));
            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(totoalAskRemainingBCH);


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
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

            console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
            console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedGBPbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerGBP
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerGBP");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedGBPbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedGBPbalance) - parseFloat(userAskAmountGBP));
            var updatedFreezedGBPbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedGBPbalance);
            updatedFreezedGBPbalanceAsker = updatedFreezedGBPbalanceAsker.minus(userAskAmountGBP);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of GBP Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedGBPbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingGBP " + totoalAskRemainingGBP);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerGBP
              }, {
                BCHbalance: updatedBCHbalanceAsker,
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
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountGBP = new BigNumber(req.body.bidAmountGBP);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountGBP = parseFloat(userBidAmountGBP);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountGBP || !userBidAmountBCH ||
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
      var bidDetails = await BidGBP.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountGBP: userBidAmountGBP,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountGBP: userBidAmountGBP,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
      var allAsksFromdb = await AskGBP.find({
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
        var totoalBidRemainingGBP = new BigNumber(userBidAmountGBP);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of GBP
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountGBP;
        }
        if (total_ask <= totoalBidRemainingGBP) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingGBP :: " + totoalBidRemainingGBP);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingGBP = totoalBidRemainingGBP - allAsksFromdb[i].bidAmountGBP;
            //totoalBidRemainingGBP = (parseFloat(totoalBidRemainingGBP) - parseFloat(currentAskDetails.askAmountGBP));
            totoalBidRemainingGBP = totoalBidRemainingGBP.minus(currentAskDetails.askAmountGBP);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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
              console.log("After deduct TX Fees of GBP Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedGBPbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
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
              //Bid FreezedBCHbalance of bidder deduct and GBP  give to bidder
              //var updatedGBPbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.GBPbalance) + parseFloat(totoalBidRemainingGBP)) - parseFloat(totoalBidRemainingBCH);
              //var updatedGBPbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.GBPbalance) + parseFloat(userBidAmountGBP)) - parseFloat(totoalBidRemainingGBP));
              var updatedGBPbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(totoalBidRemainingGBP);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainGBP updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingGBP == 0updatedGBPbalanceBidder ::: " + updatedGBPbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingGBP asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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

              console.log("After deduct TX Fees of GBP Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingGBP == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerGBP");
              //var updatedGBPbalanceBidder = ((parseFloat(userAllDetailsInDBBid.GBPbalance) + parseFloat(userBidAmountGBP)) - parseFloat(totoalBidRemainingGBP));
              var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBid.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(totoalBidRemainingGBP);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainGBP updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedGBPbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountGBP totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidGBP.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingGBP = totoalBidRemainingGBP - allAsksFromdb[i].bidAmountGBP;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingGBP = totoalBidRemainingGBP.minus(currentAskDetails.askAmountGBP);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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

                console.log("After deduct TX Fees of GBP Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingGBP == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingGBP == 0updatedFreezedGBPbalanceAsker ::: " + updatedFreezedGBPbalanceAsker);
                console.log(" totoalBidRemainingGBP == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerGBP
                  }, {
                    FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainGBP totoalAskRemainingGBP " + totoalBidRemainingBCH);
                console.log("Total Ask RemainGBP BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainGBP updatedFreezedGBPbalanceAsker " + updatedFreezedBCHbalanceBidder);
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

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
                //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
                updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);



                console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingGBP == 0 updatedFreezedGBPbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerGBP
                  }, {
                    GBPbalance: updatedGBPbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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
                console.log("After deduct TX Fees of GBP Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0 updatedFreezedGBPbalanceAsker:: " + updatedFreezedGBPbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingGBP == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingGBP " + totoalBidRemainingGBP);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerGBP
                  }, {
                    FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountGBP = (parseFloat(currentAskDetails.askAmountGBP) - parseFloat(totoalBidRemainingGBP));

              var updatedAskAmountGBP = new BigNumber(currentAskDetails.askAmountGBP);
              updatedAskAmountGBP = updatedAskAmountGBP.minus(totoalBidRemainingGBP);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskGBP.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
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

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainGBP totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainGBP userAllDetailsInDBAsker.FreezedGBPbalance " + userAllDetailsInDBAsker.FreezedGBPbalance);
              console.log("Total Ask RemainGBP updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of GBP Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedGBPbalanceAsker:: " + updatedFreezedGBPbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedGBPbalanceAsker " + updatedFreezedGBPbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerGBP
                }, {
                  FreezedGBPbalance: updatedFreezedGBPbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerGBP");
              //var updatedGBPbalanceBidder = (parseFloat(userAllDetailsInDBBidder.GBPbalance) + parseFloat(userBidAmountGBP));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountGBP " + userBidAmountGBP);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.GBPbalance " + userAllDetailsInDBBidder.GBPbalance);

              var updatedGBPbalanceBidder = new BigNumber(userAllDetailsInDBBidder.GBPbalance);
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.plus(userBidAmountGBP);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);
              //var txFeesBidderGBP = (parseFloat(updatedGBPbalanceBidder) * parseFloat(txFeeWithdrawSuccessGBP));
              // var txFeesBidderGBP = new BigNumber(userBidAmountGBP);
              // txFeesBidderGBP = txFeesBidderGBP.times(txFeeWithdrawSuccessGBP);
              //
              // console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              // //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              // updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderGBP = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderGBP :: " + txFeesBidderGBP);
              //updatedGBPbalanceBidder = (parseFloat(updatedGBPbalanceBidder) - parseFloat(txFeesBidderGBP));
              updatedGBPbalanceBidder = updatedGBPbalanceBidder.minus(txFeesBidderGBP);

              console.log("After deduct TX Fees of GBP Update user " + updatedGBPbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedGBPbalanceBidder ::: " + updatedGBPbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedGBPbalanceBidder " + updatedGBPbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingGBP " + totoalBidRemainingGBP);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerGBP
                }, {
                  GBPbalance: updatedGBPbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidGBP.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user BCH balance");
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
            BidGBP.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGBP: allAskDetailsToExecute,
                      bidAmountGBPSum: bidAmountGBPSum[0].bidAmountGBP,
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
  getAllAskGBP: function(req, res) {
    console.log("Enter into ask api getAllAskGBP :: ");
    AskGBP.find({
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
            AskGBP.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGBP: allAskDetailsToExecute,
                      askAmountGBPSum: askAmountGBPSum[0].askAmountGBP,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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
            BidGBP.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsGBP: allAskDetailsToExecute,
                      bidAmountGBPSum: bidAmountGBPSum[0].bidAmountGBP,
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
  getAsksGBPSuccess: function(req, res) {
    console.log("Enter into ask api getAsksGBPSuccess :: ");
    AskGBP.find({
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
            AskGBP.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountGBPSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksGBP: allAskDetailsToExecute,
                      askAmountGBPSum: askAmountGBPSum[0].askAmountGBP,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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