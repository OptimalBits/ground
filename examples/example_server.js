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
  text : {type: String}
});
mongoose.model('Message', Message);

var Chat = new Schema({
  messages :  [{ type: Schema.ObjectId, ref: 'Message' }]
});
mongoose.model('Chat', Chat);

var models = {
  Message: mongoose.model('Message'),
  messages: mongoose.model('Message'),
  Chat: mongoose.model('Chat')
};

mongoose.connect('mongodb://localhost/exampleDB', function(){
  mongoose.connection.db.executeDbCommand( {dropDatabase:1}, function(err, result) { 
    console.log(err); 
    console.log(result); 

  });
    mongoose.connect('mongodb://localhost/exampleDB');
    var server = new Server(models, 6379, 'localhost', sio.sockets);

  app.listen(8080);
  console.log("Started test server at port: %d in %s mode", app.address().port, app.settings.env);
});
