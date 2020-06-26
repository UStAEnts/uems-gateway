var express = require('express');
var logger = require('morgan');

console.log("Starting uems-gateway...");

var app = express();

app.set('port', process.env.PORT || 15450);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    return res.send("Test Path, Get Req Received")
});

app.get('/status', (req, res) => {
    return res.send("Ok")
});

app.listen(app.get('port'));

console.log("Started uems-gateway");

module.exports = app;