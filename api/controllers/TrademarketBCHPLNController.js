/**
 * TrademarketBCHPLNController
 *PLN
 * @description :: Server-side logic for managing trademarketbchplns
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

  addAskPLNMarket: async function(req, res) {
    console.log("Enter into ask api addAskPLNMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountPLN = new BigNumber(req.body.askAmountPLN);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountPLN || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountPLN < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userPLNBalanceInDb = new BigNumber(userAsker.PLNbalance);
    var userFreezedPLNBalanceInDb = new BigNumber(userAsker.FreezedPLNbalance);

    userPLNBalanceInDb = parseFloat(userPLNBalanceInDb);
    userFreezedPLNBalanceInDb = parseFloat(userFreezedPLNBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountPLN.greaterThanOrEqualTo(userPLNBalanceInDb)) {
      return res.json({
        "message": "You have insufficient PLN Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountPLN :: " + userAskAmountPLN);
    console.log("userPLNBalanceInDb :: " + userPLNBalanceInDb);
    // if (userAskAmountPLN >= userPLNBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient PLN Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountPLN = parseFloat(userAskAmountPLN);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskPLN.create({
        askAmountBCH: userAskAmountBCH,
        askAmountPLN: userAskAmountPLN,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountPLN: userAskAmountPLN,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerPLN: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.PLN_ASK_ADDED, askDetails);
    // var updateUserPLNBalance = (parseFloat(userPLNBalanceInDb) - parseFloat(userAskAmountPLN));
    // var updateFreezedPLNBalance = (parseFloat(userFreezedPLNBalanceInDb) + parseFloat(userAskAmountPLN));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userPLNBalanceInDb = new BigNumber(userPLNBalanceInDb);
    var updateUserPLNBalance = userPLNBalanceInDb.minus(userAskAmountPLN);
    updateUserPLNBalance = parseFloat(updateUserPLNBalance);
    userFreezedPLNBalanceInDb = new BigNumber(userFreezedPLNBalanceInDb);
    var updateFreezedPLNBalance = userFreezedPLNBalanceInDb.plus(userAskAmountPLN);
    updateFreezedPLNBalance = parseFloat(updateFreezedPLNBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedPLNbalance: updateFreezedPLNBalance,
        PLNbalance: updateUserPLNBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidPLN.find({
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
        message: 'Failed to find PLN bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingPLN = new BigNumber(userAskAmountPLN);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of PLN
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountPLN;
      }
      if (total_bid <= totoalAskRemainingPLN) {
        console.log("Inside of total_bid <= totoalAskRemainingPLN");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingPLN");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingPLN :: " + totoalAskRemainingPLN);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingPLN = (parseFloat(totoalAskRemainingPLN) - parseFloat(currentBidDetails.bidAmountPLN));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingPLN = totoalAskRemainingPLN.minus(currentBidDetails.bidAmountPLN);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingPLN :: " + totoalAskRemainingPLN);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingPLN == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingPLN == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerPLN
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPLN
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(currentBidDetails.bidAmountPLN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of PLN Update user " + updatedPLNbalanceBidder);
            //var txFeesBidderPLN = (parseFloat(currentBidDetails.bidAmountPLN) * parseFloat(txFeeWithdrawSuccessPLN));
            // var txFeesBidderPLN = new BigNumber(currentBidDetails.bidAmountPLN);
            //
            // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN)
            // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
            // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


            //updatedPLNbalanceBidder =  parseFloat(updatedPLNbalanceBidder);

            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                PLNbalance: updatedPLNbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and PLN balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedPLNbalanceAsker = parseFloat(totoalAskRemainingPLN);
            //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);

            //updatedFreezedPLNbalanceAsker =  parseFloat(updatedFreezedPLNbalanceAsker);
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
            console.log("After deduct TX Fees of PLN Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedPLNbalance: updatedFreezedPLNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed PLNBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidPLN:: ");
            try {
              var bidDestroy = await BidPLN.update({
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
            sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskPLN.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskPLN.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskPLN',
                statusCode: 401
              });
            }
            //emitting event of destruction of PLN_ask
            sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingPLN == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerPLN " + currentBidDetails.bidownerPLN);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerPLN
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(currentBidDetails.bidAmountPLN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of PLN 089089Update user " + updatedPLNbalanceBidder);
            // var txFeesBidderPLN = (parseFloat(currentBidDetails.bidAmountPLN) * parseFloat(txFeeWithdrawSuccessPLN));
            // var txFeesBidderPLN = new BigNumber(currentBidDetails.bidAmountPLN);
            // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
            // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            // // updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
            // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedPLNbalanceBidder:: " + updatedPLNbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                PLNbalance: updatedPLNbalanceBidder
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
              var desctroyCurrentBid = await BidPLN.update({
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
            sails.sockets.blast(constants.PLN_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPLN
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerPLN");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(totoalAskRemainingPLN));
            //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
            console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
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
            console.log("After deduct TX Fees of PLN Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedPLNbalance: updatedFreezedPLNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskPLN.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountPLN: parseFloat(totoalAskRemainingPLN),
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
            sails.sockets.blast(constants.PLN_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingPLN :: " + totoalAskRemainingPLN);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingPLN = totoalAskRemainingPLN - allBidsFromdb[i].bidAmountPLN;
          if (totoalAskRemainingPLN >= currentBidDetails.bidAmountPLN) {
            //totoalAskRemainingPLN = (parseFloat(totoalAskRemainingPLN) - parseFloat(currentBidDetails.bidAmountPLN));
            totoalAskRemainingPLN = totoalAskRemainingPLN.minus(currentBidDetails.bidAmountPLN);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingPLN == 0::: " + totoalAskRemainingPLN);

            if (totoalAskRemainingPLN == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingPLN == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerPLN
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
                  id: askDetails.askownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerPLN :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));
              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(currentBidDetails.bidAmountPLN);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 PLN Update user " + updatedPLNbalanceBidder);
              //var txFeesBidderPLN = (parseFloat(currentBidDetails.bidAmountPLN) * parseFloat(txFeeWithdrawSuccessPLN));

              // var txFeesBidderPLN = new BigNumber(currentBidDetails.bidAmountPLN);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);
              // console.log("After deduct TX Fees of PLN Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerPLN
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  PLNbalance: updatedPLNbalanceBidder
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
              //var updatedFreezedPLNbalanceAsker = parseFloat(totoalAskRemainingPLN);
              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(totoalAskRemainingPLN));
              //var updatedFreezedPLNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN)) + parseFloat(totoalAskRemainingPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.plus(totoalAskRemainingPLN);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
              console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
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

              console.log("After deduct TX Fees of PLN Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerPLN
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidPLN.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidPLN.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidPLN.update({
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskPLN.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskPLN.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskPLN.update({
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
              sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingPLN == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerPLN " + currentBidDetails.bidownerPLN);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerPLN
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

              //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(currentBidDetails.bidAmountPLN));
              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(currentBidDetails.bidAmountPLN);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var txFeesBidderPLN = (parseFloat(currentBidDetails.bidAmountPLN) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(currentBidDetails.bidAmountPLN);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);
              // console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedPLNbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingPLN " + totoalAskRemainingPLN);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerPLN
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  PLNbalance: updatedPLNbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidPLN.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidPLN.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.PLN_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerPLN
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
            //var updatedBidAmountPLN = (parseFloat(currentBidDetails.bidAmountPLN) - parseFloat(totoalAskRemainingPLN));
            var updatedBidAmountPLN = new BigNumber(currentBidDetails.bidAmountPLN);
            updatedBidAmountPLN = updatedBidAmountPLN.minus(totoalAskRemainingPLN);

            try {
              var updatedaskDetails = await BidPLN.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountPLN: updatedBidAmountPLN,
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
            sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerPLN
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


            //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.PLNbalance) + parseFloat(totoalAskRemainingPLN));

            var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.PLNbalance);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(totoalAskRemainingPLN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of PLN Update user " + updatedPLNbalanceBidder);
            //var PLNAmountSucess = parseFloat(totoalAskRemainingPLN);
            //var PLNAmountSucess = new BigNumber(totoalAskRemainingPLN);
            //var txFeesBidderPLN = (parseFloat(PLNAmountSucess) * parseFloat(txFeeWithdrawSuccessPLN));
            //var txFeesBidderPLN = (parseFloat(totoalAskRemainingPLN) * parseFloat(txFeeWithdrawSuccessPLN));



            // var txFeesBidderPLN = new BigNumber(totoalAskRemainingPLN);
            // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
            //
            // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
            // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

            console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
            console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedPLNbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerPLN
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                PLNbalance: updatedPLNbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerPLN");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(userAskAmountPLN));
            var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
            updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(userAskAmountPLN);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of PLN Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedPLNbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingPLN " + totoalAskRemainingPLN);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerPLN
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedPLNbalance: updatedFreezedPLNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskPLN.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskPLN.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskPLN.update({
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
            //emitting event for PLN_ask destruction
            sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
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
  addBidPLNMarket: async function(req, res) {
    console.log("Enter into ask api addBidPLNMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountPLN = new BigNumber(req.body.bidAmountPLN);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountPLN = parseFloat(userBidAmountPLN);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountPLN || !userBidAmountBCH ||
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
      var bidDetails = await BidPLN.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountPLN: userBidAmountPLN,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountPLN: userBidAmountPLN,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerPLN: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.PLN_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskPLN.find({
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
        var totoalBidRemainingPLN = new BigNumber(userBidAmountPLN);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of PLN
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountPLN;
        }
        if (total_ask <= totoalBidRemainingPLN) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingPLN :: " + totoalBidRemainingPLN);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingPLN = totoalBidRemainingPLN - allAsksFromdb[i].bidAmountPLN;
            //totoalBidRemainingPLN = (parseFloat(totoalBidRemainingPLN) - parseFloat(currentAskDetails.askAmountPLN));
            totoalBidRemainingPLN = totoalBidRemainingPLN.minus(currentAskDetails.askAmountPLN);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingPLN == 0::: " + totoalBidRemainingPLN);
            if (totoalBidRemainingPLN == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingPLN == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerPLN totoalBidRemainingPLN == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(currentAskDetails.askAmountPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(currentAskDetails.askAmountPLN);
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
              console.log("After deduct TX Fees of PLN Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedPLNbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
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
                  id: bidDetails.bidownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and PLN  give to bidder
              //var updatedPLNbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.PLNbalance) + parseFloat(totoalBidRemainingPLN)) - parseFloat(totoalBidRemainingBCH);
              //var updatedPLNbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.PLNbalance) + parseFloat(userBidAmountPLN)) - parseFloat(totoalBidRemainingPLN));
              var updatedPLNbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(totoalBidRemainingPLN);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainPLN updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var PLNAmountSucess = (parseFloat(userBidAmountPLN) - parseFloat(totoalBidRemainingPLN));
              // var PLNAmountSucess = new BigNumber(userBidAmountPLN);
              // PLNAmountSucess = PLNAmountSucess.minus(totoalBidRemainingPLN);
              //
              // //var txFeesBidderPLN = (parseFloat(PLNAmountSucess) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(PLNAmountSucess);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              //
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingPLN == 0updatedPLNbalanceBidder ::: " + updatedPLNbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingPLN asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingPLN == 0BidPLN.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidPLN.destroy({
              //   id: bidDetails.bidownerPLN
              // });
              try {
                var bidDestroy = await BidPLN.update({
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0AskPLN.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskPLN.destroy({
              //   id: currentAskDetails.askownerPLN
              // });
              try {
                var askDestroy = await AskPLN.update({
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
              sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0  enter into else of totoalBidRemainingPLN == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0start User.findOne currentAskDetails.bidownerPLN ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(currentAskDetails.askAmountPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(currentAskDetails.askAmountPLN);
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

              console.log("After deduct TX Fees of PLN Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskPLN.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskPLN.update({
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

              sails.sockets.blast(constants.PLN_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingPLN == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingPLN == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerPLN");
              //var updatedPLNbalanceBidder = ((parseFloat(userAllDetailsInDBBid.PLNbalance) + parseFloat(userBidAmountPLN)) - parseFloat(totoalBidRemainingPLN));
              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBid.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(totoalBidRemainingPLN);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainPLN updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var PLNAmountSucess = (parseFloat(userBidAmountPLN) - parseFloat(totoalBidRemainingPLN));
              // var PLNAmountSucess = new BigNumber(userBidAmountPLN);
              // PLNAmountSucess = PLNAmountSucess.minus(totoalBidRemainingPLN);
              //
              // //var txFeesBidderPLN = (parseFloat(PLNAmountSucess) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(PLNAmountSucess);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              //
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);
              // console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedPLNbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountPLN totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidPLN.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountPLN: totoalBidRemainingPLN,
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingPLN :: " + totoalBidRemainingPLN);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingPLN = totoalBidRemainingPLN - allAsksFromdb[i].bidAmountPLN;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingPLN = totoalBidRemainingPLN.minus(currentAskDetails.askAmountPLN);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingPLN == 0::: " + totoalBidRemainingPLN);

              if (totoalBidRemainingPLN == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingPLN == 0Enter into totoalBidRemainingPLN == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerPLN
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
                    id: bidDetails.bidownerPLN
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingPLN == 0userAll bidDetails.askownerPLN :: ");
                console.log(" totoalBidRemainingPLN == 0Update value of Bidder and asker");
                //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(currentAskDetails.askAmountPLN));
                var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
                updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(currentAskDetails.askAmountPLN);

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

                console.log("After deduct TX Fees of PLN Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingPLN == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingPLN == 0updatedFreezedPLNbalanceAsker ::: " + updatedFreezedPLNbalanceAsker);
                console.log(" totoalBidRemainingPLN == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerPLN
                  }, {
                    FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedPLNbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(userBidAmountPLN)) - parseFloat(totoalBidRemainingPLN));

                var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
                updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);
                updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(totoalBidRemainingPLN);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainPLN totoalAskRemainingPLN " + totoalBidRemainingBCH);
                console.log("Total Ask RemainPLN BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainPLN updatedFreezedPLNbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
                //var PLNAmountSucess = (parseFloat(userBidAmountPLN) - parseFloat(totoalBidRemainingPLN));
                // var PLNAmountSucess = new BigNumber(userBidAmountPLN);
                // PLNAmountSucess = PLNAmountSucess.minus(totoalBidRemainingPLN);
                //
                //
                // //var txFeesBidderPLN = (parseFloat(PLNAmountSucess) * parseFloat(txFeeWithdrawSuccessPLN));
                // var txFeesBidderPLN = new BigNumber(PLNAmountSucess);
                // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
                // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
                // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
                // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
                //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
                updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);



                console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 updatedFreezedPLNbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerPLN
                  }, {
                    PLNbalance: updatedPLNbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 BidPLN.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskPLN.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskPLN.update({
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
                sails.sockets.blast(constants.PLN_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingPLN == 0 AskPLN.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidPLN.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidPLN.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 enter into else of totoalBidRemainingPLN == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0totoalBidRemainingPLN == 0 start User.findOne currentAskDetails.bidownerPLN " + currentAskDetails.bidownerPLN);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerPLN
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(currentAskDetails.askAmountPLN));

                var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
                updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(currentAskDetails.askAmountPLN);

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
                console.log("After deduct TX Fees of PLN Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 updatedFreezedPLNbalanceAsker:: " + updatedFreezedPLNbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingPLN " + totoalBidRemainingPLN);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerPLN
                  }, {
                    FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingPLN == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskPLN.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskPLN.update({
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
                sails.sockets.blast(constants.PLN_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountPLN = (parseFloat(currentAskDetails.askAmountPLN) - parseFloat(totoalBidRemainingPLN));

              var updatedAskAmountPLN = new BigNumber(currentAskDetails.askAmountPLN);
              updatedAskAmountPLN = updatedAskAmountPLN.minus(totoalBidRemainingPLN);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskPLN.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountPLN: updatedAskAmountPLN,
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
              sails.sockets.blast(constants.PLN_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedPLNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedPLNbalance) - parseFloat(totoalBidRemainingPLN));
              var updatedFreezedPLNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedPLNbalance);
              updatedFreezedPLNbalanceAsker = updatedFreezedPLNbalanceAsker.minus(totoalBidRemainingPLN);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainPLN totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainPLN userAllDetailsInDBAsker.FreezedPLNbalance " + userAllDetailsInDBAsker.FreezedPLNbalance);
              console.log("Total Ask RemainPLN updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of PLN Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedPLNbalanceAsker:: " + updatedFreezedPLNbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedPLNbalanceAsker " + updatedFreezedPLNbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerPLN
                }, {
                  FreezedPLNbalance: updatedFreezedPLNbalanceAsker,
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
                  id: bidDetails.bidownerPLN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerPLN");
              //var updatedPLNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.PLNbalance) + parseFloat(userBidAmountPLN));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountPLN " + userBidAmountPLN);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.PLNbalance " + userAllDetailsInDBBidder.PLNbalance);

              var updatedPLNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.PLNbalance);
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.plus(userBidAmountPLN);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);
              //var txFeesBidderPLN = (parseFloat(updatedPLNbalanceBidder) * parseFloat(txFeeWithdrawSuccessPLN));
              // var txFeesBidderPLN = new BigNumber(userBidAmountPLN);
              // txFeesBidderPLN = txFeesBidderPLN.times(txFeeWithdrawSuccessPLN);
              //
              // console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              // //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              // updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderPLN = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderPLN :: " + txFeesBidderPLN);
              //updatedPLNbalanceBidder = (parseFloat(updatedPLNbalanceBidder) - parseFloat(txFeesBidderPLN));
              updatedPLNbalanceBidder = updatedPLNbalanceBidder.minus(txFeesBidderPLN);

              console.log("After deduct TX Fees of PLN Update user " + updatedPLNbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedPLNbalanceBidder ::: " + updatedPLNbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedPLNbalanceBidder " + updatedPLNbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingPLN " + totoalBidRemainingPLN);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerPLN
                }, {
                  PLNbalance: updatedPLNbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidPLN.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidPLN.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidPLN.update({
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, bidDestroy);
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
  removeBidPLNMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdPLN;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidPLN.findOne({
      bidownerPLN: bidownerId,
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
            BidPLN.update({
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
              sails.sockets.blast(constants.PLN_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskPLNMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdPLN;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskPLN.findOne({
      askownerPLN: askownerId,
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
        var userPLNBalanceInDb = parseFloat(user.PLNbalance);
        var askAmountOfPLNInAskTableDB = parseFloat(askDetails.askAmountPLN);
        var userFreezedPLNbalanceInDB = parseFloat(user.FreezedPLNbalance);
        console.log("userPLNBalanceInDb :" + userPLNBalanceInDb);
        console.log("askAmountOfPLNInAskTableDB :" + askAmountOfPLNInAskTableDB);
        console.log("userFreezedPLNbalanceInDB :" + userFreezedPLNbalanceInDB);
        var updateFreezedPLNBalance = (parseFloat(userFreezedPLNbalanceInDB) - parseFloat(askAmountOfPLNInAskTableDB));
        var updateUserPLNBalance = (parseFloat(userPLNBalanceInDb) + parseFloat(askAmountOfPLNInAskTableDB));
        User.update({
            id: askownerId
          }, {
            PLNbalance: parseFloat(updateUserPLNBalance),
            FreezedPLNbalance: parseFloat(updateFreezedPLNBalance)
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
            AskPLN.update({
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
              sails.sockets.blast(constants.PLN_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidPLN: function(req, res) {
    console.log("Enter into ask api getAllBidPLN :: ");
    BidPLN.find({
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
            BidPLN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountPLN')
              .exec(function(err, bidAmountPLNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountPLNSum",
                    statusCode: 401
                  });
                }
                BidPLN.find({
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
                        "message": "Error to sum Of bidAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsPLN: allAskDetailsToExecute,
                      bidAmountPLNSum: bidAmountPLNSum[0].bidAmountPLN,
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
  getAllAskPLN: function(req, res) {
    console.log("Enter into ask api getAllAskPLN :: ");
    AskPLN.find({
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
            AskPLN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountPLN')
              .exec(function(err, askAmountPLNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountPLNSum",
                    statusCode: 401
                  });
                }
                AskPLN.find({
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
                        "message": "Error to sum Of askAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksPLN: allAskDetailsToExecute,
                      askAmountPLNSum: askAmountPLNSum[0].askAmountPLN,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskPLN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsPLNSuccess: function(req, res) {
    console.log("Enter into ask api getBidsPLNSuccess :: ");
    BidPLN.find({
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
            BidPLN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountPLN')
              .exec(function(err, bidAmountPLNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountPLNSum",
                    statusCode: 401
                  });
                }
                BidPLN.find({
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
                        "message": "Error to sum Of bidAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsPLN: allAskDetailsToExecute,
                      bidAmountPLNSum: bidAmountPLNSum[0].bidAmountPLN,
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
  getAsksPLNSuccess: function(req, res) {
    console.log("Enter into ask api getAsksPLNSuccess :: ");
    AskPLN.find({
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
            AskPLN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountPLN')
              .exec(function(err, askAmountPLNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountPLNSum",
                    statusCode: 401
                  });
                }
                AskPLN.find({
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
                        "message": "Error to sum Of askAmountPLNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksPLN: allAskDetailsToExecute,
                      askAmountPLNSum: askAmountPLNSum[0].askAmountPLN,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskPLN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};