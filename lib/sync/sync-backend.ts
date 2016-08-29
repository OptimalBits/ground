/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/// <reference path="../log.ts" />
/// <reference path="../event.ts" />

/**
  @module Gnd
  @submodule Sync
*/
module Gnd.Sync {

/**
  This class is run server side to provide automatic synchronization between
  models, sequences and collections.

  Uses Redis PubSub in order to provide scalability. Any number of socket.io
  servers can be deployed, as long as they have access to a common redis server,
  the synchronization will work transparently between them.

  This class is used mostly internally by the framework but its method can
  sometimes be called by the user when manual notification of changes is
  required.

  @class Sync.Hub
  @constructor
  @param pubClient {Redis} redis client to be used for publishing messages.
  @param subClient {Redis} redis client to be used for receiving messages.
  @param [sockets]
  @param [sio]
*/
export class Hub {
  private pubClient;
  private eventEmitter;

  constructor(pubClient, subClient?, sockets?, sio?)
  {
    this.pubClient = pubClient;
    this.eventEmitter = new EventEmitter();

    if(sockets){
      if(!sio){
        sio = sockets;
      }

      sio.on('connection', (socket) => {
        log("Socket %s connected in the Sync Module", socket.id);

        socket.on('observe', (keyPath: string[], cb:(err?: Error) => void) => {

          log("Request to start observing:", keyPath);

          if(!Array.isArray(keyPath)){
            cb && cb(new TypeError("keyPath must be a string[]"));
          }else{
            var id = this.makeId(keyPath);

            if(this['check']){
              if (this['check'](socket.id, keyPath)){
                socket.join(id);
              }
            }else{
              log("Socket %s started synchronization for id:%s", socket.id, keyPath);
              socket.join(id);
            }
            cb();
          }
        });

        socket.on('unobserve', (keyPath: string[], cb:(err?: Error) => void) => {
          var id = this.makeId(keyPath);
          socket.leave(id);
          log("Socket %s stopped synchronization for id:%s", socket.id, id);
          cb();
        });

        socket.emit('ready');
      });

      subClient.subscribe('update:');
      subClient.subscribe('delete:');
      subClient.subscribe('add:');
      subClient.subscribe('remove:');
      subClient.subscribe('insertBefore:');
      subClient.subscribe('deleteItem:');

      subClient.on('message', (channel, msg) => {
        var args = JSON.parse(msg);

        if(!_.isArray(args.keyPath)){
          log("Error: keyPath must be an array:", args.keyPath);
          return;
        }
        var id = this.makeId(args.keyPath);
        var clientId = args.clientId;

        //var room = sio.in(id).except(args.clientId);
        log("About to emit: ", channel, args);
        switch(channel)
        {
          case 'update:':
            emitExcept(sio, id, clientId, "update:", args.keyPath, args.doc);
            this.emit('update', <string[]>_.initial(args.keyPath), args.keyPath, args.doc);
            break;
          case 'delete:':
            emitExcept(sio, id, clientId, 'delete:', args.keyPath);
            this.emit('delete', <string[]>_.initial(args.keyPath), args.keyPath);
            break;
          case 'add:':
            emitExcept(sio, id, clientId, 'add:', args.keyPath, args.itemsKeyPath, args.itemIds);
            this.emit('add', args.keyPath, args.keyPath, args.itemsKeyPath, args.itemIds);
            break;
          case 'remove:':
            emitExcept(sio, id, clientId, 'remove:', args.keyPath, args.itemsKeyPath, args.itemIds);
            this.emit('remove', args.keyPath, args.keyPath, args.itemsKeyPath, args.itemIds);
            break;
          case 'insertBefore:':
            emitExcept(sio, id, clientId, 'insertBefore:', args.keyPath, args.id, args.itemKeyPath, args.refId);
            this.emit('insertBefore', args.keyPath, args.keyPath, args.id, args.itemsKeyPath, args.refId);
            break;
          case 'deleteItem:':
            emitExcept(sio, id, clientId, 'deleteItem:', args.keyPath, args.id);
            this.emit('delete', args.keyPath, args.keyPath, args.id);
            break;
        }
      });
    }
  }

  private makeId(keyPath: string[]){
    return keyPath.join(':');
  }

  private makeEvent(evt: string, keyPath: string[]){
    var arr = [evt].concat(keyPath);
    return this.makeId(arr);
  }

  /**
    Listen to notifications handled by this Synchronization Hub.

    @method on
    @param evt {String} can be any of 'update', 'delete', 'add',
    'remove', 'insertBefore', 'deleteItem'.
    @param keyPath {Array} A keypath to listen to.
  */
  // on(evt: 'update', keyPath: string[], fn: ()=>void): void;
  on(evt: string, keyPath: string[], fn){
    this.eventEmitter.on(this.makeEvent(evt, keyPath), fn);
  }

  /**
    Remove listener to notifications handled by this Synchronization Hub.

    @method off
    @param evt {String} can be any of 'update', 'delete', 'add',
    'remove', 'insertBefore', 'deleteItem'.
    @param keyPath {Array} A keypath to stop listening to.
  */
  off(evt: string, keyPath: string[], fn){
    this.eventEmitter.off(this.makeEvent(evt, keyPath), fn);
  }

  /**
    Emits an event for the given event name and keyPath.

    @method emit
    @param evt {String} can be any of 'update', 'delete', 'add',
    'remove', 'insertBefore', 'deleteItem'.
    @param keyPath {Array} A keypath.
  */
  emit(evt: string, keyPath: string[], ...args: any[]){
    args.unshift(this.makeEvent(evt, keyPath));
    this.eventEmitter.emit.apply(this.eventEmitter, args);
  }

  /**
    Sends an update notification to all relevant observers.

    @method update
    @param clientId {String} clientId performing the update (use null if not
      relevant)
    @param keyPath {KeyPath} key path pointing to the document that was updated.
    @param doc {Object} Plain object with the changed values for the given properties.
  */
  update(clientId: string, keyPath: string[], doc:{})
  {
    var args = {keyPath:keyPath, doc: doc, clientId: clientId};
    this.pubClient.publish('update:', JSON.stringify(args));
  }

  /**
    Sends a delete notification to all relevant observers.

    @method delete
    @param clientId {String} clientId performing the deletion (use null if not
      relevant)
    @param keyPath {KeyPath} key path pointing to the document that was deleted.
  */
  delete(clientId: string, keyPath: string[]){
    var args = {keyPath:keyPath, clientId: clientId};
    this.pubClient.publish('delete:', JSON.stringify(args));
  }

  /**
    Sends an add notification to all relevant observers.

    @method add
    @param clientId {String} clientId performing the addition (use null if not
      relevant)
    @param keyPath {KeyPath} key path pointing to the bucket where the collection resides.
    @param itemsKeyPath {KeyPath} key path to the bucket containing the added items.
    @param itemIds {Array} array of ids with the documents added to this collection.
  */
  add(clientId: string, keyPath: string[], itemsKeyPath: string[], itemIds: string[]){
    var args = {keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds: itemIds, clientId: clientId};
    this.pubClient.publish('add:', JSON.stringify(args));
  }

  /**
    Sends a remove notification to all relevant observers.

    @method remove
    @param clientId {String} clientId performing the removal (use null if not
      relevant)
    @param keyPath {KeyPath} key path pointing to the bucket where the collection resides.
    @param itemsKeyPath {KeyPath} key path to the bucket containing the removed items.
    @param itemIds {Array} array of ids with the documents removed to this collection.
  */
  remove(clientId: string, keyPath: string[], itemsKeyPath: string[], itemIds: string[]){
    var args = {keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds: itemIds, clientId: clientId};
    this.pubClient.publish('remove:', JSON.stringify(args));
  }

  /**
    Sends an insertBefore notification to all relevant observers.

    @method insertBefore
    @param clientId {String} clientId performing the insertion (use null if not
      relevant)
    @param keyPath {KeyPath} key path pointing to the bucket where the sequence resides.
    @param id {String} id of the document that was inserted.
    @param itemKeyPath {KeyPath} key path pointing to the bucket where the document resides.
    @param refId {String} reference id for where the document was inserted.
    @param doc {Object} Plain object with the changed values for the given properties.
  */
  insertBefore(clientId: string, keyPath: string[], id: string, itemKeyPath: string[], refId: string)
  {
    var args = {keyPath: keyPath, id: id, itemKeyPath: itemKeyPath, refId: refId, clientId: clientId};
    log('insertBefore-synchub', args);
    this.pubClient.publish('insertBefore:', JSON.stringify(args));
  }

  /**
    Sends an deleteItem notification to all relevant observers.

    @method deleteItem
    @param clientId {String} clientId performing the deletion (use null if not
      relevant)
    @param keyPath {KeyPath} key path pointing to the document that was deleted.
    @param doc {Object} Plain object with the changed values for the given properties.
  */
  deleteItem(clientId: string, keyPath: string[], id: string)
  {
    var args = {keyPath: keyPath, id: id, clientId: clientId};
    log('deleteItem-synchub', args);
    this.pubClient.publish('deleteItem:', JSON.stringify(args));
  }
}

//
// Workaround since socket.io does not support "except" anymore.
// https://github.com/Automattic/socket.io/issues/1595
//
function emitExcept(ns, room, socketId, ...args: any[]){
  var socket;

  if(socketId){
    socket = ns.connected[socketId];
  }

  if(socket){
    socket.leave(room, function(){
      ns.in(room).emit.apply(ns, args);
      socket.join(room);
    });
  } else {
    ns.in(room).emit.apply(ns, args);
  }
}

}
