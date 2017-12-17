/**
 * TrademarketBCHNZDController
 *NZD
 * @description :: Server-side logic for managing trademarketbchnzds
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

  addAskNZDMarket: async function(req, res) {
    console.log("Enter into ask api addAskNZDMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountNZD = new BigNumber(req.body.askAmountNZD);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountNZD || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountNZD < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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
    var userNZDBalanceInDb = new BigNumber(userAsker.NZDbalance);
    var userFreezedNZDBalanceInDb = new BigNumber(userAsker.FreezedNZDbalance);

    userNZDBalanceInDb = parseFloat(userNZDBalanceInDb);
    userFreezedNZDBalanceInDb = parseFloat(userFreezedNZDBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountNZD.greaterThanOrEqualTo(userNZDBalanceInDb)) {
      return res.json({
        "message": "You have insufficient NZD Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountNZD :: " + userAskAmountNZD);
    console.log("userNZDBalanceInDb :: " + userNZDBalanceInDb);
    // if (userAskAmountNZD >= userNZDBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient NZD Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountNZD = parseFloat(userAskAmountNZD);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskNZD.create({
        askAmountBCH: userAskAmountBCH,
        askAmountNZD: userAskAmountNZD,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountNZD: userAskAmountNZD,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        askownerNZD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.NZD_ASK_ADDED, askDetails);
    // var updateUserNZDBalance = (parseFloat(userNZDBalanceInDb) - parseFloat(userAskAmountNZD));
    // var updateFreezedNZDBalance = (parseFloat(userFreezedNZDBalanceInDb) + parseFloat(userAskAmountNZD));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userNZDBalanceInDb = new BigNumber(userNZDBalanceInDb);
    var updateUserNZDBalance = userNZDBalanceInDb.minus(userAskAmountNZD);
    updateUserNZDBalance = parseFloat(updateUserNZDBalance);
    userFreezedNZDBalanceInDb = new BigNumber(userFreezedNZDBalanceInDb);
    var updateFreezedNZDBalance = userFreezedNZDBalanceInDb.plus(userAskAmountNZD);
    updateFreezedNZDBalance = parseFloat(updateFreezedNZDBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedNZDbalance: updateFreezedNZDBalance,
        NZDbalance: updateUserNZDBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidNZD.find({
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
        message: 'Failed to find NZD bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingNZD = new BigNumber(userAskAmountNZD);
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
      //this loop for sum of all Bids amount of NZD
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountNZD;
      }
      if (total_bid <= totoalAskRemainingNZD) {
        console.log("Inside of total_bid <= totoalAskRemainingNZD");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingNZD");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingNZD :: " + totoalAskRemainingNZD);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingNZD = (parseFloat(totoalAskRemainingNZD) - parseFloat(currentBidDetails.bidAmountNZD));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingNZD = totoalAskRemainingNZD.minus(currentBidDetails.bidAmountNZD);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingNZD :: " + totoalAskRemainingNZD);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

          if (totoalAskRemainingNZD == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingNZD == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerNZD
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerNZD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedNZDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.NZDbalance) + parseFloat(currentBidDetails.bidAmountNZD));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            var updatedNZDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.NZDbalance);
            updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(currentBidDetails.bidAmountNZD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of NZD Update user " + updatedNZDbalanceBidder);
            //var txFeesBidderNZD = (parseFloat(currentBidDetails.bidAmountNZD) * parseFloat(txFeeWithdrawSuccessNZD));
            // var txFeesBidderNZD = new BigNumber(currentBidDetails.bidAmountNZD);
            //
            // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD)
            // console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
            // //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
            // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
            updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);


            //updatedNZDbalanceBidder =  parseFloat(updatedNZDbalanceBidder);

            console.log("After deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingNZD " + totoalAskRemainingNZD);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerNZD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                NZDbalance: updatedNZDbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and NZD balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedNZDbalanceAsker = parseFloat(totoalAskRemainingNZD);
            //var updatedFreezedNZDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(userAskAmountNZD)) + parseFloat(totoalAskRemainingNZD));
            var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
            updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(userAskAmountNZD);
            updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.plus(totoalAskRemainingNZD);

            //updatedFreezedNZDbalanceAsker =  parseFloat(updatedFreezedNZDbalanceAsker);
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
            console.log("After deduct TX Fees of NZD Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingNZD " + totoalAskRemainingNZD);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerNZD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedNZDbalance: updatedFreezedNZDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed NZDBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidNZD:: ");
            try {
              var bidDestroy = await BidNZD.update({
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
            sails.sockets.blast(constants.NZD_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskNZD.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskNZD.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskNZD',
                statusCode: 401
              });
            }
            //emitting event of destruction of NZD_ask
            sails.sockets.blast(constants.NZD_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingNZD == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerNZD " + currentBidDetails.bidownerNZD);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerNZD
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedNZDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.NZDbalance) + parseFloat(currentBidDetails.bidAmountNZD));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            var updatedNZDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.NZDbalance);
            updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(currentBidDetails.bidAmountNZD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of NZD 089089Update user " + updatedNZDbalanceBidder);
            // var txFeesBidderNZD = (parseFloat(currentBidDetails.bidAmountNZD) * parseFloat(txFeeWithdrawSuccessNZD));
            // var txFeesBidderNZD = new BigNumber(currentBidDetails.bidAmountNZD);
            // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD);
            // console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
            // // updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
            // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
            updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);


            console.log("After deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedNZDbalanceBidder:: " + updatedNZDbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingNZD " + totoalAskRemainingNZD);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerNZD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                NZDbalance: updatedNZDbalanceBidder
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
              var desctroyCurrentBid = await BidNZD.update({
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
            sails.sockets.blast(constants.NZD_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerNZD
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerNZD");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedNZDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(totoalAskRemainingNZD));
            //var updatedFreezedNZDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(userAskAmountNZD)) + parseFloat(totoalAskRemainingNZD));
            var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
            updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(userAskAmountNZD);
            updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.plus(totoalAskRemainingNZD);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainNZD totoalAskRemainingNZD " + totoalAskRemainingNZD);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainNZD userAllDetailsInDBAsker.FreezedNZDbalance " + userAllDetailsInDBAsker.FreezedNZDbalance);
            console.log("Total Ask RemainNZD updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
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
            console.log("After deduct TX Fees of NZD Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedNZDbalanceAsker ::: " + updatedFreezedNZDbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingNZD " + totoalAskRemainingNZD);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerNZD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedNZDbalance: updatedFreezedNZDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountNZD totoalAskRemainingNZD " + totoalAskRemainingNZD);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskNZD.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
                askAmountNZD: parseFloat(totoalAskRemainingNZD),
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
            sails.sockets.blast(constants.NZD_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingNZD :: " + totoalAskRemainingNZD);
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingNZD = totoalAskRemainingNZD - allBidsFromdb[i].bidAmountNZD;
          if (totoalAskRemainingNZD >= currentBidDetails.bidAmountNZD) {
            //totoalAskRemainingNZD = (parseFloat(totoalAskRemainingNZD) - parseFloat(currentBidDetails.bidAmountNZD));
            totoalAskRemainingNZD = totoalAskRemainingNZD.minus(currentBidDetails.bidAmountNZD);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
            console.log("start from here totoalAskRemainingNZD == 0::: " + totoalAskRemainingNZD);

            if (totoalAskRemainingNZD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingNZD == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerNZD
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
                  id: askDetails.askownerNZD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerNZD :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
              //var updatedNZDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.NZDbalance) + parseFloat(currentBidDetails.bidAmountNZD));
              var updatedNZDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.NZDbalance);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(currentBidDetails.bidAmountNZD);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 NZD Update user " + updatedNZDbalanceBidder);
              //var txFeesBidderNZD = (parseFloat(currentBidDetails.bidAmountNZD) * parseFloat(txFeeWithdrawSuccessNZD));

              // var txFeesBidderNZD = new BigNumber(currentBidDetails.bidAmountNZD);
              // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD);
              // console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              // //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
              // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);
              // console.log("After deduct TX Fees of NZD Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingNZD " + totoalAskRemainingNZD);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerNZD
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  NZDbalance: updatedNZDbalanceBidder
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
              //var updatedFreezedNZDbalanceAsker = parseFloat(totoalAskRemainingNZD);
              //var updatedFreezedNZDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(totoalAskRemainingNZD));
              //var updatedFreezedNZDbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(userAskAmountNZD)) + parseFloat(totoalAskRemainingNZD));
              var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
              updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(userAskAmountNZD);
              updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.plus(totoalAskRemainingNZD);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainNZD totoalAskRemainingNZD " + totoalAskRemainingNZD);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainNZD userAllDetailsInDBAsker.FreezedNZDbalance " + userAllDetailsInDBAsker.FreezedNZDbalance);
              console.log("Total Ask RemainNZD updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
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

              console.log("After deduct TX Fees of NZD Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedNZDbalanceAsker ::: " + updatedFreezedNZDbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingNZD " + totoalAskRemainingNZD);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerNZD
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
                  FreezedNZDbalance: updatedFreezedNZDbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidNZD.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidNZD.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidNZD.update({
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
              sails.sockets.blast(constants.NZD_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskNZD.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskNZD.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskNZD.update({
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
              sails.sockets.blast(constants.NZD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingNZD == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerNZD " + currentBidDetails.bidownerNZD);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerNZD
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

              //var updatedNZDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.NZDbalance) + parseFloat(currentBidDetails.bidAmountNZD));
              var updatedNZDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.NZDbalance);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(currentBidDetails.bidAmountNZD);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of NZD Update user " + updatedNZDbalanceBidder);
              //var txFeesBidderNZD = (parseFloat(currentBidDetails.bidAmountNZD) * parseFloat(txFeeWithdrawSuccessNZD));
              // var txFeesBidderNZD = new BigNumber(currentBidDetails.bidAmountNZD);
              // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD);
              // console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              // //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
              // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);
              // console.log("After deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedNZDbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingNZD " + totoalAskRemainingNZD);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerNZD
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  NZDbalance: updatedNZDbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidNZD.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidNZD.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.NZD_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerNZD
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
            //var updatedBidAmountNZD = (parseFloat(currentBidDetails.bidAmountNZD) - parseFloat(totoalAskRemainingNZD));
            var updatedBidAmountNZD = new BigNumber(currentBidDetails.bidAmountNZD);
            updatedBidAmountNZD = updatedBidAmountNZD.minus(totoalAskRemainingNZD);

            try {
              var updatedaskDetails = await BidNZD.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
                bidAmountNZD: updatedBidAmountNZD,
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
            sails.sockets.blast(constants.NZD_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerNZD
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


            //var updatedNZDbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.NZDbalance) + parseFloat(totoalAskRemainingNZD));

            var updatedNZDbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.NZDbalance);
            updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(totoalAskRemainingNZD);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of NZD Update user " + updatedNZDbalanceBidder);
            //var NZDAmountSucess = parseFloat(totoalAskRemainingNZD);
            //var NZDAmountSucess = new BigNumber(totoalAskRemainingNZD);
            //var txFeesBidderNZD = (parseFloat(NZDAmountSucess) * parseFloat(txFeeWithdrawSuccessNZD));
            //var txFeesBidderNZD = (parseFloat(totoalAskRemainingNZD) * parseFloat(txFeeWithdrawSuccessNZD));



            // var txFeesBidderNZD = new BigNumber(totoalAskRemainingNZD);
            // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD);
            //
            // //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
            // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

            //Need to change here ...111...............askDetails
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

            console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
            console.log("After deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedNZDbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingNZD " + totoalAskRemainingNZD);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerNZD
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                NZDbalance: updatedNZDbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerNZD");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedNZDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(userAskAmountNZD));
            var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
            updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(userAskAmountNZD);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of NZD Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedNZDbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingNZD " + totoalAskRemainingNZD);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerNZD
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedNZDbalance: updatedFreezedNZDbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskNZD.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskNZD.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskNZD.update({
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
            //emitting event for NZD_ask destruction
            sails.sockets.blast(constants.NZD_ASK_DESTROYED, askDestroy);
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
  addBidNZDMarket: async function(req, res) {
    console.log("Enter into ask api addBidNZDMarket :: " + JSON.stringify(req.body));
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountNZD = new BigNumber(req.body.bidAmountNZD);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountNZD = parseFloat(userBidAmountNZD);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountNZD || !userBidAmountBCH ||
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
      var bidDetails = await BidNZD.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountNZD: userBidAmountNZD,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountNZD: userBidAmountNZD,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
        bidownerNZD: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.NZD_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskNZD.find({
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
        var totoalBidRemainingNZD = new BigNumber(userBidAmountNZD);
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of NZD
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountNZD;
        }
        if (total_ask <= totoalBidRemainingNZD) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingNZD :: " + totoalBidRemainingNZD);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingNZD = totoalBidRemainingNZD - allAsksFromdb[i].bidAmountNZD;
            //totoalBidRemainingNZD = (parseFloat(totoalBidRemainingNZD) - parseFloat(currentAskDetails.askAmountNZD));
            totoalBidRemainingNZD = totoalBidRemainingNZD.minus(currentAskDetails.askAmountNZD);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
            console.log("start from here totoalBidRemainingNZD == 0::: " + totoalBidRemainingNZD);
            if (totoalBidRemainingNZD == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingNZD == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerNZD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerNZD totoalBidRemainingNZD == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedNZDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(currentAskDetails.askAmountNZD));
              var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
              updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(currentAskDetails.askAmountNZD);
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
              console.log("After deduct TX Fees of NZD Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedNZDbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingNZD " + totoalBidRemainingNZD);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerNZD
                }, {
                  FreezedNZDbalance: updatedFreezedNZDbalanceAsker,
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
                  id: bidDetails.bidownerNZD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBCHbalance of bidder deduct and NZD  give to bidder
              //var updatedNZDbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.NZDbalance) + parseFloat(totoalBidRemainingNZD)) - parseFloat(totoalBidRemainingBCH);
              //var updatedNZDbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.NZDbalance) + parseFloat(userBidAmountNZD)) - parseFloat(totoalBidRemainingNZD));
              var updatedNZDbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.NZDbalance);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(userBidAmountNZD);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(totoalBidRemainingNZD);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainNZD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainNZD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainNZD updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);
              //var NZDAmountSucess = (parseFloat(userBidAmountNZD) - parseFloat(totoalBidRemainingNZD));
              // var NZDAmountSucess = new BigNumber(userBidAmountNZD);
              // NZDAmountSucess = NZDAmountSucess.minus(totoalBidRemainingNZD);
              //
              // //var txFeesBidderNZD = (parseFloat(NZDAmountSucess) * parseFloat(txFeeWithdrawSuccessNZD));
              // var txFeesBidderNZD = new BigNumber(NZDAmountSucess);
              // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD);
              //
              // console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              // //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
              // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

              console.log("After deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingNZD == 0updatedNZDbalanceBidder ::: " + updatedNZDbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingNZD asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingNZD " + totoalBidRemainingNZD);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerNZD
                }, {
                  NZDbalance: updatedNZDbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingNZD == 0BidNZD.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidNZD.destroy({
              //   id: bidDetails.bidownerNZD
              // });
              try {
                var bidDestroy = await BidNZD.update({
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
              sails.sockets.blast(constants.NZD_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingNZD == 0AskNZD.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskNZD.destroy({
              //   id: currentAskDetails.askownerNZD
              // });
              try {
                var askDestroy = await AskNZD.update({
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
              sails.sockets.blast(constants.NZD_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingNZD == 0  enter into else of totoalBidRemainingNZD == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingNZD == 0start User.findOne currentAskDetails.bidownerNZD ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerNZD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingNZD == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedNZDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(currentAskDetails.askAmountNZD));
              var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
              updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(currentAskDetails.askAmountNZD);
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

              console.log("After deduct TX Fees of NZD Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingNZD == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingNZD == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingNZD " + totoalBidRemainingNZD);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerNZD
                }, {
                  FreezedNZDbalance: updatedFreezedNZDbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingNZD == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskNZD.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskNZD.update({
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

              sails.sockets.blast(constants.NZD_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingNZD == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingNZD == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerNZD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerNZD");
              //var updatedNZDbalanceBidder = ((parseFloat(userAllDetailsInDBBid.NZDbalance) + parseFloat(userBidAmountNZD)) - parseFloat(totoalBidRemainingNZD));
              var updatedNZDbalanceBidder = new BigNumber(userAllDetailsInDBBid.NZDbalance);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(userBidAmountNZD);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(totoalBidRemainingNZD);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainNZD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainNZD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainNZD updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);
              //var NZDAmountSucess = (parseFloat(userBidAmountNZD) - parseFloat(totoalBidRemainingNZD));
              // var NZDAmountSucess = new BigNumber(userBidAmountNZD);
              // NZDAmountSucess = NZDAmountSucess.minus(totoalBidRemainingNZD);
              //
              // //var txFeesBidderNZD = (parseFloat(NZDAmountSucess) * parseFloat(txFeeWithdrawSuccessNZD));
              // var txFeesBidderNZD = new BigNumber(NZDAmountSucess);
              // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD);
              //
              // console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              // //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
              // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);
              // console.log("After deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedNZDbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingNZD " + totoalBidRemainingNZD);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerNZD
                }, {
                  NZDbalance: updatedNZDbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountNZD totoalBidRemainingNZD " + totoalBidRemainingNZD);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidNZD.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
                  bidAmountNZD: totoalBidRemainingNZD,
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
              sails.sockets.blast(constants.NZD_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingNZD :: " + totoalBidRemainingNZD);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingNZD = totoalBidRemainingNZD - allAsksFromdb[i].bidAmountNZD;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingNZD = totoalBidRemainingNZD.minus(currentAskDetails.askAmountNZD);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingNZD == 0::: " + totoalBidRemainingNZD);

              if (totoalBidRemainingNZD == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingNZD == 0Enter into totoalBidRemainingNZD == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerNZD
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
                    id: bidDetails.bidownerNZD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingNZD == 0userAll bidDetails.askownerNZD :: ");
                console.log(" totoalBidRemainingNZD == 0Update value of Bidder and asker");
                //var updatedFreezedNZDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(currentAskDetails.askAmountNZD));
                var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
                updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(currentAskDetails.askAmountNZD);

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

                console.log("After deduct TX Fees of NZD Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingNZD == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingNZD == 0updatedFreezedNZDbalanceAsker ::: " + updatedFreezedNZDbalanceAsker);
                console.log(" totoalBidRemainingNZD == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingNZD " + totoalBidRemainingNZD);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerNZD
                  }, {
                    FreezedNZDbalance: updatedFreezedNZDbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedNZDbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.NZDbalance) + parseFloat(userBidAmountNZD)) - parseFloat(totoalBidRemainingNZD));

                var updatedNZDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.NZDbalance);
                updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(userBidAmountNZD);
                updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(totoalBidRemainingNZD);

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainNZD totoalAskRemainingNZD " + totoalBidRemainingBCH);
                console.log("Total Ask RemainNZD BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainNZD updatedFreezedNZDbalanceAsker " + updatedFreezedBCHbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);
                //var NZDAmountSucess = (parseFloat(userBidAmountNZD) - parseFloat(totoalBidRemainingNZD));
                // var NZDAmountSucess = new BigNumber(userBidAmountNZD);
                // NZDAmountSucess = NZDAmountSucess.minus(totoalBidRemainingNZD);
                //
                //
                // //var txFeesBidderNZD = (parseFloat(NZDAmountSucess) * parseFloat(txFeeWithdrawSuccessNZD));
                // var txFeesBidderNZD = new BigNumber(NZDAmountSucess);
                // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD);
                // console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
                // //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
                // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
                //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
                updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);



                console.log("After deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingNZD == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingNZD == 0 updatedFreezedNZDbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingNZD " + totoalBidRemainingNZD);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerNZD
                  }, {
                    NZDbalance: updatedNZDbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingNZD == 0 BidNZD.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskNZD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskNZD.update({
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
                sails.sockets.blast(constants.NZD_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingNZD == 0 AskNZD.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidNZD.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidNZD.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.NZD_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingNZD == 0 enter into else of totoalBidRemainingNZD == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingNZD == 0totoalBidRemainingNZD == 0 start User.findOne currentAskDetails.bidownerNZD " + currentAskDetails.bidownerNZD);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerNZD
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingNZD == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedNZDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(currentAskDetails.askAmountNZD));

                var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
                updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(currentAskDetails.askAmountNZD);

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
                console.log("After deduct TX Fees of NZD Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingNZD == 0 updatedFreezedNZDbalanceAsker:: " + updatedFreezedNZDbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingNZD == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingNZD " + totoalBidRemainingNZD);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerNZD
                  }, {
                    FreezedNZDbalance: updatedFreezedNZDbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingNZD == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskNZD.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskNZD.update({
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
                sails.sockets.blast(constants.NZD_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountNZD = (parseFloat(currentAskDetails.askAmountNZD) - parseFloat(totoalBidRemainingNZD));

              var updatedAskAmountNZD = new BigNumber(currentAskDetails.askAmountNZD);
              updatedAskAmountNZD = updatedAskAmountNZD.minus(totoalBidRemainingNZD);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskNZD.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
                  askAmountNZD: updatedAskAmountNZD,
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
              sails.sockets.blast(constants.NZD_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerNZD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedNZDbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedNZDbalance) - parseFloat(totoalBidRemainingNZD));
              var updatedFreezedNZDbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedNZDbalance);
              updatedFreezedNZDbalanceAsker = updatedFreezedNZDbalanceAsker.minus(totoalBidRemainingNZD);

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainNZD totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainNZD userAllDetailsInDBAsker.FreezedNZDbalance " + userAllDetailsInDBAsker.FreezedNZDbalance);
              console.log("Total Ask RemainNZD updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of NZD Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedNZDbalanceAsker:: " + updatedFreezedNZDbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedNZDbalanceAsker " + updatedFreezedNZDbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingNZD " + totoalBidRemainingNZD);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerNZD
                }, {
                  FreezedNZDbalance: updatedFreezedNZDbalanceAsker,
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
                  id: bidDetails.bidownerNZD
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerNZD");
              //var updatedNZDbalanceBidder = (parseFloat(userAllDetailsInDBBidder.NZDbalance) + parseFloat(userBidAmountNZD));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountNZD " + userBidAmountNZD);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.NZDbalance " + userAllDetailsInDBBidder.NZDbalance);

              var updatedNZDbalanceBidder = new BigNumber(userAllDetailsInDBBidder.NZDbalance);
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.plus(userBidAmountNZD);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);
              //var txFeesBidderNZD = (parseFloat(updatedNZDbalanceBidder) * parseFloat(txFeeWithdrawSuccessNZD));
              // var txFeesBidderNZD = new BigNumber(userBidAmountNZD);
              // txFeesBidderNZD = txFeesBidderNZD.times(txFeeWithdrawSuccessNZD);
              //
              // console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              // //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
              // updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderNZD = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderNZD :: " + txFeesBidderNZD);
              //updatedNZDbalanceBidder = (parseFloat(updatedNZDbalanceBidder) - parseFloat(txFeesBidderNZD));
              updatedNZDbalanceBidder = updatedNZDbalanceBidder.minus(txFeesBidderNZD);

              console.log("After deduct TX Fees of NZD Update user " + updatedNZDbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedNZDbalanceBidder ::: " + updatedNZDbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedNZDbalanceBidder " + updatedNZDbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingNZD " + totoalBidRemainingNZD);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerNZD
                }, {
                  NZDbalance: updatedNZDbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidNZD.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidNZD.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidNZD.update({
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
              sails.sockets.blast(constants.NZD_BID_DESTROYED, bidDestroy);
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
  removeBidNZDMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdNZD;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidNZD.findOne({
      bidownerNZD: bidownerId,
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
            BidNZD.update({
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
              sails.sockets.blast(constants.NZD_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskNZDMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdNZD;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskNZD.findOne({
      askownerNZD: askownerId,
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
        var userNZDBalanceInDb = parseFloat(user.NZDbalance);
        var askAmountOfNZDInAskTableDB = parseFloat(askDetails.askAmountNZD);
        var userFreezedNZDbalanceInDB = parseFloat(user.FreezedNZDbalance);
        console.log("userNZDBalanceInDb :" + userNZDBalanceInDb);
        console.log("askAmountOfNZDInAskTableDB :" + askAmountOfNZDInAskTableDB);
        console.log("userFreezedNZDbalanceInDB :" + userFreezedNZDbalanceInDB);
        var updateFreezedNZDBalance = (parseFloat(userFreezedNZDbalanceInDB) - parseFloat(askAmountOfNZDInAskTableDB));
        var updateUserNZDBalance = (parseFloat(userNZDBalanceInDb) + parseFloat(askAmountOfNZDInAskTableDB));
        User.update({
            id: askownerId
          }, {
            NZDbalance: parseFloat(updateUserNZDBalance),
            FreezedNZDbalance: parseFloat(updateFreezedNZDBalance)
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
            AskNZD.update({
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
              sails.sockets.blast(constants.NZD_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidNZD: function(req, res) {
    console.log("Enter into ask api getAllBidNZD :: ");
    BidNZD.find({
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
            BidNZD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountNZD')
              .exec(function(err, bidAmountNZDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountNZDSum",
                    statusCode: 401
                  });
                }
                BidNZD.find({
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
                        "message": "Error to sum Of bidAmountNZDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsNZD: allAskDetailsToExecute,
                      bidAmountNZDSum: bidAmountNZDSum[0].bidAmountNZD,
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
  getAllAskNZD: function(req, res) {
    console.log("Enter into ask api getAllAskNZD :: ");
    AskNZD.find({
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
            AskNZD.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountNZD')
              .exec(function(err, askAmountNZDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountNZDSum",
                    statusCode: 401
                  });
                }
                AskNZD.find({
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
                        "message": "Error to sum Of askAmountNZDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksNZD: allAskDetailsToExecute,
                      askAmountNZDSum: askAmountNZDSum[0].askAmountNZD,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskNZD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsNZDSuccess: function(req, res) {
    console.log("Enter into ask api getBidsNZDSuccess :: ");
    BidNZD.find({
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
            BidNZD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('bidAmountNZD')
              .exec(function(err, bidAmountNZDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountNZDSum",
                    statusCode: 401
                  });
                }
                BidNZD.find({
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
                        "message": "Error to sum Of bidAmountNZDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsNZD: allAskDetailsToExecute,
                      bidAmountNZDSum: bidAmountNZDSum[0].bidAmountNZD,
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
  getAsksNZDSuccess: function(req, res) {
    console.log("Enter into ask api getAsksNZDSuccess :: ");
    AskNZD.find({
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
            AskNZD.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BCHMARKETID
                }
              })
              .sum('askAmountNZD')
              .exec(function(err, askAmountNZDSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountNZDSum",
                    statusCode: 401
                  });
                }
                AskNZD.find({
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
                        "message": "Error to sum Of askAmountNZDSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksNZD: allAskDetailsToExecute,
                      askAmountNZDSum: askAmountNZDSum[0].askAmountNZD,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskNZD Found!!",
              statusCode: 401
            });
          }
        }
      });
  },

};