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
// Listen to available routes. Only used for selecting filters
//
Gnd.Route.listen(function(req) {
  req.get(function() {
    // Handle routes
  })
})

/*
  var TODOLIST_ID = "GndTodoApp";
  var Todo = Gnd.Model.extend('todos');
  var TodoList = Gnd.Model.extend('todolists');
  var todoList = new TodoList();
  var storageLocal  = new Gnd.Storage.Local();
  var app = new Gnd.Base();
  
  //
  // Create a storageQueue using only a local storage
  //
  Gnd.Model.storageQueue = new Gnd.Storage.Queue(storageLocal);
  
  TodoList.findById(TODOLIST_ID, function(err, todoList) {
    if (!todoList) {
      todoList = new TodoList();
      
      // Force an ID so that we can find it easily next time the app starts
      todoList.id(TODOLIST_ID); 
      todoList.save();
    }

    // Keep the todo list synced so that Gnd automatically stores all the changes.
    todoList.keepSynced();
        
    function setFilter(all, active, completed) {
      app.set('filterAll', all);
      app.set('filterActive', active);
      app.set('filterCompleted', completed);
    }
    setFilter(true, false, false);
  
    //
    // Bind the App model (only used for keeping the filter links updated)
    // (TODO: Only use one viewmodel for the whole APP)
    var appViewModel = new Gnd.ViewModel(Gnd.$('#filters')[0], {app: app});
  
    //
    // Get the todos collection
    //
    todoList.all(Todo, function(err, todos) {
      
      var todoListCtrl = new TodoListCtrl(todos);
     
      // 
      // Listen to available routes. Only used for selecting filters
      //
      Gnd.Route.listen(function(req) {
        req.get(function() {
        
          if (req.isLast()) {
            todoListCtrl.showAll();
            setFilter(true, false, false);
          }
        
          req.get('active', '', function() {
            todoListCtrl.showActive();
            setFilter(false, true, false);
          });
          
          req.get('completed', '', function() {
            todoListCtrl.showCompleted();
            setFilter(false, false, true);
          });
        })
      })
    });
  });
  */
});
