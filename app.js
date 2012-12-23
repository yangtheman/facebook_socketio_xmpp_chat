var express = require('express'),
    connect = require('connect'),
    app = module.exports = express.createServer(),
    io = require('socket.io').listen(app),
    mongoose = require('mongoose'),
    mongoStore = require('connect-mongodb'),
    passport = require('passport'),
    FacebookStrategy = require('passport-facebook').Strategy,
    models = require('./models'),
    FacebookChat = require('facebook-chat'),
    // mongo = require('mongodb'),
    currentUser = {},
    friends = {},
    facebookClient,
    db,
    User;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

app.configure('development', function() {
  app.set('db-uri', 'mongodb://localhost/yangchat-development');
  app.use(express.errorHandler({ dumpExceptions: true }));
  app.set('view options', {
    pretty: true
  });
});

app.configure('test', function() {
  app.set('db-uri', 'mongodb://localhost/yangchat-test');
  app.set('view options', {
    pretty: true
  });  
});

app.configure('production', function() {
  var mongoUri = process.env.MONGOLAB_URI || 
    process.env.MONGOHQ_URL || 
    'mongodb://localhost/mydb'; 
  
  app.set('db-uri', mongoUri);

  // app.set('db-uri', 'mongodb://localhost/yangchat-production');
  
});

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade')
  app.set('view options', { layout: false })
  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: 'topsecret' }));
  app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }))
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(passport.initialize());
  app.use(passport.session());
});

models.defineModels(mongoose, function() {
  console.log("Connecting to " + app.set('db-uri'));
  app.User = User = mongoose.model('User');
  db = mongoose.connect(app.set('db-uri'));
})

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("NodeChat server listening on port %d in %s mode", app.address().port, app.settings.env);
});

passport.use(new FacebookStrategy({
  clientID: '216824721709270',
  clientSecret: '82fe3a5bd84d808cc064f89baf20c709',
  callbackURL: "http://yangchat.com:" + port + "/auth/facebook/callback", 
  passReqToCallback: true},
  
  function(req, accessToken, refreshToken, profile, done) {
    // console.log(profile);    
    if (req.user) {
      return done(req.user)
    } else {
      User.findOne({ fbid: profile.id }, function (err, user) {
        if (user == null) {
          console.log("User NOT Found");
          var user = new User({ fbid: profile.id, username: profile.username, accessToken: accessToken });
          user.save(function (err) {
            if (err) throw err
          });
        } else {
          console.log(user);
        }
        currentUser = {id: profile.id, accessToken: accessToken};
      });
      return done(null);            
      //return done(null);
    }
  }
));

//routing
app.get('/', function (req, res) {
  res.render('index');
});

app.get('/facebook', function(req, res) {
  res.sendfile(__dirname + '/views/facebook_login.html');
})

app.get('/fbchat', function(req, res) {
  
  var params = {
    facebookId : currentUser.fbid,
    appId : '216824721709270',
    secret_key : '82fe3a5bd84d808cc064f89baf20c709',
    accessToken : currentUser.accessToken
  };
  
  facebookClient = new FacebookChat(params);
  
  facebookClient.on('online', function() {
    //Get friends list
    facebookClient.roster();  
  });

  facebookClient.on('message', function(message) {
    console.log('MESSAGE');
    console.log(message);
    fbid = message.from.match(/[\d]+/g);
    io.sockets.emit('updatechat', friends[fbid] + ' -> me', message.body);
  });
  
  facebookClient.on('presence', function(presence) {
    console.log('PRESENCE');
    console.log(presence);
  });
  
  // Put friends into hash with name as value
  // friends[fbid] = 'name'
  facebookClient.on('roster', function(roster) {
    for (var i=0; i < roster.length; i++) {
      fbid = roster[i].id.match(/[\d]+/g);
      friends[fbid] = roster[i].name
    }
  });
  
  facebookClient.on('composing', function(from) {
    console.log('COMPOSING');
    console.log(from);
  });
  
  res.sendfile(__dirname + '/views/fbchat.html');
})

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
app.get('/auth/facebook', 
  passport.authenticate('facebook', { scope: ['read_stream', 'publish_actions', 'xmpp_login'] }));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { display: 'popup',
                                      successRedirect: '/fbchat',
                                      failureRedirect: '/fbchat' }));
                                      
//usernames which are currently connected to the chat
var usernames = {};

io.sockets.on('connection', function(socket) {
  
  socket.on('inituser', function() {
    io.sockets.emit('update_user', currentUser.id);
    io.sockets.emit('update_friends', friends);
  });
  
  // when the client emits 'sendchat', this listens and executes
  socket.on('sendchat', function(fbid, message) {
    fbchat_id = '-' + fbid + '@chat.facebook.com';
    facebookClient.send(fbchat_id, message);
        
    //we tell the client to execute 'updatechat' with 2 parameters
    io.sockets.emit('updatechat', 'me -> ' + friends[fbid], message);
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