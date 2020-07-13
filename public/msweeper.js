let board;
let options = {
    cellSize: 50,
    cellMargin: 5
}
let hover;
let leftMouseDown = false;
let leftMouseTarget;
let rightMouseDown = false;
let rightMouseTarget;
function generateMockBoard(width, height) {

}
function generateBoard(socket) {
    let container = document.getElementById('board');
    let hud = document.getElementById('hud');
    let width = (options.cellSize + (options.cellMargin * 2)) * (board.width + 1);
    hud.style.maxWidth = width + 'px';
    container.style.width = width + 'px';
    // COUNT HEADER ROW
    for(let i = 0; i < board.width + 1; i++) {
        let count = document.createElement('div');
        count.classList.add('count');
        if(i != 0) {
            count.innerHTML = i - 1;
        }
        count.style.width = options.cellSize + 'px';
        count.style.height = options.cellSize + 'px';
        count.style.margin = options.cellMargin + 'px';
        container.appendChild(count);
    }
    // BOARD
    let yCount = 0;
    for(let i = 0; i < board.cells.length; i++) {
        // COUNT COLUMN START
        if(i % board.width == 0) {
            let count = document.createElement('div');
            count.classList.add('count');
            count.innerHTML = yCount++;
            count.style.width = options.cellSize + 'px';
            count.style.height = options.cellSize + 'px';
            count.style.margin = options.cellMargin + 'px';
            container.appendChild(count);
        }
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
            if(
                (board.state == 'playing' || board.state == 'virgin') &&
                !event.target.classList.contains('showing')
            ) {
                let id = event.target.id;
                if(event.target.classList.contains('flagged')) {
                    socket.emit('unflag', id);
                }
                else {
                    socket.emit('flag', id);
                }
            }
        });
        cell.addEventListener('mouseover', (event) => {
            hover = event.target;
        });
        container.appendChild(cell);
    }
}
function handleKeydown(event) {
    if(event.key == ' ') {
        let id = hover.id;
    }
}
function updateTimer() {
    let elapsed = Date.now() - board.start;
    let secondsElapsed = Math.floor(elapsed / 1000);
    let timerH = document.getElementById('timer-h');
    let timerT = document.getElementById('timer-t');
    let timerD = document.getElementById('timer-d');
    if(secondsElapsed < 999) {
        let secH = Math.floor(secondsElapsed / 100) % 100;
        let secT = Math.floor(secondsElapsed / 10) % 10;
        let secD = secondsElapsed % 10;
        timerH.innerHTML = secH;
        timerT.innerHTML = secT;
        timerD.innerHTML = secD;
    }
    else {
        timerH.innerHTML = 9;
        timerT.innerHTML = 9;
        timerD.innerHTML = 9;
    }
    if(board.state == 'playing' && secondsElapsed < 999) {
        window.requestAnimationFrame(updateTimer);
    }
}
function init() {
    const socket = io();
    window.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    })
    window.addEventListener('keydown', (event) => {
        if(
            event.key == ' ' &&
            (board.state == 'playing' || board.state == 'virgin') &&
            !hover.classList.contains('showing')
        ) {    
            if(hover.classList.contains('flagged')) {
                socket.emit('unflag', hover.id);
            }
            else {
                socket.emit('flag', hover.id);
            }
        }
    });
    window.addEventListener('mousedown', (event) => {
        if(event.button == 0) {
            leftMouseDown = true;
            leftMouseTarget = event.target;
        }
        else if(event.button == 2) {
            rightMouseDown = true;
            rightMouseTarget = event.target;
        }
    });
    window.addEventListener('mouseup', (event) => {
        if(leftMouseDown && rightMouseDown && leftMouseTarget == rightMouseTarget) {
            let id = event.target.id;
            socket.emit('revealAdjacent', id);
        }
        if(event.button == 0) {
            leftMouseDown = false;
        }
        else if(event.button == 2) {
            rightMouseDown = false;
        }
    })
    socket.on('deny', (id) => {
        let targetElement = document.getElementById(id);
        targetElement.classList.add('deny');
        setTimeout(function(that) {
            document.getElementById(id).classList.remove('deny');
        }, 200, this);
    });
    socket.on('glimmer', (id) => {
        let targetElement = document.getElementById(id);
        targetElement.classList.add('glimmer');
        setTimeout(function(that) {
            document.getElementById(id).classList.remove('glimmer');
        }, 200, this);
    });
    socket.on('markTrigger', (id) => {
        let targetElement = document.getElementById(id);
        targetElement.classList.add('trigger');
    });
    socket.on('newBoard', (payload) => {
        let container = document.getElementById('board');
        board = payload;
        document.body.classList.remove('defeat');
        document.body.classList.remove('victory');
        if(container.children.length > 0) {
            container.innerHTML = '';
        }
        generateBoard(socket);
    });
    socket.on('updateBombCount', (count) => {
        board.bombCount = count;
    });
    socket.on('updateCells', (updates) => {
        for(let i = 0; i < updates.length; i++) {
            let update = updates[i];
            board.cells[update.index] = update.cell;
            let targetCell = board.cells[update.index];
            let targetElement = document.getElementById(targetCell.id);
            if(targetCell.isFlagged) {
                targetElement.classList.add('flagged');
            }
            else {
                targetElement.classList.remove('flagged');
            }
            if(!targetCell.isHidden) {
                targetElement.classList.add('showing');
                if(targetCell.isBomb) {
                    targetElement.classList.add('bomb');
                    targetElement.innerHTML = 'M';
                }
                else {
                    targetElement.classList.remove('bomb');
                    targetElement.innerHTML = targetCell.count;
                    targetElement.classList.add('c' + targetCell.count);
                    if(targetCell.count == 0) {
                        socket.emit('revealAdjacent', targetCell.id);
                    }
                }
            }
        }
    });
    socket.on('updateFlagCount', (count) => {
        let bombCountH = document.getElementById('bomb-count-h');
        let bombCountT = document.getElementById('bomb-count-t');
        let bombCountD = document.getElementById('bomb-count-d');
        if(board.state == 'virgin') {
            bombCountH.innerHTML = 0;
            bombCountT.innerHTML = 0;
            bombCountD.innerHTML = 0;
        }
        else {
            let bombCount = board.bombCount - count;
            if(bombCount < 0) {
                let dif = Math.abs(bombCount);
                bombCountH.innerHTML = '-';
                bombCountT.innerHTML = Math.floor(dif / 10) % 10;
                bombCountD.innerHTML = dif % 10;
            }
            else {
                bombCountH.innerHTML = Math.floor(bombCount / 100) % 100;
                bombCountT.innerHTML = Math.floor(bombCount / 10) % 10;
                bombCountD.innerHTML = bombCount % 10;
            }
        }
    })
    socket.on('updateGameEnd', (time) => {
        board.end = time;
    });
    socket.on('updateGameState', (newState) => {
        board.state = newState;
        if(newState == 'playing') {
            window.requestAnimationFrame(updateTimer);
        }
        else if(newState == 'defeat') {
            document.body.classList.add('defeat');
        }
        else if(newState == 'victory') {
            document.body.classList.add('victory');
        }
    });
    socket.on('updateGameStart', (time) => {
        board.start = time;
    });
}
window.addEventListener('load', init);