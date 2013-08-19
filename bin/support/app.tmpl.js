define(['gnd'], function(Gnd, models){
'use strict';

<% if(!static) { %>
//
// Establish a socket.io connection.
//
var socket = io.connect(); 

//
// Configure the sync manager.
//
Gnd.use.syncManager(socket);
<% } %>

//
// Create Storages
//
var localStorage = new Gnd.Storage.Local();

<% if(!static) { %>
var remoteStorage = new Gnd.Storage.Socket(socket);
<% } %>

//
// Configure the synchronization queue.
//
<% if(!static) { %>
Gnd.use.storageQueue(localStorage, remoteStorage);
<% } else { %>
Gnd.use.storageQueue(localStorage);
<% } %>

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
