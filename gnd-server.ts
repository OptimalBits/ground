/**
   Ground Web Framework

   Features:
   - Modular design.
   - Hierarchical routing system.
   - Clean class hierarchies, based on javascript prototypal inheritance.
   - Property bindings.
   - Models with persistence and clients/servers synchronization.
   - Global and Local Events.
   - Undo/Redo Manager.
   - Keyboard handling.
   - Set of views for common web "widgets".
   - Canvas View.

   Dependencies:
   - LoDash

   (c) 2011-2013 OptimalBits - Licensed as MIT.
*/

/// <reference path="typings/main.d.ts" />
/// <reference path="lib/models/schema.ts" />

/// <reference path="lib/task.ts" />
/// <reference path="lib/server.ts" />
/// <reference path="lib/session/sessionmanager.ts" />
/// <reference path="lib/storage/socket-backend.ts" />
/// <reference path="lib/storage/ajax-backend.ts" />
/// <reference path="lib/storage/rest-backend.ts" />
/// <reference path="lib/storage/mongoose-backend.ts" />


/// <reference path="lib/container/sequence.ts" />
/// <reference path="lib/container/collection.ts" />

declare var define;

var windowOrGlobal;
if(typeof window === 'undefined'){
  windowOrGlobal = global;
}else{
  windowOrGlobal = window;
}

(function (root, factory) {
  if (typeof exports === 'object') {
    for(var k in factory()){
      exports[k] = factory()[k];
    }
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else {
    // Browser globals (root is window)
    root.returnExports = factory();
  }
}(windowOrGlobal, function () {
    return Gnd;
}));
