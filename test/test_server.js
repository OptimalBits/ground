
var express = require('express'),
    mongoose = require('mongoose'),
    app = express.createServer(),
    sio = require('socket.io').listen(app),
    models = require('./test_mongo_models'),
    redis = require('redis'),
    staticDir = __dirname + '/../',
    Server = require('../server');

app.use(express.static(staticDir));
app.use(express.static(__dirname));

mongoose.connect('mongodb://localhost/testGingerSync');

var server = new Server(models, 6379, 'localhost', sio);

app.listen(8080);
console.log("Started test server at port: %d in %s mode", app.address().port, app.settings.env);