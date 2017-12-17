/**
 * TrademarketBCHTRYController
 *
 * @description :: Server-side logic for managing trademarketbchtries
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

  addAskTRYMarket: async function(req, res) {
    console.log("Enter into ask api addAskTRYMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountTRY = new BigNumber(req.body.askAmountTRY);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountTRY || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountTRY < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userTRYBalanceInDb = new BigNumber(userAsker.TRYbalance);
    var userFreezedTRYBalanceInDb = new BigNumber(userAsker.FreezedTRYbalance);

    userTRYBalanceInDb = parseFloat(userTRYBalanceInDb);
    userFreezedTRYBalanceInDb = parseFloat(userFreezedTRYBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountTRY.greaterThanOrEqualTo(userTRYBalanceInDb)) {
      return res.json({
        "message": "You have insufficient TRY Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountTRY :: " + userAskAmountTRY);
    console.log("userTRYBalanceInDb :: " + userTRYBalanceInDb);
    // if (userAskAmountTRY >= userTRYBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient TRY Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountTRY = parseFloat(userAskAmountTRY);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskTRY.create({
        askAmountBCH: userAskAmountBCH,
        askAmountTRY: userAskAmountTRY,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountTRY: userAskAmountTRY,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerTRY: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.TRY_ASK_ADDED, askDetails);
    // var updateUserTRYBalance = (parseFloat(userTRYBalanceInDb) - parseFloat(userAskAmountTRY));
    // var updateFreezedTRYBalance = (parseFloat(userFreezedTRYBalanceInDb) + parseFloat(userAskAmountTRY));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userTRYBalanceInDb = new BigNumber(userTRYBalanceInDb);
    var updateUserTRYBalance = userTRYBalanceInDb.minus(userAskAmountTRY);
    updateUserTRYBalance = parseFloat(updateUserTRYBalance);
    userFreezedTRYBalanceInDb = new BigNumber(userFreezedTRYBalanceInDb);
    var updateFreezedTRYBalance = userFreezedTRYBalanceInDb.plus(userAskAmountTRY);
    updateFreezedTRYBalance = parseFloat(updateFreezedTRYBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedTRYbalance: updateFreezedTRYBalance,
        TRYbalance: updateUserTRYBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidTRY.find({
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
        message: 'Failed to find TRY bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingTRY = new BigNumber(userAskAmountTRY);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of TRY
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountTRY;
      }
      if (total_bid <= totoalAskRemainingTRY) {
        console.log("Inside of total_bid <= totoalAskRemainingTRY");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingTRY");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingTRY :: " + totoalAskRemainingTRY);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingTRY = (parseFloat(totoalAskRemainingTRY) - parseFloat(currentBidDetails.bidAmountTRY));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingTRY = totoalAskRemainingTRY.minus(currentBidDetails.bidAmountTRY);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingTRY :: " + totoalAskRemainingTRY);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingTRY == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingTRY == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerTRY
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerTRY
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(currentBidDetails.bidAmountTRY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of TRY Update user " + updatedTRYbalanceBidder);
            //var txFeesBidderTRY = (parseFloat(currentBidDetails.bidAmountTRY) * parseFloat(txFeeWithdrawSuccessTRY));
            // var txFeesBidderTRY = new BigNumber(currentBidDetails.bidAmountTRY);
            //
            // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY)
            // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
            // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


            //updatedTRYbalanceBidder =  parseFloat(updatedTRYbalanceBidder);

            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                TRYbalance: updatedTRYbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and TRY balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedTRYbalanceAsker = parseFloat(totoalAskRemainingTRY);
            //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);

            //updatedFreezedTRYbalanceAsker =  parseFloat(updatedFreezedTRYbalanceAsker);
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
            console.log("After deduct TX Fees of TRY Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedTRYbalance: updatedFreezedTRYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed TRYBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidTRY:: ");
            try {
              var bidDestroy = await BidTRY.update({
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
            sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskTRY.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskTRY.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskTRY',
                statusCode: 401
              });
            }
            //emitting event of destruction of TRY_ask
            sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingTRY == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerTRY " + currentBidDetails.bidownerTRY);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerTRY
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(currentBidDetails.bidAmountTRY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of TRY 089089Update user " + updatedTRYbalanceBidder);
            // var txFeesBidderTRY = (parseFloat(currentBidDetails.bidAmountTRY) * parseFloat(txFeeWithdrawSuccessTRY));
            // var txFeesBidderTRY = new BigNumber(currentBidDetails.bidAmountTRY);
            // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
            // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            // // updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
            // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedTRYbalanceBidder:: " + updatedTRYbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                TRYbalance: updatedTRYbalanceBidder
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
              var desctroyCurrentBid = await BidTRY.update({
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
            sails.sockets.blast(constants.TRY_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerTRY
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerTRY");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(totoalAskRemainingTRY));
            //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
            console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
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
            console.log("After deduct TX Fees of TRY Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedTRYbalance: updatedFreezedTRYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskTRY.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountTRY: parseFloat(totoalAskRemainingTRY),
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
            sails.sockets.blast(constants.TRY_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingTRY :: " + totoalAskRemainingTRY);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingTRY = totoalAskRemainingTRY - allBidsFromdb[i].bidAmountTRY;
          if (totoalAskRemainingTRY >= currentBidDetails.bidAmountTRY) {
            //totoalAskRemainingTRY = (parseFloat(totoalAskRemainingTRY) - parseFloat(currentBidDetails.bidAmountTRY));
            totoalAskRemainingTRY = totoalAskRemainingTRY.minus(currentBidDetails.bidAmountTRY);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingTRY == 0::: " + totoalAskRemainingTRY);

            if (totoalAskRemainingTRY == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingTRY == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerTRY
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
                  id: askDetails.askownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerTRY :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));
              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(currentBidDetails.bidAmountTRY);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 TRY Update user " + updatedTRYbalanceBidder);
              //var txFeesBidderTRY = (parseFloat(currentBidDetails.bidAmountTRY) * parseFloat(txFeeWithdrawSuccessTRY));

              // var txFeesBidderTRY = new BigNumber(currentBidDetails.bidAmountTRY);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);
              // console.log("After deduct TX Fees of TRY Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerTRY
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  TRYbalance: updatedTRYbalanceBidder
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
              //var updatedFreezedTRYbalanceAsker = parseFloat(totoalAskRemainingTRY);
              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(totoalAskRemainingTRY));
              //var updatedFreezedTRYbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY)) + parseFloat(totoalAskRemainingTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.plus(totoalAskRemainingTRY);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
              console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
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

              console.log("After deduct TX Fees of TRY Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerTRY
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidTRY.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidTRY.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidTRY.update({
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskTRY.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskTRY.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskTRY.update({
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
              sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingTRY == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerTRY " + currentBidDetails.bidownerTRY);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerTRY
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

              //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(currentBidDetails.bidAmountTRY));
              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(currentBidDetails.bidAmountTRY);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var txFeesBidderTRY = (parseFloat(currentBidDetails.bidAmountTRY) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(currentBidDetails.bidAmountTRY);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);
              // console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedTRYbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingTRY " + totoalAskRemainingTRY);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerTRY
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  TRYbalance: updatedTRYbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidTRY.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidTRY.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.TRY_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerTRY
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
            //var updatedBidAmountTRY = (parseFloat(currentBidDetails.bidAmountTRY) - parseFloat(totoalAskRemainingTRY));
            var updatedBidAmountTRY = new BigNumber(currentBidDetails.bidAmountTRY);
            updatedBidAmountTRY = updatedBidAmountTRY.minus(totoalAskRemainingTRY);

            try {
              var updatedaskDetails = await BidTRY.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountTRY: updatedBidAmountTRY,
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
            sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerTRY
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


            //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.TRYbalance) + parseFloat(totoalAskRemainingTRY));

            var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.TRYbalance);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(totoalAskRemainingTRY);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of TRY Update user " + updatedTRYbalanceBidder);
            //var TRYAmountSucess = parseFloat(totoalAskRemainingTRY);
            //var TRYAmountSucess = new BigNumber(totoalAskRemainingTRY);
            //var txFeesBidderTRY = (parseFloat(TRYAmountSucess) * parseFloat(txFeeWithdrawSuccessTRY));
            //var txFeesBidderTRY = (parseFloat(totoalAskRemainingTRY) * parseFloat(txFeeWithdrawSuccessTRY));



            // var txFeesBidderTRY = new BigNumber(totoalAskRemainingTRY);
            // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
            //
            // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
            // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

            console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
            console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedTRYbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerTRY
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                TRYbalance: updatedTRYbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerTRY");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(userAskAmountTRY));
            var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
            updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(userAskAmountTRY);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of TRY Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedTRYbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingTRY " + totoalAskRemainingTRY);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerTRY
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedTRYbalance: updatedFreezedTRYbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskTRY.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskTRY.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskTRY.update({
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
            //emitting event for TRY_ask destruction
            sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
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
  addBidTRYMarket: async function(req, res) {
    console.log("Enter into ask api addBidTRYMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountTRY = new BigNumber(req.body.bidAmountTRY);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountTRY = parseFloat(userBidAmountTRY);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountTRY || !userBidAmountBCH ||
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
      var bidDetails = await BidTRY.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountTRY: userBidAmountTRY,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountTRY: userBidAmountTRY,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerTRY: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.TRY_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskTRY.find({
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
        var totoalBidRemainingTRY = new BigNumber(userBidAmountTRY);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of TRY
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountTRY;
        }
        if (total_ask <= totoalBidRemainingTRY) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingTRY :: " + totoalBidRemainingTRY);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingTRY = totoalBidRemainingTRY - allAsksFromdb[i].bidAmountTRY;
            //totoalBidRemainingTRY = (parseFloat(totoalBidRemainingTRY) - parseFloat(currentAskDetails.askAmountTRY));
            totoalBidRemainingTRY = totoalBidRemainingTRY.minus(currentAskDetails.askAmountTRY);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingTRY == 0::: " + totoalBidRemainingTRY);
            if (totoalBidRemainingTRY == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingTRY == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerTRY totoalBidRemainingTRY == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(currentAskDetails.askAmountTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(currentAskDetails.askAmountTRY);
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
              console.log("After deduct TX Fees of TRY Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedTRYbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
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
                  id: bidDetails.bidownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and TRY  give to bidder
              //var updatedTRYbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.TRYbalance) + parseFloat(totoalBidRemainingTRY)) - parseFloat(totoalBidRemainingBCH);
              //var updatedTRYbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.TRYbalance) + parseFloat(userBidAmountTRY)) - parseFloat(totoalBidRemainingTRY));
              var updatedTRYbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(totoalBidRemainingTRY);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainTRY updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var TRYAmountSucess = (parseFloat(userBidAmountTRY) - parseFloat(totoalBidRemainingTRY));
              // var TRYAmountSucess = new BigNumber(userBidAmountTRY);
              // TRYAmountSucess = TRYAmountSucess.minus(totoalBidRemainingTRY);
              //
              // //var txFeesBidderTRY = (parseFloat(TRYAmountSucess) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(TRYAmountSucess);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              //
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingTRY == 0updatedTRYbalanceBidder ::: " + updatedTRYbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingTRY asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingTRY == 0BidTRY.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidTRY.destroy({
              //   id: bidDetails.bidownerTRY
              // });
              try {
                var bidDestroy = await BidTRY.update({
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0AskTRY.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskTRY.destroy({
              //   id: currentAskDetails.askownerTRY
              // });
              try {
                var askDestroy = await AskTRY.update({
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
              sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0  enter into else of totoalBidRemainingTRY == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0start User.findOne currentAskDetails.bidownerTRY ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(currentAskDetails.askAmountTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(currentAskDetails.askAmountTRY);
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

              console.log("After deduct TX Fees of TRY Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskTRY.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskTRY.update({
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

              sails.sockets.blast(constants.TRY_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingTRY == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingTRY == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerTRY");
              //var updatedTRYbalanceBidder = ((parseFloat(userAllDetailsInDBBid.TRYbalance) + parseFloat(userBidAmountTRY)) - parseFloat(totoalBidRemainingTRY));
              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBid.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(totoalBidRemainingTRY);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainTRY updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var TRYAmountSucess = (parseFloat(userBidAmountTRY) - parseFloat(totoalBidRemainingTRY));
              // var TRYAmountSucess = new BigNumber(userBidAmountTRY);
              // TRYAmountSucess = TRYAmountSucess.minus(totoalBidRemainingTRY);
              //
              // //var txFeesBidderTRY = (parseFloat(TRYAmountSucess) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(TRYAmountSucess);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              //
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);
              // console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedTRYbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountTRY totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidTRY.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountTRY: totoalBidRemainingTRY,
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingTRY :: " + totoalBidRemainingTRY);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingTRY = totoalBidRemainingTRY - allAsksFromdb[i].bidAmountTRY;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingTRY = totoalBidRemainingTRY.minus(currentAskDetails.askAmountTRY);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingTRY == 0::: " + totoalBidRemainingTRY);

              if (totoalBidRemainingTRY == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingTRY == 0Enter into totoalBidRemainingTRY == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerTRY
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
                    id: bidDetails.bidownerTRY
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingTRY == 0userAll bidDetails.askownerTRY :: ");
                console.log(" totoalBidRemainingTRY == 0Update value of Bidder and asker");
                //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(currentAskDetails.askAmountTRY));
                var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
                updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(currentAskDetails.askAmountTRY);

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

                console.log("After deduct TX Fees of TRY Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingTRY == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingTRY == 0updatedFreezedTRYbalanceAsker ::: " + updatedFreezedTRYbalanceAsker);
                console.log(" totoalBidRemainingTRY == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerTRY
                  }, {
                    FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedTRYbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(userBidAmountTRY)) - parseFloat(totoalBidRemainingTRY));

                var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
                updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);
                updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(totoalBidRemainingTRY);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainTRY totoalAskRemainingTRY " + totoalBidRemainingBCH);
                console.log("Total Ask RemainTRY BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainTRY updatedFreezedTRYbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
                //var TRYAmountSucess = (parseFloat(userBidAmountTRY) - parseFloat(totoalBidRemainingTRY));
                // var TRYAmountSucess = new BigNumber(userBidAmountTRY);
                // TRYAmountSucess = TRYAmountSucess.minus(totoalBidRemainingTRY);
                //
                //
                // //var txFeesBidderTRY = (parseFloat(TRYAmountSucess) * parseFloat(txFeeWithdrawSuccessTRY));
                // var txFeesBidderTRY = new BigNumber(TRYAmountSucess);
                // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
                // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
                // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
                // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
                //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
                updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);



                console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 updatedFreezedTRYbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerTRY
                  }, {
                    TRYbalance: updatedTRYbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 BidTRY.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskTRY.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskTRY.update({
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
                sails.sockets.blast(constants.TRY_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingTRY == 0 AskTRY.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidTRY.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidTRY.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 enter into else of totoalBidRemainingTRY == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0totoalBidRemainingTRY == 0 start User.findOne currentAskDetails.bidownerTRY " + currentAskDetails.bidownerTRY);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerTRY
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(currentAskDetails.askAmountTRY));

                var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
                updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(currentAskDetails.askAmountTRY);

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
                console.log("After deduct TX Fees of TRY Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 updatedFreezedTRYbalanceAsker:: " + updatedFreezedTRYbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingTRY " + totoalBidRemainingTRY);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerTRY
                  }, {
                    FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingTRY == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskTRY.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskTRY.update({
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
                sails.sockets.blast(constants.TRY_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountTRY = (parseFloat(currentAskDetails.askAmountTRY) - parseFloat(totoalBidRemainingTRY));

              var updatedAskAmountTRY = new BigNumber(currentAskDetails.askAmountTRY);
              updatedAskAmountTRY = updatedAskAmountTRY.minus(totoalBidRemainingTRY);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskTRY.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountTRY: updatedAskAmountTRY,
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
              sails.sockets.blast(constants.TRY_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedTRYbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedTRYbalance) - parseFloat(totoalBidRemainingTRY));
              var updatedFreezedTRYbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedTRYbalance);
              updatedFreezedTRYbalanceAsker = updatedFreezedTRYbalanceAsker.minus(totoalBidRemainingTRY);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainTRY totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainTRY userAllDetailsInDBAsker.FreezedTRYbalance " + userAllDetailsInDBAsker.FreezedTRYbalance);
              console.log("Total Ask RemainTRY updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of TRY Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedTRYbalanceAsker:: " + updatedFreezedTRYbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedTRYbalanceAsker " + updatedFreezedTRYbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerTRY
                }, {
                  FreezedTRYbalance: updatedFreezedTRYbalanceAsker,
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
                  id: bidDetails.bidownerTRY
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerTRY");
              //var updatedTRYbalanceBidder = (parseFloat(userAllDetailsInDBBidder.TRYbalance) + parseFloat(userBidAmountTRY));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountTRY " + userBidAmountTRY);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.TRYbalance " + userAllDetailsInDBBidder.TRYbalance);

              var updatedTRYbalanceBidder = new BigNumber(userAllDetailsInDBBidder.TRYbalance);
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.plus(userBidAmountTRY);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);
              //var txFeesBidderTRY = (parseFloat(updatedTRYbalanceBidder) * parseFloat(txFeeWithdrawSuccessTRY));
              // var txFeesBidderTRY = new BigNumber(userBidAmountTRY);
              // txFeesBidderTRY = txFeesBidderTRY.times(txFeeWithdrawSuccessTRY);
              //
              // console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              // //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              // updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderTRY = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderTRY :: " + txFeesBidderTRY);
              //updatedTRYbalanceBidder = (parseFloat(updatedTRYbalanceBidder) - parseFloat(txFeesBidderTRY));
              updatedTRYbalanceBidder = updatedTRYbalanceBidder.minus(txFeesBidderTRY);

              console.log("After deduct TX Fees of TRY Update user " + updatedTRYbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedTRYbalanceBidder ::: " + updatedTRYbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedTRYbalanceBidder " + updatedTRYbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingTRY " + totoalBidRemainingTRY);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerTRY
                }, {
                  TRYbalance: updatedTRYbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidTRY.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidTRY.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidTRY.update({
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, bidDestroy);
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
  removeBidTRYMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdTRY;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidTRY.findOne({
      bidownerTRY: bidownerId,
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
            BidTRY.update({
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
              sails.sockets.blast(constants.TRY_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskTRYMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdTRY;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskTRY.findOne({
      askownerTRY: askownerId,
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
        var userTRYBalanceInDb = parseFloat(user.TRYbalance);
        var askAmountOfTRYInAskTableDB = parseFloat(askDetails.askAmountTRY);
        var userFreezedTRYbalanceInDB = parseFloat(user.FreezedTRYbalance);
        console.log("userTRYBalanceInDb :" + userTRYBalanceInDb);
        console.log("askAmountOfTRYInAskTableDB :" + askAmountOfTRYInAskTableDB);
        console.log("userFreezedTRYbalanceInDB :" + userFreezedTRYbalanceInDB);
        var updateFreezedTRYBalance = (parseFloat(userFreezedTRYbalanceInDB) - parseFloat(askAmountOfTRYInAskTableDB));
        var updateUserTRYBalance = (parseFloat(userTRYBalanceInDb) + parseFloat(askAmountOfTRYInAskTableDB));
        User.update({
            id: askownerId
          }, {
            TRYbalance: parseFloat(updateUserTRYBalance),
            FreezedTRYbalance: parseFloat(updateFreezedTRYBalance)
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
            AskTRY.update({
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
              sails.sockets.blast(constants.TRY_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidTRY: function(req, res) {
    console.log("Enter into ask api getAllBidTRY :: ");
    BidTRY.find({
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
            BidTRY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountTRY')
              .exec(function(err, bidAmountTRYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountTRYSum",
                    statusCode: 401
                  });
                }
                BidTRY.find({
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
                        "message": "Error to sum Of bidAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsTRY: allAskDetailsToExecute,
                      bidAmountTRYSum: bidAmountTRYSum[0].bidAmountTRY,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
  getAllAskTRY: function(req, res) {
    console.log("Enter into ask api getAllAskTRY :: ");
    AskTRY.find({
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
            AskTRY.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountTRY')
              .exec(function(err, askAmountTRYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountTRYSum",
                    statusCode: 401
                  });
                }
                AskTRY.find({
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
                        "message": "Error to sum Of askAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksTRY: allAskDetailsToExecute,
                      askAmountTRYSum: askAmountTRYSum[0].askAmountTRY,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskTRY Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsTRYSuccess: function(req, res) {
    console.log("Enter into ask api getBidsTRYSuccess :: ");
    BidTRY.find({
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
            BidTRY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountTRY')
              .exec(function(err, bidAmountTRYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountTRYSum",
                    statusCode: 401
                  });
                }
                BidTRY.find({
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
                        "message": "Error to sum Of bidAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsTRY: allAskDetailsToExecute,
                      bidAmountTRYSum: bidAmountTRYSum[0].bidAmountTRY,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
  getAsksTRYSuccess: function(req, res) {
    console.log("Enter into ask api getAsksTRYSuccess :: ");
    AskTRY.find({
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
            AskTRY.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountTRY')
              .exec(function(err, askAmountTRYSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountTRYSum",
                    statusCode: 401
                  });
                }
                AskTRY.find({
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
                        "message": "Error to sum Of askAmountTRYSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksTRY: allAskDetailsToExecute,
                      askAmountTRYSum: askAmountTRYSum[0].askAmountTRY,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskTRY Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};