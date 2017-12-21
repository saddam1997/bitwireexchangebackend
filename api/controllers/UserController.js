/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

//External Dependencies.........
var request = require('request');
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var mergeJSON = require("merge-json");
var validator = require('validator');
var crypto = require("crypto");

var transporter = nodemailer.createTransport({
  service: sails.config.common.supportEmailIdService,
  auth: {
    user: sails.config.common.supportEmailId,
    pass: sails.config.common.supportEmailIdpass
  }
});

var projectURL = sails.config.common.projectURL;

module.exports = {
  createNewUser: function(req, res) {
    console.log("Enter into createNewUser :: " + req.body.email);
    var useremailaddress = req.body.email;
    var userpassword = req.body.password;
    var userconfirmPassword = req.body.confirmPassword;
    var userspendingpassword = req.body.spendingpassword;
    var userconfirmspendingpassword = req.body.confirmspendingpassword;
    var googlesecreatekey = req.body.googlesecreatekey;
    if (!validator.isEmail(useremailaddress)) {
      return res.json({
        "message": "Please Enter valid email id",
        statusCode: 400
      });
    }
    if (!useremailaddress || !userpassword || !userconfirmPassword || !userspendingpassword || !googlesecreatekey || !userconfirmspendingpassword) {
      console.log("User Entered invalid parameter ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userpassword !== userconfirmPassword) {
      console.log("Password and confirmPassword doesn\'t match!");
      return res.json({
        "message": 'Password and confirmPassword doesn\'t match!',
        statusCode: 400
      });
    }

    if (userspendingpassword !== userconfirmspendingpassword) {
      console.log("spendingpassword and confirmspendingpassword doesn\'t match!");
      return res.json({
        "message": 'spendingpassword and confirmspendingpassword doesn\'t match!',
        statusCode: 400
      });
    }

    User.findOne({
      email: useremailaddress
    }, function(err, user) {
      if (err) {
        console.log("Error to find user from database");
        return res.json({
          "message": "Error to find User",
          statusCode: 400
        });
      }
      if (user && !user.verifyEmail) {
        console.log("Use email exit But but not verified ");
        return res.json({
          "message": 'Email already exit but not varifed please login and verify',
          statusCode: 400
        });
      }
      if (user) {
        console.log("Use email exit and return ");
        return res.json({
          "message": 'email already exist',
          statusCode: 400
        });
      }
      if (!user) {
        bcrypt.hash(userspendingpassword, 10, function(err, hashspendingpassword) {
          if (err) {
            console.log("Error To bcrypt spendingpassword");
            return res.json({
              "message": err,
              statusCode: 500
            });
          }

          bcrypt.hash(googlesecreatekey, 10, function(err, hashsgooglesecreatekey) {
            if (err) {
              console.log("Error To bcrypt spendingpassword");
              return res.json({
                "message": err,
                statusCode: 500
              });
            }
            var otpForEmail = crypto.randomBytes(20).toString('hex');;
            console.log("otpForEmail :: " + otpForEmail);
            bcrypt.hash(otpForEmail.toString(), 10, function(err, hash) {
              if (err) return next(err);
              var encOtpForEmail = hash;
              var userObj = {
                email: useremailaddress,
                password: userpassword,
                encryptedSpendingpassword: hashspendingpassword,
                encryptedEmailVerificationOTP: encOtpForEmail,
                googlesecreatekey: hashsgooglesecreatekey
              }
              User.create(userObj).exec(function(err, userAddDetails) {
                if (err) {
                  console.log("Error to Create New user !!!");
                  console.log(err);
                  return res.json({
                    "message": "Error to create New User",
                    statusCode: 400
                  });
                }
                console.log("User Create Succesfully...........");

                var verificationURL = projectURL + "/user/verifyEmailAddress?email=" + useremailaddress + "&otp=" + otpForEmail;
                //console.log("verificationURL ::: " + verificationURL);
                var mailOptions = {
                  from: sails.config.common.supportEmailId,
                  to: useremailaddress,
                  subject: 'Please verify email !!!',
                  html: `
                  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                  <html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                  <head>
                    <meta name="viewport" content="width=device-width" />
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                    <title>Actionable emails e.g. reset password</title>


                    <style type="text/css">
                      img {
                        max-width: 100%;
                      }

                      body {
                        -webkit-font-smoothing: antialiased;
                        -webkit-text-size-adjust: none;
                        width: 100% !important;
                        height: 100%;
                        line-height: 1.6em;
                      }

                      body {
                        background-color: #f6f6f6;
                      }

                      @media only screen and (max-width: 640px) {
                        body {
                          padding: 0 !important;
                        }
                        h1 {
                          font-weight: 800 !important;
                          margin: 20px 0 5px !important;
                        }
                        h2 {
                          font-weight: 800 !important;
                          margin: 20px 0 5px !important;
                        }
                        h3 {
                          font-weight: 800 !important;
                          margin: 20px 0 5px !important;
                        }
                        h4 {
                          font-weight: 800 !important;
                          margin: 20px 0 5px !important;
                        }
                        h1 {
                          font-size: 22px !important;
                        }
                        h2 {
                          font-size: 18px !important;
                        }
                        h3 {
                          font-size: 16px !important;
                        }
                        .container {
                          padding: 0 !important;
                          width: 100% !important;
                        }
                        .content {
                          padding: 0 !important;
                        }
                        .content-wrap {
                          padding: 10px !important;
                        }
                        .invoice {
                          width: 100% !important;
                        }
                      }
                    </style>
                  </head>

                  <body itemscope itemtype="http://schema.org/EmailMessage" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; width: 100% !important; height: 100%; line-height: 1.6em; background-color: #f6f6f6; margin: 0;"
                    bgcolor="#f6f6f6">

                    <table class="body-wrap" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; width: 100%; background-color: #f6f6f6; margin: 0;" bgcolor="#f6f6f6">
                      <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                        <td style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0;" valign="top"></td>
                        <td class="container" width="600" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; display: block !important; max-width: 600px !important; clear: both !important; margin: 0 auto;"
                          valign="top">
                          <div class="content" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; max-width: 600px; display: block; margin: 0 auto; padding: 20px;">
                            <table class="main" width="100%" cellpadding="0" cellspacing="0" itemprop="action" itemscope itemtype="http://schema.org/ConfirmAction" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; border-radius: 3px; background-color: #fff; margin: 0; border: 1px solid #e9e9e9;"
                              bgcolor="#fff">
                              <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                <td class="content-wrap" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 20px;" valign="top">
                                  <meta itemprop="name" content="Confirm Email" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;" />
                                  <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">

                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                        Dear user,
                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                        Thank you for signing up with us. Please follow this link to verify your Email.
                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                        Verify Email address
                                      </td>
                                    </tr>


                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" itemprop="handler" itemscope itemtype="http://schema.org/HttpActionHandler" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;"
                                        valign="top">
                                        <a href=${verificationURL} class="btn-primary" itemprop="url" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; color: #FFF; text-decoration: none; line-height: 2em; font-weight: bold; text-align: center; cursor: pointer; display: inline-block; border-radius: 5px; text-transform: capitalize; background-color: #348eda; margin: 0; border-color: #348eda; border-style: solid; border-width: 10px 20px;">Confirm email address</a>
                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                        Kind Regards,
                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                        The BitwireX Team
                                      </td>
                                    </tr>

                                  </table>
                                </td>
                              </tr>
                            </table>
                            <div class="footer" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; width: 100%; clear: both; color: #999; margin: 0; padding: 20px;">
                              <table width="100%" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                  <td class="aligncenter content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; vertical-align: top; color: #999; text-align: center; margin: 0; padding: 0 0 20px;" align="center"
                                    valign="top">Follow <a href="http://twitter.com/bitwirex" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; color: #999; text-decoration: underline; margin: 0;">@bitwirex</a> on Twitter.</td>
                                </tr>
                              </table>
                            </div>
                          </div>
                        </td>
                        <td style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0;" valign="top"></td>
                      </tr>
                    </table>
                  </body>

                  </html>`
                };
                transporter.sendMail(mailOptions, function(error, info) {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log('Email sent: ' + info.response);
                    return res.json(200, {
                      "message": "We sent link on your email address please verify link!!!",
                      "userMailId": useremailaddress,
                      statusCode: 200
                    });
                  }
                });
              });
            });
          });
        });
      }
    });
  },
  verifyEmailAddress: function(req, res, next) {
    console.log("Enter into verifyEmailAddress");
    var userMailId = req.param('email');
    var otp = req.param('otp');
    if (!userMailId || !otp) {
      console.log("Can't be empty!!! by user.....");
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
      if (user.verifyEmail) {
        return res.redirect('http://bitwirex.io/');
        // return res.json({
        //   "message": "Email already verified !!",
        //   statusCode: 401
        // });
      }
      User.compareEmailVerificationOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "OTP is incorrect!!",
            statusCode: 401
          });
        } else {
          console.log("OTP is verified successfully");
          User.update({
              email: userMailId
            }, {
              verifyEmail: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update passoword!",
                  statusCode: 401
                });
              }
              console.log("Update passoword successfully!!!");
              return res.redirect('http://bitwirex.io');
              // res.json(200, {
              //   "message": "Email verified successfully",
              //   "userMailId": userMailId,
              //   statusCode: 200
              // });
            });
        }
      });
    });
  },
  sentOtpToEmailForgotPassword: function(req, res, next) {

    console.log("Enter into sentOtpToEmailForgotPassword");
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

      var newCreatedPassword = Math.floor(100000 + Math.random() * 900000);
      console.log("newCreatedPassword :: " + newCreatedPassword);
      var mailOptions = {
        from: sails.config.common.supportEmailId,
        to: userMailId,
        subject: 'Please reset your password',
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
          <html xmlns="http://www.w3.org/1999/xhtml" xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
              <title>Set up a new password for [Product Name]</title>


            </head>
            <body style="-webkit-text-size-adjust: none; box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; height: 100%; line-height: 1.4; margin: 0; width: 100% !important;" bgcolor="#F2F4F6"><style type="text/css">
          body {
          width: 100% !important; height: 100%; margin: 0; line-height: 1.4; background-color: #F2F4F6; color: #74787E; -webkit-text-size-adjust: none;
          }
          @media only screen and (max-width: 600px) {
            .email-body_inner {
              width: 100% !important;
            }
            .email-footer {
              width: 100% !important;
            }
          }
          @media only screen and (max-width: 500px) {
            .button {
              width: 100% !important;
            }
          }
          </style>
              <span class="preheader" style="box-sizing: border-box; display: none !important; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; mso-hide: all; opacity: 0; overflow: hidden; visibility: hidden;">Use this link to reset your password. The link is only valid for 24 hours.</span>
              <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%;" bgcolor="#F2F4F6">
                <tr>
                  <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">
                    <table class="email-content" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%;">


                      <tr>
                        <td class="email-body" width="100%" cellpadding="0" cellspacing="0" style="-premailer-cellpadding: 0; -premailer-cellspacing: 0; border-bottom-color: #EDEFF2; border-bottom-style: solid; border-bottom-width: 1px; border-top-color: #EDEFF2; border-top-style: solid; border-top-width: 1px; box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%; word-break: break-word;" bgcolor="#FFFFFF">
                          <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0 auto; padding: 0; width: 570px;" bgcolor="#FFFFFF">

                            <tr>
                              <td class="content-cell" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; padding: 35px; word-break: break-word;">
                                <h1 style="box-sizing: border-box; color: #2F3133; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 19px; font-weight: bold; margin-top: 0;" align="left">Hi,</h1>
                                <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;" align="left">You recently requested to forgot your password for your bitwirex account. Use the OTP below to reset it. <strong style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;"></strong></p>

                                <table class="body-action" align="center" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 30px auto; padding: 0; text-align: center; width: 100%;">
                                  <tr>
                                    <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">

                                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
                                        <tr>
                                          <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">
                                             <h5 style="box-sizing: border-box; color: #2F3133; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 15px; font-weight: bold; margin-top: 0;" align="left">${newCreatedPassword}</h5>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                                <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;" align="left">Thanks,
                                <br />The Bitwirex Team</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>`
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log(newCreatedPassword + 'Email sent: ' + info.response);
          //res.json(200,"Message Send Succesfully");
          console.log("createing encryptedPassword ....");
          bcrypt.hash(newCreatedPassword.toString(), 10, function(err, hash) {
            if (err) return next(err);
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedForgotPasswordOTP: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.serverError(err);
                }
                console.log("OTP forgot update successfully!!!");
                return res.json({
                  "message": "Otp sent on user mail id",
                  "userMailId": userMailId,
                  statusCode: 200
                });
              });
          });
        }
      });
    });
  },
  verifyOtpToEmailForgotPassord: function(req, res, next) {

    console.log("Enter into verifyOtpToEmailForgotPassord");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Can't be empty!!! by user.....");
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
      User.compareForgotpasswordOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is verified successfully");
          res.json(200, {
            "message": "OTP is verified successfully",
            "userMailId": userMailId,
            statusCode: 200
          });
        }
      });
    });
  },
  updateForgotPassordAfterVerify: function(req, res, next) {
    console.log("Enter into updateForgotPassordAfterVerify");
    var userMailId = req.body.userMailId;
    var newPassword = req.body.newPassword;
    var confirmNewPassword = req.body.confirmNewPassword;
    if (!userMailId || !newPassword || !confirmNewPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    if (newPassword != confirmNewPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "New Password and Confirm New Password not match",
        statusCode: 401
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
      bcrypt.hash(confirmNewPassword, 10, function(err, hash) {
        if (err) res.json({
          "message": "Errot to bcrypt passoword",
          statusCode: 401
        });
        var newEncryptedPass = hash;
        User.update({
            email: userMailId
          }, {
            encryptedPassword: newEncryptedPass
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update passoword!",
                statusCode: 401
              });
            }
            console.log("Update passoword successfully!!!");
            return res.json({
              "message": "Your passoword updated successfully",
              statusCode: 200
            });
          });
      });
    });
  },
  updateCurrentPassword: function(req, res, next) {
    console.log("Enter into updateCurrentPassword");
    var userMailId = req.body.userMailId;
    var currentPassword = req.body.currentPassword;
    var newPassword = req.body.newPassword;
    var confirmNewPassword = req.body.confirmNewPassword;
    if (!userMailId || !currentPassword || !newPassword || !confirmNewPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    if (currentPassword == newPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Current password cannot be same as new Password",
        statusCode: 401
      });
    }
    if (newPassword != confirmNewPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "New  password and confirm new password are not match",
        statusCode: 401
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
      User.comparePassword(currentPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct currentPassword",
            statusCode: 401
          });
        } else {
          bcrypt.hash(confirmNewPassword, 10, function(err, hash) {
            if (err) res.json({
              "message": "Errot to bcrypt passoword",
              statusCode: 401
            });
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedPassword: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update passoword!",
                    statusCode: 401
                  });
                }
                console.log("Your password updated successfully!!!");
                return res.json({
                  "message": "Your password updated successfully",
                  statusCode: 200
                });
              });
          });
        }
      });

    });
  },
  updateCurrentSpendingPassword: function(req, res, next) {
    console.log("Enter into updateCurrentSpendingPassword");
    var userMailId = req.body.userMailId;
    var currentSpendingPassword = req.body.currentSpendingPassword;
    var newSpendingPassword = req.body.newSpendingPassword;
    var confirmNewSpendingPassword = req.body.confirmNewPassword;
    if (!userMailId || !currentSpendingPassword || !newSpendingPassword || !confirmNewSpendingPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    if (currentSpendingPassword == newSpendingPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Current spending password cannot be same as new spending password",
        statusCode: 401
      });
    }
    if (newSpendingPassword != confirmNewSpendingPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "New spending password and confirm new spending password are not match",
        statusCode: 401
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
      User.compareSpendingpassword(currentSpendingPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct currentSpendingPassword",
            statusCode: 401
          });
        } else {
          bcrypt.hash(confirmNewSpendingPassword, 10, function(err, hash) {
            if (err) res.json({
              "message": "Errot to bcrypt passoword",
              statusCode: 401
            });
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedSpendingpassword: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update passoword!",
                    statusCode: 401
                  });
                }
                console.log("Your password updated successfully!!!");
                return res.json({
                  "message": "Your spending password updated successfully",
                  statusCode: 200
                });
              });
          });
        }
      });

    });
  },
  sentOtpToUpdateSpendingPassword: function(req, res, next) {
    console.log("Enter into sentOtpToUpdateSpendingPassword");
    var userMailId = req.body.userMailId;
    var currentPassword = req.body.currentPassword;
    if (!userMailId || !currentPassword) {
      console.log("Can't be empty!!! by user.....");
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
      User.comparePassword(currentPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct Password",
            statusCode: 401
          });
        } else {

          var newCreatedPassword = Math.floor(100000 + Math.random() * 900000);
          console.log("newCreatedPassword :: " + newCreatedPassword);
          var mailOptions = {
            from: sails.config.common.supportEmailId,
            to: userMailId,
            subject: 'Please reset your spending password',
            text: 'We heard that you lost your BccPay spending password. Sorry about that! ' +
              '\n But don’t worry! You can use this otp reset your password ' + newCreatedPassword
          };
          transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log(newCreatedPassword + 'Email sent: ' + info.response);
              //res.json(200,"Message Send Succesfully");
              console.log("createing encryptedPassword ....");
              bcrypt.hash(newCreatedPassword.toString(), 10, function(err, hash) {
                if (err) return next(err);
                var newEncryptedPass = hash;
                User.update({
                    email: userMailId
                  }, {
                    encryptedForgotSpendingPasswordOTP: newEncryptedPass
                  })
                  .exec(function(err, updatedUser) {
                    if (err) {
                      return res.serverError(err);
                    }
                    console.log("OTP forgot update successfully!!!");
                    return res.json({
                      "message": "Otp sent on user mail id",
                      "userMailId": userMailId,
                      statusCode: 200
                    });
                  });
              });
            }
          });
        }
      });

    });
  },
  verifyOtpToEmailForgotSpendingPassord: function(req, res, next) {
    console.log("Enter into verifyOtpToEmailForgotSpendingPassord ");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Can't be empty!!! by user.....");
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
      User.compareEmailVerificationOTPForSpendingPassword(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is verified successfully");
          res.json(200, {
            "message": "OTP for spending passoword is verified successfully",
            "userMailId": userMailId,
            statusCode: 200
          });
        }
      });
    });
  },
  updateForgotSpendingPassordAfterVerify: function(req, res, next) {
    console.log("Enter into updateForgotSpendingPassordAfterVerif");
    var userMailId = req.body.userMailId;
    var newSpendingPassword = req.body.newSpendingPassword;
    var confirmSpendingPassword = req.body.confirmSpendingPassword;
    if (!userMailId || !newSpendingPassword || !confirmSpendingPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    if (newSpendingPassword != confirmSpendingPassword) {
      console.log("New Password and Confirm New Password not match");
      return res.json({
        "message": "New Spending Password and Confirm Spending Password not match",
        statusCode: 401
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
      bcrypt.hash(newSpendingPassword, 10, function(err, hash) {
        if (err) res.json({
          "message": "Errot to bcrypt passoword",
          statusCode: 401
        });
        var newEncryptedPass = hash;
        User.update({
            email: userMailId
          }, {
            encryptedSpendingpassword: newEncryptedPass
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update passoword!",
                statusCode: 401
              });
            }
            console.log("Update passoword successfully!!!");
            return res.json({
              "message": "Your spending passoword updated successfully",
              statusCode: 200
            });
          });
      });
    });
  },
  updateUserVerifyEmail: function(req, res, next) {
    console.log("Enter into updateUserVerifyEmail");
    var userMailId = req.body.userMailId;
    var otp = req.body.otp;
    if (!userMailId || !otp) {
      console.log("Can't be empty!!! by user.....");
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
      User.compareEmailVerificationOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp",
            statusCode: 401
          });
        } else {
          console.log("OTP is verified successfully");
          User.update({
              email: userMailId
            }, {
              verifyEmail: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update passoword!",
                  statusCode: 401
                });
              }
              console.log("Update current SpendingPassword successfully!!!");

              User.findOne({
                email: userMailId
              }).exec(function(err, userDetailsReturn) {
                if (err) {
                  return res.json({
                    "message": "Error to find user",
                    statusCode: 401
                  });
                }
                if (!userDetailsReturn) {
                  return res.json({
                    "message": "Invalid email!",
                    statusCode: 401
                  });
                }
                return res.json(200, {
                  user: userDetailsReturn,
                  statusCode: 200
                });
              });
            });
        }
      });
    });
  },
  getAllDetailsOfUser: function(req, res, next) {
    console.log("Enter into getAllDetailsOfUser");
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
      .populateAll()
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
            user: user,
            statusCode: 200
          });
        }

      });
  },
  enableTFA: function(req, res, next) {
    console.log("Enter into enableTFA");
    var userMailId = req.body.userMailId;

    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
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
      User.update({
          email: userMailId
        }, {
          tfastatus: true
        })
        .exec(function(err, updatedUser) {
          if (err) {
            return res.json({
              "message": "Error to update passoword!",
              statusCode: 401
            });
          }
          console.log("TFA and googlesecreatekey updated successfully!!!");
          User.findOne({
              email: userMailId
            })
            .populateAll()
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
                  user: user,
                  statusCode: 200
                });
              }
            });
        });
    });
  },
  disableTFA: function(req, res, next) {
    console.log("Enter into disableTFA");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
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
      User.update({
          email: userMailId
        }, {
          tfastatus: false
        })
        .exec(function(err, updatedUser) {
          if (err) {
            return res.json({
              "message": "Error to update passoword!",
              statusCode: 401
            });
          }
          console.log("TFA disabled successfully!!!");
          User.findOne({
              email: userMailId
            })
            .populateAll()
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
                  user: user,
                  statusCode: 200
                });
              }
            });
        });
    });
  }
};