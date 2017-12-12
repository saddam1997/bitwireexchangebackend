/**
 * TradeBCHMarketController
 *
 * @description :: Server-side logic for managing tradebchmarkets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var statusZero = sails.config.company.statusZero;
var statusOne = sails.config.company.statusOne;
var statusTwo = sails.config.company.statusTwo;

var statusZeroCreated = sails.config.company.statusZeroCreated;
var statusOneSuccessfull = sails.config.company.statusOneSuccessfull;
var statusTwoPending = sails.config.company.statusTwoPending;
var constants = require('./../../config/constants');

const txFeeBCHWithdrawSuccess = sails.config.common.txFeeBCHWithdrawSuccess;
const txFeeBTCWithdrawSuccess = sails.config.common.txFeeBTCWithdrawSuccess;

module.exports = {
  addAskBCHMarket: async function(req, res) {
    console.log("Enter into ask api addAskBCHMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountBCH || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountBCH < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userBCHBalanceInDb = new BigNumber(userAsker.BCHbalance);
    var userFreezedBCHBalanceInDb = new BigNumber(userAsker.FreezedBCHbalance);

    userBCHBalanceInDb =  parseFloat(userBCHBalanceInDb);
    userFreezedBCHBalanceInDb =  parseFloat(userFreezedBCHBalanceInDb);

    var userIdInDb = userAsker.id;
    if (userAskAmountBCH.greaterThanOrEqualTo(userBCHBalanceInDb)) {
      return res.json({
        "message": "You have insufficient BCH Balance",
        statusCode: 401
      });
    }
    console.log("userAskAmountBCH :: " + userAskAmountBCH);
    console.log("userBCHBalanceInDb :: " + userBCHBalanceInDb);
    // if (userAskAmountBCH >= userBCHBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient BCH Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC =  parseFloat(userAskAmountBTC);
    userAskAmountBCH =  parseFloat(userAskAmountBCH);
    userAskRate =  parseFloat(userAskRate);
    try {
      var askDetails = await AskBCH.create({
        askAmountBTC: userAskAmountBTC,
        askAmountBCH: userAskAmountBCH,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountBCH: userAskAmountBCH,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        askownerBCH: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.BCH_ASK_ADDED, askDetails);
    // var updateUserBCHBalance = (parseFloat(userBCHBalanceInDb) - parseFloat(userAskAmountBCH));
    // var updateFreezedBCHBalance = (parseFloat(userFreezedBCHBalanceInDb) + parseFloat(userAskAmountBCH));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userBCHBalanceInDb = new BigNumber(userBCHBalanceInDb);
    var updateUserBCHBalance = userBCHBalanceInDb.minus(userAskAmountBCH);
    updateUserBCHBalance =  parseFloat(updateUserBCHBalance);
    userFreezedBCHBalanceInDb = new BigNumber(userFreezedBCHBalanceInDb);
    var updateFreezedBCHBalance = userFreezedBCHBalanceInDb.plus(userAskAmountBCH);
    updateFreezedBCHBalance =  parseFloat(updateFreezedBCHBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedBCHbalance: updateFreezedBCHBalance,
        BCHbalance: updateUserBCHBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidBCH.find({
        bidRate: {
          'like': parseFloat(userAskRate)
        },
        status: {
          '!': statusOne
        }
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to find bch bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of BCH
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountBCH;
      }
      if (total_bid <= totoalAskRemainingBCH) {
        console.log("Inside of total_bid <= totoalAskRemainingBCH");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingBCH");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingBCH == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingBCH == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerBCH
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerBCH
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BCHbalance);
            updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(currentBidDetails.bidAmountBCH);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of BCH Update user " + updatedBCHbalanceBidder);
            //var txFeesBidderBCH = (parseFloat(currentBidDetails.bidAmountBCH) * parseFloat(txFeeBCHWithdrawSuccess));
            // var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            //
            // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess)
            // console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
            // //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
            // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
            var  txFeesBidderBCH = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
            updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);


            //updatedBCHbalanceBidder =  parseFloat(updatedBCHbalanceBidder);

            console.log("After deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerBCH
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                BCHbalance: updatedBCHbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and bch balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH);
            //var updatedFreezedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(userAskAmountBCH)) + parseFloat(totoalAskRemainingBCH));
            var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
            updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(userAskAmountBCH);
            updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.plus(totoalAskRemainingBCH);

            //updatedFreezedBCHbalanceAsker =  parseFloat(updatedFreezedBCHbalanceAsker);
            //Deduct Transation Fee Asker
            //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var btcAmountSucess = new BigNumber(userAskAmountBTC);
            btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount BTC updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(btcAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log("After deduct TX Fees of BCH Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBCH
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedBCHbalance: updatedFreezedBCHbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed BCHBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidBCH:: ");
            try {
              var bidDestroy = await BidBCH.update({
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
            sails.sockets.blast(constants.BCH_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskBCH.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskBCH.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskBCH',
                statusCode: 401
              });
            }
            //emitting event of destruction of bch_ask
            sails.sockets.blast(constants.BCH_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingBCH == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerBCH " + currentBidDetails.bidownerBCH);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerBCH
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BCHbalance);
            updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(currentBidDetails.bidAmountBCH);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of BCH 089089Update user " + updatedBCHbalanceBidder);
            // var txFeesBidderBCH = (parseFloat(currentBidDetails.bidAmountBCH) * parseFloat(txFeeBCHWithdrawSuccess));
            // var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess);
            // console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
            // // updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
            // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
            var  txFeesBidderBCH = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
            updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);


            console.log("After deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedBCHbalanceBidder:: " + updatedBCHbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerBCH
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                BCHbalance: updatedBCHbalanceBidder
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
              var desctroyCurrentBid = await BidBCH.update({
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
            sails.sockets.blast(constants.BCH_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerBCH
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerBCH");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(totoalAskRemainingBCH));
            //var updatedFreezedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(userAskAmountBCH)) + parseFloat(totoalAskRemainingBCH));
            var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
            updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(userAskAmountBCH);
            updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.plus(totoalAskRemainingBCH);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainBCH userAllDetailsInDBAsker.FreezedBCHbalance " + userAllDetailsInDBAsker.FreezedBCHbalance);
            console.log("Total Ask RemainBCH updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var btcAmountSucess = new BigNumber(userAskAmountBTC);
            btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);

            //var txFeesAskerBTC = (parseFloat(btcAmountSucess) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(btcAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of BCH Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBCH
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedBCHbalance: updatedFreezedBCHbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskBCH.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
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
            sails.sockets.blast(constants.BCH_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingBCH = totoalAskRemainingBCH - allBidsFromdb[i].bidAmountBCH;
          if (totoalAskRemainingBCH >= currentBidDetails.bidAmountBCH) {
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingBCH == 0::: " + totoalAskRemainingBCH);

            if (totoalAskRemainingBCH == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingBCH == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerBCH
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
                  id: askDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerBCH :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH));
              var updatedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BCHbalance);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(currentBidDetails.bidAmountBCH);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 BCH Update user " + updatedBCHbalanceBidder);
              //var txFeesBidderBCH = (parseFloat(currentBidDetails.bidAmountBCH) * parseFloat(txFeeBCHWithdrawSuccess));

              // var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess);
              // console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              // //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
              // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);
              // console.log("After deduct TX Fees of BCH Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
              var  txFeesBidderBCH = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerBCH
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  BCHbalance: updatedBCHbalanceBidder
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
              //var updatedFreezedBCHbalanceAsker = parseFloat(totoalAskRemainingBCH);
              //var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(totoalAskRemainingBCH));
              //var updatedFreezedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(userAskAmountBCH)) + parseFloat(totoalAskRemainingBCH));
              var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
              updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(userAskAmountBCH);
              updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.plus(totoalAskRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainBCH userAllDetailsInDBAsker.FreezedBCHbalance " + userAllDetailsInDBAsker.FreezedBCHbalance);
              console.log("Total Ask RemainBCH updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var btcAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
              var btcAmountSucess = new BigNumber(userAskAmountBTC);
              btcAmountSucess = btcAmountSucess.minus(totoalAskRemainingBTC);
              //var txFeesAskerBTC = (parseFloat(updatedBTCbalanceAsker) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(updatedBTCbalanceAsker);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of BCH Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerBCH
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedBCHbalance: updatedFreezedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidBCH.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidBCH.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidBCH.update({
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
              sails.sockets.blast(constants.BCH_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskBCH.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskBCH.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskBCH.update({
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
              sails.sockets.blast(constants.BCH_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingBCH == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerBCH " + currentBidDetails.bidownerBCH);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerBCH
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

              //var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(currentBidDetails.bidAmountBCH));
              var updatedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BCHbalance);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(currentBidDetails.bidAmountBCH);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of BCH Update user " + updatedBCHbalanceBidder);
              //var txFeesBidderBCH = (parseFloat(currentBidDetails.bidAmountBCH) * parseFloat(txFeeBCHWithdrawSuccess));
              // var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess);
              // console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              // //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
              // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);
              // console.log("After deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
              var  txFeesBidderBCH = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedBCHbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerBCH
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  BCHbalance: updatedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidBCH.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidBCH.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.BCH_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerBCH
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
            //var updatedBidAmountBCH = (parseFloat(currentBidDetails.bidAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var updatedBidAmountBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            updatedBidAmountBCH = updatedBidAmountBCH.minus(totoalAskRemainingBCH);

            try {
              var updatedaskDetails = await BidBCH.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountBCH: updatedBidAmountBCH,
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
            sails.sockets.blast(constants.BCH_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerBCH
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


            //var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.BCHbalance) + parseFloat(totoalAskRemainingBCH));

            var updatedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.BCHbalance);
            updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(totoalAskRemainingBCH);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of BCH Update user " + updatedBCHbalanceBidder);
            //var bchAmountSucess = parseFloat(totoalAskRemainingBCH);
            //var bchAmountSucess = new BigNumber(totoalAskRemainingBCH);
            //var txFeesBidderBCH = (parseFloat(bchAmountSucess) * parseFloat(txFeeBCHWithdrawSuccess));
            //var txFeesBidderBCH = (parseFloat(totoalAskRemainingBCH) * parseFloat(txFeeBCHWithdrawSuccess));



            // var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess);
            //
            // //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
            // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC=txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
            var txFeesBidderBCH = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

            console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
            console.log("After deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedBCHbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerBCH
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                BCHbalance: updatedBCHbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerBCH");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(userAskAmountBCH));
            var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
            updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(userAskAmountBCH);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of BCH Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerBCH
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedBCHbalance: updatedFreezedBCHbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskBCH.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskBCH.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskBCH.update({
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
            //emitting event for bch_ask destruction
            sails.sockets.blast(constants.BCH_ASK_DESTROYED, askDestroy);
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
  addBidBCHMarket: async function(req, res) {
    console.log("Enter into ask api addBidBCHMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC =  parseFloat(userBidAmountBTC);
    userBidAmountBCH =  parseFloat(userBidAmountBCH);
    userBidRate =  parseFloat(userBidRate);


    if (!userBidAmountBCH || !userBidAmountBTC ||
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
    userBidAmountBTC =  parseFloat(userBidAmountBTC);
    try {
      var bidDetails = await BidBCH.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountBCH: userBidAmountBCH,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountBCH: userBidAmountBCH,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        bidownerBCH: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.BCH_BID_ADDED, bidDetails);

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
        FreezedBTCbalance:  parseFloat(updateFreezedBTCBalance),
        BTCbalance:  parseFloat(updateUserBTCBalance),
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    try {
      var allAsksFromdb = await AskBCH.find({
        askRate: {
          'like': parseFloat(userBidRate)
        },
        status: {
          '!': statusOne
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
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of BCH
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountBCH;
        }
        if (total_ask <= totoalBidRemainingBCH) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingBCH = totoalBidRemainingBCH - allAsksFromdb[i].bidAmountBCH;
            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingBCH == 0::: " + totoalBidRemainingBCH);
            if (totoalBidRemainingBCH == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingBCH == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerBCH totoalBidRemainingBCH == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(currentAskDetails.askAmountBCH));
              var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
              updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(currentAskDetails.askAmountBCH);
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of BCH Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedBCHbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerBCH
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceAsker,
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
                  id: bidDetails.bidownerBCH
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and BCH  give to bidder
              //var updatedBCHbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.BCHbalance) + parseFloat(totoalBidRemainingBCH)) - parseFloat(totoalBidRemainingBTC);
              //var updatedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.BCHbalance) + parseFloat(userBidAmountBCH)) - parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.BCHbalance);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(userBidAmountBCH);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(totoalBidRemainingBCH);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBCH totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainBCH BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainBCH updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);
              //var bchAmountSucess = (parseFloat(userBidAmountBCH) - parseFloat(totoalBidRemainingBCH));
              // var bchAmountSucess = new BigNumber(userBidAmountBCH);
              // bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingBCH);
              //
              // //var txFeesBidderBCH = (parseFloat(bchAmountSucess) * parseFloat(txFeeBCHWithdrawSuccess));
              // var txFeesBidderBCH = new BigNumber(bchAmountSucess);
              // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess);
              //
              // console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              // //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
              // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
              var txFeesBidderBCH=txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

              console.log("After deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingBCH == 0updatedBCHbalanceBidder ::: " + updatedBCHbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingBCH asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBCH
                }, {
                  BCHbalance: updatedBCHbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingBCH == 0BidBCH.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidBCH.destroy({
              //   id: bidDetails.bidownerBCH
              // });
              try {
                var bidDestroy = await BidBCH.update({
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
              sails.sockets.blast(constants.BCH_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingBCH == 0AskBCH.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskBCH.destroy({
              //   id: currentAskDetails.askownerBCH
              // });
              try {
                var askDestroy = await AskBCH.update({
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
              sails.sockets.blast(constants.BCH_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH == 0  enter into else of totoalBidRemainingBCH == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBCH == 0start User.findOne currentAskDetails.bidownerBCH ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBCH == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(currentAskDetails.askAmountBCH));
              var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
              updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(currentAskDetails.askAmountBCH);
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of BCH Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingBCH == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBCH == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBCH
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingBCH == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskBCH.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskBCH.update({
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

              sails.sockets.blast(constants.BCH_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingBCH == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingBCH == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerBCH
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerBCH");
              //var updatedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.BCHbalance) + parseFloat(userBidAmountBCH)) - parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.BCHbalance);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(userBidAmountBCH);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(totoalBidRemainingBCH);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBCH totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainBCH BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainBCH updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);
              //var bchAmountSucess = (parseFloat(userBidAmountBCH) - parseFloat(totoalBidRemainingBCH));
              // var bchAmountSucess = new BigNumber(userBidAmountBCH);
              // bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingBCH);
              //
              // //var txFeesBidderBCH = (parseFloat(bchAmountSucess) * parseFloat(txFeeBCHWithdrawSuccess));
              // var txFeesBidderBCH = new BigNumber(bchAmountSucess);
              // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess);
              //
              // console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              // //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
              // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);
              // console.log("After deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
              var txFeesBidderBCH=txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedBCHbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBCH
                }, {
                  BCHbalance: updatedBCHbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBCH totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidBCH.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountBCH: totoalBidRemainingBCH,
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
              sails.sockets.blast(constants.BCH_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingBCH = totoalBidRemainingBCH - allAsksFromdb[i].bidAmountBCH;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingBCH == 0::: " + totoalBidRemainingBCH);

              if (totoalBidRemainingBCH == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingBCH == 0Enter into totoalBidRemainingBCH == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerBCH
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
                    id: bidDetails.bidownerBCH
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingBCH == 0userAll bidDetails.askownerBCH :: ");
                console.log(" totoalBidRemainingBCH == 0Update value of Bidder and asker");
                //var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(currentAskDetails.askAmountBCH));
                var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
                updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(currentAskDetails.askAmountBCH);

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

                console.log("After deduct TX Fees of BCH Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingBCH == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingBCH == 0updatedFreezedBCHbalanceAsker ::: " + updatedFreezedBCHbalanceAsker);
                console.log(" totoalBidRemainingBCH == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerBCH
                  }, {
                    FreezedBCHbalance: updatedFreezedBCHbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(userBidAmountBCH)) - parseFloat(totoalBidRemainingBCH));

                var updatedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BCHbalance);
                updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(userBidAmountBCH);
                updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(totoalBidRemainingBCH);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainBCH totoalAskRemainingBCH " + totoalBidRemainingBTC);
                console.log("Total Ask RemainBCH BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainBCH updatedFreezedBCHbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);
                //var bchAmountSucess = (parseFloat(userBidAmountBCH) - parseFloat(totoalBidRemainingBCH));
                // var bchAmountSucess = new BigNumber(userBidAmountBCH);
                // bchAmountSucess = bchAmountSucess.minus(totoalBidRemainingBCH);
                //
                //
                // //var txFeesBidderBCH = (parseFloat(bchAmountSucess) * parseFloat(txFeeBCHWithdrawSuccess));
                // var txFeesBidderBCH = new BigNumber(bchAmountSucess);
                // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess);
                // console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
                // //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
                // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);
                var txFeesBidderBCH=txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
                //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
                updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);



                console.log("After deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingBCH == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingBCH == 0 updatedFreezedBCHbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerBCH
                  }, {
                    BCHbalance: updatedBCHbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingBCH == 0 BidBCH.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskBCH.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskBCH.update({
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
                sails.sockets.blast(constants.BCH_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingBCH == 0 AskBCH.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidBCH.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidBCH.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.BCH_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingBCH == 0 enter into else of totoalBidRemainingBCH == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingBCH == 0totoalBidRemainingBCH == 0 start User.findOne currentAskDetails.bidownerBCH " + currentAskDetails.bidownerBCH);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerBCH
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingBCH == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(currentAskDetails.askAmountBCH));

                var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
                updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(currentAskDetails.askAmountBCH);

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeBTCWithdrawSuccess));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
                console.log("After deduct TX Fees of BCH Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingBCH == 0 updatedFreezedBCHbalanceAsker:: " + updatedFreezedBCHbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingBCH == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerBCH
                  }, {
                    FreezedBCHbalance: updatedFreezedBCHbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingBCH == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskBCH.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskBCH.update({
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
                sails.sockets.blast(constants.BCH_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));

              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskBCH.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountBCH: updatedAskAmountBCH,
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
              sails.sockets.blast(constants.BCH_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerBCH
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedBCHbalance);
              updatedFreezedBCHbalanceAsker = updatedFreezedBCHbalanceAsker.minus(totoalBidRemainingBCH);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainBCH totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainBCH userAllDetailsInDBAsker.FreezedBCHbalance " + userAllDetailsInDBAsker.FreezedBCHbalance);
              console.log("Total Ask RemainBCH updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeBTCWithdrawSuccess));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeBTCWithdrawSuccess);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of BCH Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedBCHbalanceAsker:: " + updatedFreezedBCHbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedBCHbalanceAsker " + updatedFreezedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerBCH
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceAsker,
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
                  id: bidDetails.bidownerBCH
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerBCH");
              //var updatedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.BCHbalance) + parseFloat(userBidAmountBCH));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountBCH " + userBidAmountBCH);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.BCHbalance " + userAllDetailsInDBBidder.BCHbalance);

              var updatedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.BCHbalance);
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.plus(userBidAmountBCH);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);
              //var txFeesBidderBCH = (parseFloat(updatedBCHbalanceBidder) * parseFloat(txFeeBCHWithdrawSuccess));
              // var txFeesBidderBCH = new BigNumber(userBidAmountBCH);
              // txFeesBidderBCH = txFeesBidderBCH.times(txFeeBCHWithdrawSuccess);
              //
              // console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              // //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
              // updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeBTCWithdrawSuccess);

              var txFeesBidderBCH=txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderBCH :: " + txFeesBidderBCH);
              //updatedBCHbalanceBidder = (parseFloat(updatedBCHbalanceBidder) - parseFloat(txFeesBidderBCH));
              updatedBCHbalanceBidder = updatedBCHbalanceBidder.minus(txFeesBidderBCH);

              console.log("After deduct TX Fees of BCH Update user " + updatedBCHbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedBCHbalanceBidder ::: " + updatedBCHbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedBCHbalanceBidder " + updatedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerBCH
                }, {
                  BCHbalance: updatedBCHbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidBCH.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidBCH.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidBCH.update({
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
              sails.sockets.blast(constants.BCH_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC Bid destroy successfully desctroyCurrentBid ::");
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            }
          }
        }
      }
      console.log("Total Bid ::: " + total_ask);
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
  removeBidBCHMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdBCH;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidBCH.findOne({
      bidownerBCH: bidownerId,
      id: userBidId,
      status: {
        '!': statusOne
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
            BidBCH.destroy({
              id: userBidId
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }

              sails.sockets.blast(constants.BCH_BID_DESTROYED, bid);


              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  removeAskBCHMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdBCH;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskBCH.findOne({
      askownerBCH: askownerId,
      id: userAskId,
      status: {
        '!': statusOne
      }
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
        var userBCHBalanceInDb = parseFloat(user.BCHbalance);
        var askAmountOfBCHInAskTableDB = parseFloat(askDetails.askAmountBCH);
        var userFreezedBCHbalanceInDB = parseFloat(user.FreezedBCHbalance);
        console.log("userBCHBalanceInDb :" + userBCHBalanceInDb);
        console.log("askAmountOfBCHInAskTableDB :" + askAmountOfBCHInAskTableDB);
        console.log("userFreezedBCHbalanceInDB :" + userFreezedBCHbalanceInDB);
        var updateFreezedBCHBalance = (parseFloat(userFreezedBCHbalanceInDB) - parseFloat(askAmountOfBCHInAskTableDB));
        var updateUserBCHBalance = (parseFloat(userBCHBalanceInDb) + parseFloat(askAmountOfBCHInAskTableDB));
        User.update({
            id: askownerId
          }, {
            BCHbalance: parseFloat(updateUserBCHBalance),
            FreezedBCHbalance: parseFloat(updateFreezedBCHBalance)
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
            AskBCH.destroy({
              id: userAskId
            }).exec(function(err, ask) {
              if (err) {
                return res.json({
                  "message": "Error to remove ask",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.BCH_ASK_DESTROYED, ask);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidBCH: function(req, res) {
    console.log("Enter into ask api getAllBidBCH :: ");
    BidBCH.find()
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
            BidBCH.find({
                status: {
                  '!': statusOne
                }
              })
              .sum('bidAmountBCH')
              .exec(function(err, bidAmountBCHSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountBCHSum",
                    statusCode: 401
                  });
                }
                BidBCH.find({
                    status: {
                      '!': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountBCHSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBCH: allAskDetailsToExecute,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
  getAllAskBCH: function(req, res) {
    console.log("Enter into ask api getAllAskBCH :: ");
    AskBCH.find()
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
            AskBCH.find({
                status: {
                  '!': statusOne
                }
              })
              .sum('askAmountBCH')
              .exec(function(err, askAmountBCHSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountBCHSum",
                    statusCode: 401
                  });
                }
                AskBCH.find({
                    status: {
                      '!': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountBCHSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBCH: allAskDetailsToExecute,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskBCH Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsBCHSuccess: function(req, res) {
    console.log("Enter into ask api getBidsBCHSuccess :: ");
    BidBCH.find({
        status: {
          'like': statusOne
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
            BidBCH.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('bidAmountBCH')
              .exec(function(err, bidAmountBCHSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountBCHSum",
                    statusCode: 401
                  });
                }
                BidBCH.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountBCHSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsBCH: allAskDetailsToExecute,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
  getAsksBCHSuccess: function(req, res) {
    console.log("Enter into ask api getAsksBCHSuccess :: ");
    AskBCH.find({
        status: {
          'like': statusOne
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
            AskBCH.find({
                status: {
                  'like': statusOne
                }
              })
              .sum('askAmountBCH')
              .exec(function(err, askAmountBCHSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountBCHSum",
                    statusCode: 401
                  });
                }
                AskBCH.find({
                    status: {
                      'like': statusOne
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountBCHSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksBCH: allAskDetailsToExecute,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskBCH Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
};
