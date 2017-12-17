/**
 * TrademarketBCHSEKController
 *
 * @description :: Server-side logic for managing trademarketbchseks
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

  addAskSEKMarket: async function(req, res) {
    console.log("Enter into ask api addAskSEKMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountSEK = new BigNumber(req.body.askAmountSEK);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountSEK || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountSEK < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userSEKBalanceInDb = new BigNumber(userAsker.SEKbalance);
    var userFreezedSEKBalanceInDb = new BigNumber(userAsker.FreezedSEKbalance);

    userSEKBalanceInDb = parseFloat(userSEKBalanceInDb);
    userFreezedSEKBalanceInDb = parseFloat(userFreezedSEKBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountSEK.greaterThanOrEqualTo(userSEKBalanceInDb)) {
      return res.json({
        "message": "You have insufficient SEK Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountSEK :: " + userAskAmountSEK);
    console.log("userSEKBalanceInDb :: " + userSEKBalanceInDb);
    // if (userAskAmountSEK >= userSEKBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient SEK Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountSEK = parseFloat(userAskAmountSEK);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskSEK.create({
        askAmountBCH: userAskAmountBCH,
        askAmountSEK: userAskAmountSEK,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountSEK: userAskAmountSEK,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerSEK: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.SEK_ASK_ADDED, askDetails);
    // var updateUserSEKBalance = (parseFloat(userSEKBalanceInDb) - parseFloat(userAskAmountSEK));
    // var updateFreezedSEKBalance = (parseFloat(userFreezedSEKBalanceInDb) + parseFloat(userAskAmountSEK));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userSEKBalanceInDb = new BigNumber(userSEKBalanceInDb);
    var updateUserSEKBalance = userSEKBalanceInDb.minus(userAskAmountSEK);
    updateUserSEKBalance = parseFloat(updateUserSEKBalance);
    userFreezedSEKBalanceInDb = new BigNumber(userFreezedSEKBalanceInDb);
    var updateFreezedSEKBalance = userFreezedSEKBalanceInDb.plus(userAskAmountSEK);
    updateFreezedSEKBalance = parseFloat(updateFreezedSEKBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedSEKbalance: updateFreezedSEKBalance,
        SEKbalance: updateUserSEKBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidSEK.find({
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
        message: 'Failed to find SEK bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingSEK = new BigNumber(userAskAmountSEK);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of SEK
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountSEK;
      }
      if (total_bid <= totoalAskRemainingSEK) {
        console.log("Inside of total_bid <= totoalAskRemainingSEK");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingSEK");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingSEK :: " + totoalAskRemainingSEK);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingSEK = (parseFloat(totoalAskRemainingSEK) - parseFloat(currentBidDetails.bidAmountSEK));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingSEK = totoalAskRemainingSEK.minus(currentBidDetails.bidAmountSEK);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingSEK :: " + totoalAskRemainingSEK);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingSEK == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingSEK == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerSEK
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerSEK
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(currentBidDetails.bidAmountSEK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of SEK Update user " + updatedSEKbalanceBidder);
            //var txFeesBidderSEK = (parseFloat(currentBidDetails.bidAmountSEK) * parseFloat(txFeeWithdrawSuccessSEK));
            // var txFeesBidderSEK = new BigNumber(currentBidDetails.bidAmountSEK);
            //
            // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK)
            // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
            // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


            //updatedSEKbalanceBidder =  parseFloat(updatedSEKbalanceBidder);

            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                SEKbalance: updatedSEKbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and SEK balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedSEKbalanceAsker = parseFloat(totoalAskRemainingSEK);
            //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);

            //updatedFreezedSEKbalanceAsker =  parseFloat(updatedFreezedSEKbalanceAsker);
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
            console.log("After deduct TX Fees of SEK Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedSEKbalance: updatedFreezedSEKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed SEKBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidSEK:: ");
            try {
              var bidDestroy = await BidSEK.update({
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
            sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskSEK.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskSEK.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskSEK',
                statusCode: 401
              });
            }
            //emitting event of destruction of SEK_ask
            sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingSEK == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerSEK " + currentBidDetails.bidownerSEK);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerSEK
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(currentBidDetails.bidAmountSEK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of SEK 089089Update user " + updatedSEKbalanceBidder);
            // var txFeesBidderSEK = (parseFloat(currentBidDetails.bidAmountSEK) * parseFloat(txFeeWithdrawSuccessSEK));
            // var txFeesBidderSEK = new BigNumber(currentBidDetails.bidAmountSEK);
            // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
            // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            // // updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
            // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedSEKbalanceBidder:: " + updatedSEKbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                SEKbalance: updatedSEKbalanceBidder
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
              var desctroyCurrentBid = await BidSEK.update({
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
            sails.sockets.blast(constants.SEK_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerSEK
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerSEK");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(totoalAskRemainingSEK));
            //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
            console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
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
            console.log("After deduct TX Fees of SEK Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedSEKbalance: updatedFreezedSEKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskSEK.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountSEK: parseFloat(totoalAskRemainingSEK),
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
            sails.sockets.blast(constants.SEK_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingSEK :: " + totoalAskRemainingSEK);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingSEK = totoalAskRemainingSEK - allBidsFromdb[i].bidAmountSEK;
          if (totoalAskRemainingSEK >= currentBidDetails.bidAmountSEK) {
            //totoalAskRemainingSEK = (parseFloat(totoalAskRemainingSEK) - parseFloat(currentBidDetails.bidAmountSEK));
            totoalAskRemainingSEK = totoalAskRemainingSEK.minus(currentBidDetails.bidAmountSEK);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingSEK == 0::: " + totoalAskRemainingSEK);

            if (totoalAskRemainingSEK == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingSEK == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerSEK
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
                  id: askDetails.askownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerSEK :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));
              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(currentBidDetails.bidAmountSEK);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 SEK Update user " + updatedSEKbalanceBidder);
              //var txFeesBidderSEK = (parseFloat(currentBidDetails.bidAmountSEK) * parseFloat(txFeeWithdrawSuccessSEK));

              // var txFeesBidderSEK = new BigNumber(currentBidDetails.bidAmountSEK);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);
              // console.log("After deduct TX Fees of SEK Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerSEK
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  SEKbalance: updatedSEKbalanceBidder
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
              //var updatedFreezedSEKbalanceAsker = parseFloat(totoalAskRemainingSEK);
              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(totoalAskRemainingSEK));
              //var updatedFreezedSEKbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK)) + parseFloat(totoalAskRemainingSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.plus(totoalAskRemainingSEK);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
              console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
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

              console.log("After deduct TX Fees of SEK Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerSEK
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidSEK.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidSEK.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidSEK.update({
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskSEK.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskSEK.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskSEK.update({
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
              sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingSEK == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerSEK " + currentBidDetails.bidownerSEK);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerSEK
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

              //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(currentBidDetails.bidAmountSEK));
              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(currentBidDetails.bidAmountSEK);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var txFeesBidderSEK = (parseFloat(currentBidDetails.bidAmountSEK) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(currentBidDetails.bidAmountSEK);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);
              // console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedSEKbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingSEK " + totoalAskRemainingSEK);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerSEK
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  SEKbalance: updatedSEKbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidSEK.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidSEK.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.SEK_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerSEK
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
            //var updatedBidAmountSEK = (parseFloat(currentBidDetails.bidAmountSEK) - parseFloat(totoalAskRemainingSEK));
            var updatedBidAmountSEK = new BigNumber(currentBidDetails.bidAmountSEK);
            updatedBidAmountSEK = updatedBidAmountSEK.minus(totoalAskRemainingSEK);

            try {
              var updatedaskDetails = await BidSEK.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountSEK: updatedBidAmountSEK,
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
            sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerSEK
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


            //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.SEKbalance) + parseFloat(totoalAskRemainingSEK));

            var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.SEKbalance);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(totoalAskRemainingSEK);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of SEK Update user " + updatedSEKbalanceBidder);
            //var SEKAmountSucess = parseFloat(totoalAskRemainingSEK);
            //var SEKAmountSucess = new BigNumber(totoalAskRemainingSEK);
            //var txFeesBidderSEK = (parseFloat(SEKAmountSucess) * parseFloat(txFeeWithdrawSuccessSEK));
            //var txFeesBidderSEK = (parseFloat(totoalAskRemainingSEK) * parseFloat(txFeeWithdrawSuccessSEK));



            // var txFeesBidderSEK = new BigNumber(totoalAskRemainingSEK);
            // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
            //
            // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
            // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

            console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
            console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedSEKbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerSEK
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                SEKbalance: updatedSEKbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerSEK");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(userAskAmountSEK));
            var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
            updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(userAskAmountSEK);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of SEK Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedSEKbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingSEK " + totoalAskRemainingSEK);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerSEK
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedSEKbalance: updatedFreezedSEKbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskSEK.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskSEK.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskSEK.update({
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
            //emitting event for SEK_ask destruction
            sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
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
  addBidSEKMarket: async function(req, res) {
    console.log("Enter into ask api addBidSEKMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountSEK = new BigNumber(req.body.bidAmountSEK);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountSEK = parseFloat(userBidAmountSEK);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountSEK || !userBidAmountBCH ||
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
      var bidDetails = await BidSEK.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountSEK: userBidAmountSEK,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountSEK: userBidAmountSEK,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerSEK: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.SEK_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskSEK.find({
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
        var totoalBidRemainingSEK = new BigNumber(userBidAmountSEK);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of SEK
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountSEK;
        }
        if (total_ask <= totoalBidRemainingSEK) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingSEK :: " + totoalBidRemainingSEK);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingSEK = totoalBidRemainingSEK - allAsksFromdb[i].bidAmountSEK;
            //totoalBidRemainingSEK = (parseFloat(totoalBidRemainingSEK) - parseFloat(currentAskDetails.askAmountSEK));
            totoalBidRemainingSEK = totoalBidRemainingSEK.minus(currentAskDetails.askAmountSEK);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingSEK == 0::: " + totoalBidRemainingSEK);
            if (totoalBidRemainingSEK == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingSEK == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerSEK totoalBidRemainingSEK == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(currentAskDetails.askAmountSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(currentAskDetails.askAmountSEK);
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
              console.log("After deduct TX Fees of SEK Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedSEKbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
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
                  id: bidDetails.bidownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and SEK  give to bidder
              //var updatedSEKbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.SEKbalance) + parseFloat(totoalBidRemainingSEK)) - parseFloat(totoalBidRemainingBCH);
              //var updatedSEKbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.SEKbalance) + parseFloat(userBidAmountSEK)) - parseFloat(totoalBidRemainingSEK));
              var updatedSEKbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(totoalBidRemainingSEK);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainSEK updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var SEKAmountSucess = (parseFloat(userBidAmountSEK) - parseFloat(totoalBidRemainingSEK));
              // var SEKAmountSucess = new BigNumber(userBidAmountSEK);
              // SEKAmountSucess = SEKAmountSucess.minus(totoalBidRemainingSEK);
              //
              // //var txFeesBidderSEK = (parseFloat(SEKAmountSucess) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(SEKAmountSucess);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              //
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingSEK == 0updatedSEKbalanceBidder ::: " + updatedSEKbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingSEK asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingSEK == 0BidSEK.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidSEK.destroy({
              //   id: bidDetails.bidownerSEK
              // });
              try {
                var bidDestroy = await BidSEK.update({
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0AskSEK.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskSEK.destroy({
              //   id: currentAskDetails.askownerSEK
              // });
              try {
                var askDestroy = await AskSEK.update({
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
              sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0  enter into else of totoalBidRemainingSEK == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0start User.findOne currentAskDetails.bidownerSEK ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(currentAskDetails.askAmountSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(currentAskDetails.askAmountSEK);
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

              console.log("After deduct TX Fees of SEK Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskSEK.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskSEK.update({
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

              sails.sockets.blast(constants.SEK_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingSEK == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingSEK == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerSEK");
              //var updatedSEKbalanceBidder = ((parseFloat(userAllDetailsInDBBid.SEKbalance) + parseFloat(userBidAmountSEK)) - parseFloat(totoalBidRemainingSEK));
              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBid.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(totoalBidRemainingSEK);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainSEK updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var SEKAmountSucess = (parseFloat(userBidAmountSEK) - parseFloat(totoalBidRemainingSEK));
              // var SEKAmountSucess = new BigNumber(userBidAmountSEK);
              // SEKAmountSucess = SEKAmountSucess.minus(totoalBidRemainingSEK);
              //
              // //var txFeesBidderSEK = (parseFloat(SEKAmountSucess) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(SEKAmountSucess);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              //
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);
              // console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedSEKbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountSEK totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidSEK.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountSEK: totoalBidRemainingSEK,
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingSEK :: " + totoalBidRemainingSEK);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingSEK = totoalBidRemainingSEK - allAsksFromdb[i].bidAmountSEK;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingSEK = totoalBidRemainingSEK.minus(currentAskDetails.askAmountSEK);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingSEK == 0::: " + totoalBidRemainingSEK);

              if (totoalBidRemainingSEK == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingSEK == 0Enter into totoalBidRemainingSEK == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerSEK
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
                    id: bidDetails.bidownerSEK
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingSEK == 0userAll bidDetails.askownerSEK :: ");
                console.log(" totoalBidRemainingSEK == 0Update value of Bidder and asker");
                //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(currentAskDetails.askAmountSEK));
                var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
                updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(currentAskDetails.askAmountSEK);

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

                console.log("After deduct TX Fees of SEK Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingSEK == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingSEK == 0updatedFreezedSEKbalanceAsker ::: " + updatedFreezedSEKbalanceAsker);
                console.log(" totoalBidRemainingSEK == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerSEK
                  }, {
                    FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedSEKbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(userBidAmountSEK)) - parseFloat(totoalBidRemainingSEK));

                var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
                updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);
                updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(totoalBidRemainingSEK);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainSEK totoalAskRemainingSEK " + totoalBidRemainingBCH);
                console.log("Total Ask RemainSEK BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainSEK updatedFreezedSEKbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
                //var SEKAmountSucess = (parseFloat(userBidAmountSEK) - parseFloat(totoalBidRemainingSEK));
                // var SEKAmountSucess = new BigNumber(userBidAmountSEK);
                // SEKAmountSucess = SEKAmountSucess.minus(totoalBidRemainingSEK);
                //
                //
                // //var txFeesBidderSEK = (parseFloat(SEKAmountSucess) * parseFloat(txFeeWithdrawSuccessSEK));
                // var txFeesBidderSEK = new BigNumber(SEKAmountSucess);
                // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
                // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
                // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
                // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
                //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
                updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);



                console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 updatedFreezedSEKbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerSEK
                  }, {
                    SEKbalance: updatedSEKbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 BidSEK.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskSEK.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskSEK.update({
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
                sails.sockets.blast(constants.SEK_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingSEK == 0 AskSEK.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidSEK.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidSEK.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 enter into else of totoalBidRemainingSEK == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0totoalBidRemainingSEK == 0 start User.findOne currentAskDetails.bidownerSEK " + currentAskDetails.bidownerSEK);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerSEK
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(currentAskDetails.askAmountSEK));

                var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
                updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(currentAskDetails.askAmountSEK);

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
                console.log("After deduct TX Fees of SEK Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 updatedFreezedSEKbalanceAsker:: " + updatedFreezedSEKbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingSEK " + totoalBidRemainingSEK);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerSEK
                  }, {
                    FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingSEK == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskSEK.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskSEK.update({
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
                sails.sockets.blast(constants.SEK_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountSEK = (parseFloat(currentAskDetails.askAmountSEK) - parseFloat(totoalBidRemainingSEK));

              var updatedAskAmountSEK = new BigNumber(currentAskDetails.askAmountSEK);
              updatedAskAmountSEK = updatedAskAmountSEK.minus(totoalBidRemainingSEK);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskSEK.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountSEK: updatedAskAmountSEK,
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
              sails.sockets.blast(constants.SEK_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedSEKbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedSEKbalance) - parseFloat(totoalBidRemainingSEK));
              var updatedFreezedSEKbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedSEKbalance);
              updatedFreezedSEKbalanceAsker = updatedFreezedSEKbalanceAsker.minus(totoalBidRemainingSEK);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainSEK totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainSEK userAllDetailsInDBAsker.FreezedSEKbalance " + userAllDetailsInDBAsker.FreezedSEKbalance);
              console.log("Total Ask RemainSEK updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of SEK Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedSEKbalanceAsker:: " + updatedFreezedSEKbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedSEKbalanceAsker " + updatedFreezedSEKbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerSEK
                }, {
                  FreezedSEKbalance: updatedFreezedSEKbalanceAsker,
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
                  id: bidDetails.bidownerSEK
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerSEK");
              //var updatedSEKbalanceBidder = (parseFloat(userAllDetailsInDBBidder.SEKbalance) + parseFloat(userBidAmountSEK));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountSEK " + userBidAmountSEK);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.SEKbalance " + userAllDetailsInDBBidder.SEKbalance);

              var updatedSEKbalanceBidder = new BigNumber(userAllDetailsInDBBidder.SEKbalance);
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.plus(userBidAmountSEK);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);
              //var txFeesBidderSEK = (parseFloat(updatedSEKbalanceBidder) * parseFloat(txFeeWithdrawSuccessSEK));
              // var txFeesBidderSEK = new BigNumber(userBidAmountSEK);
              // txFeesBidderSEK = txFeesBidderSEK.times(txFeeWithdrawSuccessSEK);
              //
              // console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              // //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              // updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderSEK = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderSEK :: " + txFeesBidderSEK);
              //updatedSEKbalanceBidder = (parseFloat(updatedSEKbalanceBidder) - parseFloat(txFeesBidderSEK));
              updatedSEKbalanceBidder = updatedSEKbalanceBidder.minus(txFeesBidderSEK);

              console.log("After deduct TX Fees of SEK Update user " + updatedSEKbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedSEKbalanceBidder ::: " + updatedSEKbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedSEKbalanceBidder " + updatedSEKbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingSEK " + totoalBidRemainingSEK);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerSEK
                }, {
                  SEKbalance: updatedSEKbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidSEK.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidSEK.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidSEK.update({
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, bidDestroy);
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
  removeBidSEKMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdSEK;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidSEK.findOne({
      bidownerSEK: bidownerId,
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
            BidSEK.update({
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
              sails.sockets.blast(constants.SEK_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskSEKMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdSEK;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskSEK.findOne({
      askownerSEK: askownerId,
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
        var userSEKBalanceInDb = parseFloat(user.SEKbalance);
        var askAmountOfSEKInAskTableDB = parseFloat(askDetails.askAmountSEK);
        var userFreezedSEKbalanceInDB = parseFloat(user.FreezedSEKbalance);
        console.log("userSEKBalanceInDb :" + userSEKBalanceInDb);
        console.log("askAmountOfSEKInAskTableDB :" + askAmountOfSEKInAskTableDB);
        console.log("userFreezedSEKbalanceInDB :" + userFreezedSEKbalanceInDB);
        var updateFreezedSEKBalance = (parseFloat(userFreezedSEKbalanceInDB) - parseFloat(askAmountOfSEKInAskTableDB));
        var updateUserSEKBalance = (parseFloat(userSEKBalanceInDb) + parseFloat(askAmountOfSEKInAskTableDB));
        User.update({
            id: askownerId
          }, {
            SEKbalance: parseFloat(updateUserSEKBalance),
            FreezedSEKbalance: parseFloat(updateFreezedSEKBalance)
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
            AskSEK.update({
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
              sails.sockets.blast(constants.SEK_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidSEK: function(req, res) {
    console.log("Enter into ask api getAllBidSEK :: ");
    BidSEK.find({
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
            BidSEK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountSEK')
              .exec(function(err, bidAmountSEKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountSEKSum",
                    statusCode: 401
                  });
                }
                BidSEK.find({
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
                        "message": "Error to sum Of bidAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsSEK: allAskDetailsToExecute,
                      bidAmountSEKSum: bidAmountSEKSum[0].bidAmountSEK,
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
  getAllAskSEK: function(req, res) {
    console.log("Enter into ask api getAllAskSEK :: ");
    AskSEK.find({
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
            AskSEK.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountSEK')
              .exec(function(err, askAmountSEKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountSEKSum",
                    statusCode: 401
                  });
                }
                AskSEK.find({
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
                        "message": "Error to sum Of askAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksSEK: allAskDetailsToExecute,
                      askAmountSEKSum: askAmountSEKSum[0].askAmountSEK,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskSEK Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsSEKSuccess: function(req, res) {
    console.log("Enter into ask api getBidsSEKSuccess :: ");
    BidSEK.find({
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
            BidSEK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountSEK')
              .exec(function(err, bidAmountSEKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountSEKSum",
                    statusCode: 401
                  });
                }
                BidSEK.find({
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
                        "message": "Error to sum Of bidAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsSEK: allAskDetailsToExecute,
                      bidAmountSEKSum: bidAmountSEKSum[0].bidAmountSEK,
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
  getAsksSEKSuccess: function(req, res) {
    console.log("Enter into ask api getAsksSEKSuccess :: ");
    AskSEK.find({
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
            AskSEK.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountSEK')
              .exec(function(err, askAmountSEKSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountSEKSum",
                    statusCode: 401
                  });
                }
                AskSEK.find({
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
                        "message": "Error to sum Of askAmountSEKSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksSEK: allAskDetailsToExecute,
                      askAmountSEKSum: askAmountSEKSum[0].askAmountSEK,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskSEK Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};