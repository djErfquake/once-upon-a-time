const NUM_OF_CARDS = 6;

const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const port = process.env.PORT || 9713;
const io = require('socket.io')(server);
const _ = require('underscore');
const fs = require('fs');

//////////////////////
// START SERVER
//////////////////////

app.use(express.static(path.join(__dirname, 'app')));

// serve these pages
app.get('/', (req, res) => {
  res.status(200).sendFile(path.resolve(__dirname, '', 'app', 'ouat.html'));
});

// start listening for requests
server.listen(port, () => { console.log(`Listening on port ${port}`); });


//////////////////////
// SOCKET IO
//////////////////////

let sockets = [];
let currentSocketIndex = 0;

io.on('connection', function(socket) {

    socket.index = currentSocketIndex;
    socket.activePlayer = false;
    sockets.push(socket);
    console.log(`user ${currentSocketIndex} connected`);
    currentSocketIndex++;
    
    // setup for disconnect
    socket.on('disconnect', function() {

        // delete player
        let socketsIndex = 0;
        for (let i = 0; i < sockets.length; i++) {
            if (sockets[i].index == socket.index) {
                socketsIndex = i;
                sockets.splice(socketsIndex, 1);
                break;
            } 
        }
        console.log(`user ${socket.index} disconnected. ${sockets.length} sockets left.`);

        // set new active player if necessary
        if (socket.activePlayer && sockets.length > 0) {
            if (socketsIndex >= sockets.length) { socketsIndex = 0; }

            console.log(`setting active player to ${socketsIndex}/${sockets.length}`);

            sockets[socketsIndex].activePlayer = true;
            sockets[socketsIndex].emit('YOUR_TURN');
        }
    });

    // asking for cards
    socket.on('CARD_REQUEST', function() {
        socket.cards = [];
        for (let i = 0; i < NUM_OF_CARDS - 1; i++) {
            socket.cards.push(cards.randomCard());         
        }
        socket.cards.sort(function(a, b) { return a.cardtype.localeCompare(b.cardtype); });

        socket.cards.push(cards.randomEnding());
        socket.emit('CARDS', socket.cards);
    });

    // set start player
    if (sockets.length == 1) {
        socket.activePlayer = true;
        socket.emit('YOUR_TURN');
    }

    // let all players know when a card is played
    socket.on('CARD_PLAYED', function(card) {
        for (let i = 0; i < sockets.length; i++) {
            if (sockets[i] != socket) {
                sockets[i].emit('CARD_PLAYED', card);
                sockets[i].activePlayer = false;
            }    
        }

        socket.activePlayer = true;
        socket.emit('YOUR_TURN');
    });

    // listen for turn switching
    socket.on('TURN_OVER', function() {

        // let new player know it is their turn
        for (let i = 0; i < sockets.length; i++) {
            let socketIndex = i;
            if (sockets[socketIndex].activePlayer) {
                socketIndex++; if (socketIndex >= sockets.length) { socketIndex = 0; }
                sockets[socketIndex].activePlayer = true;
                sockets[socketIndex].emit('YOUR_TURN');
                sockets[i].activePlayer = false;
                break;
            }
        }
        
        // give old player a card for passing
        let newCard = cards.randomCard();
        socket.cards.push(newCard);
        socket.emit('NEW_CARD', newCard);
    });

    // listen for game end
    socket.on('GAME_OVER', function() {
        for (let i = 0; i < sockets.length; i++) {
            sockets[i].emit('GAME_OVER');
        }
    });

});


//////////////////////
// LOAD CARDS
//////////////////////
let cards = JSON.parse(fs.readFileSync('cards.json'));
cards = _.groupBy(cards, 'cardtype');
cards.allCards = cards.aspect.concat(cards.character).concat(cards.event).concat(cards.place).concat(cards.thing);
cards.randomCard = function() {
    let cardIndex = Math.floor(Math.random()*cards.allCards.length);
    let card = cards.allCards.splice(cardIndex, 1)[0];
    //console.log(`taking card ${cardIndex}`, cards);
    return card;
};
cards.randomEnding = function() {
    let cardIndex = Math.floor(Math.random()*cards.ending.length);
    let card = cards.ending.splice(cardIndex, 1)[0];
    return card;
}
//console.log("themes", cards.theme);
//console.log("random ending", cards.randomEnding());
//console.log("cards", cards);
//console.log("random card", cards.randomCard());

/*
// TODO:
make timer work

put on heroku
test

*/