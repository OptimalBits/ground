"use strict";

var Gnd = require('gnd')
  , config = require('./config')
  , models = require('./models/models')
  , cabinet = require('cabinet') 
  , http = require('http')
  , app = require('connect').createServer()
  , server = http.createServer(app)
  , sio = require('socket.io').listen(server)
  , redis = require('redis')
  , mongoose = require('mongoose')
  , staticDir = __dirname
  , path = require('path');
  
server.listen(config.APP_PORT);
console.log("Started server at port: %d in %s mode", server.address().port, config.MODE);


app.use(cabinet(path.join(__dirname, 'app'), {
  ignore: ['.git', 'node_modules', '*~'],
  files: {
    '/lib/gnd.js': Gnd.lib,
    '/lib/curl.js': Gnd.third.curl,
    '/lib/underscore.js': Gnd.third.underscore
  }
}));

mongoose.connect(config.MONGODB_URI);

var mongooseStorage = new Gnd.MongooseStorage(models, mongoose)
  , pubClient = redis.createClient(config.REDIS_PORT, config.REDIS_ADDR)
  , subClient = redis.createClient(config.REDIS_PORT, config.REDIS_ADDR)
  , syncHub = new Gnd.Sync.Hub(pubClient, subClient, sio.sockets)
  , sessionManager =  new Gnd.SessionManager()
  , gndServer = new Gnd.Server(mongooseStorage, sessionManager, syncHub);
                               
var socketServer = new Gnd.SocketBackend(sio.sockets, gndServer);
