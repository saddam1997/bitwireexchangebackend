/**
 * TrademarketLTCILSController
 *ILS
 * @description :: Server-side logic for managing trademarketltcils
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

  addAskILSMarket: async function(req, res) {
    console.log("Enter into ask api addAskILSMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountILS = new BigNumber(req.body.askAmountILS);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountILS || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountILS < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountILS = parseFloat(userAskAmountILS);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskILS.create({
        askAmountLTC: userAskAmountLTC,
        askAmountILS: userAskAmountILS,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountILS: userAskAmountILS,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingILS = (parseFloat(totoalAskRemainingILS) - parseFloat(currentBidDetails.bidAmountILS));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingILS = totoalAskRemainingILS.minus(currentBidDetails.bidAmountILS);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingILS :: " + totoalAskRemainingILS);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(currentBidDetails.bidAmountILS));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


            //updatedILSbalanceBidder =  parseFloat(updatedILSbalanceBidder);

            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedILSbalanceAsker = parseFloat(totoalAskRemainingILS);
            //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);

            //updatedFreezedILSbalanceAsker =  parseFloat(updatedFreezedILSbalanceAsker);
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
            console.log("After deduct TX Fees of ILS Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedILSbalance: updatedFreezedILSbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed ILSBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(currentBidDetails.bidAmountILS));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedILSbalanceBidder:: " + updatedILSbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerILS");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(totoalAskRemainingILS));
            //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
            console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
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
            console.log("After deduct TX Fees of ILS Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedILSbalance: updatedFreezedILSbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountILS totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskILS.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingILS = totoalAskRemainingILS - allBidsFromdb[i].bidAmountILS;
          if (totoalAskRemainingILS >= currentBidDetails.bidAmountILS) {
            //totoalAskRemainingILS = (parseFloat(totoalAskRemainingILS) - parseFloat(currentBidDetails.bidAmountILS));
            totoalAskRemainingILS = totoalAskRemainingILS.minus(currentBidDetails.bidAmountILS);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of ILS Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerILS
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  ILSbalance: updatedILSbalanceBidder
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
              //var updatedFreezedILSbalanceAsker = parseFloat(totoalAskRemainingILS);
              //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(totoalAskRemainingILS));
              //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
              var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
              console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
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

              console.log("After deduct TX Fees of ILS Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerILS
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedILSbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerILS
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountILS = (parseFloat(currentBidDetails.bidAmountILS) - parseFloat(totoalAskRemainingILS));
            var updatedBidAmountILS = new BigNumber(currentBidDetails.bidAmountILS);
            updatedBidAmountILS = updatedBidAmountILS.minus(totoalAskRemainingILS);

            try {
              var updatedaskDetails = await BidILS.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedILSbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerILS");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of ILS Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountILS = new BigNumber(req.body.bidAmountILS);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountILS = parseFloat(userBidAmountILS);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountILS || !userBidAmountLTC ||
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
      var bidDetails = await BidILS.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountILS: userBidAmountILS,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountILS: userBidAmountILS,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskILS.find({
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
        var totoalBidRemainingILS = new BigNumber(userBidAmountILS);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of ILS
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountILS;
        }
        if (total_ask <= totoalBidRemainingILS) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingILS :: " + totoalBidRemainingILS);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingILS = totoalBidRemainingILS - allAsksFromdb[i].bidAmountILS;
            //totoalBidRemainingILS = (parseFloat(totoalBidRemainingILS) - parseFloat(currentAskDetails.askAmountILS));
            totoalBidRemainingILS = totoalBidRemainingILS.minus(currentAskDetails.askAmountILS);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of ILS Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedILSbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and ILS  give to bidder
              //var updatedILSbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.ILSbalance) + parseFloat(totoalBidRemainingILS)) - parseFloat(totoalBidRemainingLTC);
              //var updatedILSbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.ILSbalance) + parseFloat(userBidAmountILS)) - parseFloat(totoalBidRemainingILS));
              var updatedILSbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(totoalBidRemainingILS);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainILS updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingILS == 0updatedILSbalanceBidder ::: " + updatedILSbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingILS asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of ILS Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerILS");
              //var updatedILSbalanceBidder = ((parseFloat(userAllDetailsInDBBid.ILSbalance) + parseFloat(userBidAmountILS)) - parseFloat(totoalBidRemainingILS));
              var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBid.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(totoalBidRemainingILS);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainILS updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedILSbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountILS totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidILS.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingILS = totoalBidRemainingILS - allAsksFromdb[i].bidAmountILS;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingILS = totoalBidRemainingILS.minus(currentAskDetails.askAmountILS);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of ILS Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingILS == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingILS == 0updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);
                console.log(" totoalBidRemainingILS == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerILS
                  }, {
                    FreezedILSbalance: updatedFreezedILSbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalBidRemainingLTC);
                console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderILS :: " + txFeesBidderILS);
                //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
                updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);



                console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingILS == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingILS == 0 updatedFreezedILSbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedILSbalanceBidder " + updatedILSbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerILS
                  }, {
                    ILSbalance: updatedILSbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of ILS Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0 updatedFreezedILSbalanceAsker:: " + updatedFreezedILSbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerILS
                  }, {
                    FreezedILSbalance: updatedFreezedILSbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountILS = (parseFloat(currentAskDetails.askAmountILS) - parseFloat(totoalBidRemainingILS));

              var updatedAskAmountILS = new BigNumber(currentAskDetails.askAmountILS);
              updatedAskAmountILS = updatedAskAmountILS.minus(totoalBidRemainingILS);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskILS.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
              console.log("Total Ask RemainILS updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of ILS Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedILSbalanceAsker:: " + updatedFreezedILSbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerILS");
              //var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(userBidAmountILS));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountILS " + userBidAmountILS);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.ILSbalance " + userAllDetailsInDBBidder.ILSbalance);

              var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBidder.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
              //var txFeesBidderILS = (parseFloat(updatedILSbalanceBidder) * parseFloat(txFeeWithdrawSuccessILS));
              // var txFeesBidderILS = new BigNumber(userBidAmountILS);
              // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
              //
              // console.log("txFeesBidderILS :: " + txFeesBidderILS);
              // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderILS = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedILSbalanceBidder ::: " + updatedILSbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidILS.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
          'like': LTCMARKETID
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
            BidILS.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsILS: allAskDetailsToExecute,
                      bidAmountILSSum: bidAmountILSSum[0].bidAmountILS,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
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
  getAllAskILS: function(req, res) {
    console.log("Enter into ask api getAllAskILS :: ");
    AskILS.find({
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
            AskILS.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksILS: allAskDetailsToExecute,
                      askAmountILSSum: askAmountILSSum[0].askAmountILS,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
          'like': LTCMARKETID
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
            BidILS.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsILS: allAskDetailsToExecute,
                      bidAmountILSSum: bidAmountILSSum[0].bidAmountILS,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
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
  getAsksILSSuccess: function(req, res) {
    console.log("Enter into ask api getAsksILSSuccess :: ");
    AskILS.find({
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
            AskILS.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksILS: allAskDetailsToExecute,
                      askAmountILSSum: askAmountILSSum[0].askAmountILS,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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