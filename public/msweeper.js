let board;
let options = {
    cellSize: 50,
    cellMargin: 5
}
let hover;
function generateBoard(socket) {
    let container = document.getElementById('board');
    container.style.width = (options.cellSize + (options.cellMargin * 2)) * board.width + 'px';
    for(let i = 0; i < board.cells.length; i++) {
        let cell = document.createElement('div');
        cell.classList.add('cell');
        cell.id = board.cells[i].id;
        cell.style.width = options.cellSize + 'px';
        cell.style.height = options.cellSize + 'px';
        cell.style.margin = options.cellMargin + 'px';
        cell.addEventListener('click', (event) => {
            let id = event.target.id;
            if(
                (board.state == 'playing' || board.state == 'virgin') &&
                !event.target.classList.contains('showing') &&
                !event.target.classList.contains('flagged')
            ) {
                socket.emit('reveal', id);
            }
        });
        cell.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            if((board.state == 'playing' || board.state == 'virgin') && !event.target.classList.contains('showing')) {
                let id = event.target.id;
                if(event.target.classList.contains('flagged')) {
                    socket.emit('unflag', id);
                }
                else {
                    socket.emit('flag', id);
                }
            }
        })
        cell.addEventListener('mouseover', (event) => {
            hover = event.target;
            console.log(hover);
        });
        container.appendChild(cell);
    }
}
function handleKeydown(event) {
    if(event.key == ' ') {
        let id = hover.id;
        console.log(id);
    }
}
function init() {
    const socket = io();
    window.addEventListener('keydown', (event) => {
        if(event.key == ' ' && (board.state == 'playing' || board.state == 'virgin')) {
            if(hover.classList.contains('flagged')) {
                socket.emit('unflag', hover.id);
            }
            else {
                socket.emit('flag', hover.id);
            }
        }
    });
    socket.on('newBoard', (payload) => {
        board = payload;
        let container = document.getElementById('board')
        if(container.children.length > 0) {
            container.innerHTML = '';
        }
        generateBoard(socket);
        console.log(board);
    });
    socket.on('updateCells', (updates) => {
        console.log(updates);
        for(let i = 0; i < updates.length; i++) {
            let update = updates[i];
            board.cells[update.index] = update.cell;
            let targetCell = board.cells[update.index];
            let targetElement = document.getElementById(targetCell.id);
            
            if(targetCell.isHidden) {
                if(targetCell.isFlagged) {
                    targetElement.classList.add('flagged');
                }
                else {
                    targetElement.classList.remove('flagged');
                }
            }
            else {
                if(targetCell.isBomb) {
                    targetElement.innerHTML = 'B';
                    targetElement.classList.add('bomb');
                    targetElement.classList.add('showing');
                }
                else {
                    if(targetCell.count == 0) {
                        socket.emit('revealAdjacent', targetCell.id);
                    }
                    if(targetElement.classList.contains('flagged')) {
                        targetElement.classList.remove('flagged');
                    }
                    targetElement.innerHTML = targetCell.count;
                    targetElement.classList.add('c' + targetCell.count);
                }
                targetElement.classList.add('showing');
            }
        }
        console.log(board);
    });
    socket.on('updateGameState', (newState) => {
        board.state = newState;
        if(newState == 'defeat') {
            document.body.classList.add('defeat');
        }
        else if(newState == 'victory') {
            document.body.classList.add('victory');
        }
    });
    socket.on('updateGameStart', (time) => {
        board.start = time;
        console.log(board);
    });
}
window.addEventListener('load', init);