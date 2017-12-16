/**
 * TrademarketBCHEURController
 *EUR
 * @description :: Server-side logic for managing trademarketbcheurs
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

  addAskEURMarket: async function(req, res) {
    console.log("Enter into ask api addAskEURMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountEUR = new BigNumber(req.body.askAmountEUR);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountEUR || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountEUR < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userEURBalanceInDb = new BigNumber(userAsker.EURbalance);
    var userFreezedEURBalanceInDb = new BigNumber(userAsker.FreezedEURbalance);

    userEURBalanceInDb = parseFloat(userEURBalanceInDb);
    userFreezedEURBalanceInDb = parseFloat(userFreezedEURBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountEUR.greaterThanOrEqualTo(userEURBalanceInDb)) {
      return res.json({
        "message": "You have insufficient EUR Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountEUR :: " + userAskAmountEUR);
    console.log("userEURBalanceInDb :: " + userEURBalanceInDb);
    // if (userAskAmountEUR >= userEURBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient EUR Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountEUR = parseFloat(userAskAmountEUR);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskEUR.create({
        askAmountBCH: userAskAmountBCH,
        askAmountEUR: userAskAmountEUR,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountEUR: userAskAmountEUR,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerEUR: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.EUR_ASK_ADDED, askDetails);
    // var updateUserEURBalance = (parseFloat(userEURBalanceInDb) - parseFloat(userAskAmountEUR));
    // var updateFreezedEURBalance = (parseFloat(userFreezedEURBalanceInDb) + parseFloat(userAskAmountEUR));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userEURBalanceInDb = new BigNumber(userEURBalanceInDb);
    var updateUserEURBalance = userEURBalanceInDb.minus(userAskAmountEUR);
    updateUserEURBalance = parseFloat(updateUserEURBalance);
    userFreezedEURBalanceInDb = new BigNumber(userFreezedEURBalanceInDb);
    var updateFreezedEURBalance = userFreezedEURBalanceInDb.plus(userAskAmountEUR);
    updateFreezedEURBalance = parseFloat(updateFreezedEURBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedEURbalance: updateFreezedEURBalance,
        EURbalance: updateUserEURBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidEUR.find({
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
        message: 'Failed to find EUR bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingEUR = new BigNumber(userAskAmountEUR);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of EUR
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountEUR;
      }
      if (total_bid <= totoalAskRemainingEUR) {
        console.log("Inside of total_bid <= totoalAskRemainingEUR");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingEUR");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingEUR :: " + totoalAskRemainingEUR);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingEUR = (parseFloat(totoalAskRemainingEUR) - parseFloat(currentBidDetails.bidAmountEUR));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingEUR = totoalAskRemainingEUR.minus(currentBidDetails.bidAmountEUR);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingEUR :: " + totoalAskRemainingEUR);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingEUR == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingEUR == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerEUR
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerEUR
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(currentBidDetails.bidAmountEUR));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EURbalance);
            updatedEURbalanceBidder = updatedEURbalanceBidder.plus(currentBidDetails.bidAmountEUR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of EUR Update user " + updatedEURbalanceBidder);
            //var txFeesBidderEUR = (parseFloat(currentBidDetails.bidAmountEUR) * parseFloat(txFeeWithdrawSuccessEUR));
            // var txFeesBidderEUR = new BigNumber(currentBidDetails.bidAmountEUR);
            //
            // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR)
            // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
            // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


            //updatedEURbalanceBidder =  parseFloat(updatedEURbalanceBidder);

            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                EURbalance: updatedEURbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and EUR balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedEURbalanceAsker = parseFloat(totoalAskRemainingEUR);
            //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);

            //updatedFreezedEURbalanceAsker =  parseFloat(updatedFreezedEURbalanceAsker);
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
            console.log("After deduct TX Fees of EUR Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedEURbalance: updatedFreezedEURbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed EURBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidEUR:: ");
            try {
              var bidDestroy = await BidEUR.update({
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
            sails.sockets.blast(constants.EUR_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskEUR.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskEUR.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskEUR',
                statusCode: 401
              });
            }
            //emitting event of destruction of EUR_ask
            sails.sockets.blast(constants.EUR_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingEUR == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerEUR " + currentBidDetails.bidownerEUR);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerEUR
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(currentBidDetails.bidAmountEUR));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EURbalance);
            updatedEURbalanceBidder = updatedEURbalanceBidder.plus(currentBidDetails.bidAmountEUR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of EUR 089089Update user " + updatedEURbalanceBidder);
            // var txFeesBidderEUR = (parseFloat(currentBidDetails.bidAmountEUR) * parseFloat(txFeeWithdrawSuccessEUR));
            // var txFeesBidderEUR = new BigNumber(currentBidDetails.bidAmountEUR);
            // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
            // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            // // updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
            // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedEURbalanceBidder:: " + updatedEURbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                EURbalance: updatedEURbalanceBidder
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
              var desctroyCurrentBid = await BidEUR.update({
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
            sails.sockets.blast(constants.EUR_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerEUR
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerEUR");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(totoalAskRemainingEUR));
            //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
            console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
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
            console.log("After deduct TX Fees of EUR Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedEURbalance: updatedFreezedEURbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskEUR.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountEUR: parseFloat(totoalAskRemainingEUR),
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
            sails.sockets.blast(constants.EUR_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingEUR :: " + totoalAskRemainingEUR);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingEUR = totoalAskRemainingEUR - allBidsFromdb[i].bidAmountEUR;
          if (totoalAskRemainingEUR >= currentBidDetails.bidAmountEUR) {
            //totoalAskRemainingEUR = (parseFloat(totoalAskRemainingEUR) - parseFloat(currentBidDetails.bidAmountEUR));
            totoalAskRemainingEUR = totoalAskRemainingEUR.minus(currentBidDetails.bidAmountEUR);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingEUR == 0::: " + totoalAskRemainingEUR);

            if (totoalAskRemainingEUR == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingEUR == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerEUR
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
                  id: askDetails.askownerEUR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerEUR :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(currentBidDetails.bidAmountEUR));
              var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(currentBidDetails.bidAmountEUR);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 EUR Update user " + updatedEURbalanceBidder);
              //var txFeesBidderEUR = (parseFloat(currentBidDetails.bidAmountEUR) * parseFloat(txFeeWithdrawSuccessEUR));

              // var txFeesBidderEUR = new BigNumber(currentBidDetails.bidAmountEUR);
              // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
              // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);
              // console.log("After deduct TX Fees of EUR Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerEUR
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  EURbalance: updatedEURbalanceBidder
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
              //var updatedFreezedEURbalanceAsker = parseFloat(totoalAskRemainingEUR);
              //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(totoalAskRemainingEUR));
              //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
              var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
              console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
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

              console.log("After deduct TX Fees of EUR Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerEUR
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedEURbalance: updatedFreezedEURbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidEUR.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidEUR.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidEUR.update({
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
              sails.sockets.blast(constants.EUR_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskEUR.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskEUR.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskEUR.update({
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
              sails.sockets.blast(constants.EUR_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingEUR == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerEUR " + currentBidDetails.bidownerEUR);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerEUR
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

              //var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(currentBidDetails.bidAmountEUR));
              var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(currentBidDetails.bidAmountEUR);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of EUR Update user " + updatedEURbalanceBidder);
              //var txFeesBidderEUR = (parseFloat(currentBidDetails.bidAmountEUR) * parseFloat(txFeeWithdrawSuccessEUR));
              // var txFeesBidderEUR = new BigNumber(currentBidDetails.bidAmountEUR);
              // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
              // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);
              // console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedEURbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerEUR
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  EURbalance: updatedEURbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidEUR.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidEUR.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.EUR_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerEUR
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
            //var updatedBidAmountEUR = (parseFloat(currentBidDetails.bidAmountEUR) - parseFloat(totoalAskRemainingEUR));
            var updatedBidAmountEUR = new BigNumber(currentBidDetails.bidAmountEUR);
            updatedBidAmountEUR = updatedBidAmountEUR.minus(totoalAskRemainingEUR);

            try {
              var updatedaskDetails = await BidEUR.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountEUR: updatedBidAmountEUR,
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
            sails.sockets.blast(constants.EUR_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerEUR
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


            //var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.EURbalance) + parseFloat(totoalAskRemainingEUR));

            var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.EURbalance);
            updatedEURbalanceBidder = updatedEURbalanceBidder.plus(totoalAskRemainingEUR);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of EUR Update user " + updatedEURbalanceBidder);
            //var EURAmountSucess = parseFloat(totoalAskRemainingEUR);
            //var EURAmountSucess = new BigNumber(totoalAskRemainingEUR);
            //var txFeesBidderEUR = (parseFloat(EURAmountSucess) * parseFloat(txFeeWithdrawSuccessEUR));
            //var txFeesBidderEUR = (parseFloat(totoalAskRemainingEUR) * parseFloat(txFeeWithdrawSuccessEUR));



            // var txFeesBidderEUR = new BigNumber(totoalAskRemainingEUR);
            // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
            //
            // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
            // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedEURbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                EURbalance: updatedEURbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerEUR");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of EUR Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedEURbalance: updatedFreezedEURbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskEUR.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskEUR.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskEUR.update({
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
            //emitting event for EUR_ask destruction
            sails.sockets.blast(constants.EUR_ASK_DESTROYED, askDestroy);
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
  addBidEURMarket: async function(req, res) {
    console.log("Enter into ask api addBidEURMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountEUR = new BigNumber(req.body.bidAmountEUR);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountEUR = parseFloat(userBidAmountEUR);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountEUR || !userBidAmountBCH ||
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
      var bidDetails = await BidEUR.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountEUR: userBidAmountEUR,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountEUR: userBidAmountEUR,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerEUR: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.EUR_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskEUR.find({
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
        var totoalBidRemainingEUR = new BigNumber(userBidAmountEUR);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of EUR
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountEUR;
        }
        if (total_ask <= totoalBidRemainingEUR) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingEUR :: " + totoalBidRemainingEUR);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingEUR = totoalBidRemainingEUR - allAsksFromdb[i].bidAmountEUR;
            //totoalBidRemainingEUR = (parseFloat(totoalBidRemainingEUR) - parseFloat(currentAskDetails.askAmountEUR));
            totoalBidRemainingEUR = totoalBidRemainingEUR.minus(currentAskDetails.askAmountEUR);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingEUR == 0::: " + totoalBidRemainingEUR);
            if (totoalBidRemainingEUR == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingEUR == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerEUR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerEUR totoalBidRemainingEUR == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(currentAskDetails.askAmountEUR));
              var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(currentAskDetails.askAmountEUR);
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
              console.log("After deduct TX Fees of EUR Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedEURbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
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
                  id: bidDetails.bidownerEUR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and EUR  give to bidder
              //var updatedEURbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.EURbalance) + parseFloat(totoalBidRemainingEUR)) - parseFloat(totoalBidRemainingBCH);
              //var updatedEURbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.EURbalance) + parseFloat(userBidAmountEUR)) - parseFloat(totoalBidRemainingEUR));
              var updatedEURbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(totoalBidRemainingEUR);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainEUR updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
              //var EURAmountSucess = (parseFloat(userBidAmountEUR) - parseFloat(totoalBidRemainingEUR));
              // var EURAmountSucess = new BigNumber(userBidAmountEUR);
              // EURAmountSucess = EURAmountSucess.minus(totoalBidRemainingEUR);
              //
              // //var txFeesBidderEUR = (parseFloat(EURAmountSucess) * parseFloat(txFeeWithdrawSuccessEUR));
              // var txFeesBidderEUR = new BigNumber(EURAmountSucess);
              // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
              //
              // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingEUR == 0updatedEURbalanceBidder ::: " + updatedEURbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingEUR asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingEUR == 0BidEUR.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidEUR.destroy({
              //   id: bidDetails.bidownerEUR
              // });
              try {
                var bidDestroy = await BidEUR.update({
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
              sails.sockets.blast(constants.EUR_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0AskEUR.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskEUR.destroy({
              //   id: currentAskDetails.askownerEUR
              // });
              try {
                var askDestroy = await AskEUR.update({
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
              sails.sockets.blast(constants.EUR_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0  enter into else of totoalBidRemainingEUR == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == 0start User.findOne currentAskDetails.bidownerEUR ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerEUR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(currentAskDetails.askAmountEUR));
              var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(currentAskDetails.askAmountEUR);
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

              console.log("After deduct TX Fees of EUR Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskEUR.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskEUR.update({
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

              sails.sockets.blast(constants.EUR_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingEUR == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerEUR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerEUR");
              //var updatedEURbalanceBidder = ((parseFloat(userAllDetailsInDBBid.EURbalance) + parseFloat(userBidAmountEUR)) - parseFloat(totoalBidRemainingEUR));
              var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBid.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(totoalBidRemainingEUR);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainEUR updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
              //var EURAmountSucess = (parseFloat(userBidAmountEUR) - parseFloat(totoalBidRemainingEUR));
              // var EURAmountSucess = new BigNumber(userBidAmountEUR);
              // EURAmountSucess = EURAmountSucess.minus(totoalBidRemainingEUR);
              //
              // //var txFeesBidderEUR = (parseFloat(EURAmountSucess) * parseFloat(txFeeWithdrawSuccessEUR));
              // var txFeesBidderEUR = new BigNumber(EURAmountSucess);
              // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
              //
              // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);
              // console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedEURbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountEUR totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidEUR.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountEUR: totoalBidRemainingEUR,
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
              sails.sockets.blast(constants.EUR_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingEUR :: " + totoalBidRemainingEUR);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingEUR = totoalBidRemainingEUR - allAsksFromdb[i].bidAmountEUR;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingEUR = totoalBidRemainingEUR.minus(currentAskDetails.askAmountEUR);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingEUR == 0::: " + totoalBidRemainingEUR);

              if (totoalBidRemainingEUR == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingEUR == 0Enter into totoalBidRemainingEUR == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerEUR
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
                    id: bidDetails.bidownerEUR
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingEUR == 0userAll bidDetails.askownerEUR :: ");
                console.log(" totoalBidRemainingEUR == 0Update value of Bidder and asker");
                //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(currentAskDetails.askAmountEUR));
                var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
                updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(currentAskDetails.askAmountEUR);

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

                console.log("After deduct TX Fees of EUR Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingEUR == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingEUR == 0updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);
                console.log(" totoalBidRemainingEUR == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerEUR
                  }, {
                    FreezedEURbalance: updatedFreezedEURbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedEURbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(userBidAmountEUR)) - parseFloat(totoalBidRemainingEUR));

                var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EURbalance);
                updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);
                updatedEURbalanceBidder = updatedEURbalanceBidder.minus(totoalBidRemainingEUR);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalBidRemainingBCH);
                console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
                //var EURAmountSucess = (parseFloat(userBidAmountEUR) - parseFloat(totoalBidRemainingEUR));
                // var EURAmountSucess = new BigNumber(userBidAmountEUR);
                // EURAmountSucess = EURAmountSucess.minus(totoalBidRemainingEUR);
                //
                //
                // //var txFeesBidderEUR = (parseFloat(EURAmountSucess) * parseFloat(txFeeWithdrawSuccessEUR));
                // var txFeesBidderEUR = new BigNumber(EURAmountSucess);
                // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
                // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
                // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
                // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
                //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
                updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);



                console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0 updatedFreezedEURbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedEURbalanceBidder " + updatedEURbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerEUR
                  }, {
                    EURbalance: updatedEURbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0 BidEUR.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskEUR.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskEUR.update({
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
                sails.sockets.blast(constants.EUR_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0 AskEUR.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidEUR.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidEUR.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.EUR_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0 enter into else of totoalBidRemainingEUR == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0totoalBidRemainingEUR == 0 start User.findOne currentAskDetails.bidownerEUR " + currentAskDetails.bidownerEUR);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerEUR
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(currentAskDetails.askAmountEUR));

                var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
                updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(currentAskDetails.askAmountEUR);

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
                console.log("After deduct TX Fees of EUR Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0 updatedFreezedEURbalanceAsker:: " + updatedFreezedEURbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerEUR
                  }, {
                    FreezedEURbalance: updatedFreezedEURbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskEUR.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskEUR.update({
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
                sails.sockets.blast(constants.EUR_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountEUR = (parseFloat(currentAskDetails.askAmountEUR) - parseFloat(totoalBidRemainingEUR));

              var updatedAskAmountEUR = new BigNumber(currentAskDetails.askAmountEUR);
              updatedAskAmountEUR = updatedAskAmountEUR.minus(totoalBidRemainingEUR);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskEUR.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountEUR: updatedAskAmountEUR,
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
              sails.sockets.blast(constants.EUR_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerEUR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(totoalBidRemainingEUR));
              var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(totoalBidRemainingEUR);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
              console.log("Total Ask RemainEUR updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of EUR Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedEURbalanceAsker:: " + updatedFreezedEURbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
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
                  id: bidDetails.bidownerEUR
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerEUR");
              //var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(userBidAmountEUR));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountEUR " + userBidAmountEUR);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.EURbalance " + userAllDetailsInDBBidder.EURbalance);

              var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
              //var txFeesBidderEUR = (parseFloat(updatedEURbalanceBidder) * parseFloat(txFeeWithdrawSuccessEUR));
              // var txFeesBidderEUR = new BigNumber(userBidAmountEUR);
              // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
              //
              // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderEUR = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedEURbalanceBidder ::: " + updatedEURbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidEUR.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidEUR.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidEUR.update({
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
              sails.sockets.blast(constants.EUR_BID_DESTROYED, bidDestroy);
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
  removeBidEURMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdEUR;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidEUR.findOne({
      bidownerEUR: bidownerId,
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
            BidEUR.update({
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
              sails.sockets.blast(constants.EUR_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskEURMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdEUR;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskEUR.findOne({
      askownerEUR: askownerId,
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
        var userEURBalanceInDb = parseFloat(user.EURbalance);
        var askAmountOfEURInAskTableDB = parseFloat(askDetails.askAmountEUR);
        var userFreezedEURbalanceInDB = parseFloat(user.FreezedEURbalance);
        console.log("userEURBalanceInDb :" + userEURBalanceInDb);
        console.log("askAmountOfEURInAskTableDB :" + askAmountOfEURInAskTableDB);
        console.log("userFreezedEURbalanceInDB :" + userFreezedEURbalanceInDB);
        var updateFreezedEURBalance = (parseFloat(userFreezedEURbalanceInDB) - parseFloat(askAmountOfEURInAskTableDB));
        var updateUserEURBalance = (parseFloat(userEURBalanceInDb) + parseFloat(askAmountOfEURInAskTableDB));
        User.update({
            id: askownerId
          }, {
            EURbalance: parseFloat(updateUserEURBalance),
            FreezedEURbalance: parseFloat(updateFreezedEURBalance)
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
            AskEUR.update({
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
              sails.sockets.blast(constants.EUR_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidEUR: function(req, res) {
    console.log("Enter into ask api getAllBidEUR :: ");
    BidEUR.find({
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
            BidEUR.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountEUR')
              .exec(function(err, bidAmountEURSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountEURSum",
                    statusCode: 401
                  });
                }
                BidEUR.find({
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
                        "message": "Error to sum Of bidAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsEUR: allAskDetailsToExecute,
                      bidAmountEURSum: bidAmountEURSum[0].bidAmountEUR,
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
  getAllAskEUR: function(req, res) {
    console.log("Enter into ask api getAllAskEUR :: ");
    AskEUR.find({
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
            AskEUR.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountEUR')
              .exec(function(err, askAmountEURSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountEURSum",
                    statusCode: 401
                  });
                }
                AskEUR.find({
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
                        "message": "Error to sum Of askAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksEUR: allAskDetailsToExecute,
                      askAmountEURSum: askAmountEURSum[0].askAmountEUR,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskEUR Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsEURSuccess: function(req, res) {
    console.log("Enter into ask api getBidsEURSuccess :: ");
    BidEUR.find({
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
            BidEUR.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountEUR')
              .exec(function(err, bidAmountEURSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountEURSum",
                    statusCode: 401
                  });
                }
                BidEUR.find({
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
                        "message": "Error to sum Of bidAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsEUR: allAskDetailsToExecute,
                      bidAmountEURSum: bidAmountEURSum[0].bidAmountEUR,
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
  getAsksEURSuccess: function(req, res) {
    console.log("Enter into ask api getAsksEURSuccess :: ");
    AskEUR.find({
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
            AskEUR.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountEUR')
              .exec(function(err, askAmountEURSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountEURSum",
                    statusCode: 401
                  });
                }
                AskEUR.find({
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
                        "message": "Error to sum Of askAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksEUR: allAskDetailsToExecute,
                      askAmountEURSum: askAmountEURSum[0].askAmountEUR,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskEUR Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};