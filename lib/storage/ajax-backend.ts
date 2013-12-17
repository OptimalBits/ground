
/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Ajax server backend.
*/

/// <reference path="../log.ts" />
/// <reference path="../server.ts" />
/// <reference path="../error.ts" />

module Gnd {
  
  /**
    Server backend for socket.io. Works in tandem with 
    {{#crossLink "Storage.Socket"}}{{/crossLink}}
  
    @class SocketBackend
    @constructor
    @param root {String} A root path (without trailing /) where the AjaxBackend will reside.
    (for example: "/api")
    @param app {Connect/Express} A connect/express like object with support for 
    listening to the HTTP verbs: get, put, post and delete.
    @param server {Server} a Gnd server instance.
  */
export class AjaxBackend {
  private root: string;
  
  private toKeyPath(url){
    return url.substr(this.root.length).split('/');
  }
  
  constructor(root: string, app: any, server: Server){
    this.root = root[root.length-1] !== '/' ? root + '/' : root;
    var session = {userId: null};
    var userId = session.userId;
    var clientId = null;
    
    app.post(this.root+"*", (req, res, next) => {
      var result;
      var path = req.path;
      
      var keyPath = this.toKeyPath(req.path);
      var args = req.body;
      console.log(req.path, keyPath, args);
      switch(args.cmd){
        case 'create':
          result = server.create(userId, keyPath, args.doc, args.opts);
          break;
        case 'put':
          result = server.put(clientId, userId, keyPath, args.doc, args.opts);
          break;
        case 'fetch':
          result = server.fetch(userId, keyPath);
          break;
        case 'del':
          result = server.del(clientId, userId, keyPath, args.opts);
          break;
        case 'add':
          result = server.add(clientId, userId, keyPath, args.itemsKeyPath, args.itemIds, args.opts);
          break;
        case 'remove':
          result = server.remove(clientId, userId, keyPath, args.itemsKeyPath, args.itemIds, args.opts);
          break;
        case 'find':
          result = server.find(userId, keyPath, args.query, args.opts);
          break;
        case 'all':
          result = server.all(userId, keyPath, args.query, args.opts);
          break;
        case 'deleteItem':
          result = server.deleteItem(clientId, userId, keyPath, args.id, args.opts);
          break;
        case 'insertBefore':
          result = server.insertBefore(clientId, userId, keyPath, args.id, args.itemKeyPath, args.opts);
          break;
      }
      if(result){
        result.then(function(val){
          res.send(val);
        }, function(err){
          res.send(500, err);
        });
      }else{
        res.send(500);
      }
    });
  }
}

}
