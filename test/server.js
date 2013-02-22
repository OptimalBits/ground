_ = require('underscore');

//require('require-typescript');

// @see http://nodejs.org/api/all.html#all_require_extensions
var uuid = require('node-uuid');
var fs = require('fs');
var execSync = require('execSync');
var path = require('path');

// typescript doesn't export any public interface, we need to spawn a
// process
// @todo: do I need to take care of caching or is this done at a higher level??
// @todo: cache compiled files and don't recompile them if source didn't
//        change (last modified date comparison)
require.extensions['.ts'] = function(module, filename) {
  var baseName = path.basename(filename, '.ts');
  var basePath = path.dirname(filename);
  var out = path.join(basePath, baseName)+'.js';
  var cmd = 'tsc -out '+ out + ' ' + filename;
  console.log(cmd);
  execSync.stdout(cmd);
  var content = fs.readFileSync(out, 'utf8');
  //execSync.stdout('rm ' + out);
  return module._compile(content, filename);
};


var Gnd = require('../gnd-server.ts');

var express = require('express'),
    mongoose = require('mongoose'),
    app = express.createServer(),
    sio = require('socket.io').listen(app),
    models = require('./fixtures/mongo_models'),
    redis = require('redis'),
    cabinet = require('cabinet'),
    Server = require('../server'),
    staticDir = __dirname + '/../';

app.use(cabinet(staticDir+'node_modules/mocha', {
  ignore: ['.git', 'node_modules', '*~', 'examples']
}));

app.use(cabinet(staticDir+'node_modules/expect.js', {
  ignore: ['.git', 'node_modules', '*~', 'examples']
}));

app.use(cabinet(staticDir,
  {
    ignore: ['.git', 'node_modules', '*~', 'examples', '*.js'],
    typescript: {
      tmpPath: '/var/tmp',
      out: true,
    }
  },
  function(url){
    console.log("FILE Changed:"+url);
    if(url.indexOf('.ts') !== -1){
      sio.sockets.emit('file_changed:', url);
    }
  }
));
app.use(cabinet(__dirname, {ignore:['.git', '*~']}, function(url){
  sio.sockets.emit('file_changed:', url);
  console.log(url);
}));



app.use(express.bodyParser());

var mongooseStorage = new Gnd.MongooseStorage(models);
var pubClient = redis.createClient(6379, "127.0.0.1"),
    subClient = redis.createClient(6379, "127.0.0.1");

var syncHub = new Gnd.Sync.SyncHub(pubClient, subClient, sio.sockets);

var gndServer = new Gnd.Server(mongooseStorage, syncHub);
var socketServer = new Gnd.SocketBackend(sio.sockets, gndServer);

//
// Ajax APIs used for some unit tests
//
app.put('/animals/:id', function(req, res){
  console.log("Updating animals:");
  console.log(req.body);
  models.animals.update({_id:req.params.id}, req.body, function(err){
    if (err) throw new Error('Error updating animal:'+req.params.id+' '+err);
    res.send(204);
  });
});

app.put('/zoos/:zooId/animals/:id', function(req, res){
  res.send(204);
});

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


