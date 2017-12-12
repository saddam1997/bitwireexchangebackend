/**
 * RequestamountsController
 *
 * @description :: Server-side logic for managing requestamounts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var nodemailer = require('nodemailer');
module.exports = {

	bch: function(req, res, next) {
		console.log("Enter into BCH request amount BCH");
		var userMailId=req.body.userMailId;
		var messageRecieverMailId=req.body.messageRecieverMailId;
		var requestBCHAmounts=req.body.requestBCHAmounts;
		var notes=req.body.notes;

		if(!userMailId ||!messageRecieverMailId||!notes||!requestBCHAmounts){
			console.log("Can't be empty!!! by user.....");
			return res.json({"message": "Can't be empty!!!",statusCode: 400});
		}
		User.findOne({
			email: userMailId
		}).exec(function (err, user){
			if (err) {
				return res.json( {"message": "Error to find user",statusCode: 401});
			}
			if (!user) {
				return res.json( {"message": "Invalid email!",statusCode: 401});
			}
			var transporter = nodemailer.createTransport({
				service: 'gmail',
				auth: {
					user: 'wallet.bcc@gmail.com',
					pass: 'boosters@123'
				}
			});
			var mailOptions = {
				from: 'wallet.bcc@gmail.com',
				to: messageRecieverMailId,
				subject: user.email+' sent you a payment request for '+requestBCHAmounts+ ' BCH',
				text: 'Hi, \n  '+user.email+' just sent you a request to pay '+requestBCHAmounts+
				' BCH using BccPay. On this bch address '+user.userBCHAddress+'\n Attached message: '+notes
			};
			var mailSenderRequest = {
				from: 'wallet.bcc@gmail.com',
				to: user.email,
				subject: 'Request sent successfully to '+messageRecieverMailId,
				text: 'Hi, \n  you just sent a request '+requestBCHAmounts+
				' BCH to '+messageRecieverMailId
			};
			transporter.sendMail(mailOptions, function(error, info){
				if (error) {
					return res.json( {"message": "Error to send request mail!",statusCode: 401});
					console.log(error);
				}else {
					console.log('Email sent: ' + info.response);
					transporter.sendMail(mailSenderRequest, function(error, info){
						if (error) {
							return res.json( {"message": "Error to send request mail!",statusCode: 401});
						}else{
							console.log('Email sent success: ' + info.response);
							return res.json({"message": "Request sent successfully!",statusCode: 200});
						}
					});
			 }
			});
		});
	},
	btc: function(req, res, next) {
		console.log("Enter into request amount BTC");
		var userMailId=req.body.userMailId;
		var messageRecieverMailId=req.body.messageRecieverMailId;
		var requestBTCAmounts=req.body.requestBTCAmounts;
		var notes=req.body.notes;

		if(!userMailId ||!messageRecieverMailId||!notes ||!requestBTCAmounts){
			console.log("Can't be empty!!! by user.....");
			return res.json({"message": "Can't be empty!!!",statusCode: 400});
		}
		User.findOne({
			email: userMailId
		}).exec(function (err, user){
			if (err) {
				return res.json( {"message": "Error to find user",statusCode: 401});
			}
			if (!user) {
				return res.json( {"message": "Invalid email!",statusCode: 401});
			}
			var transporter = nodemailer.createTransport({
				service: 'gmail',
				auth: {
					user: 'wallet.bcc@gmail.com',
					pass: 'boosters@123'
				}
			});
			var mailOptions = {
				from: 'wallet.bcc@gmail.com',
				to: messageRecieverMailId,
				subject: user.email+' sent you a payment request for '+requestBTCAmounts+ ' BTC',
				text: 'Hi, \n  '+user.email+' just sent you a request to pay '+requestBTCAmounts+
				' BTC using BccPay. On this BTC address '+user.userBTCAddress+'\n Attached message: '+notes
			};
			var mailSenderRequest = {
				from: 'wallet.bcc@gmail.com',
				to: user.email,
				subject: 'Request sent successfully to '+messageRecieverMailId,
				text: 'Hi, \n  you just sent a request '+requestBTCAmounts+
				' BTC to '+messageRecieverMailId
			};
			transporter.sendMail(mailOptions, function(error, info){
				if (error) {
					return res.json( {"message": "Error to send request mail!",statusCode: 401});
					console.log(error);
				}else {
					console.log('Email sent: '+info.response);
					transporter.sendMail(mailSenderRequest, function(error, info){
						if (error) {
							return res.json( {"message": "Error to send request mail!",statusCode: 401});
						}else{
							console.log('Email sent success: ' + info.response);
							return res.json({"message": "Request sent successfully!",statusCode: 200});
						}
					});
			 }
			});
		});
	}
};
