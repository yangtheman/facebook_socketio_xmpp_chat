var FacebookChat = require("facebook-chat");

var params = {
  facebookId : FB_USER_ID,
  appId : FB_APP_ID,
  secret_key : FB_SECRET,
  accessToken : FB_USER_ACCESS_TOKEN
};

var facebookClient = new FacebookChat(params);
facebookClient.on('online', function(){
  //Get friend list
  facebookClient.roster();

  //Send a message
  facebookClient.send('-224713@chat.facebook.com', 'Z');
  //facebookClient.send('-5405706@chat.facebook.com', 'Z');

  //Get a vcard
  facebookClient.vcard();

  //Get a friend vcard
  facebookClient.vcard('-224713@chat.facebook.com');
});

facebookClient.on('message', function(message){
  console.log(message);
});

facebookClient.on('presence', function(presence){
  console.log(presence);
});

facebookClient.on('roster', function(roster){
  console.log(roster);
});

facebookClient.on('vcard', function(vcard){
  console.log(vcard);
});

facebookClient.on('composing', function(from){
  console.log(from + ' compose a message');
});
