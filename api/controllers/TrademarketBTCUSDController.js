/**
 * TrademarketBTCUSDController
 *
 * @description :: Server-side logic for managing trademarketbtcusds
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

  addAskUSDMarket: async function(req, res) {
    console.log("Enter into ask api addAskUSDMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountUSD = new BigNumber(req.body.askAmountUSD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountUSD || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountUSD < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userUSDBalanceInDb = new BigNumber(userAsker.USDbalance);
    var userFreezedUSDBalanceInDb = new BigNumber(userAsker.FreezedUSDbalance);

    userUSDBalanceInDb = parseFloat(userUSDBalanceInDb);
    userFreezedUSDBalanceInDb = parseFloat(userFreezedUSDBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountUSD.greaterThanOrEqualTo(userUSDBalanceInDb)) {
      return res.json({
        "message": "You have insufficient USD Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountUSD :: " + userAskAmountUSD);
    console.log("userUSDBalanceInDb :: " + userUSDBalanceInDb);
    // if (userAskAmountUSD >= userUSDBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient USD Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountUSD = parseFloat(userAskAmountUSD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskUSD.create({
        askAmountBTC: userAskAmountBTC,
        askAmountUSD: userAskAmountUSD,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountUSD: userAskAmountUSD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerUSD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.USD_ASK_ADDED, askDetails);
    // var updateUserUSDBalance = (parseFloat(userUSDBalanceInDb) - parseFloat(userAskAmountUSD));
    // var updateFreezedUSDBalance = (parseFloat(userFreezedUSDBalanceInDb) + parseFloat(userAskAmountUSD));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userUSDBalanceInDb = new BigNumber(userUSDBalanceInDb);
    var updateUserUSDBalance = userUSDBalanceInDb.minus(userAskAmountUSD);
    updateUserUSDBalance = parseFloat(updateUserUSDBalance);
    userFreezedUSDBalanceInDb = new BigNumber(userFreezedUSDBalanceInDb);
    var updateFreezedUSDBalance = userFreezedUSDBalanceInDb.plus(userAskAmountUSD);
    updateFreezedUSDBalance = parseFloat(updateFreezedUSDBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedUSDbalance: updateFreezedUSDBalance,
        USDbalance: updateUserUSDBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidUSD.find({
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
        message: 'Failed to find USD bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingUSD = new BigNumber(userAskAmountUSD);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of USD
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountUSD;
      }
      if (total_bid <= totoalAskRemainingUSD) {
        console.log("Inside of total_bid <= totoalAskRemainingUSD");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingUSD");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingUSD :: " + totoalAskRemainingUSD);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingUSD = (parseFloat(totoalAskRemainingUSD) - parseFloat(currentBidDetails.bidAmountUSD));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingUSD = totoalAskRemainingUSD.minus(currentBidDetails.bidAmountUSD);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingUSD :: " + totoalAskRemainingUSD);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingUSD == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingUSD == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerUSD
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerUSD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(currentBidDetails.bidAmountUSD));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.USDbalance);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(currentBidDetails.bidAmountUSD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of USD Update user " + updatedUSDbalanceBidder);
            //var txFeesBidderUSD = (parseFloat(currentBidDetails.bidAmountUSD) * parseFloat(txFeeWithdrawSuccessUSD));
            // var txFeesBidderUSD = new BigNumber(currentBidDetails.bidAmountUSD);
            //
            // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD)
            // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
            // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


            //updatedUSDbalanceBidder =  parseFloat(updatedUSDbalanceBidder);

            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                USDbalance: updatedUSDbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and USD balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedUSDbalanceAsker = parseFloat(totoalAskRemainingUSD);
            //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);

            //updatedFreezedUSDbalanceAsker =  parseFloat(updatedFreezedUSDbalanceAsker);
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
            console.log("After deduct TX Fees of USD Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedUSDbalance: updatedFreezedUSDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed USDBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidUSD:: ");
            try {
              var bidDestroy = await BidUSD.update({
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
            sails.sockets.blast(constants.USD_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskUSD.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskUSD.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskUSD',
                statusCode: 401
              });
            }
            //emitting event of destruction of USD_ask
            sails.sockets.blast(constants.USD_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingUSD == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerUSD " + currentBidDetails.bidownerUSD);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerUSD
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(currentBidDetails.bidAmountUSD));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.USDbalance);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(currentBidDetails.bidAmountUSD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of USD 089089Update user " + updatedUSDbalanceBidder);
            // var txFeesBidderUSD = (parseFloat(currentBidDetails.bidAmountUSD) * parseFloat(txFeeWithdrawSuccessUSD));
            // var txFeesBidderUSD = new BigNumber(currentBidDetails.bidAmountUSD);
            // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
            // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            // // updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
            // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedUSDbalanceBidder:: " + updatedUSDbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                USDbalance: updatedUSDbalanceBidder
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
              var desctroyCurrentBid = await BidUSD.update({
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
            sails.sockets.blast(constants.USD_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerUSD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerUSD");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(totoalAskRemainingUSD));
            //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
            console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
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
            console.log("After deduct TX Fees of USD Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedUSDbalance: updatedFreezedUSDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskUSD.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountUSD: parseFloat(totoalAskRemainingUSD),
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
            sails.sockets.blast(constants.USD_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingUSD :: " + totoalAskRemainingUSD);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingUSD = totoalAskRemainingUSD - allBidsFromdb[i].bidAmountUSD;
          if (totoalAskRemainingUSD >= currentBidDetails.bidAmountUSD) {
            //totoalAskRemainingUSD = (parseFloat(totoalAskRemainingUSD) - parseFloat(currentBidDetails.bidAmountUSD));
            totoalAskRemainingUSD = totoalAskRemainingUSD.minus(currentBidDetails.bidAmountUSD);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingUSD == 0::: " + totoalAskRemainingUSD);

            if (totoalAskRemainingUSD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingUSD == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerUSD
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
                  id: askDetails.askownerUSD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerUSD :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(currentBidDetails.bidAmountUSD));
              var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(currentBidDetails.bidAmountUSD);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 USD Update user " + updatedUSDbalanceBidder);
              //var txFeesBidderUSD = (parseFloat(currentBidDetails.bidAmountUSD) * parseFloat(txFeeWithdrawSuccessUSD));

              // var txFeesBidderUSD = new BigNumber(currentBidDetails.bidAmountUSD);
              // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
              // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);
              // console.log("After deduct TX Fees of USD Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerUSD
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  USDbalance: updatedUSDbalanceBidder
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
              //var updatedFreezedUSDbalanceAsker = parseFloat(totoalAskRemainingUSD);
              //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(totoalAskRemainingUSD));
              //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
              var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
              console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
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

              console.log("After deduct TX Fees of USD Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerUSD
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidUSD.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidUSD.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidUSD.update({
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
              sails.sockets.blast(constants.USD_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskUSD.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskUSD.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskUSD.update({
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
              sails.sockets.blast(constants.USD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingUSD == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerUSD " + currentBidDetails.bidownerUSD);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerUSD
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

              //var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(currentBidDetails.bidAmountUSD));
              var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(currentBidDetails.bidAmountUSD);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of USD Update user " + updatedUSDbalanceBidder);
              //var txFeesBidderUSD = (parseFloat(currentBidDetails.bidAmountUSD) * parseFloat(txFeeWithdrawSuccessUSD));
              // var txFeesBidderUSD = new BigNumber(currentBidDetails.bidAmountUSD);
              // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
              // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);
              // console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedUSDbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerUSD
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  USDbalance: updatedUSDbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidUSD.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidUSD.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.USD_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerUSD
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
            //var updatedBidAmountUSD = (parseFloat(currentBidDetails.bidAmountUSD) - parseFloat(totoalAskRemainingUSD));
            var updatedBidAmountUSD = new BigNumber(currentBidDetails.bidAmountUSD);
            updatedBidAmountUSD = updatedBidAmountUSD.minus(totoalAskRemainingUSD);

            try {
              var updatedaskDetails = await BidUSD.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountUSD: updatedBidAmountUSD,
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
            sails.sockets.blast(constants.USD_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerUSD
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


            //var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.USDbalance) + parseFloat(totoalAskRemainingUSD));

            var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.USDbalance);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(totoalAskRemainingUSD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of USD Update user " + updatedUSDbalanceBidder);
            //var USDAmountSucess = parseFloat(totoalAskRemainingUSD);
            //var USDAmountSucess = new BigNumber(totoalAskRemainingUSD);
            //var txFeesBidderUSD = (parseFloat(USDAmountSucess) * parseFloat(txFeeWithdrawSuccessUSD));
            //var txFeesBidderUSD = (parseFloat(totoalAskRemainingUSD) * parseFloat(txFeeWithdrawSuccessUSD));



            // var txFeesBidderUSD = new BigNumber(totoalAskRemainingUSD);
            // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
            //
            // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
            // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedUSDbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                USDbalance: updatedUSDbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerUSD");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of USD Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedUSDbalance: updatedFreezedUSDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskUSD.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskUSD.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskUSD.update({
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
            //emitting event for USD_ask destruction
            sails.sockets.blast(constants.USD_ASK_DESTROYED, askDestroy);
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
  addBidUSDMarket: async function(req, res) {
    console.log("Enter into ask api addBidUSDMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountUSD = new BigNumber(req.body.bidAmountUSD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountUSD = parseFloat(userBidAmountUSD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountUSD || !userBidAmountBTC ||
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
      var bidDetails = await BidUSD.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountUSD: userBidAmountUSD,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountUSD: userBidAmountUSD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerUSD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.USD_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskUSD.find({
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
        var totoalBidRemainingUSD = new BigNumber(userBidAmountUSD);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of USD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountUSD;
        }
        if (total_ask <= totoalBidRemainingUSD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingUSD :: " + totoalBidRemainingUSD);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingUSD = totoalBidRemainingUSD - allAsksFromdb[i].bidAmountUSD;
            //totoalBidRemainingUSD = (parseFloat(totoalBidRemainingUSD) - parseFloat(currentAskDetails.askAmountUSD));
            totoalBidRemainingUSD = totoalBidRemainingUSD.minus(currentAskDetails.askAmountUSD);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingUSD == 0::: " + totoalBidRemainingUSD);
            if (totoalBidRemainingUSD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingUSD == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerUSD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerUSD totoalBidRemainingUSD == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(currentAskDetails.askAmountUSD));
              var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(currentAskDetails.askAmountUSD);
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
              console.log("After deduct TX Fees of USD Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedUSDbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
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
                  id: bidDetails.bidownerUSD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and USD  give to bidder
              //var updatedUSDbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.USDbalance) + parseFloat(totoalBidRemainingUSD)) - parseFloat(totoalBidRemainingBTC);
              //var updatedUSDbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.USDbalance) + parseFloat(userBidAmountUSD)) - parseFloat(totoalBidRemainingUSD));
              var updatedUSDbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(totoalBidRemainingUSD);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainUSD updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
              //var USDAmountSucess = (parseFloat(userBidAmountUSD) - parseFloat(totoalBidRemainingUSD));
              // var USDAmountSucess = new BigNumber(userBidAmountUSD);
              // USDAmountSucess = USDAmountSucess.minus(totoalBidRemainingUSD);
              //
              // //var txFeesBidderUSD = (parseFloat(USDAmountSucess) * parseFloat(txFeeWithdrawSuccessUSD));
              // var txFeesBidderUSD = new BigNumber(USDAmountSucess);
              // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
              //
              // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingUSD == 0updatedUSDbalanceBidder ::: " + updatedUSDbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingUSD asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingUSD == 0BidUSD.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidUSD.destroy({
              //   id: bidDetails.bidownerUSD
              // });
              try {
                var bidDestroy = await BidUSD.update({
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
              sails.sockets.blast(constants.USD_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0AskUSD.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskUSD.destroy({
              //   id: currentAskDetails.askownerUSD
              // });
              try {
                var askDestroy = await AskUSD.update({
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
              sails.sockets.blast(constants.USD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0  enter into else of totoalBidRemainingUSD == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == 0start User.findOne currentAskDetails.bidownerUSD ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerUSD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(currentAskDetails.askAmountUSD));
              var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(currentAskDetails.askAmountUSD);
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

              console.log("After deduct TX Fees of USD Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskUSD.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskUSD.update({
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

              sails.sockets.blast(constants.USD_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingUSD == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerUSD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerUSD");
              //var updatedUSDbalanceBidder = ((parseFloat(userAllDetailsInDBBid.USDbalance) + parseFloat(userBidAmountUSD)) - parseFloat(totoalBidRemainingUSD));
              var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBid.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(totoalBidRemainingUSD);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainUSD updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
              //var USDAmountSucess = (parseFloat(userBidAmountUSD) - parseFloat(totoalBidRemainingUSD));
              // var USDAmountSucess = new BigNumber(userBidAmountUSD);
              // USDAmountSucess = USDAmountSucess.minus(totoalBidRemainingUSD);
              //
              // //var txFeesBidderUSD = (parseFloat(USDAmountSucess) * parseFloat(txFeeWithdrawSuccessUSD));
              // var txFeesBidderUSD = new BigNumber(USDAmountSucess);
              // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
              //
              // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);
              // console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedUSDbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountUSD totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidUSD.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountUSD: totoalBidRemainingUSD,
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
              sails.sockets.blast(constants.USD_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingUSD :: " + totoalBidRemainingUSD);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingUSD = totoalBidRemainingUSD - allAsksFromdb[i].bidAmountUSD;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingUSD = totoalBidRemainingUSD.minus(currentAskDetails.askAmountUSD);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingUSD == 0::: " + totoalBidRemainingUSD);

              if (totoalBidRemainingUSD == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingUSD == 0Enter into totoalBidRemainingUSD == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerUSD
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
                    id: bidDetails.bidownerUSD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingUSD == 0userAll bidDetails.askownerUSD :: ");
                console.log(" totoalBidRemainingUSD == 0Update value of Bidder and asker");
                //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(currentAskDetails.askAmountUSD));
                var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
                updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(currentAskDetails.askAmountUSD);

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

                console.log("After deduct TX Fees of USD Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingUSD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingUSD == 0updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);
                console.log(" totoalBidRemainingUSD == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerUSD
                  }, {
                    FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedUSDbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(userBidAmountUSD)) - parseFloat(totoalBidRemainingUSD));

                var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.USDbalance);
                updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);
                updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(totoalBidRemainingUSD);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalBidRemainingBTC);
                console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
                //var USDAmountSucess = (parseFloat(userBidAmountUSD) - parseFloat(totoalBidRemainingUSD));
                // var USDAmountSucess = new BigNumber(userBidAmountUSD);
                // USDAmountSucess = USDAmountSucess.minus(totoalBidRemainingUSD);
                //
                //
                // //var txFeesBidderUSD = (parseFloat(USDAmountSucess) * parseFloat(txFeeWithdrawSuccessUSD));
                // var txFeesBidderUSD = new BigNumber(USDAmountSucess);
                // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
                // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
                // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
                // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
                //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
                updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);



                console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0 updatedFreezedUSDbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerUSD
                  }, {
                    USDbalance: updatedUSDbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0 BidUSD.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskUSD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskUSD.update({
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
                sails.sockets.blast(constants.USD_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0 AskUSD.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidUSD.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidUSD.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.USD_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0 enter into else of totoalBidRemainingUSD == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0totoalBidRemainingUSD == 0 start User.findOne currentAskDetails.bidownerUSD " + currentAskDetails.bidownerUSD);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerUSD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(currentAskDetails.askAmountUSD));

                var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
                updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(currentAskDetails.askAmountUSD);

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
                console.log("After deduct TX Fees of USD Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0 updatedFreezedUSDbalanceAsker:: " + updatedFreezedUSDbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerUSD
                  }, {
                    FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskUSD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskUSD.update({
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
                sails.sockets.blast(constants.USD_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountUSD = (parseFloat(currentAskDetails.askAmountUSD) - parseFloat(totoalBidRemainingUSD));

              var updatedAskAmountUSD = new BigNumber(currentAskDetails.askAmountUSD);
              updatedAskAmountUSD = updatedAskAmountUSD.minus(totoalBidRemainingUSD);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskUSD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountUSD: updatedAskAmountUSD,
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
              sails.sockets.blast(constants.USD_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerUSD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(totoalBidRemainingUSD));
              var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(totoalBidRemainingUSD);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
              console.log("Total Ask RemainUSD updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of USD Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedUSDbalanceAsker:: " + updatedFreezedUSDbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
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
                  id: bidDetails.bidownerUSD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerUSD");
              //var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(userBidAmountUSD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountUSD " + userBidAmountUSD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.USDbalance " + userAllDetailsInDBBidder.USDbalance);

              var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
              //var txFeesBidderUSD = (parseFloat(updatedUSDbalanceBidder) * parseFloat(txFeeWithdrawSuccessUSD));
              // var txFeesBidderUSD = new BigNumber(userBidAmountUSD);
              // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
              //
              // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderUSD = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedUSDbalanceBidder ::: " + updatedUSDbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidUSD.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidUSD.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidUSD.update({
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
              sails.sockets.blast(constants.USD_BID_DESTROYED, bidDestroy);
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
  removeBidUSDMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdUSD;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidUSD.findOne({
      bidownerUSD: bidownerId,
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
            BidUSD.update({
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
              sails.sockets.blast(constants.USD_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskUSDMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdUSD;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskUSD.findOne({
      askownerUSD: askownerId,
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
        var userUSDBalanceInDb = parseFloat(user.USDbalance);
        var askAmountOfUSDInAskTableDB = parseFloat(askDetails.askAmountUSD);
        var userFreezedUSDbalanceInDB = parseFloat(user.FreezedUSDbalance);
        console.log("userUSDBalanceInDb :" + userUSDBalanceInDb);
        console.log("askAmountOfUSDInAskTableDB :" + askAmountOfUSDInAskTableDB);
        console.log("userFreezedUSDbalanceInDB :" + userFreezedUSDbalanceInDB);
        var updateFreezedUSDBalance = (parseFloat(userFreezedUSDbalanceInDB) - parseFloat(askAmountOfUSDInAskTableDB));
        var updateUserUSDBalance = (parseFloat(userUSDBalanceInDb) + parseFloat(askAmountOfUSDInAskTableDB));
        User.update({
            id: askownerId
          }, {
            USDbalance: parseFloat(updateUserUSDBalance),
            FreezedUSDbalance: parseFloat(updateFreezedUSDBalance)
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
            AskUSD.update({
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
              sails.sockets.blast(constants.USD_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidUSD: function(req, res) {
    console.log("Enter into ask api getAllBidUSD :: ");
    BidUSD.find({
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
            BidUSD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountUSD')
              .exec(function(err, bidAmountUSDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountUSDSum",
                    statusCode: 401
                  });
                }
                BidUSD.find({
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
                        "message": "Error to sum Of bidAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsUSD: allAskDetailsToExecute,
                      bidAmountUSDSum: bidAmountUSDSum[0].bidAmountUSD,
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
  getAllAskUSD: function(req, res) {
    console.log("Enter into ask api getAllAskUSD :: ");
    AskUSD.find({
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
            AskUSD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountUSD')
              .exec(function(err, askAmountUSDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountUSDSum",
                    statusCode: 401
                  });
                }
                AskUSD.find({
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
                        "message": "Error to sum Of askAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksUSD: allAskDetailsToExecute,
                      askAmountUSDSum: askAmountUSDSum[0].askAmountUSD,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskUSD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsUSDSuccess: function(req, res) {
    console.log("Enter into ask api getBidsUSDSuccess :: ");
    BidUSD.find({
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
            BidUSD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountUSD')
              .exec(function(err, bidAmountUSDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountUSDSum",
                    statusCode: 401
                  });
                }
                BidUSD.find({
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
                        "message": "Error to sum Of bidAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsUSD: allAskDetailsToExecute,
                      bidAmountUSDSum: bidAmountUSDSum[0].bidAmountUSD,
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
  getAsksUSDSuccess: function(req, res) {
    console.log("Enter into ask api getAsksUSDSuccess :: ");
    AskUSD.find({
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
            AskUSD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountUSD')
              .exec(function(err, askAmountUSDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountUSDSum",
                    statusCode: 401
                  });
                }
                AskUSD.find({
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
                        "message": "Error to sum Of askAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksUSD: allAskDetailsToExecute,
                      askAmountUSDSum: askAmountUSDSum[0].askAmountUSD,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskUSD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};