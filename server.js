//'use strict'
const express = require('express');
const path = require('path');
const app = express();

const port = 2323;
const hostname = 'localhost';
app.get('/', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	return res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/studentInfo', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	return res.sendFile(path.join(__dirname, 'studentInfo_new.csv'));
});

app.get('/verification', (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
	console.log(req.query.code);
	if(true || req.query.code == 'testcode'){
		return res.sendFile(path.join(__dirname, 'studentInfo_new.csv'));
	}
	else{
		res.status(403);
		return res.send('Wrong verification code.');
	}
});

console.log('Start listening on', hostname + ':' + port);

app.use(express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'assets')));

app.listen(port, hostname);
