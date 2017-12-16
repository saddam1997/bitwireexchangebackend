/**
 * TrademarketBCHUSDController
 *
 * @description :: Server-side logic for managing trademarketbchusds
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

  addAskUSDMarket: async function(req, res) {
    console.log("Enter into ask api addAskUSDMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountUSD = new BigNumber(req.body.askAmountUSD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountUSD || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountUSD < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountUSD = parseFloat(userAskAmountUSD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskUSD.create({
        askAmountBCH: userAskAmountBCH,
        askAmountUSD: userAskAmountUSD,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountUSD: userAskAmountUSD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
          'like': BCHMARKETID
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
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingUSD = (parseFloat(totoalAskRemainingUSD) - parseFloat(currentBidDetails.bidAmountUSD));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingUSD = totoalAskRemainingUSD.minus(currentBidDetails.bidAmountUSD);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingUSD :: " + totoalAskRemainingUSD);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(currentBidDetails.bidAmountUSD));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


            //updatedUSDbalanceBidder =  parseFloat(updatedUSDbalanceBidder);

            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedUSDbalanceAsker = parseFloat(totoalAskRemainingUSD);
            //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);

            //updatedFreezedUSDbalanceAsker =  parseFloat(updatedFreezedUSDbalanceAsker);
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
            console.log("After deduct TX Fees of USD Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedUSDbalance: updatedFreezedUSDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed USDBalance',
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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(currentBidDetails.bidAmountUSD));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedUSDbalanceBidder:: " + updatedUSDbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerUSD");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(totoalAskRemainingUSD));
            //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
            console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
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
            console.log("After deduct TX Fees of USD Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedUSDbalance: updatedFreezedUSDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskUSD.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingUSD = totoalAskRemainingUSD - allBidsFromdb[i].bidAmountUSD;
          if (totoalAskRemainingUSD >= currentBidDetails.bidAmountUSD) {
            //totoalAskRemainingUSD = (parseFloat(totoalAskRemainingUSD) - parseFloat(currentBidDetails.bidAmountUSD));
            totoalAskRemainingUSD = totoalAskRemainingUSD.minus(currentBidDetails.bidAmountUSD);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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
              // console.log("After deduct TX Fees of USD Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerUSD
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  USDbalance: updatedUSDbalanceBidder
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
              //var updatedFreezedUSDbalanceAsker = parseFloat(totoalAskRemainingUSD);
              //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(totoalAskRemainingUSD));
              //var updatedFreezedUSDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD)) + parseFloat(totoalAskRemainingUSD));
              var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);
              updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.plus(totoalAskRemainingUSD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
              console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
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

              console.log("After deduct TX Fees of USD Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerUSD
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);

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

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedUSDbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingUSD " + totoalAskRemainingUSD);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerUSD
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBidAmountBCH = (parseFloat(currentBidDetails.bidAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var updatedBidAmountBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            updatedBidAmountBCH = updatedBidAmountBCH.minus(totoalAskRemainingBCH);
            //var updatedBidAmountUSD = (parseFloat(currentBidDetails.bidAmountUSD) - parseFloat(totoalAskRemainingUSD));
            var updatedBidAmountUSD = new BigNumber(currentBidDetails.bidAmountUSD);
            updatedBidAmountUSD = updatedBidAmountUSD.minus(totoalAskRemainingUSD);

            try {
              var updatedaskDetails = await BidUSD.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
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
            //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBCHbalance) - parseFloat(totoalAskRemainingBCH));
            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(totoalAskRemainingBCH);


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
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

            console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
            console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedUSDbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerUSD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerUSD");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedUSDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedUSDbalance) - parseFloat(userAskAmountUSD));
            var updatedFreezedUSDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedUSDbalance);
            updatedFreezedUSDbalanceAsker = updatedFreezedUSDbalanceAsker.minus(userAskAmountUSD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of USD Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedUSDbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingUSD " + totoalAskRemainingUSD);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerUSD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
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
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountUSD = new BigNumber(req.body.bidAmountUSD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountUSD = parseFloat(userBidAmountUSD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountUSD || !userBidAmountBCH ||
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
      var bidDetails = await BidUSD.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountUSD: userBidAmountUSD,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountUSD: userBidAmountUSD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
      var allAsksFromdb = await AskUSD.find({
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
        var totoalBidRemainingUSD = new BigNumber(userBidAmountUSD);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of USD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountUSD;
        }
        if (total_ask <= totoalBidRemainingUSD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingUSD :: " + totoalBidRemainingUSD);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingUSD = totoalBidRemainingUSD - allAsksFromdb[i].bidAmountUSD;
            //totoalBidRemainingUSD = (parseFloat(totoalBidRemainingUSD) - parseFloat(currentAskDetails.askAmountUSD));
            totoalBidRemainingUSD = totoalBidRemainingUSD.minus(currentAskDetails.askAmountUSD);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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
              console.log("After deduct TX Fees of USD Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedUSDbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
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
              //Bid FreezedBCHbalance of bidder deduct and USD  give to bidder
              //var updatedUSDbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.USDbalance) + parseFloat(totoalBidRemainingUSD)) - parseFloat(totoalBidRemainingBCH);
              //var updatedUSDbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.USDbalance) + parseFloat(userBidAmountUSD)) - parseFloat(totoalBidRemainingUSD));
              var updatedUSDbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(totoalBidRemainingUSD);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainUSD updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingUSD == 0updatedUSDbalanceBidder ::: " + updatedUSDbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingUSD asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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

              console.log("After deduct TX Fees of USD Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingUSD == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerUSD");
              //var updatedUSDbalanceBidder = ((parseFloat(userAllDetailsInDBBid.USDbalance) + parseFloat(userBidAmountUSD)) - parseFloat(totoalBidRemainingUSD));
              var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBid.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(totoalBidRemainingUSD);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainUSD updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedUSDbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountUSD totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidUSD.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingUSD = totoalBidRemainingUSD - allAsksFromdb[i].bidAmountUSD;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingUSD = totoalBidRemainingUSD.minus(currentAskDetails.askAmountUSD);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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

                console.log("After deduct TX Fees of USD Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingUSD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingUSD == 0updatedFreezedUSDbalanceAsker ::: " + updatedFreezedUSDbalanceAsker);
                console.log(" totoalBidRemainingUSD == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerUSD
                  }, {
                    FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainUSD totoalAskRemainingUSD " + totoalBidRemainingBCH);
                console.log("Total Ask RemainUSD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainUSD updatedFreezedUSDbalanceAsker " + updatedFreezedBCHbalanceBidder);
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

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
                //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
                updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);



                console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingUSD == 0 updatedFreezedUSDbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerUSD
                  }, {
                    USDbalance: updatedUSDbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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
                console.log("After deduct TX Fees of USD Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0 updatedFreezedUSDbalanceAsker:: " + updatedFreezedUSDbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingUSD == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingUSD " + totoalBidRemainingUSD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerUSD
                  }, {
                    FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountUSD = (parseFloat(currentAskDetails.askAmountUSD) - parseFloat(totoalBidRemainingUSD));

              var updatedAskAmountUSD = new BigNumber(currentAskDetails.askAmountUSD);
              updatedAskAmountUSD = updatedAskAmountUSD.minus(totoalBidRemainingUSD);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskUSD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
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

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainUSD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainUSD userAllDetailsInDBAsker.FreezedUSDbalance " + userAllDetailsInDBAsker.FreezedUSDbalance);
              console.log("Total Ask RemainUSD updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of USD Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedUSDbalanceAsker:: " + updatedFreezedUSDbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedUSDbalanceAsker " + updatedFreezedUSDbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);



              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerUSD
                }, {
                  FreezedUSDbalance: updatedFreezedUSDbalanceAsker,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerUSD");
              //var updatedUSDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.USDbalance) + parseFloat(userBidAmountUSD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountUSD " + userBidAmountUSD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.USDbalance " + userAllDetailsInDBBidder.USDbalance);

              var updatedUSDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.USDbalance);
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.plus(userBidAmountUSD);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);
              //var txFeesBidderUSD = (parseFloat(updatedUSDbalanceBidder) * parseFloat(txFeeWithdrawSuccessUSD));
              // var txFeesBidderUSD = new BigNumber(userBidAmountUSD);
              // txFeesBidderUSD = txFeesBidderUSD.times(txFeeWithdrawSuccessUSD);
              //
              // console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              // //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              // updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);

              var txFeesBidderUSD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderUSD :: " + txFeesBidderUSD);
              //updatedUSDbalanceBidder = (parseFloat(updatedUSDbalanceBidder) - parseFloat(txFeesBidderUSD));
              updatedUSDbalanceBidder = updatedUSDbalanceBidder.minus(txFeesBidderUSD);

              console.log("After deduct TX Fees of USD Update user " + updatedUSDbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedUSDbalanceBidder ::: " + updatedUSDbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedUSDbalanceBidder " + updatedUSDbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingUSD " + totoalBidRemainingUSD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerUSD
                }, {
                  USDbalance: updatedUSDbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidUSD.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log("Error to update user BCH balance");
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
            BidUSD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsUSD: allAskDetailsToExecute,
                      bidAmountUSDSum: bidAmountUSDSum[0].bidAmountUSD,
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
  getAllAskUSD: function(req, res) {
    console.log("Enter into ask api getAllAskUSD :: ");
    AskUSD.find({
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
            AskUSD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksUSD: allAskDetailsToExecute,
                      askAmountUSDSum: askAmountUSDSum[0].askAmountUSD,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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
            BidUSD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsUSD: allAskDetailsToExecute,
                      bidAmountUSDSum: bidAmountUSDSum[0].bidAmountUSD,
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
  getAsksUSDSuccess: function(req, res) {
    console.log("Enter into ask api getAsksUSDSuccess :: ");
    AskUSD.find({
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
            AskUSD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountUSDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksUSD: allAskDetailsToExecute,
                      askAmountUSDSum: askAmountUSDSum[0].askAmountUSD,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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