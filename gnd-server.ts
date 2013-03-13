/**
   Ground Web Framework v0.1.0

   Features:
   - Modular design.
   - Builds on top of proven libraries such as jQuery and underscore.
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
   - jQuery
   - Underscore / LoDash

   (c) 2011-2013 OptimalBits - Licensed as MIT.
*/

//import _ = module('underscore');

/// <reference path="./lib/server.ts" />
/// <reference path="./lib/sessionmanager.ts" />
/// <reference path="./lib/storage/socket-backend.ts" />
/// <reference path="./lib/storage/mongoose-backend.ts" />

declare var define;
declare var exports;
declare var window; // Browser
declare var global; // Node.js

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
