var app = require('express').createServer();
var io = require('socket.io').listen(app);

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("NodeChat server listening on port %d in %s mode", app.address().port, app.settings.env);
});

//routing
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

//usernames which are currently connected to the chat
var usernames = {};

io.sockets.on('connection', function(socket) {
  
  // when the client emits 'sendchat', this listens and executes
  socket.on('sendchat', function(data) {
    //we tell the client to execute 'updatechat' with 2 parameters
    io.sockets.emit('updatechat', socket.username, data);
  });
  
  // when the client emits 'adduser', this listens and executes
  socket.on('adduser', function(username) {
    // we store username in the socket session for this client
    socket.username = username;
    
    // add the client's username to the global list
    usernames[username] = username;
    
    // echo to client they've connected
    socket.emit('updatechat', 'SERVER', 'you have connected!');
    
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected!');
    
    // update the list of users in chat, client-side
    io.sockets.emit('updateusers', usernames);
  });
  
  // when the user disconnects, perform this
  socket.on('disconnect', function() {
    
    // remove the username from global username list
    delete usernames[socket.username];
    
    //update list of users in chat, client-side
    io.sockets.emit('updateusers', usernames);
    
    // echo globally that his user has left
    socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected!');
  });
});