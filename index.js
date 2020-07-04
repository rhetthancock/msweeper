const app = require('express')();
const http = require('http').createServer(app);

app.get('/', (request, response) => {
    response.send('<h1>Hello World!</h1>');
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});