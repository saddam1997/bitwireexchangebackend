/**
 * TrademarketBTCCADController
 *
 * @description :: Server-side logic for managing trademarketbtccads
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


  addAskCADMarket: async function(req, res) {
    console.log("Enter into ask api addAskCADMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountCAD = new BigNumber(req.body.askAmountCAD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountCAD || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountCAD < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountCAD = parseFloat(userAskAmountCAD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskCAD.create({
        askAmountBTC: userAskAmountBTC,
        askAmountCAD: userAskAmountCAD,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountCAD: userAskAmountCAD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
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
          'like': BTCMARKETID
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
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingCAD = (parseFloat(totoalAskRemainingCAD) - parseFloat(currentBidDetails.bidAmountCAD));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingCAD = totoalAskRemainingCAD.minus(currentBidDetails.bidAmountCAD);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingCAD :: " + totoalAskRemainingCAD);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
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

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


            //updatedCADbalanceBidder =  parseFloat(updatedCADbalanceBidder);

            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedCADbalanceAsker = parseFloat(totoalAskRemainingCAD);
            //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);

            //updatedFreezedCADbalanceAsker =  parseFloat(updatedFreezedCADbalanceAsker);
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
            console.log("After deduct TX Fees of CAD Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedCADbalance: updatedFreezedCADbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed CADBalance',
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
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(currentBidDetails.bidAmountCAD));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
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

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCADbalanceBidder:: " + updatedCADbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerCAD");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(totoalAskRemainingCAD));
            //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
            console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
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
            console.log("After deduct TX Fees of CAD Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedCADbalance: updatedFreezedCADbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskCAD.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingCAD = totoalAskRemainingCAD - allBidsFromdb[i].bidAmountCAD;
          if (totoalAskRemainingCAD >= currentBidDetails.bidAmountCAD) {
            //totoalAskRemainingCAD = (parseFloat(totoalAskRemainingCAD) - parseFloat(currentBidDetails.bidAmountCAD));
            totoalAskRemainingCAD = totoalAskRemainingCAD.minus(currentBidDetails.bidAmountCAD);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
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
              // console.log("After deduct TX Fees of CAD Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerCAD
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  CADbalance: updatedCADbalanceBidder
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
              //var updatedFreezedCADbalanceAsker = parseFloat(totoalAskRemainingCAD);
              //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(totoalAskRemainingCAD));
              //var updatedFreezedCADbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD)) + parseFloat(totoalAskRemainingCAD));
              var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);
              updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.plus(totoalAskRemainingCAD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
              console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
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

              console.log("After deduct TX Fees of CAD Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerCAD
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
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
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);

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

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedCADbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingCAD " + totoalAskRemainingCAD);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerCAD
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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
            //var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var updatedBidAmountBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            updatedBidAmountBTC = updatedBidAmountBTC.minus(totoalAskRemainingBTC);
            //var updatedBidAmountCAD = (parseFloat(currentBidDetails.bidAmountCAD) - parseFloat(totoalAskRemainingCAD));
            var updatedBidAmountCAD = new BigNumber(currentBidDetails.bidAmountCAD);
            updatedBidAmountCAD = updatedBidAmountCAD.minus(totoalAskRemainingCAD);

            try {
              var updatedaskDetails = await BidCAD.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
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
            //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance) - parseFloat(totoalAskRemainingBTC));
            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(totoalAskRemainingBTC);


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
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

            console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
            console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedCADbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedCADbalanceBidder " + updatedCADbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerCAD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerCAD");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedCADbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedCADbalance) - parseFloat(userAskAmountCAD));
            var updatedFreezedCADbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedCADbalance);
            updatedFreezedCADbalanceAsker = updatedFreezedCADbalanceAsker.minus(userAskAmountCAD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of CAD Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedCADbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingCAD " + totoalAskRemainingCAD);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerCAD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
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
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountCAD = new BigNumber(req.body.bidAmountCAD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountCAD = parseFloat(userBidAmountCAD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountCAD || !userBidAmountBTC ||
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
      var bidDetails = await BidCAD.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountCAD: userBidAmountCAD,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountCAD: userBidAmountCAD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
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
      var allAsksFromdb = await AskCAD.find({
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
        var totoalBidRemainingCAD = new BigNumber(userBidAmountCAD);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of CAD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountCAD;
        }
        if (total_ask <= totoalBidRemainingCAD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingCAD :: " + totoalBidRemainingCAD);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingCAD = totoalBidRemainingCAD - allAsksFromdb[i].bidAmountCAD;
            //totoalBidRemainingCAD = (parseFloat(totoalBidRemainingCAD) - parseFloat(currentAskDetails.askAmountCAD));
            totoalBidRemainingCAD = totoalBidRemainingCAD.minus(currentAskDetails.askAmountCAD);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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
              console.log("After deduct TX Fees of CAD Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedCADbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
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
              //Bid FreezedBTCbalance of bidder deduct and CAD  give to bidder
              //var updatedCADbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.CADbalance) + parseFloat(totoalBidRemainingCAD)) - parseFloat(totoalBidRemainingBTC);
              //var updatedCADbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.CADbalance) + parseFloat(userBidAmountCAD)) - parseFloat(totoalBidRemainingCAD));
              var updatedCADbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(totoalBidRemainingCAD);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainCAD updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
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

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingCAD == 0updatedCADbalanceBidder ::: " + updatedCADbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingCAD asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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

              console.log("After deduct TX Fees of CAD Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingCAD == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerCAD");
              //var updatedCADbalanceBidder = ((parseFloat(userAllDetailsInDBBid.CADbalance) + parseFloat(userBidAmountCAD)) - parseFloat(totoalBidRemainingCAD));
              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBid.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(totoalBidRemainingCAD);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainCAD updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
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



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedCADbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountCAD totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidCAD.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingCAD = totoalBidRemainingCAD - allAsksFromdb[i].bidAmountCAD;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingCAD = totoalBidRemainingCAD.minus(currentAskDetails.askAmountCAD);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
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

                console.log("After deduct TX Fees of CAD Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingCAD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingCAD == 0updatedFreezedCADbalanceAsker ::: " + updatedFreezedCADbalanceAsker);
                console.log(" totoalBidRemainingCAD == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerCAD
                  }, {
                    FreezedCADbalance: updatedFreezedCADbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainCAD totoalAskRemainingCAD " + totoalBidRemainingBTC);
                console.log("Total Ask RemainCAD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainCAD updatedFreezedCADbalanceAsker " + updatedFreezedBTCbalanceBidder);
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

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
                //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
                updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);



                console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingCAD == 0 updatedFreezedCADbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedCADbalanceBidder " + updatedCADbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerCAD
                  }, {
                    CADbalance: updatedCADbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
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
                console.log("After deduct TX Fees of CAD Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 updatedFreezedCADbalanceAsker:: " + updatedFreezedCADbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingCAD == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingCAD " + totoalBidRemainingCAD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerCAD
                  }, {
                    FreezedCADbalance: updatedFreezedCADbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountCAD = (parseFloat(currentAskDetails.askAmountCAD) - parseFloat(totoalBidRemainingCAD));

              var updatedAskAmountCAD = new BigNumber(currentAskDetails.askAmountCAD);
              updatedAskAmountCAD = updatedAskAmountCAD.minus(totoalBidRemainingCAD);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskCAD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
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

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainCAD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainCAD userAllDetailsInDBAsker.FreezedCADbalance " + userAllDetailsInDBAsker.FreezedCADbalance);
              console.log("Total Ask RemainCAD updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of CAD Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedCADbalanceAsker:: " + updatedFreezedCADbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedCADbalanceAsker " + updatedFreezedCADbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerCAD
                }, {
                  FreezedCADbalance: updatedFreezedCADbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerCAD");
              //var updatedCADbalanceBidder = (parseFloat(userAllDetailsInDBBidder.CADbalance) + parseFloat(userBidAmountCAD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountCAD " + userBidAmountCAD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.CADbalance " + userAllDetailsInDBBidder.CADbalance);

              var updatedCADbalanceBidder = new BigNumber(userAllDetailsInDBBidder.CADbalance);
              updatedCADbalanceBidder = updatedCADbalanceBidder.plus(userBidAmountCAD);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);
              //var txFeesBidderCAD = (parseFloat(updatedCADbalanceBidder) * parseFloat(txFeeWithdrawSuccessCAD));
              // var txFeesBidderCAD = new BigNumber(userBidAmountCAD);
              // txFeesBidderCAD = txFeesBidderCAD.times(txFeeWithdrawSuccessCAD);
              //
              // console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              // //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              // updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);

              var txFeesBidderCAD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderCAD :: " + txFeesBidderCAD);
              //updatedCADbalanceBidder = (parseFloat(updatedCADbalanceBidder) - parseFloat(txFeesBidderCAD));
              updatedCADbalanceBidder = updatedCADbalanceBidder.minus(txFeesBidderCAD);

              console.log("After deduct TX Fees of CAD Update user " + updatedCADbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedCADbalanceBidder ::: " + updatedCADbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedCADbalanceBidder " + updatedCADbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingCAD " + totoalBidRemainingCAD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerCAD
                }, {
                  CADbalance: updatedCADbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidCAD.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user BTC balance");
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
            BidCAD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCAD: allAskDetailsToExecute,
                      bidAmountCADSum: bidAmountCADSum[0].bidAmountCAD,
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
  getAllAskCAD: function(req, res) {
    console.log("Enter into ask api getAllAskCAD :: ");
    AskCAD.find({
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
            AskCAD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCAD: allAskDetailsToExecute,
                      askAmountCADSum: askAmountCADSum[0].askAmountCAD,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
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
            BidCAD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsCAD: allAskDetailsToExecute,
                      bidAmountCADSum: bidAmountCADSum[0].bidAmountCAD,
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
  getAsksCADSuccess: function(req, res) {
    console.log("Enter into ask api getAsksCADSuccess :: ");
    AskCAD.find({
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
            AskCAD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
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
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountCADSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksCAD: allAskDetailsToExecute,
                      askAmountCADSum: askAmountCADSum[0].askAmountCAD,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
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