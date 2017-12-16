/**
 * TrademarketLTCEURController
 *
 * @description :: Server-side logic for managing trademarketltceurs
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

const txFeeWithdrawSuccessLTC = sails.config.common.txFeeWithdrawSuccessLTC;
const LTCMARKETID = sails.config.common.LTCMARKETID;
module.exports = {


  addAskEURMarket: async function(req, res) {
    console.log("Enter into ask api addAskEURMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountEUR = new BigNumber(req.body.askAmountEUR);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountEUR || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountEUR < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountEUR = parseFloat(userAskAmountEUR);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskEUR.create({
        askAmountLTC: userAskAmountLTC,
        askAmountEUR: userAskAmountEUR,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountEUR: userAskAmountEUR,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingEUR = (parseFloat(totoalAskRemainingEUR) - parseFloat(currentBidDetails.bidAmountEUR));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingEUR = totoalAskRemainingEUR.minus(currentBidDetails.bidAmountEUR);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingEUR :: " + totoalAskRemainingEUR);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(currentBidDetails.bidAmountEUR));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


            //updatedEURbalanceBidder =  parseFloat(updatedEURbalanceBidder);

            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedEURbalanceAsker = parseFloat(totoalAskRemainingEUR);
            //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);

            //updatedFreezedEURbalanceAsker =  parseFloat(updatedFreezedEURbalanceAsker);
            //Deduct Transation Fee Asker
            //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var LTCAmountSucess = new BigNumber(userAskAmountLTC);
            LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount LTC updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
            updatedLTCbalanceAsker = parseFloat(updatedLTCbalanceAsker);
            console.log("After deduct TX Fees of EUR Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedEURbalance: updatedFreezedEURbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed EURBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(currentBidDetails.bidAmountEUR));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedEURbalanceBidder:: " + updatedEURbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerEUR");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(totoalAskRemainingEUR));
            //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
            console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var LTCAmountSucess = new BigNumber(userAskAmountLTC);
            LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);

            //var txFeesAskerLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of EUR Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedEURbalance: updatedFreezedEURbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskEUR.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingEUR = totoalAskRemainingEUR - allBidsFromdb[i].bidAmountEUR;
          if (totoalAskRemainingEUR >= currentBidDetails.bidAmountEUR) {
            //totoalAskRemainingEUR = (parseFloat(totoalAskRemainingEUR) - parseFloat(currentBidDetails.bidAmountEUR));
            totoalAskRemainingEUR = totoalAskRemainingEUR.minus(currentBidDetails.bidAmountEUR);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of EUR Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerEUR
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  EURbalance: updatedEURbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
              //var updatedFreezedEURbalanceAsker = parseFloat(totoalAskRemainingEUR);
              //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(totoalAskRemainingEUR));
              //var updatedFreezedEURbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR)) + parseFloat(totoalAskRemainingEUR));
              var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);
              updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.plus(totoalAskRemainingEUR);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
              console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
              var LTCAmountSucess = new BigNumber(userAskAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);
              //var txFeesAskerLTC = (parseFloat(updatedLTCbalanceAsker) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

              console.log("After deduct TX Fees of EUR Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerEUR
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedEURbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingEUR " + totoalAskRemainingEUR);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerEUR
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountEUR = (parseFloat(currentBidDetails.bidAmountEUR) - parseFloat(totoalAskRemainingEUR));
            var updatedBidAmountEUR = new BigNumber(currentBidDetails.bidAmountEUR);
            updatedBidAmountEUR = updatedBidAmountEUR.minus(totoalAskRemainingEUR);

            try {
              var updatedaskDetails = await BidEUR.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

            console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
            console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedEURbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedEURbalanceBidder " + updatedEURbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerEUR
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerEUR");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedEURbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedEURbalance) - parseFloat(userAskAmountEUR));
            var updatedFreezedEURbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedEURbalance);
            updatedFreezedEURbalanceAsker = updatedFreezedEURbalanceAsker.minus(userAskAmountEUR);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of EUR Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedEURbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingEUR " + totoalAskRemainingEUR);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerEUR
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountEUR = new BigNumber(req.body.bidAmountEUR);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountEUR = parseFloat(userBidAmountEUR);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountEUR || !userBidAmountLTC ||
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
    var userLTCBalanceInDb = new BigNumber(userBidder.LTCbalance);
    var userFreezedLTCBalanceInDb = new BigNumber(userBidder.FreezedLTCbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountLTC = new BigNumber(userBidAmountLTC);
    if (userBidAmountLTC.greaterThanOrEqualTo(userLTCBalanceInDb)) {
      return res.json({
        "message": "You have insufficient LTC Balance",
        statusCode: 401
      });
    }
    userBidAmountLTC = parseFloat(userBidAmountLTC);
    try {
      var bidDetails = await BidEUR.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountEUR: userBidAmountEUR,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountEUR: userBidAmountEUR,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
    //var updateUserLTCBalance = (parseFloat(userLTCBalanceInDb) - parseFloat(userBidAmountLTC));
    var updateUserLTCBalance = new BigNumber(userLTCBalanceInDb);
    updateUserLTCBalance = updateUserLTCBalance.minus(userBidAmountLTC);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedLTCBalance = (parseFloat(userFreezedLTCBalanceInDb) + parseFloat(userBidAmountLTC));
    var updateFreezedLTCBalance = new BigNumber(userBidder.FreezedLTCbalance);
    updateFreezedLTCBalance = updateFreezedLTCBalance.plus(userBidAmountLTC);

    console.log("Updating user's bid details sdfyrtyupdateFreezedLTCBalance  " + updateFreezedLTCBalance);
    console.log("Updating user's bid details asdfasdf updateUserLTCBalance  " + updateUserLTCBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedLTCbalance: parseFloat(updateFreezedLTCBalance),
        LTCbalance: parseFloat(updateUserLTCBalance),
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
          'like': LTCMARKETID
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
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of EUR
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountEUR;
        }
        if (total_ask <= totoalBidRemainingEUR) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingEUR :: " + totoalBidRemainingEUR);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingEUR = totoalBidRemainingEUR - allAsksFromdb[i].bidAmountEUR;
            //totoalBidRemainingEUR = (parseFloat(totoalBidRemainingEUR) - parseFloat(currentAskDetails.askAmountEUR));
            totoalBidRemainingEUR = totoalBidRemainingEUR.minus(currentAskDetails.askAmountEUR);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of EUR Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedEURbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              //Bid FreezedLTCbalance of bidder deduct and EUR  give to bidder
              //var updatedEURbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.EURbalance) + parseFloat(totoalBidRemainingEUR)) - parseFloat(totoalBidRemainingLTC);
              //var updatedEURbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.EURbalance) + parseFloat(userBidAmountEUR)) - parseFloat(totoalBidRemainingEUR));
              var updatedEURbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(totoalBidRemainingEUR);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainEUR updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingEUR == 0updatedEURbalanceBidder ::: " + updatedEURbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingEUR asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

              console.log("After deduct TX Fees of EUR Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingEUR == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerEUR");
              //var updatedEURbalanceBidder = ((parseFloat(userAllDetailsInDBBid.EURbalance) + parseFloat(userBidAmountEUR)) - parseFloat(totoalBidRemainingEUR));
              var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBid.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(totoalBidRemainingEUR);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainEUR updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedEURbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountLTC totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountEUR totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidEUR.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingEUR = totoalBidRemainingEUR - allAsksFromdb[i].bidAmountEUR;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingEUR = totoalBidRemainingEUR.minus(currentAskDetails.askAmountEUR);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
                var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
                var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
                txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

                console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
                //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

                console.log("After deduct TX Fees of EUR Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingEUR == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingEUR == 0updatedFreezedEURbalanceAsker ::: " + updatedFreezedEURbalanceAsker);
                console.log(" totoalBidRemainingEUR == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerEUR
                  }, {
                    FreezedEURbalance: updatedFreezedEURbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainEUR totoalAskRemainingEUR " + totoalBidRemainingLTC);
                console.log("Total Ask RemainEUR BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainEUR updatedFreezedEURbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
                //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
                updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);



                console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingEUR == 0 updatedFreezedEURbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedEURbalanceBidder " + updatedEURbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerEUR
                  }, {
                    EURbalance: updatedEURbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

                //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
                var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
                var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
                txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

                console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
                //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
                console.log("After deduct TX Fees of EUR Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0 updatedFreezedEURbalanceAsker:: " + updatedFreezedEURbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingEUR == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingEUR " + totoalBidRemainingEUR);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerEUR
                  }, {
                    FreezedEURbalance: updatedFreezedEURbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountEUR = (parseFloat(currentAskDetails.askAmountEUR) - parseFloat(totoalBidRemainingEUR));

              var updatedAskAmountEUR = new BigNumber(currentAskDetails.askAmountEUR);
              updatedAskAmountEUR = updatedAskAmountEUR.minus(totoalBidRemainingEUR);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskEUR.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainEUR totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainEUR userAllDetailsInDBAsker.FreezedEURbalance " + userAllDetailsInDBAsker.FreezedEURbalance);
              console.log("Total Ask RemainEUR updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of EUR Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedEURbalanceAsker:: " + updatedFreezedEURbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedEURbalanceAsker " + updatedFreezedEURbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerEUR
                }, {
                  FreezedEURbalance: updatedFreezedEURbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerEUR");
              //var updatedEURbalanceBidder = (parseFloat(userAllDetailsInDBBidder.EURbalance) + parseFloat(userBidAmountEUR));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountEUR " + userBidAmountEUR);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.EURbalance " + userAllDetailsInDBBidder.EURbalance);

              var updatedEURbalanceBidder = new BigNumber(userAllDetailsInDBBidder.EURbalance);
              updatedEURbalanceBidder = updatedEURbalanceBidder.plus(userBidAmountEUR);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);
              //var txFeesBidderEUR = (parseFloat(updatedEURbalanceBidder) * parseFloat(txFeeWithdrawSuccessEUR));
              // var txFeesBidderEUR = new BigNumber(userBidAmountEUR);
              // txFeesBidderEUR = txFeesBidderEUR.times(txFeeWithdrawSuccessEUR);
              //
              // console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              // //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              // updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);

              var txFeesBidderEUR = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderEUR :: " + txFeesBidderEUR);
              //updatedEURbalanceBidder = (parseFloat(updatedEURbalanceBidder) - parseFloat(txFeesBidderEUR));
              updatedEURbalanceBidder = updatedEURbalanceBidder.minus(txFeesBidderEUR);

              console.log("After deduct TX Fees of EUR Update user " + updatedEURbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedEURbalanceBidder ::: " + updatedEURbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedEURbalanceBidder " + updatedEURbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingEUR " + totoalBidRemainingEUR);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerEUR
                }, {
                  EURbalance: updatedEURbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidEUR.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC Bid destroy successfully desctroyCurrentBid ::");
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
        'like': LTCMARKETID
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
        var userLTCBalanceInDb = parseFloat(user.LTCbalance);
        var bidAmountOfLTCInBidTableDB = parseFloat(bidDetails.bidAmountLTC);
        var userFreezedLTCbalanceInDB = parseFloat(user.FreezedLTCbalance);
        var updateFreezedBalance = (parseFloat(userFreezedLTCbalanceInDB) - parseFloat(bidAmountOfLTCInBidTableDB));
        var updateUserLTCBalance = (parseFloat(userLTCBalanceInDb) + parseFloat(bidAmountOfLTCInBidTableDB));
        console.log("userLTCBalanceInDb :" + userLTCBalanceInDb);
        console.log("bidAmountOfLTCInBidTableDB :" + bidAmountOfLTCInBidTableDB);
        console.log("userFreezedLTCbalanceInDB :" + userFreezedLTCbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserLTCBalance :" + updateUserLTCBalance);

        User.update({
            id: bidownerId
          }, {
            LTCbalance: parseFloat(updateUserLTCBalance),
            FreezedLTCbalance: parseFloat(updateFreezedBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user LTC balance");
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
        'like': LTCMARKETID
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
              console.log("Error to update user LTC balance");
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
          'like': LTCMARKETID
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
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsEUR: allAskDetailsToExecute,
                      bidAmountEURSum: bidAmountEURSum[0].bidAmountEUR,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
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
          'like': LTCMARKETID
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
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksEUR: allAskDetailsToExecute,
                      askAmountEURSum: askAmountEURSum[0].askAmountEUR,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
          'like': LTCMARKETID
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
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsEUR: allAskDetailsToExecute,
                      bidAmountEURSum: bidAmountEURSum[0].bidAmountEUR,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
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
          'like': LTCMARKETID
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
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountEURSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksEUR: allAskDetailsToExecute,
                      askAmountEURSum: askAmountEURSum[0].askAmountEUR,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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