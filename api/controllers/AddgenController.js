/**
 * AddgenController
 *
 * @description :: Server-side logic for managing addgens
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  getNewINRWAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      if (user.isINRWAddress) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientINRW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from INRW server",
            statusCode: 400
          });
        }
        console.log('INRW address generated', address);
        if (!user.isINRWAddress) {
          User.update({
            email: userMailId
          }, {
            isINRWAddress: true,
            userINRAddress: true
          }).exec(function afterwards(err, updated) {
            console.log("Easdlkfjasldfjalskdfjalsdfjl...............");
            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              statusCode: 200
            });
          });
        }
      });
    });
  },
};