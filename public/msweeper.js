let board;
let options = {
    cellSize: 50,
    cellMargin: 5
}
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
            socket.emit('reveal', id);
        });
        container.appendChild(cell);
    }
}
function init() {
    const socket = io();
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
        for(let i = 0; i < updates.length; i++) {
            let update = updates[i];
            let index = update.index;
            let cell = update.cell;
            board.cells[update.index] = update.cell;
        }
        console.log(board);
    });
}
window.addEventListener('load', init);