/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
 */
var bitcoinBCH = require('bitcoin');
var clientBCH = new bitcoinBCH.Client({
  host: 'localhost',
  port: 18332,
  user: 'test',
  pass: 'test123'
});
//BTC Wallet Details
var bitcoinBTC = require('bitcoin');
var clientBTC = new bitcoinBTC.Client({
  host: '162.213.252.66',
  port: 18332,
  user: 'test',
  pass: 'test123'
});

module.exports.bootstrap = function(cb) {

  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  console.log("Checking Server details..........");
  cb();
  // clientBCH.cmd('getinfo', function(err, newBCHDetails, resHeaders) {
  //   if (err) {
  //     console.log("BCH Server not running................." + newBCHDetails);
  //   } else {
  //     console.log("\n\n\nBCH Server  running................." + JSON.stringify(newBCHDetails));
  //     clientBCH.cmd('getinfo', function(err, newBTCDetails, resHeaders) {
  //       if (err) {
  //         console.log("BTC Server not running................." + newBTCDetails);
  //       } else {
  //         console.log("BTC Server  running................." + JSON.stringify(newBTCDetails));
  //         cb();
  //       }
  //     });
  //
  //   }
  // });

};
