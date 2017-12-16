/**
 * TrademarketBTCEURController
 *
 * @description :: Server-side logic for managing trademarketbtceurs
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


const txFeeWithdrawSuccessBTC = sails.config.common.txFeeWithdrawSuccessBTC;
const BTCMARKETID = sails.config.common.BTCMARKETID;
module.exports = {


  addAskEURMarket: async function(req, res) {
    console.log("Enter into ask api addAskEURMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountEUR = new BigNumber(req.body.askAmountEUR);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountEUR || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountEUR < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountEUR = parseFloat(userAskAmountEUR);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskEUR.create({
        askAmountBTC: userAskAmountBTC,
        askAmountEUR: userAskAmountEUR,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountEUR: userAskAmountEUR,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
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
          'like': BTCMARKETID
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
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingEUR = (parseFloat(totoalAskRemainingEUR) - parseFloat(currentBidDetails.bidAmountEUR));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingEUR = totoalAskRemainingEUR.minus(currentBidDetails.bidAmountEUR);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingEUR :: " + totoalAskRemainingEUR);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(currentBidDetails.bidAmountEUR));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
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

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


            //updatedEURbalanceBidder =  parseFloat(updatedEURbalanceBidder);

            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedEURbalanceAsker = parseFloat(totoalAskRemainingEUR);
            //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);

            //updatedFreezedEURbalanceAsker =  parseFloat(updatedFreezedEURbalanceAsker);
            //Deduct Transation Fee Asker
            //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var BTCAmountSucess = new BigNumber(userAskAmountBTC);
            BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount BTC updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(BTCAmountSucess) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            updatedBTCbalanceAsker = parseFloat(updatedBTCbalanceAsker);
            console.log("After deduct TX Fees of EUR Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedEURbalance: updatedFreezedEURbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed EURBalance',
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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(currentBidDetails.bidAmountEUR));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
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

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedEURbalanceBidder:: " + updatedEURbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerEUR");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(totoalAskRemainingEUR));
            //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
            console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var BTCAmountSucess = new BigNumber(userAskAmountBTC);
            BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);

            //var txFeesAskerBTC = (parseFloat(BTCAmountSucess) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of EUR Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedEURbalance: updatedFreezedEURbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskEUR.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingEUR = totoalAskRemainingEUR - allBidsFromdb[i].bidAmountEUR;
          if (totoalAskRemainingEUR >= currentBidDetails.bidAmountEUR) {
            //totoalAskRemainingEUR = (parseFloat(totoalAskRemainingEUR) - parseFloat(currentBidDetails.bidAmountEUR));
            totoalAskRemainingEUR = totoalAskRemainingEUR.minus(currentBidDetails.bidAmountEUR);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
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
              // console.log("After deduct TX Fees of EUR Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerEUR
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  EURbalance: updatedEURbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
              //var updatedFreezedEURbalanceAsker = parseFloat(totoalAskRemainingEUR);
              //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(totoalAskRemainingEUR));
              //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
              var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
              console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
              var BTCAmountSucess = new BigNumber(userAskAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);
              //var txFeesAskerBTC = (parseFloat(updatedBTCbalanceAsker) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of EUR Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerEUR
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);

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

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedEURbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerEUR
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            //var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var updatedBidAmountBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            updatedBidAmountBTC = updatedBidAmountBTC.minus(totoalAskRemainingBTC);
            //var updatedBidAmountEUR = (parseFloat(currentBidDetails.bidAmountEUR) - parseFloat(totoalAskRemainingEUR));
            var updatedBidAmountEUR = new BigNumber(currentBidDetails.bidAmountEUR);
            updatedBidAmountEUR = updatedBidAmountEUR.minus(totoalAskRemainingEUR);

            try {
              var updatedaskDetails = await BidEUR.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
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
            //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance) - parseFloat(totoalAskRemainingBTC));
            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(totoalAskRemainingBTC);


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
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedEURbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerEUR");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of EUR Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                BTCbalance: updatedBTCbalanceAsker,
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
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountEUR = new BigNumber(req.body.bidAmountEUR);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountEUR = parseFloat(userBidAmountEUR);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountEUR || !userBidAmountBTC ||
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
    var userBTCBalanceInDb = new BigNumber(userBidder.BTCbalance);
    var userFreezedBTCBalanceInDb = new BigNumber(userBidder.FreezedBTCbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountBTC = new BigNumber(userBidAmountBTC);
    if (userBidAmountBTC.greaterThanOrEqualTo(userBTCBalanceInDb)) {
      return res.json({
        "message": "You have insufficient BTC Balance",
        statusCode: 401
      });
    }
    userBidAmountBTC = parseFloat(userBidAmountBTC);
    try {
      var bidDetails = await BidEUR.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountEUR: userBidAmountEUR,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountEUR: userBidAmountEUR,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
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
    //var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) - parseFloat(userBidAmountBTC));
    var updateUserBTCBalance = new BigNumber(userBTCBalanceInDb);
    updateUserBTCBalance = updateUserBTCBalance.minus(userBidAmountBTC);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBidAmountBTC));
    var updateFreezedBTCBalance = new BigNumber(userBidder.FreezedBTCbalance);
    updateFreezedBTCBalance = updateFreezedBTCBalance.plus(userBidAmountBTC);

    console.log("Updating user's bid details sdfyrtyupdateFreezedBTCBalance  " + updateFreezedBTCBalance);
    console.log("Updating user's bid details asdfasdf updateUserBTCBalance  " + updateUserBTCBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedBTCbalance: parseFloat(updateFreezedBTCBalance),
        BTCbalance: parseFloat(updateUserBTCBalance),
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
          'like': BTCMARKETID
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
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of EUR
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountEUR;
        }
        if (total_ask <= totoalBidRemainingEUR) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingEUR :: " + totoalBidRemainingEUR);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingEUR = totoalBidRemainingEUR - allAsksFromdb[i].bidAmountEUR;
            //totoalBidRemainingEUR = (parseFloat(totoalBidRemainingEUR) - parseFloat(currentAskDetails.askAmountEUR));
            totoalBidRemainingEUR = totoalBidRemainingEUR.minus(currentAskDetails.askAmountEUR);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of EUR Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedEURbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              //Bid FreezedBTCbalance of bidder deduct and EUR  give to bidder
              //var updatedEURbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.EURbalance) + parseFloat(totoalBidRemainingEUR)) - parseFloat(totoalBidRemainingBTC);
              //var updatedEURbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.EURbalance) + parseFloat(userBidAmountEUR)) - parseFloat(totoalBidRemainingEUR));
              var updatedEURbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(totoalBidRemainingEUR);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainEUR updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
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

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingEUR == 0updatedEURbalanceBidder ::: " + updatedEURbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingEUR asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of EUR Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerEUR");
              //var updatedEURbalanceBidder = ((parseFloat(userAllDetailsInDBBid.EURbalance) + parseFloat(userBidAmountEUR)) - parseFloat(totoalBidRemainingEUR));
              var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBid.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(totoalBidRemainingEUR);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainEUR updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
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



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedEURbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountEUR totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidEUR.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingEUR = totoalBidRemainingEUR - allAsksFromdb[i].bidAmountEUR;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingEUR = totoalBidRemainingEUR.minus(currentAskDetails.askAmountEUR);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

                console.log("After deduct TX Fees of EUR Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingEUR == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingEUR == 0updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);
                console.log(" totoalBidRemainingEUR == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerEUR
                  }, {
                    FreezedEURbalance: updatedFreezedEURbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalBidRemainingBTC);
                console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedBTCbalanceBidder);
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

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
                //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
                updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);



                console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0 updatedFreezedEURbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedEURbalanceBidder " + updatedEURbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerEUR
                  }, {
                    EURbalance: updatedEURbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
                console.log("After deduct TX Fees of EUR Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0 updatedFreezedEURbalanceAsker:: " + updatedFreezedEURbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerEUR
                  }, {
                    FreezedEURbalance: updatedFreezedEURbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountEUR = (parseFloat(currentAskDetails.askAmountEUR) - parseFloat(totoalBidRemainingEUR));

              var updatedAskAmountEUR = new BigNumber(currentAskDetails.askAmountEUR);
              updatedAskAmountEUR = updatedAskAmountEUR.minus(totoalBidRemainingEUR);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskEUR.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
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

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
              console.log("Total Ask RemainEUR updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of EUR Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedEURbalanceAsker:: " + updatedFreezedEURbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerEUR");
              //var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(userBidAmountEUR));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountEUR " + userBidAmountEUR);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.EURbalance " + userAllDetailsInDBBidder.EURbalance);

              var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
              //var txFeesBidderEUR = (parseFloat(updatedEURbalanceBidder) * parseFloat(txFeeWithdrawSuccessEUR));
              // var txFeesBidderEUR = new BigNumber(userBidAmountEUR);
              // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
              //
              // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);

              var txFeesBidderEUR = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedEURbalanceBidder ::: " + updatedEURbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidEUR.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC Bid destroy successfully desctroyCurrentBid ::");
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
        'like': BTCMARKETID
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
        var userBTCBalanceInDb = parseFloat(user.BTCbalance);
        var bidAmountOfBTCInBidTableDB = parseFloat(bidDetails.bidAmountBTC);
        var userFreezedBTCbalanceInDB = parseFloat(user.FreezedBTCbalance);
        var updateFreezedBalance = (parseFloat(userFreezedBTCbalanceInDB) - parseFloat(bidAmountOfBTCInBidTableDB));
        var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) + parseFloat(bidAmountOfBTCInBidTableDB));
        console.log("userBTCBalanceInDb :" + userBTCBalanceInDb);
        console.log("bidAmountOfBTCInBidTableDB :" + bidAmountOfBTCInBidTableDB);
        console.log("userFreezedBTCbalanceInDB :" + userFreezedBTCbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserBTCBalance :" + updateUserBTCBalance);

        User.update({
            id: bidownerId
          }, {
            BTCbalance: parseFloat(updateUserBTCBalance),
            FreezedBTCbalance: parseFloat(updateFreezedBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BTC balance");
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
        'like': BTCMARKETID
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
              console.log("Error to update user BTC balance");
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
          'like': BTCMARKETID
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
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsEUR: allAskDetailsToExecute,
                      bidAmountEURSum: bidAmountEURSum[0].bidAmountEUR,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
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
          'like': BTCMARKETID
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
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksEUR: allAskDetailsToExecute,
                      askAmountEURSum: askAmountEURSum[0].askAmountEUR,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
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
          'like': BTCMARKETID
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
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsEUR: allAskDetailsToExecute,
                      bidAmountEURSum: bidAmountEURSum[0].bidAmountEUR,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
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
          'like': BTCMARKETID
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
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksEUR: allAskDetailsToExecute,
                      askAmountEURSum: askAmountEURSum[0].askAmountEUR,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
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