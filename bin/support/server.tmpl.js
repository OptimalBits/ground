"use strict";

var Gnd = require('gnd')
  , config = require('./config')
  , models = require('./models/models')
  , cabinet = require('cabinet') 
  , http = require('http')
  , app = require('connect')()
  , sio = require('socket.io').listen(app)
  , redis = require('redis')
  , mongoose = require('mongoose')
  , staticDir = __dirname
  , path = require('path');
  
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

var server = http.createServer(app).listen(config.APP_PORT);
console.log("Started server at port: %d in %s mode", server.address().port, config.MODE);

