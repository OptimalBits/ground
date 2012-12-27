/**
   Ground Web Framework v0.1.0

   Features:
   - Highly Modular design.
   - Builds on top of proven libraries such as jQuery and underscore.
   - Hierarchical routing system.
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

   (c) 2011-2012 OptimalBits - Licensed as MIT.
*/

/// <reference path="./third/underscore.browser.d.ts" />
/// <reference path="../third/jquery.d.ts" />

/// <reference path="./lib/util.ts" />
/// <reference path="./lib/overload.ts" />
/// <reference path="./lib/task.ts" />
/// <reference path="./lib/base.ts" />
/// <reference path="./lib/cache.ts" />
/// <reference path="./lib/storage.ts" />
/// <reference path="./lib/storage/queue.ts" />
/// <reference path="./lib/storage/local.ts" />
/// <reference path="./lib/storage/socket.ts" />
/// <reference path="./lib/sync/sync.ts" />

/// <reference path="./lib/collection.ts" />
/// <reference path="./lib/model.ts" />

/// <reference path="./lib/route.ts" />

/// <reference path="./lib/view.ts" />
/// <reference path="./lib/viewmodel.ts" />


//
// Adds support for AMD and CommonJs module loaders
//
declare var define;
declare var exports;
(function (root, factory) {
  if (typeof exports === 'object') {
    root['module'].exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else {
    // Browser globals (root is window)
    root.returnExports = factory();
  }
}(this, function () {
    return Gnd;
}));
