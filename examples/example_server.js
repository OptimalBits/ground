require('require-typescript');

var Gnd = require('../gnd-server.ts');

var express = require('express'),
    app = express.createServer(),
    mongoose = require('mongoose'),
    redis = require('redis'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    
    sio = require('socket.io').listen(app),
    Server = require('../server'),
    staticDir = __dirname + '/../';

app.use(express.static(staticDir));
app.use(express.static(__dirname));

// Setup a mongo DB. This is used by the chat example
var Message = new Schema({
  text : {type: String},
  ts: {type: Number}
});

var Room = new Schema({
  name : {type: String},
  url: {type: String},
  ts: {type: Number},
  messages :  [{type: Schema.ObjectId, ref: 'Message'}]
});

var Chat = new Schema({
  rooms :  [{type: Schema.ObjectId, ref: 'Room'}]
});

Chat.statics.add = Room.statics.add = function(id, setName, itemIds, cb){
  var update = {$addToSet: {}};
  update.$addToSet[setName] = {$each:itemIds};
  this.update({_id:id}, update, cb);
};

var models = {
  messages: mongoose.model('Message', Message),
  rooms: mongoose.model('Room', Room),
  chats: mongoose.model('Chat', Chat)
};

// Setup mongodb
mongoose.connect('mongodb://localhost/exDB', function(){
  // mongoose.connection.db.executeDbCommand( {dropDatabase:1}, function(err, result) {
  //   console.log(result);
  //   mongoose.disconnect(function(){
  //     mongoose.connect('mongodb://localhost/exDB');
  
      app.listen(8080);
      console.log("Started test server at port: %d in %s mode", app.address().port, app.settings.env);
  //   });
  // });
});

var mongooseStorage = new Gnd.MongooseStorage(models);
var pubClient = redis.createClient(6379, "127.0.0.1"),
    subClient = redis.createClient(6379, "127.0.0.1");

var syncHub = new Gnd.Sync.SyncHub(pubClient, subClient, sio.sockets);
var gndServer = new Gnd.Server(mongooseStorage, syncHub);
var socketServer = new Gnd.SocketBackend(sio.sockets, gndServer);

