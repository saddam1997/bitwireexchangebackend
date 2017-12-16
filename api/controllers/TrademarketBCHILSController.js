/**
 * TrademarketBCHILSController
 *ILS
 * @description :: Server-side logic for managing trademarketbchils
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

  addAskILSMarket: async function(req, res) {
    console.log("Enter into ask api addAskILSMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountILS = new BigNumber(req.body.askAmountILS);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountILS || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountILS < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountILS = parseFloat(userAskAmountILS);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskILS.create({
        askAmountBCH: userAskAmountBCH,
        askAmountILS: userAskAmountILS,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountILS: userAskAmountILS,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
          'like': BCHMARKETID
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
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingILS = (parseFloat(totoalAskRemainingILS) - parseFloat(currentBidDetails.bidAmountILS));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingILS = totoalAskRemainingILS.minus(currentBidDetails.bidAmountILS);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingILS :: " + totoalAskRemainingILS);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(currentBidDetails.bidAmountILS));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


            //updatedILSbalanceBidder =  parseFloat(updatedILSbalanceBidder);

            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedILSbalanceAsker = parseFloat(totoalAskRemainingILS);
            //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);

            //updatedFreezedILSbalanceAsker =  parseFloat(updatedFreezedILSbalanceAsker);
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
            console.log("After deduct TX Fees of ILS Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedILSbalance: updatedFreezedILSbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed ILSBalance',
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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(currentBidDetails.bidAmountILS));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedILSbalanceBidder:: " + updatedILSbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerILS");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(totoalAskRemainingILS));
            //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
            console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
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
            console.log("After deduct TX Fees of ILS Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedILSbalance: updatedFreezedILSbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountILS totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskILS.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingILS = totoalAskRemainingILS - allBidsFromdb[i].bidAmountILS;
          if (totoalAskRemainingILS >= currentBidDetails.bidAmountILS) {
            //totoalAskRemainingILS = (parseFloat(totoalAskRemainingILS) - parseFloat(currentBidDetails.bidAmountILS));
            totoalAskRemainingILS = totoalAskRemainingILS.minus(currentBidDetails.bidAmountILS);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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
              // console.log("After deduct TX Fees of ILS Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerILS
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  ILSbalance: updatedILSbalanceBidder
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
              //var updatedFreezedILSbalanceAsker = parseFloat(totoalAskRemainingILS);
              //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(totoalAskRemainingILS));
              //var updatedFreezedILSbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS)) + parseFloat(totoalAskRemainingILS));
              var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);
              updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.plus(totoalAskRemainingILS);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
              console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
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

              console.log("After deduct TX Fees of ILS Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerILS
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);

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

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedILSbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingILS " + totoalAskRemainingILS);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerILS
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBidAmountBCH = (parseFloat(currentBidDetails.bidAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var updatedBidAmountBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            updatedBidAmountBCH = updatedBidAmountBCH.minus(totoalAskRemainingBCH);
            //var updatedBidAmountILS = (parseFloat(currentBidDetails.bidAmountILS) - parseFloat(totoalAskRemainingILS));
            var updatedBidAmountILS = new BigNumber(currentBidDetails.bidAmountILS);
            updatedBidAmountILS = updatedBidAmountILS.minus(totoalAskRemainingILS);

            try {
              var updatedaskDetails = await BidILS.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
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
            //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBCHbalance) - parseFloat(totoalAskRemainingBCH));
            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(totoalAskRemainingBCH);


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
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

            console.log("txFeesBidderILS :: " + txFeesBidderILS);
            console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedILSbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedILSbalanceBidder " + updatedILSbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerILS
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerILS");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedILSbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedILSbalance) - parseFloat(userAskAmountILS));
            var updatedFreezedILSbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedILSbalance);
            updatedFreezedILSbalanceAsker = updatedFreezedILSbalanceAsker.minus(userAskAmountILS);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of ILS Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedILSbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingILS " + totoalAskRemainingILS);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerILS
              }, {
                BCHbalance: updatedBCHbalanceAsker,
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
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountILS = new BigNumber(req.body.bidAmountILS);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountILS = parseFloat(userBidAmountILS);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountILS || !userBidAmountBCH ||
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
      var bidDetails = await BidILS.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountILS: userBidAmountILS,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountILS: userBidAmountILS,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
      var allAsksFromdb = await AskILS.find({
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
        var totoalBidRemainingILS = new BigNumber(userBidAmountILS);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of ILS
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountILS;
        }
        if (total_ask <= totoalBidRemainingILS) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingILS :: " + totoalBidRemainingILS);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingILS = totoalBidRemainingILS - allAsksFromdb[i].bidAmountILS;
            //totoalBidRemainingILS = (parseFloat(totoalBidRemainingILS) - parseFloat(currentAskDetails.askAmountILS));
            totoalBidRemainingILS = totoalBidRemainingILS.minus(currentAskDetails.askAmountILS);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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
              console.log("After deduct TX Fees of ILS Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedILSbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
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
              //Bid FreezedBCHbalance of bidder deduct and ILS  give to bidder
              //var updatedILSbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.ILSbalance) + parseFloat(totoalBidRemainingILS)) - parseFloat(totoalBidRemainingBCH);
              //var updatedILSbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.ILSbalance) + parseFloat(userBidAmountILS)) - parseFloat(totoalBidRemainingILS));
              var updatedILSbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(totoalBidRemainingILS);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainILS updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingILS == 0updatedILSbalanceBidder ::: " + updatedILSbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingILS asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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

              console.log("After deduct TX Fees of ILS Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingILS == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerILS");
              //var updatedILSbalanceBidder = ((parseFloat(userAllDetailsInDBBid.ILSbalance) + parseFloat(userBidAmountILS)) - parseFloat(totoalBidRemainingILS));
              var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBid.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(totoalBidRemainingILS);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainILS updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedILSbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountILS totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidILS.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingILS = totoalBidRemainingILS - allAsksFromdb[i].bidAmountILS;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingILS = totoalBidRemainingILS.minus(currentAskDetails.askAmountILS);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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

                console.log("After deduct TX Fees of ILS Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingILS == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingILS == 0updatedFreezedILSbalanceAsker ::: " + updatedFreezedILSbalanceAsker);
                console.log(" totoalBidRemainingILS == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerILS
                  }, {
                    FreezedILSbalance: updatedFreezedILSbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainILS totoalAskRemainingILS " + totoalBidRemainingBCH);
                console.log("Total Ask RemainILS BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainILS updatedFreezedILSbalanceAsker " + updatedFreezedBCHbalanceBidder);
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

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderILS :: " + txFeesBidderILS);
                //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
                updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);



                console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingILS == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingILS == 0 updatedFreezedILSbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedILSbalanceBidder " + updatedILSbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerILS
                  }, {
                    ILSbalance: updatedILSbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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
                console.log("After deduct TX Fees of ILS Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0 updatedFreezedILSbalanceAsker:: " + updatedFreezedILSbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingILS == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingILS " + totoalBidRemainingILS);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerILS
                  }, {
                    FreezedILSbalance: updatedFreezedILSbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountILS = (parseFloat(currentAskDetails.askAmountILS) - parseFloat(totoalBidRemainingILS));

              var updatedAskAmountILS = new BigNumber(currentAskDetails.askAmountILS);
              updatedAskAmountILS = updatedAskAmountILS.minus(totoalBidRemainingILS);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskILS.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
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

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainILS totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainILS userAllDetailsInDBAsker.FreezedILSbalance " + userAllDetailsInDBAsker.FreezedILSbalance);
              console.log("Total Ask RemainILS updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of ILS Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedILSbalanceAsker:: " + updatedFreezedILSbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedILSbalanceAsker " + updatedFreezedILSbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerILS
                }, {
                  FreezedILSbalance: updatedFreezedILSbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerILS");
              //var updatedILSbalanceBidder = (parseFloat(userAllDetailsInDBBidder.ILSbalance) + parseFloat(userBidAmountILS));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountILS " + userBidAmountILS);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.ILSbalance " + userAllDetailsInDBBidder.ILSbalance);

              var updatedILSbalanceBidder = new BigNumber(userAllDetailsInDBBidder.ILSbalance);
              updatedILSbalanceBidder = updatedILSbalanceBidder.plus(userBidAmountILS);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);
              //var txFeesBidderILS = (parseFloat(updatedILSbalanceBidder) * parseFloat(txFeeWithdrawSuccessILS));
              // var txFeesBidderILS = new BigNumber(userBidAmountILS);
              // txFeesBidderILS = txFeesBidderILS.times(txFeeWithdrawSuccessILS);
              //
              // console.log("txFeesBidderILS :: " + txFeesBidderILS);
              // //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              // updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderILS = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderILS :: " + txFeesBidderILS);
              //updatedILSbalanceBidder = (parseFloat(updatedILSbalanceBidder) - parseFloat(txFeesBidderILS));
              updatedILSbalanceBidder = updatedILSbalanceBidder.minus(txFeesBidderILS);

              console.log("After deduct TX Fees of ILS Update user " + updatedILSbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedILSbalanceBidder ::: " + updatedILSbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedILSbalanceBidder " + updatedILSbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingILS " + totoalBidRemainingILS);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerILS
                }, {
                  ILSbalance: updatedILSbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidILS.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user BCH balance");
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
            BidILS.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsILS: allAskDetailsToExecute,
                      bidAmountILSSum: bidAmountILSSum[0].bidAmountILS,
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
  getAllAskILS: function(req, res) {
    console.log("Enter into ask api getAllAskILS :: ");
    AskILS.find({
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
            AskILS.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksILS: allAskDetailsToExecute,
                      askAmountILSSum: askAmountILSSum[0].askAmountILS,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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
            BidILS.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsILS: allAskDetailsToExecute,
                      bidAmountILSSum: bidAmountILSSum[0].bidAmountILS,
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
  getAsksILSSuccess: function(req, res) {
    console.log("Enter into ask api getAsksILSSuccess :: ");
    AskILS.find({
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
            AskILS.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountILSSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksILS: allAskDetailsToExecute,
                      askAmountILSSum: askAmountILSSum[0].askAmountILS,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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