var express = require('express');
var logger = require('morgan');

var app = express();

app.set('port', process.env.PORT || 15450);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    return res.send("Test Path, Get Req Received")
});

module.exports = app;