//'use strict'
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

const conn = mysql.createConnection({
	host:dbInfo.host,
	user:dbInfo.username,
	password:dbInfo.password,
	database:dbInfo.database
});

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

app.get('/verification', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	if(req.query.code == 'testcode'){
		return res.sendFile(path.join(__dirname, 'studentInfo.csv'));
	}
	else{
		res.status(403);
		return res.send('Wrong verification code.');
	}
});

// Old login method through student name and student number
app.get('/verificationStu', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	if(studentNumDict[req.query.name] == req.query.studentNum){
		console.log('matched');
		return res.sendFile(path.join(__dirname, 'studentInfo.csv'));
	}
	else{
		res.status(403);
		return res.send('Wrong verification code.');
	}
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
	console.log(params);
	client.request('SendSms', params, reqParams).then((result) => {
		console.log(JSON.stringify(result));
		res.send(result.Message);
	}, (ex) => {
		console.log(ex);
		res.send(result.Message);
	});
	verificationCodeTemp[req.query.phoneNum] = code
});

// For new user to sign up (user info need to exist already in the database)
app.get('/signup', (req, res) => {
	const passwordSha = req.query.passwordSha;
	const phoneNum = req.query.phoneNum;
	
	if(!validatePhoneNum(phoneNum)){
		console.log(`${phoneNum} is invalid!`);
		res.send('1invalid phone number.');
		return;
	}
	
	if(true || req.query.verificationCode == verificationCodeTemp[phoneNum]){
		verificationCodeTemp[phoneNum] = undefined;
		setPassword(passwordSha, phoneNum, function(err, results){
			if(err) console.log(err);
			if(results.affectedRows > 0){
				sendCsvForCurriculum(phoneNum, res);
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
			console.log('asdasd', results);
			if(results != undefined && results.length > 0){
				console.log(results[0].password_hash);
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
	conn.query(`SELECT * FROM user_credentials WHERE phone_num="${req.query.phoneNum}"`, function(err, results){
		if(results.length > 0){
			 if(crypto.createHash('sha256').update(results[0].salt + req.query.passwordSha).digest('hex') == results[0].password_hash){
				sendCsvForCurriculum(req.query.phoneNum, res);
			}
			else {
				res.send('3Wrong phone number or password.');
			}
		}
		else {
			res.send('1Invalid phone number');
		}
	});
});

// Return false if the phone number is invalid
function validatePhoneNum(phoneNum){
	return phoneNum.match(/[1-9][0-9]+/)[0].length == phoneNum.length;
}

// Lookup the table user_credentials for the phone number
function lookupPhoneNum(phoneNum, callback) {
	conn.query(`SELECT phone_num,password_hash FROM user_credentials WHERE phone_num="${phoneNum}"`, callback);
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

console.log('Start listening on', hostname + ':' + port);

app.use(express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'assets')));

app.listen(port, hostname);
