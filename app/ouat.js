const COUNTDOWN_TIME = 15;
const RESET_TIME = 0.3;

const CARD_COLORS = {
    "aspect": "#ff6b6b",
    "character": "#1dd1a1",
    "event": "#48dbfb",
    "place": "#feca57",
    "thing": "#5f27cd",
    "ending": "#222f3e"
};

const CARD_ICONS = {
    "aspect": "fa-ruler",
    "character": "fa-user",
    "event": "fa-bolt",
    "place": "fa-map-marker",
    "thing": "fa-socks",
    "ending": "fa-hourglass-end"
};

const socket = io();

let timer = $('.timer-bar'); timer.active = false;
let cardContainer = $('.card-container');
let endingContainer = $('.ending-container');
let cards = [];
let newCardIndex = 0;
let winner = false;
let turnOverButton = $('.turn-over-button'); turnOverButton.addClass('hidden'); turnOverButton.active = false;
turnOverButton.on('click', function() {
    turnOverButton.addClass('hidden');
    turnOverButton.active = false;
    socket.emit('TURN_OVER');
});


timer.addClass('clear');
timer.start = function() {
    timer.active = true;
    timer.css('transition', `transform ${COUNTDOWN_TIME}s linear`);
    timer.addClass('timer-active');
    timer.removeClass('clear');
    timer.timeout = setTimeout(function() {
        timer.css('transition', `transform ${RESET_TIME}s ease-out`);
        timer.removeClass('timer-active');
        timer.addClass('clear');
        timer.active = false;
    }, COUNTDOWN_TIME * 1000);
};

function addCard(card) {
    let index = newCardIndex;
    card.index = index;
    cards.push(card)
    newCardIndex++;

    let cardName = card.name;
    let cardInterrupt = card.interruptible;
    let cardDiv = `<div class="word-card btn block text-white shadow card-${index}">`;
    cardDiv += `<i class="type-icon fa ${CARD_ICONS[card.cardtype]}"></i>`;
    cardDiv += `${cardName}`;
    if (card.interruptible) {
        cardDiv += `<i class="interrupt-icon fa fa-angle-double-up"></i>`;
    }
    cardDiv += `</div>`
    cardContainer.append(cardDiv);

    let cardDOM = $(`.card-${index}`);
    cardDOM.css('background-color', CARD_COLORS[card.cardtype]);
    cardDOM.on('click', function() {
        if (!timer.active && (turnOverButton.active || cardInterrupt)) {

            timer.start();

            cardDOM.addClass('hidden');
            for (let i = 0; i < cards.length; i++) {
                if (cards[i].name == cardName) {
                    socket.emit('CARD_PLAYED', cards[i]);
                    cards.splice(i, 1);
                    break;
                }
            }
            console.log(`${cards.length} cards left.`);
        }
    });
};

function addEnding(card) {

    let cardName = card.name;
    let cardDiv = `<div class="word-card btn block text-white shadow card-ending">`;
    cardDiv += `<i class="type-icon fa ${CARD_ICONS[card.cardtype]}"></i>`;
    cardDiv += `${cardName}`;
    if (card.interruptible) {
        cardDiv += `<i class="interrupt-icon fa fa-angle-double-up"></i>`;
    }
    cardDiv += `</div>`
    endingContainer.append(cardDiv);
    let cardDOM = $(`.card-ending`);
    cardDOM.css('background-color', CARD_COLORS[card.cardtype]);
    cardDOM.on('click', function() {
        console.log(`${!timer.active} && ${turnOverButton.active} && ${cards.length} == 0`);
        if (!timer.active && turnOverButton.active && cards.length == 0) {
            winner = true;
            Swal.fire(
                'You win!',
                'You used all of your story elements before anyone else! Refresh the page to restart.',
                'success'
            );
            socket.emit('GAME_OVER');
        }
    });
};



socket.emit('CARD_REQUEST');
socket.on('CARDS', function(cardData) {
    console.log("got cards", cardData);
    for (let i = 0; i < cardData.length - 1; i++) {
        addCard(cardData[i]);
    }
    addEnding(cardData[cardData.length - 1]);
});

socket.on('CARD_PLAYED', function(card) {
    Swal.fire(`${card.name}`);
    turnOverButton.addClass('hidden');
    turnOverButton.active = false;
});

socket.on('NEW_CARD', function(newCard) {
    addCard(newCard);
});

socket.on('YOUR_TURN', function() {
    turnOverButton.removeClass('hidden');
    turnOverButton.active = true;
});

socket.on('GAME_OVER', function() {
    if (!winner) {
        Swal.fire(
            'You lost!',
            'Try to used all of your story elements before anyone else next time! Refresh the page to restart.',
            'error'
        );
    }
});