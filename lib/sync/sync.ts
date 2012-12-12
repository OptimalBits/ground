/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Synchronization
  
  This class represents a Model in a MVC architecture.
  The model supports persistent storage, offline and
  automatic client<->server synchronization.
  
  The Manager keeps a data structure with all the instantiated
  models and their IDs.
*/

/// <reference path="../../third/underscore.browser.d.ts" />

import Base = module('../base');

//import Socket = module('../storage/socket');

// -----------8<-----------8<------------8<-------------------
// import is not working so we copy/paste safeEmit here...
function safeEmit(socket, ...args:any[]): void
{
  var cb = _.last(args);
   
  function errorFn(){
    cb(new Error('Socket disconnected'));
  };
  function proxyCb(err, res){
    socket.removeListener('disconnect', errorFn);
    if(err){
      err = new Error(err);
    }
    cb(err,res);
  };
  
  args[args.length-1] = proxyCb;

 if(socket.socket.connected){
    socket.once('disconnect', errorFn);
    socket.emit.apply(socket, args);
 }else{
    errorFn();
 }
}
var Socket = {safeEmit : safeEmit};
// -----------8<-----------8<------------8<-------------------

/**
  An abstract class representing a synchronizable object.
*/
export interface ISynchronizable
{
  isKeptSynced:() => bool;
  getKeyPath:() => string[];
  emit:(event: string, ...params: any[]) => void;
};

function keyPathToKey(keyPath: string[]){
  return keyPath.join(':');
}

function docKey(doc: ISynchronizable){
  return keyPathToKey(doc.getKeyPath());
}

export class Manager extends Base.Base {
  private socket;
  private docs: { [key: string]: ISynchronizable[];} = {};
  private connectFn: ()=>void;
  
  constructor(socket)
  {
    super();
    
    this.socket = socket;
        
    this.connectFn = () => {
      var socket = this.socket;
      
      // Call re-sync for all models in this manager...
      _.each(this.docs, (docs, id) => {
        var doc = docs[0];
        
        // TODO: send also the current __rev, if newer in server, 
        // get the latest doc.
        Socket.safeEmit(socket, 'sync', doc.getKeyPath(), function(err){
          if(err){
            console.log('Error syncing %s, %s', doc.getKeyPath(), err);
          }else{
            console.log('Syncing %s', doc.getKeyPath());
          }
        });
        
        // OBSOLETE if done according to new 'sync'
        Socket.safeEmit(socket, 'resync', doc.getKeyPath(), (err, doc) => {
          if(!err){
            doc && (delete doc.cid); // Hack needed since cid is almost always outdated in server.
            for(var i=0, len=docs.length; i<len; i++){
              docs[i].set(doc, {sync:'false'});
              docs[i].id(id);
            }
            // TODO: we probably should update locally...
            // doc.local().update(doc);
          } else {
            console.log('Error resyncing %s, %s', doc.getKeyPath(), err)
          }
        });
      });
    }
    
    //
    // Listeners
    //
    socket.on('update:', (keyPath, args) => {
      var key = keyPathToKey(keyPath);
      
      _.each(this.docs[key], function(doc){
        doc.set(args, {sync:false});
      });
    });
      
    socket.on('delete:', (keyPath) => {
      var key = keyPathToKey(keyPath);
      _.each(this.docs[key], function(doc){
        doc.emit('deleted:', keyPath); // rename event to 'delete:' ?
      });
    });
    
    function notifyObservers(observers, message, itemsKeyPath, itemIds){
      if(observers){
        for(var i=0; i<observers.length; i++){
          observers[i].emit(message, itemsKeyPath, itemIds);
        }
      }
    }
    
    socket.on('add:', (keyPath, itemsKeyPath, itemIds) => {
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'add:', itemsKeyPath, itemIds);
    });
    
    socket.on('remove:', (keyPath, itemsKeyPath, itemIds) => {
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'remove:', itemsKeyPath, itemIds);
    });
  }
  
  init()
  {
    this.socket.on('connect', this.connectFn);
   // socket.on('reconnect', this._connectFn);
  }
  
  deinit()
  {
    var socket = this.socket;
    if(socket){
      socket.removeListener('connect', this.connectFn);
      socket.removeListener('reconnect', this.connectFn);
    }
  }
  
  /**
    Starts synchronization for a given model.
  */
  startSync(doc: ISynchronizable)
  {
    var 
      key = docKey(doc),
      socket = this.socket;
    
    if(!this.docs[key]){
      this.docs[key] = [doc];
      
      Socket.safeEmit(this.socket, 'sync', doc.getKeyPath(), function(err){
        console.log('Start synching:'+doc.getKeyPath());
      });
    }else{
      this.docs[key].push(doc);
    }
    // Should'nt we keep all the instance of a model up-to-date?
  }
  
  /**
    Ends synchronization for a given model.
  */
  endSync(doc: ISynchronizable)
  {
    if (!doc.isKeptSynced()) return;

    var 
      key = docKey(doc),
      socket = this.socket,
      docs = this.docs[key];
    
    if(docs){
      docs = _.reject(docs, function(item){return item === doc;});
      if(docs.length===0){
        console.log('Stop synching:'+key);
        Socket.safeEmit(this.socket, 'unsync', doc.getKeyPath(), function(err){
          console.log('Stop synching:'+doc.getKeyPath());
        });
        delete this.docs[key];
      }else{
        this.docs[key] = docs;
      }
    }
  }  
}

