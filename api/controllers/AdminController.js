/**
 * AdminController
 *
 * @description :: Server-side logic for managing admins
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  getAllUsers: function(req, res, next) {
    console.log("Enter into getAllDetailsOfUser");

    User.find()
      .exec(function(err, user) {
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
        } else {
          return res.json({
            users: user,
            statusCode: 200
          });
        }
      });
  },
  disableUser: function(req, res, next) {
    console.log("Enter into disableUser " + req.body.userMailId);
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
        email: userMailId
      })
      .exec(function(err, user) {
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
        console.log(JSON.stringify(user));
        console.log(user.email);
        if (user.isUserDisable) {
          return res.json({
            "message": "User already disabled!",
            statusCode: 401
          });
        } else {
          User.update({
              email: userMailId
            }, {
              isUserDisable: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update isUserDisable!",
                  statusCode: 401
                });
              }
              return res.json({
                "message": "User disabled successfully!",
                statusCode: 200
              });
            });

        }
      });
  },
  enableUser: function(req, res, next) {
    console.log("Enter into enableUser");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
        email: userMailId
      })
      .exec(function(err, user) {
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
        } else {
          console.log(JSON.stringify(user.isUserDisable));
          if (!user.isUserDisable) {
            return res.json({
              "message": "User already enabled!",
              statusCode: 401
            });
          } else {
            User.update({
                email: userMailId
              }, {
                isUserDisable: false
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update enabled User!",
                    statusCode: 401
                  });
                }
                return res.json({
                  "message": "User enabled successfully!",
                  statusCode: 200
                });
              });
          }
        }
      });
  },
  freezUser: function(req, res, next) {
    console.log("Enter into freezUser " + req.body.userMailId);
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
        email: userMailId
      })
      .exec(function(err, user) {
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
        console.log(JSON.stringify(user));
        if (user.isUserFreezed) {
          return res.json({
            "message": "User already Freezed!",
            statusCode: 401
          });
        } else {
          User.update({
              email: userMailId
            }, {
              isUserFreezed: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update isUserDisable!",
                  statusCode: 401
                });
              }
              return res.json({
                "message": "User disabled successfully!",
                statusCode: 200
              });
            });

        }
      });
  },
  unfreezUser: function(req, res, next) {
    console.log("Enter into unfreezUser");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
        email: userMailId
      })
      .exec(function(err, user) {
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
        } else {
          console.log(JSON.stringify(user.isUserDisable));
          if (!user.isUserFreezed) {
            return res.json({
              "message": "User already enabled!",
              statusCode: 401
            });
          } else {
            User.update({
                email: userMailId
              }, {
                isUserFreezed: false
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update enabled User!",
                    statusCode: 401
                  });
                }
                return res.json({
                  "message": "User enabled successfully!",
                  statusCode: 200
                });
              });
          }
        }
      });
  },
};