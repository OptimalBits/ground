
require('require-typescript');

var GndServer = require('../lib/gnd-server.ts');
var SocketServer = require('../lib/storage/socket-backend.ts');
var MongooseStorage = require('../lib/storage/mongoose-backend.ts');
var Sync = require('../lib/sync/sync-backend.ts');

var express = require('express'),
    mongoose = require('mongoose'),
    app = express.createServer(),
    sio = require('socket.io').listen(app),
    models = require('./fixtures/mongo_models'),
    redis = require('redis'),
    cabinet = require('cabinet'),
    Server = require('../server'),
    staticDir = __dirname + '/../';

app.use(cabinet(staticDir, 
  {
    ignore: ['.git', 'node_modules', '*~', 'examples'],
    typescript: {
      tmpPath: '/var/tmp'
    }
  },
  function(url){
    console.log("FILE Changed:"+url);
    if(url.indexOf('.ts') != -1){
      sio.sockets.emit('file_changed:', url);
    }
  }
));
app.use(cabinet(__dirname, {ignore:['.git', '*~']}, function(url){
  sio.sockets.emit('file_changed:', url);
  console.log(url);
}));
app.use(express.bodyParser());

var mongooseStorage = new MongooseStorage.Mongoose(models);
var pubClient = redis.createClient(6379, "127.0.0.1"),
    subClient = redis.createClient(6379, "127.0.0.1");

var syncHub = new Sync.SyncHub(pubClient, subClient, sio.sockets);

var gndServer = new GndServer.Server(mongooseStorage, syncHub);
var socketServer = new SocketServer.SocketBackend(sio.sockets, gndServer);

//
// Ajax APIs used for some unit tests
//
app.put('/animals/:id', function(req, res){
  models.animals.update({_id:req.params.id}, req.body, function(err){
    if (err) throw new Error('Error updating animal:'+req.params.id+' '+err);
    res.send(204)
  })
})

app.put('/zoos/:zooId/animals/:id', function(req, res){
  res.send(204);
})

app.del('/zoos/:zooId/animals/:id', function(req, res){
  models.zoo.findById(req.params.zooId, function(err, zoo){    
    if (err) {
      throw new Error('Error remove animal:'+req.params.id+' from Zoo:'+req.params.zooId+' '+err);
    } else {
      var index = zoo.animals.indexOf(req.params.id);
      zoo.animals.splice(index, 1);
      zoo.save(function(err){
        res.send(204);
      });
    }
  });
});

//
// Mongoose test database
//

mongoose.connect('mongodb://localhost/testGingerSync', function(){
  mongoose.connection.db.executeDbCommand( {dropDatabase:1}, function(err, result) { 
    console.log(result);
    mongoose.disconnect(function(){
      mongoose.connect('mongodb://localhost/testGingerSync');
      //var server = new Server(models, 6379, 'localhost', sio.sockets);
  
      app.listen(8080);
      console.log("Started test server at port: %d in %s mode", app.address().port, app.settings.env);
    });
  });
});


