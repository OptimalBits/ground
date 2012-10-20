
var express = require('express'),
    mongoose = require('mongoose'),
    app = express.createServer(),
    sio = require('socket.io').listen(app),
    models = require('./test_mongo_models'),
    redis = require('redis'),
    cabinet = require('cabinet'),
    Server = require('../server'),
    staticDir = __dirname + '/../';

app.use(cabinet(staticDir, 
  {
    typescript: {
      tmpPath: '/var/tmp'
    }
  },
  function(url){
    console.log(url);
    sio.sockets.emit('file_changed:', url);
  }
));
app.use(cabinet(__dirname, function(url){
  sio.sockets.emit('file_changed:', url);
  console.log(url);
}));
app.use(express.bodyParser());

app.put('/animals/:id', function(req, res){
  models.Animal.update({_id:req.params.id}, req.body, function(err){
    if (err) throw new Error('Error updating animal:'+req.params.id+' '+err);
    res.send(204)
  })
})

app.put('/zoos/:zooId/animals/:id', function(req, res){
  res.send(204);
})

app.del('/zoos/:zooId/animals/:id', function(req, res){
  models.Zoo.findById(req.params.zooId, function(err, zoo){    
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
})

mongoose.connect('mongodb://localhost/testGingerSync', function(){
  mongoose.connection.db.executeDbCommand( {dropDatabase:1}, function(err, result) { 
    console.log(err); 
    console.log(result); 
  });
  mongoose.connect('mongodb://localhost/testGingerSync');
  var server = new Server(models, 6379, 'localhost', sio.sockets);
  
  app.listen(8080);
  console.log("Started test server at port: %d in %s mode", app.address().port, app.settings.env);
    
});


