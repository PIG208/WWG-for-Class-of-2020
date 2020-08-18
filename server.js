//'use strict'
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const port = 2323;
const hostname = 'localhost';

const content = fs.readFileSync('login-info.csv', 'utf8');
var studentNumDict = {};
const data = content.split('\r\n').slice(1).forEach(line => {
	console.log(line);
	const temp = line.split(',');
	studentNumDict[temp[0]] = temp[1];
});

app.get('/', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	return res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/verification', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	console.log(req.query.code);
	if(req.query.code == 'testcode'){
		return res.sendFile(path.join(__dirname, 'studentInfo_latest.csv'));
	}
	else{
		res.status(403);
		return res.send('Wrong verification code.');
	}
});

app.get('/verificationStu', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	if(studentNumDict[req.query.name] == req.query.studentNum){
		console.log('matched');
		return res.sendFile(path.join(__dirname, 'studentInfo_latest.csv'));
	}
	else{
		res.status(403);
		return res.send('Wrong verification code.');
	}
});

console.log('Start listening on', hostname + ':' + port);

app.use(express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'assets')));

app.listen(port, hostname);
