const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const uuidv4 = require('uuid').v4;

let activeGames = {};

function Board(width, height, gameId) {
    let board = {
        gameId: gameId,
        state: 'virgin',
        width: width,
        height: height,
        cellLookup: {},
        cells: [],
        revealed: 0
    };
    for(let y = 0; y < height; y++) {
        for(let x = 0; x < width; x++) {
            let uid = uuidv4();
            let index = getIndex(width, height, x, y);
            board.cellLookup[uid] = {
                id: uid,
                x: x,
                y: y,
                index: index,
                isBomb: roll(0.15),
                isFlagged: false,
                isHidden: true
            }
            board.cells.push({
                id: uid,
                x: x,
                y: y,
                index: index,
                isFlagged: false,
                isHidden: true
            });
        }
    }
    return board;
}

function applyCounts(board) {
    let totalBombCount = 0;
    for(let x = 0; x < board.width; x++) {
        for(let y = 0; y < board.height; y++) {
            let index = getIndex(board.width, board.height, x, y);
            let id = board.cells[index].id;
            let cell = board.cellLookup[id];
            let adjacentCells = getAdjacentCells(board, cell);
            let count = 0;
            if(cell.isBomb) {
                totalBombCount++;
            }
            for(let i = 0; i < adjacentCells.length; i++) {
                if(adjacentCells[i].isBomb) {
                    count++;
                }
            }
            cell.count = count;
        }
    }
    board.bombCount = totalBombCount;
    return board;
}

function flagCell(socket, cell) {
    let board = activeGames[socket.id];
    let lookup = board.cellLookup[cell.id];
    lookup.isFlagged = true;
    cell.isFlagged = true;
    socket.emit('updateCells', [{
        index: cell.index,
        cell: cell
    }]);
}

function unflagCell(socket, cell) {
    let board = activeGames[socket.id];
    let lookup = board.cellLookup[cell.id];
    lookup.isFlagged = false;
    cell.isFlagged = false;
    socket.emit('updateCells', [{
        index: cell.index,
        cell: cell
    }]);
}

function getAdjacentCells(board, cell) {
    let width = board.width;
    let height = board.height;
    let cells = [];
    let x = cell.x;
    let y = cell.y;
    let iTopLeft = getIndex(width, height, x - 1, y - 1);
    let iTop = getIndex(width, height, x, y - 1);
    let iTopRight = getIndex(width, height, x + 1, y - 1);
    let iRight = getIndex(width, height, x + 1, y);
    let iBottomRight = getIndex(width, height, x + 1, y + 1);
    let iBottom = getIndex(width, height, x, y + 1);
    let iBottomLeft = getIndex(width, height, x - 1, y + 1);
    let iLeft = getIndex(width, height, x - 1, y);
    if(iTopLeft != -1) {
        let id = board.cells[iTopLeft].id;
        cells.push(board.cellLookup[id]);
    }
    if(iTop != -1) {
        let id = board.cells[iTop].id;
        cells.push(board.cellLookup[id]);
    }
    if(iTopRight != -1) {
        let id = board.cells[iTopRight].id;
        cells.push(board.cellLookup[id]);
    }
    if(iRight != -1) {
        let id = board.cells[iRight].id;
        cells.push(board.cellLookup[id]);
    }
    if(iBottomRight != -1) {
        let id = board.cells[iBottomRight].id;
        cells.push(board.cellLookup[id]);
    }
    if(iBottom != -1) {
        let id = board.cells[iBottom].id;
        cells.push(board.cellLookup[id]);
    }
    if(iBottomLeft != -1) {
        let id = board.cells[iBottomLeft].id;
        cells.push(board.cellLookup[id]);
    }
    if(iLeft != -1) {
        let id = board.cells[iLeft].id;
        cells.push(board.cellLookup[id]);
    }
    return cells;
}

function getIndex(width, height, x, y) {
    if(x < 0 || y < 0 || x > width - 1 || y > height - 1) {
        return -1;
    }
    return x + (y * width);
}

function markTrigger(socket, cell) {
    let id = cell.id;
    socket.emit('markTrigger', id);
}

function revealAdjacentCells(socket, centerCell) {
    let updates = [];
    let board = activeGames[socket.id];
    let adjacentCells = getAdjacentCells(board, centerCell);
    for(let i = 0; i < adjacentCells.length; i++) {
        let cell = adjacentCells[i];
        if(cell.isHidden && !cell.isFlagged) {
            revealCell(socket, cell);
        }
    }
    socket.emit('updateCells', updates);
}

function revealCell(socket, cell) {
    if(cell.isHidden) {
        let board = activeGames[socket.id];
        let lookup = board.cellLookup[cell.id];
        let index = lookup.index;
        board.revealed++;
        cell.count = lookup.count;
        cell.isBomb = lookup.isBomb;
        cell.isFlagged = lookup.isFlagged;
        lookup.isHidden = false;
        cell.isHidden = false;
        if(board.state == 'virgin') {
            board.state = 'playing';
            board.start = new Date();
            socket.emit('updateGameState', board.state);
            socket.emit('updateGameStart', board.start);
        }
        if(cell.isBomb && (board.state == 'virgin' || board.state == 'playing')) {
            board.state = 'defeat';
            board.end = new Date();
            socket.emit('updateGameState', board.state);
            socket.emit('updateGameEnd', board.end);
            markTrigger(socket, cell);
            showBoard(socket);
        }
        if(lookup.count == 0) {
            revealAdjacentCells(socket, cell);
        }
        if(
            board.revealed == (board.cells.length - board.bombCount) &&
            board.state == 'playing'
        ) {
            board.state = 'victory';
            board.end = new Date();
            socket.emit('updateGameState', board.state);
            socket.emit('updateGameEnd', board.end);
            showBoard(socket);
        }
        socket.emit('updateCells', [{
            index: index,
            cell: cell
        }]);
    }
}

function roll(chance) {
    return (Math.random() <= chance);
}

function showBoard(socket) {
    let updates = [];
    let board = activeGames[socket.id];
    for(let i = 0; i < board.cells.length; i++) {
        let cell = board.cells[i];
        if(cell.isHidden) {
            revealCell(socket, cell);
        }
    }
    socket.emit('updateCells', updates);
}


app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('a user connected');
    activeGames[socket.id] = new Board(10, 10, socket.id);
    let clientBoard = {}
    Object.assign(clientBoard, activeGames[socket.id]);
    delete clientBoard.cellLookup;
    socket.emit('newBoard', clientBoard);
    activeGames[socket.id] = applyCounts(activeGames[socket.id]);

    // When a user disconnects
    socket.on('disconnect', () => {
        console.log('user has disconnected');
    });

    socket.on('flag', (id) => {
        let board = activeGames[socket.id];
        let cell = board.cellLookup[id];
        if(!cell.isFlagged) {
            flagCell(socket, cell);
        }
    });

    socket.on('unflag', (id) => {
        let board = activeGames[socket.id];
        let cell = board.cellLookup[id];
        if(cell.isFlagged) {
            unflagCell(socket, cell);
        }
    });

    // When a user clicks on an empty square
    socket.on('reveal', (id) => {
        let board = activeGames[socket.id];
        let cell = board.cellLookup[id];
        revealCell(socket, cell);
    });

    socket.on('revealAdjacent', (id) => {
        let board = activeGames[socket.id];
        let lookup = board.cellLookup[id];
        if(lookup) {
            let index = lookup.index;
            let cell = board.cells[index];
            cell.count = lookup.count;
            cell.isBomb = lookup.isBomb;
            let adjacentCells = getAdjacentCells(board, cell);
            let flaggedCount = 0;
            for(let i = 0; i < adjacentCells.length; i++) {
                if(adjacentCells[i].isFlagged) {
                    flaggedCount++;
                }
            }
            if(cell.count == flaggedCount) {
                revealAdjacentCells(socket, cell);
            }
            else {
                socket.emit('deny', cell.id);
                for(let i = 0; i < adjacentCells.length; i++) {
                    if(adjacentCells[i].isHidden && !adjacentCells[i].isFlagged) {
                        socket.emit('glimmer', adjacentCells[i].id);
                    }
                }
            }
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});