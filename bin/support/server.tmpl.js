"use strict";

var Gnd = require('gnd')
  , config = require('./config')
  , models = require('./models/models')
  , cabinet = require('cabinet') 
  , express = require('express')
  , app = express.createServer()
  , sio = require('socket.io').listen(app)
  , redis = require('redis')
  , mongoose = require('mongoose')
  , staticDir = __dirname
  , path = require('path');
  
app.use(cabinet(path.join(__dirname, 'app'), {
  ignore: ['.git', 'node_modules', '*~'],
  files: {
    '/index.html': path.join(__dirname, 'index.html'),
    '/lib/gnd.js': Gnd.lib,
    '/lib/curl.min.js': Gnd.third.curl
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

app.listen(config.APP_PORT);
console.log("Express server listening on port %d", config.APP_PORT);