var express = require('express'), 
    http = require('http'), 
    os = require('os'), 
    path = require('path'),
    sse = require('server-sent-events'),
    _ = require("underscore");

var app = express();

var games = {};
var pins = {};

var random = function(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

var generatePin = function(){
    var pin = '';
    for(var i = 1; i <= 4; i++){
        pin += String(random(1, 4));
    }
    return pin;
}

var createNewGame = function(){
    var game_id = random(1, 9999);
    var pin_1 = generatePin();
    var pin_2 = generatePin();

    return {
        id: game_id,
        player_1 : {
            score: 0,
            pin: pin_1,
            position: 50,
            joined: false
        },
        player_2: {
            score: 0,
            pin: pin_2,
            position: 50,
            joined: false
        },
        finish: false,
        winner: null
    }
}

var notifyAboutNewGameSate = function(game_id){
    if(!game_id in games){
        return
    }
    var game = games[game_id];

    var i=1; 
    _.forEach(game.endpoints, function(endpoint){
        endpoint.sse("data: "+JSON.stringify(game.state)+'\n\n');
        console.log('Notifing endpoint %s in game %s.', i++,  game_id);
    });
}

var scoreGame = function(game_id, pin){
    var state = games[game_id].state;
    
    if(state.player_1.pin == pin){
        state.player_1.score++;
    }else if(state.player_2.pin == pin){
        state.player_2.score++;
    }
    
    console.log("Player %s scored in game %s.", pin, game_id);
    notifyAboutNewGameSate(game_id);
}

var finishGame = function(game_id){
    var state = games[game_id].state;

    state.finish = true;
    if(state.player_1.score > state.player_2.score){
        state.winner = state.player_1.pin;
    }else{
        state.winner = state.player_2.pin;
    }
    
    console.log("Game %s finished. The winner is %s!", game_id, state.winner);
    notifyAboutNewGameSate(game_id);
}

app.get('/events/:game_id', sse, function(req, res) {
    var game_id = req.params.game_id;
    if(game_id in games){
        games[game_id].endpoints.push(res);
    }
    console.log("SSE client joined to game with id: %s.", game_id);
});


app.post('/game', function (req, res) {
    var game = createNewGame();
    games[game.id] = {
        state: game,
        endpoints: []
    }
    pins[game.player_1.pin] = game.id;
    pins[game.player_2.pin] = game.id;

    console.log("Game with id [%s] started.", game.id);
    res.json(game);
});

app.post('/score/:game_id/:pin', function (req, res) {
    var game_id = req.params.game_id;
    var pin = req.params.pin;

    if(game_id in games){
        scoreGame(game_id, pin);
        res.status(200);
    }else{
        res.status(404);
    }
    res.json({});
});


app.post('/finish/:game_id', function (req, res) {
    var game_id = req.params.game_id;

    if(game_id in games){
        finishGame(game_id);
        res.status(200);
    }else{
        res.status(404);
    }
    res.json({});
});

app.post('/join/:pin', function (req, res) {
    var pin = req.params.pin;
    if(pin in pins){
        var game_id = pins[pin];
        var state = games[game_id].state;

        if(state.player_1.pin == pin){
            state.player_1.joined = true;
            console.log('Player 1 with pin %s joined to game %s.', pin, game_id); 
            res.status(200);
            res.json(state);

            notifyAboutNewGameSate(game_id);

        }else if(state.player_2.pin == pin){
            state.player_2.joined = true;
            console.log('Player 2 with pin %s joined to game %s.', pin, game_id); 
            res.status(200);
            res.json(state);

            notifyAboutNewGameSate(game_id);
        }else {
            res.status(404);
            res.json({});
        }
    }else{
        res.status(404);
        res.json({});
    }
});


app.post('/move/:pin/:position', function (req, res) {
    var pin = req.params.pin;
    var position = req.params.position;
    if(pin in pins){
        var game_id = pins[pin];
        var state = games[game_id].state;

        if(state.player_1.pin == pin){
            state.player_1.position = position;
            res.status(200);
            res.json({});

            notifyAboutNewGameSate(game_id);

        }else if(state.player_2.pin == pin){
            state.player_2.position = position;
            res.status(200);
            res.json({});

            notifyAboutNewGameSate(game_id);
        }else {
            res.status(404);
            res.json({});
        }
    }else{
        res.status(404);
        res.json({});
    }
});


var server = app.listen(3000, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});
