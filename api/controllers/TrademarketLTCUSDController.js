/**
 * TrademarketLTCUSDController
 *
 * @description :: Server-side logic for managing trademarketltcusds
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

  addAskUSDMarket: async function(req, res) {
    console.log("Enter into ask api addAskUSDMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountUSD = new BigNumber(req.body.askAmountUSD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountUSD || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountUSD < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountUSD = parseFloat(userAskAmountUSD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskUSD.create({
        askAmountLTC: userAskAmountLTC,
        askAmountUSD: userAskAmountUSD,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountUSD: userAskAmountUSD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingUSD = (parseFloat(totoalAskRemainingUSD) - parseFloat(currentBidDetails.bidAmountUSD));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingUSD = totoalAskRemainingUSD.minus(currentBidDetails.bidAmountUSD);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingUSD :: " + totoalAskRemainingUSD);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(currentBidDetails.bidAmountUSD));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


            //updatedUSDbalanceBidder =  parseFloat(updatedUSDbalanceBidder);

            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedUSDbalanceAsker = parseFloat(totoalAskRemainingUSD);
            //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);

            //updatedFreezedUSDbalanceAsker =  parseFloat(updatedFreezedUSDbalanceAsker);
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
            console.log("After deduct TX Fees of USD Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedUSDbalance: updatedFreezedUSDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed USDBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(currentBidDetails.bidAmountUSD));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedUSDbalanceBidder:: " + updatedUSDbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerUSD");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(totoalAskRemainingUSD));
            //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
            console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
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
            console.log("After deduct TX Fees of USD Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedUSDbalance: updatedFreezedUSDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskUSD.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingUSD = totoalAskRemainingUSD - allBidsFromdb[i].bidAmountUSD;
          if (totoalAskRemainingUSD >= currentBidDetails.bidAmountUSD) {
            //totoalAskRemainingUSD = (parseFloat(totoalAskRemainingUSD) - parseFloat(currentBidDetails.bidAmountUSD));
            totoalAskRemainingUSD = totoalAskRemainingUSD.minus(currentBidDetails.bidAmountUSD);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of USD Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerUSD
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  USDbalance: updatedUSDbalanceBidder
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
              //var updatedFreezedUSDbalanceAsker = parseFloat(totoalAskRemainingUSD);
              //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(totoalAskRemainingUSD));
              //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
              var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
              console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
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

              console.log("After deduct TX Fees of USD Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerUSD
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedUSDbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerUSD
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountUSD = (parseFloat(currentBidDetails.bidAmountUSD) - parseFloat(totoalAskRemainingUSD));
            var updatedBidAmountUSD = new BigNumber(currentBidDetails.bidAmountUSD);
            updatedBidAmountUSD = updatedBidAmountUSD.minus(totoalAskRemainingUSD);

            try {
              var updatedaskDetails = await BidUSD.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedUSDbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerUSD");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of USD Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountUSD = new BigNumber(req.body.bidAmountUSD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountUSD = parseFloat(userBidAmountUSD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountUSD || !userBidAmountLTC ||
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
      var bidDetails = await BidUSD.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountUSD: userBidAmountUSD,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountUSD: userBidAmountUSD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
      var allAsksFromdb = await AskUSD.find({
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
        var totoalBidRemainingUSD = new BigNumber(userBidAmountUSD);
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of USD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountUSD;
        }
        if (total_ask <= totoalBidRemainingUSD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingUSD :: " + totoalBidRemainingUSD);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingUSD = totoalBidRemainingUSD - allAsksFromdb[i].bidAmountUSD;
            //totoalBidRemainingUSD = (parseFloat(totoalBidRemainingUSD) - parseFloat(currentAskDetails.askAmountUSD));
            totoalBidRemainingUSD = totoalBidRemainingUSD.minus(currentAskDetails.askAmountUSD);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              console.log("After deduct TX Fees of USD Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedUSDbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
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
              //Bid FreezedLTCbalance of bidder deduct and USD  give to bidder
              //var updatedUSDbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.USDbalance) + parseFloat(totoalBidRemainingUSD)) - parseFloat(totoalBidRemainingLTC);
              //var updatedUSDbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.USDbalance) + parseFloat(userBidAmountUSD)) - parseFloat(totoalBidRemainingUSD));
              var updatedUSDbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(totoalBidRemainingUSD);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainUSD updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingUSD == 0updatedUSDbalanceBidder ::: " + updatedUSDbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingUSD asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

              console.log("After deduct TX Fees of USD Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerUSD");
              //var updatedUSDbalanceBidder = ((parseFloat(userAllDetailsInDBBid.USDbalance) + parseFloat(userBidAmountUSD)) - parseFloat(totoalBidRemainingUSD));
              var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBid.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(totoalBidRemainingUSD);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainUSD updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedUSDbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountUSD totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidUSD.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingUSD = totoalBidRemainingUSD - allAsksFromdb[i].bidAmountUSD;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingUSD = totoalBidRemainingUSD.minus(currentAskDetails.askAmountUSD);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                console.log("After deduct TX Fees of USD Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingUSD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingUSD == 0updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);
                console.log(" totoalBidRemainingUSD == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerUSD
                  }, {
                    FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalBidRemainingLTC);
                console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
                //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
                updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);



                console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0 updatedFreezedUSDbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerUSD
                  }, {
                    USDbalance: updatedUSDbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
                console.log("After deduct TX Fees of USD Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0 updatedFreezedUSDbalanceAsker:: " + updatedFreezedUSDbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerUSD
                  }, {
                    FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountUSD = (parseFloat(currentAskDetails.askAmountUSD) - parseFloat(totoalBidRemainingUSD));

              var updatedAskAmountUSD = new BigNumber(currentAskDetails.askAmountUSD);
              updatedAskAmountUSD = updatedAskAmountUSD.minus(totoalBidRemainingUSD);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskUSD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
              console.log("Total Ask RemainUSD updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of USD Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedUSDbalanceAsker:: " + updatedFreezedUSDbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerUSD");
              //var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(userBidAmountUSD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountUSD " + userBidAmountUSD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.USDbalance " + userAllDetailsInDBBidder.USDbalance);

              var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
              //var txFeesBidderUSD = (parseFloat(updatedUSDbalanceBidder) * parseFloat(txFeeWithdrawSuccessUSD));
              // var txFeesBidderUSD = new BigNumber(userBidAmountUSD);
              // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
              //
              // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderUSD = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedUSDbalanceBidder ::: " + updatedUSDbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidUSD.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user LTC balance");
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
            BidUSD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsUSD: allAskDetailsToExecute,
                      bidAmountUSDSum: bidAmountUSDSum[0].bidAmountUSD,
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
  getAllAskUSD: function(req, res) {
    console.log("Enter into ask api getAllAskUSD :: ");
    AskUSD.find({
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
            AskUSD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksUSD: allAskDetailsToExecute,
                      askAmountUSDSum: askAmountUSDSum[0].askAmountUSD,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
            BidUSD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsUSD: allAskDetailsToExecute,
                      bidAmountUSDSum: bidAmountUSDSum[0].bidAmountUSD,
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
  getAsksUSDSuccess: function(req, res) {
    console.log("Enter into ask api getAsksUSDSuccess :: ");
    AskUSD.find({
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
            AskUSD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksUSD: allAskDetailsToExecute,
                      askAmountUSDSum: askAmountUSDSum[0].askAmountUSD,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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