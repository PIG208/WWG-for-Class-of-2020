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
	console.log(req);
	return res.sendFile(path.join(__dirname, 'studentInfo.csv'));
});

console.log('Start listening on', hostname + ':' + port);
console.log();
app.listen(port, hostname);
