//'use strict'

// The app use the following code for return status
// 1: Invalid phone number.
// 2: Invalid verification code.
// 3: Wrong password.
const express = require('express');
const path = require('path');
const fs = require('fs');
const Core = require('@alicloud/pop-core');
const mysql = require('mysql');
const crypto = require('crypto');
const app = express();

const port = 2323;
const hostname = 'localhost';

const dbInfo = JSON.parse(fs.readFileSync('db-info.json', 'utf8'));
const aliyunInfo = JSON.parse(fs.readFileSync('aliyun-info.json', 'utf8'));

var conn;

function dbConnect(){
	conn = mysql.createConnection({
	host:dbInfo.host,
	user:dbInfo.username,
	password:dbInfo.password,
	database:dbInfo.database
	});

	conn.on('error', function(err){
		console.log(`[${new Date().toLocaleString()}] [Database] ${err.code}`);
		if(err.code == 'PROTOCOL_CONNECTION_LOST'){
			console.log(`[${new Date().toLocaleString()}] [Database] reconnecting`);
			dbConnect();
		}
		else {
			throw err;
		}
	});
}

dbConnect();

const client = new Core({
	accessKeyId: aliyunInfo.accessKeyId,
	accessKeySecret: aliyunInfo.accessKeySecret,
	endpoint: 'https://dysmsapi.aliyuncs.com',
	apiVersion: '2017-05-25'
});

const content = fs.readFileSync('login-info.csv', 'utf8');
var studentNumDict = {};
var verificationCodeTemp = {};

const data = content.split('\r\n').slice(1).forEach(line => {
	const temp = line.split(',');
	studentNumDict[temp[0]] = temp[1];
});

app.get('/', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	return res.sendFile(path.join(__dirname, 'index.html'));
});

// Send a verification code through alicloud api and store it temporarily
app.get('/getVerificationCode', (req, res) => {
	const code = Math.floor((Math.random() * 99999 - 10000) + 10000);
	const params = {
		"RegionId": "cn-hangzhou",
		"PhoneNumbers": req.query.phoneNum,
		"SignName": "WWG2020",
		"TemplateCode": "SMS_200722868",
		"TemplateParam": `{\"code\":\"${code}\"}`,
	};
	const reqParams = {
		method:'POST'
	};
	client.request('SendSms', params, reqParams).then((result) => {
		console.log(`[${new Date().toLocaleString()}] [Verification] Sending verification to ${req.query.phoneNum}`);
		res.send(result.Message);
	}, (ex) => {
		console.log(`[${new Date().toLocaleString()}] [Error] Failed to send msg to ${req.query.phoneNum}`);
		console.log(ex);
		console.log(`[${new Date().toLocaleString()}] [Error] ===================================================`);
		res.send('1invalid phone number.');
	});
	verificationCodeTemp[req.query.phoneNum] = code
});

// For new user to sign up (user info need to exist already in the database)
app.get('/signup', (req, res) => {
	console.log(`[${new Date().toLocaleString()}] [Signup] ${req.query.phoneNum} signing up`);
	const phoneNum = req.query.phoneNum;
	const passwordSha = req.query.passwordSha;

	if(!validatePhoneNum(phoneNum)){
		console.log(`[${new Date().toLocaleString()}] [Signup] ${req.query.phoneNum} uses invalid phonenum`);
		res.send('1invalid phone number.');
		return;
	}

	if(verificationCodeTemp[phoneNum] != undefined && req.query.verificationCode == verificationCodeTemp[phoneNum]){
		verificationCodeTemp[phoneNum] = undefined;
		setPassword(passwordSha, phoneNum, function(err, results){
			if(err) console.log(err);
			if(results.affectedRows > 0){
				sendCsvForCurriculum(phoneNum, res);
					console.log(`[${new Date().toLocaleString()}] [Signup] ${req.query.phoneNum} signed up`);
			}
			else{
				res.send('1invalid phone number.');
			}
		});
	}
	else {
		res.send('2invalid verification code.');
	}
});


// Check whether the passed phone number exists in the database
app.get('/checkPhoneNum', (req, res) => {
	if(validatePhoneNum(req.query.phoneNum)){
		lookupPhoneNum(req.query.phoneNum, function(err, results){
			if(err) console.log(err);
			if(results != undefined && results.length > 0){
				if(results[0].password_hash != null){
					res.send('2');
				}
				else {
					res.send('0');
				}
			}
			else {
				res.send('1');
			}
		});
	}
	else {
		res.send('2');
	}
});

// Check login credentials
app.get('/login', (req, res) => {
	console.log(`[${new Date().toLocaleString()}] [Login] ${req.query.phoneNum} logging in`);
	validateLogin(req.query.phoneNum, req.query.passwordSha, function(statusCode){
		if(statusCode == 0){
			console.log(`[${new Date().toLocaleString()}] [Login] ${req.query.phoneNum} logged in`);
			sendCsvForCurriculum(req.query.phoneNum, res);
		}
		else if(statusCode == 1){
			console.log(`[${new Date().toLocaleString()}] [Login] ${req.query.phoneNum} uses invalid phonenum`);
			res.send('1Invalid phone number');
		}
		else if(statusCode == 3){
			console.log(`[${new Date().toLocaleString()}] [Login] ${req.query.phoneNum} enters wrong phonenum/password`);
			res.send('3Wrong phone number or password.');
		}
	});
});

app.get('/resetPassword', (req, res) => {
	const phoneNum = req.query.phoneNum;
	const passwordSha = req.query.passwordSha;
		console.log(`[${new Date().toLocaleString()}] [Reset] ${req.query.phoneNum} resetting password`);

	if(validatePhoneNum(phoneNum)){
		if(verificationCodeTemp[phoneNum] != undefined && verificationCodeTemp[phoneNum] == req.query.verificationCode){
			verificationCodeTemp[phoneNum] = undefined;
			setPassword(passwordSha, phoneNum, function(err, results){
				if(err) console.log(err);
				if(results.affectedRows > 0){
					console.log(`[${new Date().toLocaleString()}] [Reset] ${req.query.phoneNum} reset password`);
					res.send('0OK');
				}
				else{
					res.send('1invalid phone number.');
				}
			});
		}
	}
	else {
		res.send('1Invalid phonenum');
	}
});

app.get('/getMapList', (req, res) => {
	validateLogin(req.query.phoneNum, req.query.passwordSha, function(statusCode){
		if(statusCode == 0){

		}
		else {
			res.status(403).end('Unauthorized /GET request');
		}
	});
});

app.get('/maps/*', (req, res) => {
	validateLogin(req.query.phoneNum, req.query.passwordSha, function(statusCode){
		if(statusCode == 0){
			try{
				const imUrl = req.url.match(/maps\/(.+)\?/)[1];
				res.sendFile(path.join(__dirname, `maps/${imUrl}`));
			}
			catch(e){
				console.log(e);
				res.status(404).send('Invalid url');
			}

		}
		else{
			res.status(403).end('Unauthorized /GET request');
		}
	});
});

// Return false if the phone number is invalid
function validatePhoneNum(phoneNum){
	return phoneNum.match(/[1][0-9]+/) != null && phoneNum.match(/[1][0-9]+/)[0].length == phoneNum.length;
}

// Return status code for login
function validateLogin(phoneNum, passwordSha, callback){
	conn.query(`SELECT * FROM user_credentials WHERE phone_num="${phoneNum}"`, function(err, results){
		if(results.length > 0){
			 if(crypto.createHash('sha256').update(results[0].salt + passwordSha).digest('hex') == results[0].password_hash){
				callback(0);
			}
			else {
				callback(3);
			}
		}
		else {
			callback(1);
		}
	});
}

// Lookup the table user_credentials for the phone number
function lookupPhoneNum(phoneNum, callback) {
	conn.query(`SELECT phone_num, password_hash FROM user_credentials WHERE phone_num="${phoneNum}"`, callback);
}

// general password reset method that requires a verificationCode and the corresponding phone number
function setPassword(passwordSha, phoneNum, callback){
	const salt = crypto.createHash('md5').update(Math.random().toString()).digest('hex').substr(0, 16);
	const passHash = crypto.createHash('sha256').update(salt + passwordSha).digest('hex');
	conn.query(`UPDATE user_credentials SET password_hash="${passHash}", salt="${salt}" WHERE phone_num="${phoneNum}"`, callback);
}

function sendCsvForCurriculum(phoneNum, res){
	conn.query(`SELECT curriculum FROM user_credentials WHERE phone_num="${phoneNum}"`, function(err, results){
		if(err) console.log(err);
		if(results.length > 0){
			if(results[0].curriculum == '0'){
				res.sendFile(path.join(__dirname, 'studentInfo_gaokao.csv'));
			}
			else if(results[0].curriculum == '1'){
				res.sendFile(path.join(__dirname, 'studentInfo_international.csv'));
			}
		}
	});
}

console.log(`[${new Date().toLocaleString()}] [Server] Start listening on ${hostname} ${port}`);

app.use(express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'assets')));

app.listen(port, hostname);
