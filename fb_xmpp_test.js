/**
 * FB XMPP TEST
 *
 * Based on Echo Bot - the XMPP Hello World from node-xmpp package
 *
 * Package dependencies:
 * npm install node-xmpp
 * npm install validator
 **/

var sys = require('sys');
var xmpp = require('node-xmpp');
var sanitize = require('validator').sanitize;
var argv = process.argv;
if (argv.length < 4) {
    sys.puts('Usage: node fb_xmpp_test.js YOUR_FB_UID_NUMBER AUTH_TOKEN');
    process.exit(1);
}

var fbUID = argv[2];
var accessToken = argv[3];
var params = {
    jid: '-' + fbUID + '@chat.facebook.com', 
    // api_key: '145634995501895', // api key of fb debugger tool
    api_key: '216824721709270',
    access_token: accessToken, // user access token
    host: 'chat.facebook.com',
};

// FB Safe emoticons
var emoticons = [":)",":(",":P","=D",":o",";)",":v",">:(",":/",":'(","^_^","8)","B|","<3","3:)","O:)","-_-","o.O",">:o",":3","(y)"];

var cl = new xmpp.Client(params);
cl.on('online',
	function() {
		console.log('### We are online! ###');
		var buddylistIQ = new xmpp.Element('iq', {from:this.jid, type: 'get', id: "roster1"}).c("query",{ xmlns: 'jabber:iq:roster'}).up();
		cl.send(buddylistIQ);
	});
cl.on('stanza',
	function(stanza) {
		if (stanza.is('message') &&
			// Important: never reply to errors!
			stanza.attrs.type !== 'error') {
			if(stanza.attrs.from.match(/(123456|654321)/)) { // swap out these numbers for some FB UIDs as a whitelist
				var body = stanza.getChild("body");
				if(body) {
					var sentence = "Hi there!";
					// Add emoticon
					sentence += (' ' + emoticons[Math.floor(Math.random()*emoticons.length)]);
					sentence = sentence;
					console.log('MESSAGE: ' + sentence);
					var reply = new xmpp.Element('message', { from: this.jid, type: 'chat', to: stanza.attrs.from }).c('body').t(sentence).up();
					cl.send(reply);
				}
			}

		} else if(stanza.is('iq') && stanza.attrs.type !== 'error') {
			if(stanza.attrs.id == 'roster1') {
				var list = stanza.getChild("query");
				for (var i=0; i < list.children.length; i++) {
					var item = list.children[i];
					console.log("ONLINE BUDDY: " + item.attrs.name + "\t JID: " + item.attrs.jid + "\t GROUP: " + item.getChildText("group"));
					if(item.attrs.name.match(/Buddy Name/)) { // Swap this out for a friend's name to grab their vCard
						var vCardIQ = new xmpp.Element('iq', {from:this.jid, to: item.attrs.jid, type:'get', id: 'vcard1'}).c("vCard",{xmlns:'vcard-temp'}).up();
						cl.send(vCardIQ);
					}
				};
			}
		}
	});
cl.on('error',
	function(e) {
		sys.puts(e);
	});
