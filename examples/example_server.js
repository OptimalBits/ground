/*global _:true*/
_ = require('underscore');

var Gnd = require('../index');
// // require('require-typescript');
// var uuid = require('node-uuid');
// var fs = require('fs');
// var execSync = require('execSync');
// var path = require('path');
//
// // typescript doesn't export any public interface, we need to spawn a
// // process
// // @todo: do I need to take care of caching or is this done at a higher level??
// // @todo: cache compiled files and don't recompile them if source didn't
// //        change (last modified date comparison)
// require.extensions['.ts'] = function(module, filename) {
//   var baseName = path.basename(filename, '.ts');
//   var basePath = path.dirname(filename);
//   var out = path.join(basePath, baseName)+'.js';
//   var cmd = 'tsc -out '+ out + ' ' + filename;
//   console.log(cmd);
//   execSync.stdout(cmd);
//   var content = fs.readFileSync(out, 'utf8');
//   //execSync.stdout('rm ' + out);
//   return module._compile(content, filename);
// };

// var Gnd = require('../gnd-server.ts');

var express = require('express'),
    app = express.createServer(),
    mongoose = require('mongoose'),
    redis = require('redis'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    
    sio = require('socket.io').listen(app),
    // Server = require('../server'),
    staticDir = __dirname + '/../';

app.use(express.static(staticDir));
app.use(express.static(__dirname));

// Setup a mongo DB. This is used by the chat example
var Message = new Schema({
  _cid: {type: String},
  text: {type: String},
  ts: {type: Number}
});

var Room = new Schema({
  _cid: {type: String},
  name : {type: String},
  url: {type: String},
  ts: {type: Number},
  messages :  [{type: Schema.ObjectId, ref: 'Message'}]
});

var Chat = new Schema({
  _cid: {type: String},
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

