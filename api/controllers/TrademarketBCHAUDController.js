/**
 * TrademarketBCHAUDController
 *AUD
 * @description :: Server-side logic for managing trademarketbchauds
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

  addAskAUDMarket: async function(req, res) {
    console.log("Enter into ask api addAskAUDMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountAUD = new BigNumber(req.body.askAmountAUD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountAUD || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountAUD < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userAUDBalanceInDb = new BigNumber(userAsker.AUDbalance);
    var userFreezedAUDBalanceInDb = new BigNumber(userAsker.FreezedAUDbalance);

    userAUDBalanceInDb = parseFloat(userAUDBalanceInDb);
    userFreezedAUDBalanceInDb = parseFloat(userFreezedAUDBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountAUD.greaterThanOrEqualTo(userAUDBalanceInDb)) {
      return res.json({
        "message": "You have insufficient AUD Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountAUD :: " + userAskAmountAUD);
    console.log("userAUDBalanceInDb :: " + userAUDBalanceInDb);
    // if (userAskAmountAUD >= userAUDBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient AUD Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountAUD = parseFloat(userAskAmountAUD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskAUD.create({
        askAmountBCH: userAskAmountBCH,
        askAmountAUD: userAskAmountAUD,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountAUD: userAskAmountAUD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerAUD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.AUD_ASK_ADDED, askDetails);
    // var updateUserAUDBalance = (parseFloat(userAUDBalanceInDb) - parseFloat(userAskAmountAUD));
    // var updateFreezedAUDBalance = (parseFloat(userFreezedAUDBalanceInDb) + parseFloat(userAskAmountAUD));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userAUDBalanceInDb = new BigNumber(userAUDBalanceInDb);
    var updateUserAUDBalance = userAUDBalanceInDb.minus(userAskAmountAUD);
    updateUserAUDBalance = parseFloat(updateUserAUDBalance);
    userFreezedAUDBalanceInDb = new BigNumber(userFreezedAUDBalanceInDb);
    var updateFreezedAUDBalance = userFreezedAUDBalanceInDb.plus(userAskAmountAUD);
    updateFreezedAUDBalance = parseFloat(updateFreezedAUDBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedAUDbalance: updateFreezedAUDBalance,
        AUDbalance: updateUserAUDBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidAUD.find({
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
        message: 'Failed to find AUD bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingAUD = new BigNumber(userAskAmountAUD);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of AUD
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountAUD;
      }
      if (total_bid <= totoalAskRemainingAUD) {
        console.log("Inside of total_bid <= totoalAskRemainingAUD");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingAUD");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingAUD :: " + totoalAskRemainingAUD);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingAUD = (parseFloat(totoalAskRemainingAUD) - parseFloat(currentBidDetails.bidAmountAUD));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingAUD = totoalAskRemainingAUD.minus(currentBidDetails.bidAmountAUD);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingAUD :: " + totoalAskRemainingAUD);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingAUD == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingAUD == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerAUD
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerAUD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(currentBidDetails.bidAmountAUD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of AUD Update user " + updatedAUDbalanceBidder);
            //var txFeesBidderAUD = (parseFloat(currentBidDetails.bidAmountAUD) * parseFloat(txFeeWithdrawSuccessAUD));
            // var txFeesBidderAUD = new BigNumber(currentBidDetails.bidAmountAUD);
            //
            // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD)
            // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
            // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


            //updatedAUDbalanceBidder =  parseFloat(updatedAUDbalanceBidder);

            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                AUDbalance: updatedAUDbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and AUD balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedAUDbalanceAsker = parseFloat(totoalAskRemainingAUD);
            //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);

            //updatedFreezedAUDbalanceAsker =  parseFloat(updatedFreezedAUDbalanceAsker);
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
            console.log("After deduct TX Fees of AUD Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedAUDbalance: updatedFreezedAUDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed AUDBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidAUD:: ");
            try {
              var bidDestroy = await BidAUD.update({
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
            sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskAUD.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskAUD.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskAUD',
                statusCode: 401
              });
            }
            //emitting event of destruction of AUD_ask
            sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingAUD == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerAUD " + currentBidDetails.bidownerAUD);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerAUD
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(currentBidDetails.bidAmountAUD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of AUD 089089Update user " + updatedAUDbalanceBidder);
            // var txFeesBidderAUD = (parseFloat(currentBidDetails.bidAmountAUD) * parseFloat(txFeeWithdrawSuccessAUD));
            // var txFeesBidderAUD = new BigNumber(currentBidDetails.bidAmountAUD);
            // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
            // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            // // updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
            // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedAUDbalanceBidder:: " + updatedAUDbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                AUDbalance: updatedAUDbalanceBidder
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
              var desctroyCurrentBid = await BidAUD.update({
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
            sails.sockets.blast(constants.AUD_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerAUD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerAUD");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(totoalAskRemainingAUD));
            //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
            console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
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
            console.log("After deduct TX Fees of AUD Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedAUDbalance: updatedFreezedAUDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskAUD.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountAUD: parseFloat(totoalAskRemainingAUD),
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
            sails.sockets.blast(constants.AUD_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingAUD :: " + totoalAskRemainingAUD);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingAUD = totoalAskRemainingAUD - allBidsFromdb[i].bidAmountAUD;
          if (totoalAskRemainingAUD >= currentBidDetails.bidAmountAUD) {
            //totoalAskRemainingAUD = (parseFloat(totoalAskRemainingAUD) - parseFloat(currentBidDetails.bidAmountAUD));
            totoalAskRemainingAUD = totoalAskRemainingAUD.minus(currentBidDetails.bidAmountAUD);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingAUD == 0::: " + totoalAskRemainingAUD);

            if (totoalAskRemainingAUD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingAUD == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerAUD
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
                  id: askDetails.askownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerAUD :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));
              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(currentBidDetails.bidAmountAUD);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 AUD Update user " + updatedAUDbalanceBidder);
              //var txFeesBidderAUD = (parseFloat(currentBidDetails.bidAmountAUD) * parseFloat(txFeeWithdrawSuccessAUD));

              // var txFeesBidderAUD = new BigNumber(currentBidDetails.bidAmountAUD);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);
              // console.log("After deduct TX Fees of AUD Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerAUD
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  AUDbalance: updatedAUDbalanceBidder
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
              //var updatedFreezedAUDbalanceAsker = parseFloat(totoalAskRemainingAUD);
              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(totoalAskRemainingAUD));
              //var updatedFreezedAUDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD)) + parseFloat(totoalAskRemainingAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.plus(totoalAskRemainingAUD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
              console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
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

              console.log("After deduct TX Fees of AUD Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerAUD
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidAUD.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidAUD.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidAUD.update({
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskAUD.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskAUD.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskAUD.update({
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
              sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingAUD == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerAUD " + currentBidDetails.bidownerAUD);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerAUD
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

              //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(currentBidDetails.bidAmountAUD));
              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(currentBidDetails.bidAmountAUD);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var txFeesBidderAUD = (parseFloat(currentBidDetails.bidAmountAUD) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(currentBidDetails.bidAmountAUD);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);
              // console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedAUDbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingAUD " + totoalAskRemainingAUD);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerAUD
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  AUDbalance: updatedAUDbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidAUD.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidAUD.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.AUD_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerAUD
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
            //var updatedBidAmountAUD = (parseFloat(currentBidDetails.bidAmountAUD) - parseFloat(totoalAskRemainingAUD));
            var updatedBidAmountAUD = new BigNumber(currentBidDetails.bidAmountAUD);
            updatedBidAmountAUD = updatedBidAmountAUD.minus(totoalAskRemainingAUD);

            try {
              var updatedaskDetails = await BidAUD.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountAUD: updatedBidAmountAUD,
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
            sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerAUD
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


            //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.AUDbalance) + parseFloat(totoalAskRemainingAUD));

            var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.AUDbalance);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(totoalAskRemainingAUD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of AUD Update user " + updatedAUDbalanceBidder);
            //var AUDAmountSucess = parseFloat(totoalAskRemainingAUD);
            //var AUDAmountSucess = new BigNumber(totoalAskRemainingAUD);
            //var txFeesBidderAUD = (parseFloat(AUDAmountSucess) * parseFloat(txFeeWithdrawSuccessAUD));
            //var txFeesBidderAUD = (parseFloat(totoalAskRemainingAUD) * parseFloat(txFeeWithdrawSuccessAUD));



            // var txFeesBidderAUD = new BigNumber(totoalAskRemainingAUD);
            // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
            //
            // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
            // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

            console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
            console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedAUDbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerAUD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                AUDbalance: updatedAUDbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerAUD");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(userAskAmountAUD));
            var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
            updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(userAskAmountAUD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of AUD Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedAUDbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingAUD " + totoalAskRemainingAUD);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerAUD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedAUDbalance: updatedFreezedAUDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskAUD.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskAUD.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskAUD.update({
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
            //emitting event for AUD_ask destruction
            sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
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
  addBidAUDMarket: async function(req, res) {
    console.log("Enter into ask api addBidAUDMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountAUD = new BigNumber(req.body.bidAmountAUD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountAUD = parseFloat(userBidAmountAUD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountAUD || !userBidAmountBCH ||
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
      var bidDetails = await BidAUD.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountAUD: userBidAmountAUD,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountAUD: userBidAmountAUD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerAUD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.AUD_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskAUD.find({
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
        var totoalBidRemainingAUD = new BigNumber(userBidAmountAUD);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of AUD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountAUD;
        }
        if (total_ask <= totoalBidRemainingAUD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingAUD :: " + totoalBidRemainingAUD);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingAUD = totoalBidRemainingAUD - allAsksFromdb[i].bidAmountAUD;
            //totoalBidRemainingAUD = (parseFloat(totoalBidRemainingAUD) - parseFloat(currentAskDetails.askAmountAUD));
            totoalBidRemainingAUD = totoalBidRemainingAUD.minus(currentAskDetails.askAmountAUD);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingAUD == 0::: " + totoalBidRemainingAUD);
            if (totoalBidRemainingAUD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingAUD == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerAUD totoalBidRemainingAUD == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(currentAskDetails.askAmountAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(currentAskDetails.askAmountAUD);
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
              console.log("After deduct TX Fees of AUD Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedAUDbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
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
                  id: bidDetails.bidownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and AUD  give to bidder
              //var updatedAUDbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.AUDbalance) + parseFloat(totoalBidRemainingAUD)) - parseFloat(totoalBidRemainingBCH);
              //var updatedAUDbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.AUDbalance) + parseFloat(userBidAmountAUD)) - parseFloat(totoalBidRemainingAUD));
              var updatedAUDbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(totoalBidRemainingAUD);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainAUD updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var AUDAmountSucess = (parseFloat(userBidAmountAUD) - parseFloat(totoalBidRemainingAUD));
              // var AUDAmountSucess = new BigNumber(userBidAmountAUD);
              // AUDAmountSucess = AUDAmountSucess.minus(totoalBidRemainingAUD);
              //
              // //var txFeesBidderAUD = (parseFloat(AUDAmountSucess) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(AUDAmountSucess);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              //
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingAUD == 0updatedAUDbalanceBidder ::: " + updatedAUDbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingAUD asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingAUD == 0BidAUD.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidAUD.destroy({
              //   id: bidDetails.bidownerAUD
              // });
              try {
                var bidDestroy = await BidAUD.update({
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0AskAUD.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskAUD.destroy({
              //   id: currentAskDetails.askownerAUD
              // });
              try {
                var askDestroy = await AskAUD.update({
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
              sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0  enter into else of totoalBidRemainingAUD == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0start User.findOne currentAskDetails.bidownerAUD ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(currentAskDetails.askAmountAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(currentAskDetails.askAmountAUD);
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

              console.log("After deduct TX Fees of AUD Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskAUD.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskAUD.update({
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

              sails.sockets.blast(constants.AUD_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingAUD == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingAUD == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerAUD");
              //var updatedAUDbalanceBidder = ((parseFloat(userAllDetailsInDBBid.AUDbalance) + parseFloat(userBidAmountAUD)) - parseFloat(totoalBidRemainingAUD));
              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBid.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(totoalBidRemainingAUD);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainAUD updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var AUDAmountSucess = (parseFloat(userBidAmountAUD) - parseFloat(totoalBidRemainingAUD));
              // var AUDAmountSucess = new BigNumber(userBidAmountAUD);
              // AUDAmountSucess = AUDAmountSucess.minus(totoalBidRemainingAUD);
              //
              // //var txFeesBidderAUD = (parseFloat(AUDAmountSucess) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(AUDAmountSucess);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              //
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);
              // console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedAUDbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountAUD totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidAUD.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountAUD: totoalBidRemainingAUD,
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingAUD :: " + totoalBidRemainingAUD);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingAUD = totoalBidRemainingAUD - allAsksFromdb[i].bidAmountAUD;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingAUD = totoalBidRemainingAUD.minus(currentAskDetails.askAmountAUD);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingAUD == 0::: " + totoalBidRemainingAUD);

              if (totoalBidRemainingAUD == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingAUD == 0Enter into totoalBidRemainingAUD == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerAUD
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
                    id: bidDetails.bidownerAUD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingAUD == 0userAll bidDetails.askownerAUD :: ");
                console.log(" totoalBidRemainingAUD == 0Update value of Bidder and asker");
                //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(currentAskDetails.askAmountAUD));
                var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
                updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(currentAskDetails.askAmountAUD);

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

                console.log("After deduct TX Fees of AUD Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingAUD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingAUD == 0updatedFreezedAUDbalanceAsker ::: " + updatedFreezedAUDbalanceAsker);
                console.log(" totoalBidRemainingAUD == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerAUD
                  }, {
                    FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedAUDbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(userBidAmountAUD)) - parseFloat(totoalBidRemainingAUD));

                var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
                updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);
                updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(totoalBidRemainingAUD);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainAUD totoalAskRemainingAUD " + totoalBidRemainingBCH);
                console.log("Total Ask RemainAUD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainAUD updatedFreezedAUDbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
                //var AUDAmountSucess = (parseFloat(userBidAmountAUD) - parseFloat(totoalBidRemainingAUD));
                // var AUDAmountSucess = new BigNumber(userBidAmountAUD);
                // AUDAmountSucess = AUDAmountSucess.minus(totoalBidRemainingAUD);
                //
                //
                // //var txFeesBidderAUD = (parseFloat(AUDAmountSucess) * parseFloat(txFeeWithdrawSuccessAUD));
                // var txFeesBidderAUD = new BigNumber(AUDAmountSucess);
                // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
                // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
                // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
                // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
                //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
                updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);



                console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 updatedFreezedAUDbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerAUD
                  }, {
                    AUDbalance: updatedAUDbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 BidAUD.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskAUD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskAUD.update({
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
                sails.sockets.blast(constants.AUD_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingAUD == 0 AskAUD.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidAUD.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidAUD.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 enter into else of totoalBidRemainingAUD == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0totoalBidRemainingAUD == 0 start User.findOne currentAskDetails.bidownerAUD " + currentAskDetails.bidownerAUD);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerAUD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(currentAskDetails.askAmountAUD));

                var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
                updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(currentAskDetails.askAmountAUD);

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
                console.log("After deduct TX Fees of AUD Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 updatedFreezedAUDbalanceAsker:: " + updatedFreezedAUDbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingAUD " + totoalBidRemainingAUD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerAUD
                  }, {
                    FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingAUD == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskAUD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskAUD.update({
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
                sails.sockets.blast(constants.AUD_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountAUD = (parseFloat(currentAskDetails.askAmountAUD) - parseFloat(totoalBidRemainingAUD));

              var updatedAskAmountAUD = new BigNumber(currentAskDetails.askAmountAUD);
              updatedAskAmountAUD = updatedAskAmountAUD.minus(totoalBidRemainingAUD);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskAUD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountAUD: updatedAskAmountAUD,
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
              sails.sockets.blast(constants.AUD_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedAUDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedAUDbalance) - parseFloat(totoalBidRemainingAUD));
              var updatedFreezedAUDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedAUDbalance);
              updatedFreezedAUDbalanceAsker = updatedFreezedAUDbalanceAsker.minus(totoalBidRemainingAUD);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainAUD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainAUD userAllDetailsInDBAsker.FreezedAUDbalance " + userAllDetailsInDBAsker.FreezedAUDbalance);
              console.log("Total Ask RemainAUD updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of AUD Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedAUDbalanceAsker:: " + updatedFreezedAUDbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedAUDbalanceAsker " + updatedFreezedAUDbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerAUD
                }, {
                  FreezedAUDbalance: updatedFreezedAUDbalanceAsker,
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
                  id: bidDetails.bidownerAUD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerAUD");
              //var updatedAUDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.AUDbalance) + parseFloat(userBidAmountAUD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountAUD " + userBidAmountAUD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.AUDbalance " + userAllDetailsInDBBidder.AUDbalance);

              var updatedAUDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.AUDbalance);
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.plus(userBidAmountAUD);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);
              //var txFeesBidderAUD = (parseFloat(updatedAUDbalanceBidder) * parseFloat(txFeeWithdrawSuccessAUD));
              // var txFeesBidderAUD = new BigNumber(userBidAmountAUD);
              // txFeesBidderAUD = txFeesBidderAUD.times(txFeeWithdrawSuccessAUD);
              //
              // console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              // //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              // updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderAUD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderAUD :: " + txFeesBidderAUD);
              //updatedAUDbalanceBidder = (parseFloat(updatedAUDbalanceBidder) - parseFloat(txFeesBidderAUD));
              updatedAUDbalanceBidder = updatedAUDbalanceBidder.minus(txFeesBidderAUD);

              console.log("After deduct TX Fees of AUD Update user " + updatedAUDbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedAUDbalanceBidder ::: " + updatedAUDbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedAUDbalanceBidder " + updatedAUDbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingAUD " + totoalBidRemainingAUD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerAUD
                }, {
                  AUDbalance: updatedAUDbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidAUD.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidAUD.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidAUD.update({
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, bidDestroy);
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
  removeBidAUDMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdAUD;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidAUD.findOne({
      bidownerAUD: bidownerId,
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
            BidAUD.update({
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
              sails.sockets.blast(constants.AUD_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskAUDMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdAUD;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskAUD.findOne({
      askownerAUD: askownerId,
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
        var userAUDBalanceInDb = parseFloat(user.AUDbalance);
        var askAmountOfAUDInAskTableDB = parseFloat(askDetails.askAmountAUD);
        var userFreezedAUDbalanceInDB = parseFloat(user.FreezedAUDbalance);
        console.log("userAUDBalanceInDb :" + userAUDBalanceInDb);
        console.log("askAmountOfAUDInAskTableDB :" + askAmountOfAUDInAskTableDB);
        console.log("userFreezedAUDbalanceInDB :" + userFreezedAUDbalanceInDB);
        var updateFreezedAUDBalance = (parseFloat(userFreezedAUDbalanceInDB) - parseFloat(askAmountOfAUDInAskTableDB));
        var updateUserAUDBalance = (parseFloat(userAUDBalanceInDb) + parseFloat(askAmountOfAUDInAskTableDB));
        User.update({
            id: askownerId
          }, {
            AUDbalance: parseFloat(updateUserAUDBalance),
            FreezedAUDbalance: parseFloat(updateFreezedAUDBalance)
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
            AskAUD.update({
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
              sails.sockets.blast(constants.AUD_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidAUD: function(req, res) {
    console.log("Enter into ask api getAllBidAUD :: ");
    BidAUD.find({
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
            BidAUD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountAUD')
              .exec(function(err, bidAmountAUDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountAUDSum",
                    statusCode: 401
                  });
                }
                BidAUD.find({
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
                        "message": "Error to sum Of bidAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsAUD: allAskDetailsToExecute,
                      bidAmountAUDSum: bidAmountAUDSum[0].bidAmountAUD,
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
  getAllAskAUD: function(req, res) {
    console.log("Enter into ask api getAllAskAUD :: ");
    AskAUD.find({
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
            AskAUD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountAUD')
              .exec(function(err, askAmountAUDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountAUDSum",
                    statusCode: 401
                  });
                }
                AskAUD.find({
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
                        "message": "Error to sum Of askAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksAUD: allAskDetailsToExecute,
                      askAmountAUDSum: askAmountAUDSum[0].askAmountAUD,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskAUD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsAUDSuccess: function(req, res) {
    console.log("Enter into ask api getBidsAUDSuccess :: ");
    BidAUD.find({
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
            BidAUD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountAUD')
              .exec(function(err, bidAmountAUDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountAUDSum",
                    statusCode: 401
                  });
                }
                BidAUD.find({
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
                        "message": "Error to sum Of bidAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsAUD: allAskDetailsToExecute,
                      bidAmountAUDSum: bidAmountAUDSum[0].bidAmountAUD,
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
  getAsksAUDSuccess: function(req, res) {
    console.log("Enter into ask api getAsksAUDSuccess :: ");
    AskAUD.find({
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
            AskAUD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountAUD')
              .exec(function(err, askAmountAUDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountAUDSum",
                    statusCode: 401
                  });
                }
                AskAUD.find({
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
                        "message": "Error to sum Of askAmountAUDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksAUD: allAskDetailsToExecute,
                      askAmountAUDSum: askAmountAUDSum[0].askAmountAUD,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskAUD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};