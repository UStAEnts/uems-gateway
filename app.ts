const express = require('express');
const logger = require('morgan');
const passport = require('passport');
const AuthStrategy = require('passport-http-bearer').Strategy;

console.log("Starting uems-gateway...");

const app = express();

app.set('port', process.env.PORT || 15450);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

passport.use(new AuthStrategy(
    function(token, done) {
        // TODO, Authentication.
        return done(null, 1)
    }
));

app.get('/', (req, res) => {
    return res.send("Test Path, Get Req Received")
});

app.get('/status', (req, res) => {
    return res.send("Ok")
});

function add_events_handler(req, res, next) {
    throw new Error('Unimplemented');
}

function get_events_handler(req, res, next) {
    return res.send("Get event handler req received")
}

function modify_events_handler(req, res, next) {
    throw new Error('Unimplemented');
}

function remove_events_handler(req, res, next) {
    throw new Error('Unimplemented');
}

// CREATE
app.post('/events', passport.authenticate('bearer', { session: false }), add_events_handler);

// READ
app.get('/events', passport.authenticate('bearer', { session: false }), get_events_handler);

// UPDATE
app.patch('/events', passport.authenticate('bearer', { session: false }), modify_events_handler);

// DELETE
app.delete('/events', passport.authenticate('bearer', { session: false }), remove_events_handler);

app.listen(app.get('port'));

console.log("Started uems-gateway");

module.exports = app;