/**
 * TrademarketBTCILSController
 *
 * @description :: Server-side logic for managing trademarketbtcils
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

  addAskILSMarket: async function(req, res) {
    console.log("Enter into ask api addAskILSMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountILS = new BigNumber(req.body.askAmountILS);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountILS || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountILS < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userILSBalanceInDb = new BigNumber(userAsker.ILSbalance);
    var userFreezedILSBalanceInDb = new BigNumber(userAsker.FreezedILSbalance);

    userILSBalanceInDb = parseFloat(userILSBalanceInDb);
    userFreezedILSBalanceInDb = parseFloat(userFreezedILSBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountILS.greaterThanOrEqualTo(userILSBalanceInDb)) {
      return res.json({
        "message": "You have insufficient ILS Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountILS :: " + userAskAmountILS);
    console.log("userILSBalanceInDb :: " + userILSBalanceInDb);
    // if (userAskAmountILS >= userILSBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient ILS Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountILS = parseFloat(userAskAmountILS);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskILS.create({
        askAmountBTC: userAskAmountBTC,
        askAmountILS: userAskAmountILS,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountILS: userAskAmountILS,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerILS: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.ILS_ASK_ADDED, askDetails);
    // var updateUserILSBalance = (parseFloat(userILSBalanceInDb) - parseFloat(userAskAmountILS));
    // var updateFreezedILSBalance = (parseFloat(userFreezedILSBalanceInDb) + parseFloat(userAskAmountILS));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userILSBalanceInDb = new BigNumber(userILSBalanceInDb);
    var updateUserILSBalance = userILSBalanceInDb.minus(userAskAmountILS);
    updateUserILSBalance = parseFloat(updateUserILSBalance);
    userFreezedILSBalanceInDb = new BigNumber(userFreezedILSBalanceInDb);
    var updateFreezedILSBalance = userFreezedILSBalanceInDb.plus(userAskAmountILS);
    updateFreezedILSBalance = parseFloat(updateFreezedILSBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedILSbalance: updateFreezedILSBalance,
        ILSbalance: updateUserILSBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidILS.find({
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
        message: 'Failed to find ILS bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingILS = new BigNumber(userAskAmountILS);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of ILS
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountILS;
      }
      if (total_bid <= totoalAskRemainingILS) {
        console.log("Inside of total_bid <= totoalAskRemainingILS");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingILS");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingILS :: " + totoalAskRemainingILS);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingILS = (parseFloat(totoalAskRemainingILS) - parseFloat(currentBidDetails.bidAmountILS));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingILS = totoalAskRemainingILS.minus(currentBidDetails.bidAmountILS);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingILS :: " + totoalAskRemainingILS);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingILS == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingILS == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerILS
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerILS
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(currentBidDetails.bidAmountILS));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBidder.ILSbalance);
            updatedILSbalanceBidder = updatedILSbalanceBidder.plus(currentBidDetails.bidAmountILS);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of ILS Update user " + updatedILSbalanceBidder);
            //var txFeesBidderILS = (parseFloat(currentBidDetails.bidAmountILS) * parseFloat(txFeeWithdrawSuccessILS));
            // var txFeesBidderILS = new BigNumber(currentBidDetails.bidAmountILS);
            //
            // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS)
            // console.log("txFeesBidderILS :: " + txFeesBidderILS);
            // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
            // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


            //updatedILSbalanceBidder =  parseFloat(updatedILSbalanceBidder);

            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                ILSbalance: updatedILSbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and ILS balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedILSbalanceAsker = parseFloat(totoalAskRemainingILS);
            //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);

            //updatedFreezedILSbalanceAsker =  parseFloat(updatedFreezedILSbalanceAsker);
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
            console.log("After deduct TX Fees of ILS Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedILSbalance: updatedFreezedILSbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed ILSBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidILS:: ");
            try {
              var bidDestroy = await BidILS.update({
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
            sails.sockets.blast(constants.ILS_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskILS.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskILS.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskILS',
                statusCode: 401
              });
            }
            //emitting event of destruction of ILS_ask
            sails.sockets.blast(constants.ILS_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingILS == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerILS " + currentBidDetails.bidownerILS);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerILS
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(currentBidDetails.bidAmountILS));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBidder.ILSbalance);
            updatedILSbalanceBidder = updatedILSbalanceBidder.plus(currentBidDetails.bidAmountILS);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of ILS 089089Update user " + updatedILSbalanceBidder);
            // var txFeesBidderILS = (parseFloat(currentBidDetails.bidAmountILS) * parseFloat(txFeeWithdrawSuccessILS));
            // var txFeesBidderILS = new BigNumber(currentBidDetails.bidAmountILS);
            // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
            // console.log("txFeesBidderILS :: " + txFeesBidderILS);
            // // updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
            // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedILSbalanceBidder:: " + updatedILSbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                ILSbalance: updatedILSbalanceBidder
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
              var desctroyCurrentBid = await BidILS.update({
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
            sails.sockets.blast(constants.ILS_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerILS
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerILS");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(totoalAskRemainingILS));
            //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
            console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
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
            console.log("After deduct TX Fees of ILS Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedILSbalance: updatedFreezedILSbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountILS totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskILS.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountILS: parseFloat(totoalAskRemainingILS),
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
            sails.sockets.blast(constants.ILS_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingILS :: " + totoalAskRemainingILS);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingILS = totoalAskRemainingILS - allBidsFromdb[i].bidAmountILS;
          if (totoalAskRemainingILS >= currentBidDetails.bidAmountILS) {
            //totoalAskRemainingILS = (parseFloat(totoalAskRemainingILS) - parseFloat(currentBidDetails.bidAmountILS));
            totoalAskRemainingILS = totoalAskRemainingILS.minus(currentBidDetails.bidAmountILS);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingILS == 0::: " + totoalAskRemainingILS);

            if (totoalAskRemainingILS == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingILS == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerILS
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
                  id: askDetails.askownerILS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerILS :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(currentBidDetails.bidAmountILS));
              var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBidder.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(currentBidDetails.bidAmountILS);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 ILS Update user " + updatedILSbalanceBidder);
              //var txFeesBidderILS = (parseFloat(currentBidDetails.bidAmountILS) * parseFloat(txFeeWithdrawSuccessILS));

              // var txFeesBidderILS = new BigNumber(currentBidDetails.bidAmountILS);
              // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
              // console.log("txFeesBidderILS :: " + txFeesBidderILS);
              // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);
              // console.log("After deduct TX Fees of ILS Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerILS
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  ILSbalance: updatedILSbalanceBidder
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
              //var updatedFreezedILSbalanceAsker = parseFloat(totoalAskRemainingILS);
              //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(totoalAskRemainingILS));
              //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
              var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
              console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
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

              console.log("After deduct TX Fees of ILS Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerILS
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedILSbalance: updatedFreezedILSbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidILS.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidILS.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidILS.update({
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
              sails.sockets.blast(constants.ILS_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskILS.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskILS.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskILS.update({
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
              sails.sockets.blast(constants.ILS_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingILS == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerILS " + currentBidDetails.bidownerILS);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerILS
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

              //var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(currentBidDetails.bidAmountILS));
              var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBidder.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(currentBidDetails.bidAmountILS);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of ILS Update user " + updatedILSbalanceBidder);
              //var txFeesBidderILS = (parseFloat(currentBidDetails.bidAmountILS) * parseFloat(txFeeWithdrawSuccessILS));
              // var txFeesBidderILS = new BigNumber(currentBidDetails.bidAmountILS);
              // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
              // console.log("txFeesBidderILS :: " + txFeesBidderILS);
              // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);
              // console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedILSbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerILS
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  ILSbalance: updatedILSbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidILS.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidILS.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.ILS_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerILS
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
            //var updatedBidAmountILS = (parseFloat(currentBidDetails.bidAmountILS) - parseFloat(totoalAskRemainingILS));
            var updatedBidAmountILS = new BigNumber(currentBidDetails.bidAmountILS);
            updatedBidAmountILS = updatedBidAmountILS.minus(totoalAskRemainingILS);

            try {
              var updatedaskDetails = await BidILS.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountILS: updatedBidAmountILS,
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
            sails.sockets.blast(constants.ILS_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerILS
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


            //var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.ILSbalance) + parseFloat(totoalAskRemainingILS));

            var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.ILSbalance);
            updatedILSbalanceBidder = updatedILSbalanceBidder.plus(totoalAskRemainingILS);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of ILS Update user " + updatedILSbalanceBidder);
            //var ILSAmountSucess = parseFloat(totoalAskRemainingILS);
            //var ILSAmountSucess = new BigNumber(totoalAskRemainingILS);
            //var txFeesBidderILS = (parseFloat(ILSAmountSucess) * parseFloat(txFeeWithdrawSuccessILS));
            //var txFeesBidderILS = (parseFloat(totoalAskRemainingILS) * parseFloat(txFeeWithdrawSuccessILS));



            // var txFeesBidderILS = new BigNumber(totoalAskRemainingILS);
            // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
            //
            // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
            // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedILSbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                ILSbalance: updatedILSbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerILS");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of ILS Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedILSbalance: updatedFreezedILSbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskILS.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskILS.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskILS.update({
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
            //emitting event for ILS_ask destruction
            sails.sockets.blast(constants.ILS_ASK_DESTROYED, askDestroy);
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
  addBidILSMarket: async function(req, res) {
    console.log("Enter into ask api addBidILSMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountILS = new BigNumber(req.body.bidAmountILS);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountILS = parseFloat(userBidAmountILS);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountILS || !userBidAmountBTC ||
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
      var bidDetails = await BidILS.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountILS: userBidAmountILS,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountILS: userBidAmountILS,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerILS: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.ILS_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskILS.find({
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
        var totoalBidRemainingILS = new BigNumber(userBidAmountILS);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of ILS
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountILS;
        }
        if (total_ask <= totoalBidRemainingILS) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingILS :: " + totoalBidRemainingILS);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingILS = totoalBidRemainingILS - allAsksFromdb[i].bidAmountILS;
            //totoalBidRemainingILS = (parseFloat(totoalBidRemainingILS) - parseFloat(currentAskDetails.askAmountILS));
            totoalBidRemainingILS = totoalBidRemainingILS.minus(currentAskDetails.askAmountILS);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingILS == 0::: " + totoalBidRemainingILS);
            if (totoalBidRemainingILS == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingILS == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerILS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerILS totoalBidRemainingILS == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(currentAskDetails.askAmountILS));
              var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(currentAskDetails.askAmountILS);
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
              console.log("After deduct TX Fees of ILS Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedILSbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
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
                  id: bidDetails.bidownerILS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and ILS  give to bidder
              //var updatedILSbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.ILSbalance) + parseFloat(totoalBidRemainingILS)) - parseFloat(totoalBidRemainingBTC);
              //var updatedILSbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.ILSbalance) + parseFloat(userBidAmountILS)) - parseFloat(totoalBidRemainingILS));
              var updatedILSbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(totoalBidRemainingILS);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainILS updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
              //var ILSAmountSucess = (parseFloat(userBidAmountILS) - parseFloat(totoalBidRemainingILS));
              // var ILSAmountSucess = new BigNumber(userBidAmountILS);
              // ILSAmountSucess = ILSAmountSucess.minus(totoalBidRemainingILS);
              //
              // //var txFeesBidderILS = (parseFloat(ILSAmountSucess) * parseFloat(txFeeWithdrawSuccessILS));
              // var txFeesBidderILS = new BigNumber(ILSAmountSucess);
              // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
              //
              // console.log("txFeesBidderILS :: " + txFeesBidderILS);
              // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingILS == 0updatedILSbalanceBidder ::: " + updatedILSbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingILS asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingILS == 0BidILS.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidILS.destroy({
              //   id: bidDetails.bidownerILS
              // });
              try {
                var bidDestroy = await BidILS.update({
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
              sails.sockets.blast(constants.ILS_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingILS == 0AskILS.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskILS.destroy({
              //   id: currentAskDetails.askownerILS
              // });
              try {
                var askDestroy = await AskILS.update({
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
              sails.sockets.blast(constants.ILS_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0  enter into else of totoalBidRemainingILS == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == 0start User.findOne currentAskDetails.bidownerILS ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerILS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(currentAskDetails.askAmountILS));
              var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(currentAskDetails.askAmountILS);
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

              console.log("After deduct TX Fees of ILS Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskILS.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskILS.update({
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

              sails.sockets.blast(constants.ILS_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingILS == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerILS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerILS");
              //var updatedILSbalanceBidder = ((parseFloat(userAllDetailsInDBBid.ILSbalance) + parseFloat(userBidAmountILS)) - parseFloat(totoalBidRemainingILS));
              var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBid.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(totoalBidRemainingILS);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainILS updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
              //var ILSAmountSucess = (parseFloat(userBidAmountILS) - parseFloat(totoalBidRemainingILS));
              // var ILSAmountSucess = new BigNumber(userBidAmountILS);
              // ILSAmountSucess = ILSAmountSucess.minus(totoalBidRemainingILS);
              //
              // //var txFeesBidderILS = (parseFloat(ILSAmountSucess) * parseFloat(txFeeWithdrawSuccessILS));
              // var txFeesBidderILS = new BigNumber(ILSAmountSucess);
              // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
              //
              // console.log("txFeesBidderILS :: " + txFeesBidderILS);
              // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);
              // console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedILSbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountILS totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidILS.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountILS: totoalBidRemainingILS,
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
              sails.sockets.blast(constants.ILS_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingILS :: " + totoalBidRemainingILS);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingILS = totoalBidRemainingILS - allAsksFromdb[i].bidAmountILS;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingILS = totoalBidRemainingILS.minus(currentAskDetails.askAmountILS);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingILS == 0::: " + totoalBidRemainingILS);

              if (totoalBidRemainingILS == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingILS == 0Enter into totoalBidRemainingILS == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerILS
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
                    id: bidDetails.bidownerILS
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingILS == 0userAll bidDetails.askownerILS :: ");
                console.log(" totoalBidRemainingILS == 0Update value of Bidder and asker");
                //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(currentAskDetails.askAmountILS));
                var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
                updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(currentAskDetails.askAmountILS);

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

                console.log("After deduct TX Fees of ILS Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingILS == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingILS == 0updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);
                console.log(" totoalBidRemainingILS == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerILS
                  }, {
                    FreezedILSbalance: updatedFreezedILSbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedILSbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(userBidAmountILS)) - parseFloat(totoalBidRemainingILS));

                var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBidder.ILSbalance);
                updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);
                updatedILSbalanceBidder = updatedILSbalanceBidder.minus(totoalBidRemainingILS);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalBidRemainingBTC);
                console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
                //var ILSAmountSucess = (parseFloat(userBidAmountILS) - parseFloat(totoalBidRemainingILS));
                // var ILSAmountSucess = new BigNumber(userBidAmountILS);
                // ILSAmountSucess = ILSAmountSucess.minus(totoalBidRemainingILS);
                //
                //
                // //var txFeesBidderILS = (parseFloat(ILSAmountSucess) * parseFloat(txFeeWithdrawSuccessILS));
                // var txFeesBidderILS = new BigNumber(ILSAmountSucess);
                // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
                // console.log("txFeesBidderILS :: " + txFeesBidderILS);
                // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
                // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderILS :: " + txFeesBidderILS);
                //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
                updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);



                console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingILS == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingILS == 0 updatedFreezedILSbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedILSbalanceBidder " + updatedILSbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerILS
                  }, {
                    ILSbalance: updatedILSbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingILS == 0 BidILS.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskILS.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskILS.update({
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
                sails.sockets.blast(constants.ILS_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingILS == 0 AskILS.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidILS.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidILS.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.ILS_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0 enter into else of totoalBidRemainingILS == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0totoalBidRemainingILS == 0 start User.findOne currentAskDetails.bidownerILS " + currentAskDetails.bidownerILS);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerILS
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(currentAskDetails.askAmountILS));

                var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
                updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(currentAskDetails.askAmountILS);

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
                console.log("After deduct TX Fees of ILS Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0 updatedFreezedILSbalanceAsker:: " + updatedFreezedILSbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerILS
                  }, {
                    FreezedILSbalance: updatedFreezedILSbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskILS.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskILS.update({
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
                sails.sockets.blast(constants.ILS_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountILS = (parseFloat(currentAskDetails.askAmountILS) - parseFloat(totoalBidRemainingILS));

              var updatedAskAmountILS = new BigNumber(currentAskDetails.askAmountILS);
              updatedAskAmountILS = updatedAskAmountILS.minus(totoalBidRemainingILS);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskILS.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountILS: updatedAskAmountILS,
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
              sails.sockets.blast(constants.ILS_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerILS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(totoalBidRemainingILS));
              var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(totoalBidRemainingILS);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
              console.log("Total Ask RemainILS updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of ILS Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedILSbalanceAsker:: " + updatedFreezedILSbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
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
                  id: bidDetails.bidownerILS
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerILS");
              //var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(userBidAmountILS));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountILS " + userBidAmountILS);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.ILSbalance " + userAllDetailsInDBBidder.ILSbalance);

              var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBidder.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
              //var txFeesBidderILS = (parseFloat(updatedILSbalanceBidder) * parseFloat(txFeeWithdrawSuccessILS));
              // var txFeesBidderILS = new BigNumber(userBidAmountILS);
              // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
              //
              // console.log("txFeesBidderILS :: " + txFeesBidderILS);
              // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderILS = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedILSbalanceBidder ::: " + updatedILSbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidILS.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidILS.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidILS.update({
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
              sails.sockets.blast(constants.ILS_BID_DESTROYED, bidDestroy);
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
  removeBidILSMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdILS;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidILS.findOne({
      bidownerILS: bidownerId,
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
            BidILS.update({
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
              sails.sockets.blast(constants.ILS_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskILSMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdILS;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskILS.findOne({
      askownerILS: askownerId,
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
        var userILSBalanceInDb = parseFloat(user.ILSbalance);
        var askAmountOfILSInAskTableDB = parseFloat(askDetails.askAmountILS);
        var userFreezedILSbalanceInDB = parseFloat(user.FreezedILSbalance);
        console.log("userILSBalanceInDb :" + userILSBalanceInDb);
        console.log("askAmountOfILSInAskTableDB :" + askAmountOfILSInAskTableDB);
        console.log("userFreezedILSbalanceInDB :" + userFreezedILSbalanceInDB);
        var updateFreezedILSBalance = (parseFloat(userFreezedILSbalanceInDB) - parseFloat(askAmountOfILSInAskTableDB));
        var updateUserILSBalance = (parseFloat(userILSBalanceInDb) + parseFloat(askAmountOfILSInAskTableDB));
        User.update({
            id: askownerId
          }, {
            ILSbalance: parseFloat(updateUserILSBalance),
            FreezedILSbalance: parseFloat(updateFreezedILSBalance)
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
            AskILS.update({
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
              sails.sockets.blast(constants.ILS_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidILS: function(req, res) {
    console.log("Enter into ask api getAllBidILS :: ");
    BidILS.find({
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
            BidILS.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountILS')
              .exec(function(err, bidAmountILSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountILSSum",
                    statusCode: 401
                  });
                }
                BidILS.find({
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
                        "message": "Error to sum Of bidAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsILS: allAskDetailsToExecute,
                      bidAmountILSSum: bidAmountILSSum[0].bidAmountILS,
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
  getAllAskILS: function(req, res) {
    console.log("Enter into ask api getAllAskILS :: ");
    AskILS.find({
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
            AskILS.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountILS')
              .exec(function(err, askAmountILSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountILSSum",
                    statusCode: 401
                  });
                }
                AskILS.find({
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
                        "message": "Error to sum Of askAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksILS: allAskDetailsToExecute,
                      askAmountILSSum: askAmountILSSum[0].askAmountILS,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskILS Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsILSSuccess: function(req, res) {
    console.log("Enter into ask api getBidsILSSuccess :: ");
    BidILS.find({
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
            BidILS.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountILS')
              .exec(function(err, bidAmountILSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountILSSum",
                    statusCode: 401
                  });
                }
                BidILS.find({
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
                        "message": "Error to sum Of bidAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsILS: allAskDetailsToExecute,
                      bidAmountILSSum: bidAmountILSSum[0].bidAmountILS,
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
  getAsksILSSuccess: function(req, res) {
    console.log("Enter into ask api getAsksILSSuccess :: ");
    AskILS.find({
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
            AskILS.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountILS')
              .exec(function(err, askAmountILSSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountILSSum",
                    statusCode: 401
                  });
                }
                AskILS.find({
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
                        "message": "Error to sum Of askAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksILS: allAskDetailsToExecute,
                      askAmountILSSum: askAmountILSSum[0].askAmountILS,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskILS Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};