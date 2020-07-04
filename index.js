const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const uuidv4 = require('uuid').v4;

let boards = {};

function Board(width, height, gameId) {
    let board = {
        gameId: gameId,
        gameState: 'virgin',
        width: width,
        height: height,
        serverBoard: {},
        clientBoard: [],
    };
    for(let x = 0; x < width; x++) {
        for(let y = 0; y < height; y++) {
            let uid = uuidv4();
            board.serverBoard[uid] = {
                x: x,
                y: y,
                isBomb: roll(0.15),
                isFlagged: false,
                isHidden: true
            }
            board.clientBoard.push({
                id: uid,
                x: x,
                y: y,
                isFlagged: false,
                isHidden: true
            });
        }
    }
    return board;
}

function applyCounts(board) {
    for(let x = 0; x < board.width; x++) {
        for(let y = 0; y < board.height; y++) {
            let index = getIndex(board, x, y);
            let id = board.clientBoard[index].id;
            let cell = board.serverBoard[id];
            let adjacentCells = getAdjacentCells(board, cell);
            let count = 0;
            for(let i = 0; i < adjacentCells.length; i++) {
                if(adjacentCells[i].isBomb) {
                    count++;
                }
            }
            cell.count = count;
        }
    }
    return board;
}

function getAdjacentCells(board, cell) {
    let cells = [];
    let x = cell.x;
    let y = cell.y;
    let iTopLeft = getIndex(board, x - 1, y - 1);
    let iTop = getIndex(board, x, y - 1);
    let iTopRight = getIndex(board, x + 1, y - 1);
    let iRight = getIndex(board, x + 1, y);
    let iBottomRight = getIndex(board, x + 1, y + 1);
    let iBottom = getIndex(board, x, y + 1);
    let iBottomLeft = getIndex(board, x - 1, y + 1);
    if(iTopLeft != -1) {
        let id = board.clientBoard[iTopLeft].id;
        cells.push(board.serverBoard[id]);
    }
    if(iTop != -1) {
        let id = board.clientBoard[iTop].id;
        cells.push(board.serverBoard[id]);
    }
    if(iTopRight != -1) {
        let id = board.clientBoard[iTopRight].id;
        cells.push(board.serverBoard[id]);
    }
    if(iRight != -1) {
        let id = board.clientBoard[iRight].id;
        cells.push(board.serverBoard[id]);
    }
    if(iBottomRight != -1) {
        let id = board.clientBoard[iBottomRight].id;
        cells.push(board.serverBoard[id]);
    }
    if(iBottom != -1) {
        let id = board.clientBoard[iBottom].id;
        cells.push(board.serverBoard[id]);
    }
    if(iBottomLeft != -1) {
        let id = board.clientBoard[iBottomLeft].id;
        cells.push(board.serverBoard[id]);
    }
    return cells;
}

function getIndex(board, x, y) {
    if(x < 0 || y < 0 || x > board.width - 1 || y > board.height - 1) {
        return -1;
    }
    return x + (y * board.width);
}

function roll(chance) {
    return (Math.random() <= chance);
}

// Send simple GET response
// app.get('/', (request, response) => {
//     response.send('<h1>Hello World!</h1>');
// });

app.get('/', (request, response) => {
    response.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    boards[socket.id] = new Board(10, 10, socket.id);
    socket.emit('board', boards[socket.id].clientBoard);
    boards[socket.id] = applyCounts(boards[socket.id]);
    console.log(JSON.stringify(boards[socket.id]));

    // When a user disconnects
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});