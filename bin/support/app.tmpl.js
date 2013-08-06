define(['gnd'], function(Gnd, models){
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
// Define routes
//
Gnd.router.listen(function(req) {
  req.get('', '#main', 'routes/main');
});


}); // define
