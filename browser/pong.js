var animate = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60)
    };
var canvas = document.createElement("canvas");
var width = 400;
var height = 600;
canvas.width = width;
canvas.height = height;
var context = canvas.getContext('2d');
var player = new Player();
var player1 = new Player1();
var ball = new Ball(200, 300);
var downPoints = 0
var upPoints = 0
var gameId = 0
var started = 0
var shouldstop = 0

var keysDown = {};

$.post("http://91.240.28.246:8090/api/game", function( data ) {
    console.log( "Data Loaded: " + JSON.stringify(data));
    console.log("Room id: " + data.id);

    var evtSource = new EventSource("http://91.240.28.246:8090/api/events/" + data.id);
    player.pin = data.player_1.pin;
    player1.pin = data.player_2.pin
    document.getElementById("pin1").textContent += player.pin
    document.getElementById("pin2").textContent += player1.pin
    gameId = data.id
    evtSource.onmessage = function(m) {
       msg = JSON.parse(m.data);
       console.log(msg.player_1.position);
       console.log(msg.player_2.position);
       player.move(msg.player_1.position);
       player1.move(msg.player_2.position);
       if(started == 0 && msg.player_1.joined == true && msg.player_2.joined == true)
           started = 1;


    }



    }

  );



var render = function () {
    context.fillStyle = "#FF00FF";
    context.fillRect(0, 0, width, height);
    player.render();
    player1.render();
    ball.render();
};

var update = function () {
    if(started == 1 && shouldstop == 0){
    ball.update(player.paddle, player1.paddle);
}
};

var step = function () {
    update();
    render();
    animate(step)
};

function Paddle(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.x_speed = 0;
    this.y_speed = 0;
}

Paddle.prototype.render = function () {
    context.fillStyle = "#0000FF";
    context.fillRect(this.x, this.y, this.width, this.height);
};

Paddle.prototype.move = function (x, y) {
    this.x = x * 4;
    this.x_speed = x;
    this.y_speed = y;
    if (this.x < 0) {
        this.x = 0;
        this.x_speed = 0;
    } else if (this.x + this.width > 400) {
        this.x = 400 - this.width;
        this.x_speed = 0;
    }
};

function Player1() {
    this.paddle = new Paddle(175, 10, 50, 10);
}

Player1.prototype.render = function () {
    this.paddle.render();
};

Player1.prototype.move = function(x){
    console.log("[Player1] moving");
    this.paddle.move(x,0);
}

Player.prototype.move = function(x){
    console.log("[Player] moving");
    this.paddle.move(x,0);
}

function Player() {
    this.paddle = new Paddle(175, 580, 50, 10);
}

Player.prototype.render = function () {
    this.paddle.render();
};



function Ball(x, y) {
    this.x = x;
    this.y = y;
    this.x_speed = 0;
    this.y_speed = 3;
}

Ball.prototype.render = function () {
    context.beginPath();
    context.arc(this.x, this.y, 5, 2 * Math.PI, false);
    context.fillStyle = "#000000";
    context.fill();
};

Ball.prototype.update = function (paddle1, paddle2) {
    this.x += this.x_speed;
    this.y += this.y_speed;
    var top_x = this.x - 5;
    var top_y = this.y - 5;
    var bottom_x = this.x + 5;
    var bottom_y = this.y + 5;

    if (this.x - 5 < 0) {
        this.x = 5;
        this.x_speed = -this.x_speed;
    } else if (this.x + 5 > 400) {
        this.x = 395;
        this.x_speed = -this.x_speed;
    }

    if (this.y < 0 || this.y > 600) {
        console.log("Goal!");
        if(this.y < 0){
            $.post("http://91.240.28.246:8090/api/score/" + gameId + "/" + player.pin);
            downPoints += 1;
            document.getElementById("point1").textContent = downPoints
        }else{
            upPoints += 1;
            document.getElementById("point2").textContent = upPoints
            $.post("http://91.240.28.246:8090/api/score/" + gameId + "/" + player1.pin);
        }
        if(Math.abs(downPoints - upPoints) > 2){
                $.post("http://91.240.28.246:8090/api/finish/" + gameId);
                shouldstop = 1;
                document.getElementById("endinfo").textContent = "Koniec!"
        }
        this.x_speed = 0;
        this.y_speed = 3;
        this.x = 200;
        this.y = 300;

    }

    if (top_y > 300) {
        if (top_y < (paddle1.y + paddle1.height) && bottom_y > paddle1.y && top_x < (paddle1.x + paddle1.width) && bottom_x > paddle1.x) {
            this.y_speed = -3;
            this.x_speed = 3*(paddle1.x - top_x)/(paddle1.x - paddle1.width);
            this.y += this.y_speed;
        }
    } else {
        if (top_y < (paddle2.y + paddle2.height) && bottom_y > paddle2.y && top_x < (paddle2.x + paddle2.width) && bottom_x > paddle2.x) {
            this.y_speed = 3;
            this.x_speed = 3*(paddle2.x - top_x)/(paddle2.x - paddle2.width);
            this.y += this.y_speed;
        }
    }
};

document.body.appendChild(canvas);
animate(step);

window.addEventListener("keydown", function (event) {
    keysDown[event.keyCode] = true;
});

window.addEventListener("keyup", function (event) {
    delete keysDown[event.keyCode];
});
