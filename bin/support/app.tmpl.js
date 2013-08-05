define(['gnd'], function(Gnd){
'use strict';

//
// Establish a socket.io connection.
//
var socket = io.connect();

//
// Configure the sync manager.
//
Gnd.use.syncManager(socket);

//
// Create Local and Remote storages
//
var localStorage = new Gnd.Storage.Local();
var remoteStorage = new Gnd.Storage.Socket(socket);

//
// Configure the synchronization queue.
//
Gnd.use.storageQueue(localStorage, remoteStorage);

//
// Bind navigation bar to current route.
//
var viewModel = new Gnd.ViewModel('#navbar', {route: Gnd.router.route});

// 
// Define routes hierarchically
//
Gnd.router.listen(function(req) {
  req.get('', '#main', function() {
    
    if(req.isLast()){
      req.render('assets/templates/welcome.html');
    }
    
    req.get('configure', '#main', function(){
      req.render('assets/templates/configure.html');
    });
    
    req.get('models', '#main', function(){
      req.render('assets/templates/models.html');
    });
    
    req.get('routes', '#main', function(){
      req.render('assets/templates/routes.html');
    });
    
    req.get('views', '#main', function(){
      req.render('assets/templates/views.html');
    });
    
    req.get('build', '#main', function(){
      req.render('assets/templates/build.html');
    });

  });
})
});
