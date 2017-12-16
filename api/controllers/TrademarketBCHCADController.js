/**
 * TrademarketBCHCADController
 *CAD
 * @description :: Server-side logic for managing trademarketbchcads
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

  addAskCADMarket: async function(req, res) {
    console.log("Enter into ask api addAskCADMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountCAD = new BigNumber(req.body.askAmountCAD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountCAD || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountCAD < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userCADBalanceInDb = new BigNumber(userAsker.CADbalance);
    var userFreezedCADBalanceInDb = new BigNumber(userAsker.FreezedCADbalance);

    userCADBalanceInDb = parseFloat(userCADBalanceInDb);
    userFreezedCADBalanceInDb = parseFloat(userFreezedCADBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountCAD.greaterThanOrEqualTo(userCADBalanceInDb)) {
      return res.json({
        "message": "You have insufficient CAD Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountCAD :: " + userAskAmountCAD);
    console.log("userCADBalanceInDb :: " + userCADBalanceInDb);
    // if (userAskAmountCAD >= userCADBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient CAD Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountCAD = parseFloat(userAskAmountCAD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskCAD.create({
        askAmountBCH: userAskAmountBCH,
        askAmountCAD: userAskAmountCAD,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountCAD: userAskAmountCAD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerCAD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.CAD_ASK_ADDED, askDetails);
    // var updateUserCADBalance = (parseFloat(userCADBalanceInDb) - parseFloat(userAskAmountCAD));
    // var updateFreezedCADBalance = (parseFloat(userFreezedCADBalanceInDb) + parseFloat(userAskAmountCAD));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userCADBalanceInDb = new BigNumber(userCADBalanceInDb);
    var updateUserCADBalance = userCADBalanceInDb.minus(userAskAmountCAD);
    updateUserCADBalance = parseFloat(updateUserCADBalance);
    userFreezedCADBalanceInDb = new BigNumber(userFreezedCADBalanceInDb);
    var updateFreezedCADBalance = userFreezedCADBalanceInDb.plus(userAskAmountCAD);
    updateFreezedCADBalance = parseFloat(updateFreezedCADBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedCADbalance: updateFreezedCADBalance,
        CADbalance: updateUserCADBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidCAD.find({
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
        message: 'Failed to find CAD bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingCAD = new BigNumber(userAskAmountCAD);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of CAD
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountCAD;
      }
      if (total_bid <= totoalAskRemainingCAD) {
        console.log("Inside of total_bid <= totoalAskRemainingCAD");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingCAD");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingCAD :: " + totoalAskRemainingCAD);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingCAD = (parseFloat(totoalAskRemainingCAD) - parseFloat(currentBidDetails.bidAmountCAD));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingCAD = totoalAskRemainingCAD.minus(currentBidDetails.bidAmountCAD);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingCAD :: " + totoalAskRemainingCAD);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingCAD == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingCAD == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerCAD
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCAD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
            updatedCADbalanceBidder = updatedCADbalanceBidder.plus(currentBidDetails.bidAmountCAD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of CAD Update user " + updatedCADbalanceBidder);
            //var txFeesBidderCAD = (parseFloat(currentBidDetails.bidAmountCAD) * parseFloat(txFeeWithdrawSuccessCAD));
            // var txFeesBidderCAD = new BigNumber(currentBidDetails.bidAmountCAD);
            //
            // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD)
            // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
            // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


            //updatedCADbalanceBidder =  parseFloat(updatedCADbalanceBidder);

            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                CADbalance: updatedCADbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and CAD balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedCADbalanceAsker = parseFloat(totoalAskRemainingCAD);
            //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);

            //updatedFreezedCADbalanceAsker =  parseFloat(updatedFreezedCADbalanceAsker);
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
            console.log("After deduct TX Fees of CAD Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedCADbalance: updatedFreezedCADbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed CADBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidCAD:: ");
            try {
              var bidDestroy = await BidCAD.update({
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
            sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskCAD.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskCAD.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskCAD',
                statusCode: 401
              });
            }
            //emitting event of destruction of CAD_ask
            sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCAD == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCAD " + currentBidDetails.bidownerCAD);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerCAD
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
            updatedCADbalanceBidder = updatedCADbalanceBidder.plus(currentBidDetails.bidAmountCAD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of CAD 089089Update user " + updatedCADbalanceBidder);
            // var txFeesBidderCAD = (parseFloat(currentBidDetails.bidAmountCAD) * parseFloat(txFeeWithdrawSuccessCAD));
            // var txFeesBidderCAD = new BigNumber(currentBidDetails.bidAmountCAD);
            // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
            // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            // // updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
            // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedCADbalanceBidder:: " + updatedCADbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                CADbalance: updatedCADbalanceBidder
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
              var desctroyCurrentBid = await BidCAD.update({
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
            sails.sockets.blast(constants.CAD_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCAD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerCAD");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(totoalAskRemainingCAD));
            //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
            console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
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
            console.log("After deduct TX Fees of CAD Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedCADbalance: updatedFreezedCADbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskCAD.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountCAD: parseFloat(totoalAskRemainingCAD),
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
            sails.sockets.blast(constants.CAD_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingCAD :: " + totoalAskRemainingCAD);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingCAD = totoalAskRemainingCAD - allBidsFromdb[i].bidAmountCAD;
          if (totoalAskRemainingCAD >= currentBidDetails.bidAmountCAD) {
            //totoalAskRemainingCAD = (parseFloat(totoalAskRemainingCAD) - parseFloat(currentBidDetails.bidAmountCAD));
            totoalAskRemainingCAD = totoalAskRemainingCAD.minus(currentBidDetails.bidAmountCAD);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingCAD == 0::: " + totoalAskRemainingCAD);

            if (totoalAskRemainingCAD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingCAD == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCAD
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
                  id: askDetails.askownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerCAD :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));
              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(currentBidDetails.bidAmountCAD);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 CAD Update user " + updatedCADbalanceBidder);
              //var txFeesBidderCAD = (parseFloat(currentBidDetails.bidAmountCAD) * parseFloat(txFeeWithdrawSuccessCAD));

              // var txFeesBidderCAD = new BigNumber(currentBidDetails.bidAmountCAD);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);
              // console.log("After deduct TX Fees of CAD Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerCAD
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  CADbalance: updatedCADbalanceBidder
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
              //var updatedFreezedCADbalanceAsker = parseFloat(totoalAskRemainingCAD);
              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(totoalAskRemainingCAD));
              //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
              console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
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

              console.log("After deduct TX Fees of CAD Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerCAD
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedCADbalance: updatedFreezedCADbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidCAD.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidCAD.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidCAD.update({
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
              sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskCAD.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskCAD.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskCAD.update({
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
              sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingCAD == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerCAD " + currentBidDetails.bidownerCAD);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerCAD
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

              //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));
              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(currentBidDetails.bidAmountCAD);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var txFeesBidderCAD = (parseFloat(currentBidDetails.bidAmountCAD) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(currentBidDetails.bidAmountCAD);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);
              // console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedCADbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerCAD
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  CADbalance: updatedCADbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidCAD.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidCAD.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.CAD_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerCAD
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
            //var updatedBidAmountCAD = (parseFloat(currentBidDetails.bidAmountCAD) - parseFloat(totoalAskRemainingCAD));
            var updatedBidAmountCAD = new BigNumber(currentBidDetails.bidAmountCAD);
            updatedBidAmountCAD = updatedBidAmountCAD.minus(totoalAskRemainingCAD);

            try {
              var updatedaskDetails = await BidCAD.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountCAD: updatedBidAmountCAD,
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
            sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerCAD
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


            //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.CADbalance) + parseFloat(totoalAskRemainingCAD));

            var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.CADbalance);
            updatedCADbalanceBidder = updatedCADbalanceBidder.plus(totoalAskRemainingCAD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of CAD Update user " + updatedCADbalanceBidder);
            //var CADAmountSucess = parseFloat(totoalAskRemainingCAD);
            //var CADAmountSucess = new BigNumber(totoalAskRemainingCAD);
            //var txFeesBidderCAD = (parseFloat(CADAmountSucess) * parseFloat(txFeeWithdrawSuccessCAD));
            //var txFeesBidderCAD = (parseFloat(totoalAskRemainingCAD) * parseFloat(txFeeWithdrawSuccessCAD));



            // var txFeesBidderCAD = new BigNumber(totoalAskRemainingCAD);
            // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
            //
            // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
            // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedCADbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                CADbalance: updatedCADbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerCAD");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of CAD Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedCADbalance: updatedFreezedCADbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskCAD.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskCAD.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskCAD.update({
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
            //emitting event for CAD_ask destruction
            sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
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
  addBidCADMarket: async function(req, res) {
    console.log("Enter into ask api addBidCADMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountCAD = new BigNumber(req.body.bidAmountCAD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountCAD = parseFloat(userBidAmountCAD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountCAD || !userBidAmountBCH ||
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
      var bidDetails = await BidCAD.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountCAD: userBidAmountCAD,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountCAD: userBidAmountCAD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerCAD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.CAD_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskCAD.find({
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
        var totoalBidRemainingCAD = new BigNumber(userBidAmountCAD);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of CAD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountCAD;
        }
        if (total_ask <= totoalBidRemainingCAD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingCAD :: " + totoalBidRemainingCAD);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingCAD = totoalBidRemainingCAD - allAsksFromdb[i].bidAmountCAD;
            //totoalBidRemainingCAD = (parseFloat(totoalBidRemainingCAD) - parseFloat(currentAskDetails.askAmountCAD));
            totoalBidRemainingCAD = totoalBidRemainingCAD.minus(currentAskDetails.askAmountCAD);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingCAD == 0::: " + totoalBidRemainingCAD);
            if (totoalBidRemainingCAD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingCAD == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerCAD totoalBidRemainingCAD == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(currentAskDetails.askAmountCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(currentAskDetails.askAmountCAD);
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
              console.log("After deduct TX Fees of CAD Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedCADbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
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
                  id: bidDetails.bidownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and CAD  give to bidder
              //var updatedCADbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.CADbalance) + parseFloat(totoalBidRemainingCAD)) - parseFloat(totoalBidRemainingBCH);
              //var updatedCADbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.CADbalance) + parseFloat(userBidAmountCAD)) - parseFloat(totoalBidRemainingCAD));
              var updatedCADbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(totoalBidRemainingCAD);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainCAD updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var CADAmountSucess = (parseFloat(userBidAmountCAD) - parseFloat(totoalBidRemainingCAD));
              // var CADAmountSucess = new BigNumber(userBidAmountCAD);
              // CADAmountSucess = CADAmountSucess.minus(totoalBidRemainingCAD);
              //
              // //var txFeesBidderCAD = (parseFloat(CADAmountSucess) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(CADAmountSucess);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              //
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingCAD == 0updatedCADbalanceBidder ::: " + updatedCADbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingCAD asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingCAD == 0BidCAD.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidCAD.destroy({
              //   id: bidDetails.bidownerCAD
              // });
              try {
                var bidDestroy = await BidCAD.update({
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
              sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0AskCAD.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskCAD.destroy({
              //   id: currentAskDetails.askownerCAD
              // });
              try {
                var askDestroy = await AskCAD.update({
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
              sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0  enter into else of totoalBidRemainingCAD == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0start User.findOne currentAskDetails.bidownerCAD ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(currentAskDetails.askAmountCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(currentAskDetails.askAmountCAD);
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

              console.log("After deduct TX Fees of CAD Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskCAD.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskCAD.update({
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

              sails.sockets.blast(constants.CAD_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingCAD == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerCAD");
              //var updatedCADbalanceBidder = ((parseFloat(userAllDetailsInDBBid.CADbalance) + parseFloat(userBidAmountCAD)) - parseFloat(totoalBidRemainingCAD));
              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBid.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(totoalBidRemainingCAD);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainCAD updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var CADAmountSucess = (parseFloat(userBidAmountCAD) - parseFloat(totoalBidRemainingCAD));
              // var CADAmountSucess = new BigNumber(userBidAmountCAD);
              // CADAmountSucess = CADAmountSucess.minus(totoalBidRemainingCAD);
              //
              // //var txFeesBidderCAD = (parseFloat(CADAmountSucess) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(CADAmountSucess);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              //
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);
              // console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedCADbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountCAD totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidCAD.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountCAD: totoalBidRemainingCAD,
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
              sails.sockets.blast(constants.CAD_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingCAD :: " + totoalBidRemainingCAD);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingCAD = totoalBidRemainingCAD - allAsksFromdb[i].bidAmountCAD;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingCAD = totoalBidRemainingCAD.minus(currentAskDetails.askAmountCAD);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingCAD == 0::: " + totoalBidRemainingCAD);

              if (totoalBidRemainingCAD == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingCAD == 0Enter into totoalBidRemainingCAD == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCAD
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
                    id: bidDetails.bidownerCAD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingCAD == 0userAll bidDetails.askownerCAD :: ");
                console.log(" totoalBidRemainingCAD == 0Update value of Bidder and asker");
                //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(currentAskDetails.askAmountCAD));
                var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
                updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(currentAskDetails.askAmountCAD);

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

                console.log("After deduct TX Fees of CAD Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingCAD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingCAD == 0updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);
                console.log(" totoalBidRemainingCAD == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerCAD
                  }, {
                    FreezedCADbalance: updatedFreezedCADbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedCADbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(userBidAmountCAD)) - parseFloat(totoalBidRemainingCAD));

                var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
                updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);
                updatedCADbalanceBidder = updatedCADbalanceBidder.minus(totoalBidRemainingCAD);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalBidRemainingBCH);
                console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
                //var CADAmountSucess = (parseFloat(userBidAmountCAD) - parseFloat(totoalBidRemainingCAD));
                // var CADAmountSucess = new BigNumber(userBidAmountCAD);
                // CADAmountSucess = CADAmountSucess.minus(totoalBidRemainingCAD);
                //
                //
                // //var txFeesBidderCAD = (parseFloat(CADAmountSucess) * parseFloat(txFeeWithdrawSuccessCAD));
                // var txFeesBidderCAD = new BigNumber(CADAmountSucess);
                // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
                // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
                // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
                // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
                //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
                updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);



                console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 updatedFreezedCADbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedCADbalanceBidder " + updatedCADbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerCAD
                  }, {
                    CADbalance: updatedCADbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 BidCAD.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskCAD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskCAD.update({
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
                sails.sockets.blast(constants.CAD_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 AskCAD.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidCAD.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidCAD.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 enter into else of totoalBidRemainingCAD == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0totoalBidRemainingCAD == 0 start User.findOne currentAskDetails.bidownerCAD " + currentAskDetails.bidownerCAD);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerCAD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(currentAskDetails.askAmountCAD));

                var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
                updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(currentAskDetails.askAmountCAD);

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
                console.log("After deduct TX Fees of CAD Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 updatedFreezedCADbalanceAsker:: " + updatedFreezedCADbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerCAD
                  }, {
                    FreezedCADbalance: updatedFreezedCADbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskCAD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskCAD.update({
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
                sails.sockets.blast(constants.CAD_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountCAD = (parseFloat(currentAskDetails.askAmountCAD) - parseFloat(totoalBidRemainingCAD));

              var updatedAskAmountCAD = new BigNumber(currentAskDetails.askAmountCAD);
              updatedAskAmountCAD = updatedAskAmountCAD.minus(totoalBidRemainingCAD);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskCAD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountCAD: updatedAskAmountCAD,
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
              sails.sockets.blast(constants.CAD_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(totoalBidRemainingCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(totoalBidRemainingCAD);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
              console.log("Total Ask RemainCAD updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of CAD Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedCADbalanceAsker:: " + updatedFreezedCADbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
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
                  id: bidDetails.bidownerCAD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerCAD");
              //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(userBidAmountCAD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountCAD " + userBidAmountCAD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.CADbalance " + userAllDetailsInDBBidder.CADbalance);

              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var txFeesBidderCAD = (parseFloat(updatedCADbalanceBidder) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(userBidAmountCAD);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              //
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderCAD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedCADbalanceBidder ::: " + updatedCADbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidCAD.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidCAD.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidCAD.update({
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
              sails.sockets.blast(constants.CAD_BID_DESTROYED, bidDestroy);
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
  removeBidCADMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdCAD;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidCAD.findOne({
      bidownerCAD: bidownerId,
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
            BidCAD.update({
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
              sails.sockets.blast(constants.CAD_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskCADMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdCAD;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskCAD.findOne({
      askownerCAD: askownerId,
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
        var userCADBalanceInDb = parseFloat(user.CADbalance);
        var askAmountOfCADInAskTableDB = parseFloat(askDetails.askAmountCAD);
        var userFreezedCADbalanceInDB = parseFloat(user.FreezedCADbalance);
        console.log("userCADBalanceInDb :" + userCADBalanceInDb);
        console.log("askAmountOfCADInAskTableDB :" + askAmountOfCADInAskTableDB);
        console.log("userFreezedCADbalanceInDB :" + userFreezedCADbalanceInDB);
        var updateFreezedCADBalance = (parseFloat(userFreezedCADbalanceInDB) - parseFloat(askAmountOfCADInAskTableDB));
        var updateUserCADBalance = (parseFloat(userCADBalanceInDb) + parseFloat(askAmountOfCADInAskTableDB));
        User.update({
            id: askownerId
          }, {
            CADbalance: parseFloat(updateUserCADBalance),
            FreezedCADbalance: parseFloat(updateFreezedCADBalance)
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
            AskCAD.update({
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
              sails.sockets.blast(constants.CAD_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidCAD: function(req, res) {
    console.log("Enter into ask api getAllBidCAD :: ");
    BidCAD.find({
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
            BidCAD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountCAD')
              .exec(function(err, bidAmountCADSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCADSum",
                    statusCode: 401
                  });
                }
                BidCAD.find({
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
                        "message": "Error to sum Of bidAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCAD: allAskDetailsToExecute,
                      bidAmountCADSum: bidAmountCADSum[0].bidAmountCAD,
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
  getAllAskCAD: function(req, res) {
    console.log("Enter into ask api getAllAskCAD :: ");
    AskCAD.find({
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
            AskCAD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountCAD')
              .exec(function(err, askAmountCADSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCADSum",
                    statusCode: 401
                  });
                }
                AskCAD.find({
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
                        "message": "Error to sum Of askAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCAD: allAskDetailsToExecute,
                      askAmountCADSum: askAmountCADSum[0].askAmountCAD,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCAD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsCADSuccess: function(req, res) {
    console.log("Enter into ask api getBidsCADSuccess :: ");
    BidCAD.find({
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
            BidCAD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountCAD')
              .exec(function(err, bidAmountCADSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountCADSum",
                    statusCode: 401
                  });
                }
                BidCAD.find({
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
                        "message": "Error to sum Of bidAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCAD: allAskDetailsToExecute,
                      bidAmountCADSum: bidAmountCADSum[0].bidAmountCAD,
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
  getAsksCADSuccess: function(req, res) {
    console.log("Enter into ask api getAsksCADSuccess :: ");
    AskCAD.find({
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
            AskCAD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountCAD')
              .exec(function(err, askAmountCADSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountCADSum",
                    statusCode: 401
                  });
                }
                AskCAD.find({
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
                        "message": "Error to sum Of askAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCAD: allAskDetailsToExecute,
                      askAmountCADSum: askAmountCADSum[0].askAmountCAD,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskCAD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};