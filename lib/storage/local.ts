/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage implementation using HTML5 LocalStorage
*/

/// <reference path="../storage.ts" />
/// <reference path="../cache.ts" />

module Gnd.Storage {

var localCache = new Cache(1024*1024); // 1Mb

function _get(key: string): any {
  var doc = localCache.getItem(key);
  if(doc){
    return JSON.parse(doc);
  }
  return null;
}

function contextualizeIds(keyPath: string[], itemIds:string[]): string[] {
  var baseItemPath = makeKey(keyPath);
  return _.map(itemIds, function(id){
    return makeKey([baseItemPath, id]);
  })
}

function _put(key: string, doc: any): void {
  localCache.setItem(key, JSON.stringify(doc));
}

function makeKey(keyPath: string[]): string {
  return keyPath.join('@');
}

function isLink(doc){
  return _.isString(doc);
}

export class Local implements IStorage {
  
  create(keyPath: string[], doc: any, cb: (err: Error, key: string) => void) {
    if(!doc._cid){
      doc._cid = Util.uuid();
    }
    _put(makeKey(keyPath.concat(doc._cid)), doc);
    cb(null, doc._cid);
  }
  
  put(keyPath: string[], doc: {}, cb: (err?: Error) => void) {
    this.get(keyPath, (err: Error, oldDoc?: any): void => {
      if(oldDoc){
        _.extend(oldDoc, doc);
        _put(makeKey(keyPath), oldDoc);
      }
      cb(err);
    })
  }
  
  get(keyPath: string[], cb: (err: Error, doc?: any) => void) {
    var doc = _get(makeKey(keyPath));
    if (doc){
      if (isLink(doc)){
        this.get(doc.split('@'), cb);
      } else {
        cb(null, doc);
      }
    } else {
      cb(new Error('No local object available'));  
    }
  }
  
  del(keyPath: string[], cb: (err?: Error) => void) {
    localCache.removeItem(makeKey(keyPath));
    cb();
  }
    
  link(newKeyPath: string[], oldKeyPath: string[], cb: (err?: Error) => void): void
  {
    // Find all the keypaths with oldKeyPath as subpath, replacing them by the new subkeypath
    var oldKey = makeKey(oldKeyPath);
    var newKey = makeKey(newKeyPath);
    
    var keys = localCache.getKeys();
    for(var i=0; i<keys.length; i++){
      if(keys[i].substring(0, oldKey.length) === oldKey){
        // Make Link
        var link = keys[i].replace(oldKey, newKey);
        _put(link, keys[i]);
      }
    }
    cb();  
  }
  
  
  //
  // ISetStorage
  //  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void{
    var key = makeKey(keyPath);
    
    var itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds);
    var oldItemIdsKeys = _get(key) || [];
    
    _put(key, _.union(oldItemIdsKeys, itemIdsKeys));
    cb(null);
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void) {
    var key = makeKey(keyPath);
    var oldItemIdsKeys = _get(key) || [];
    
    var itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds);
    for(var i=0; i<itemIdsKeys.length; i++){
      var doc = _get(itemIdsKeys[i]);
      if(isLink(doc)){
        itemIdsKeys.push(doc);
      }
    }

    _put(key, _.difference(oldItemIdsKeys, itemIdsKeys));
    cb(null);
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result?: {}[]) => void) : void
  {
    this.get(keyPath, (err, collection?) => {
      var result = [];
      if(collection){
        for(var i=0; i<collection.length;i++){
          result.push(_get(collection[i]));
        }
      }
      cb(null, result);
    });
  }
  
  //
  // ISeqStorage
  //
  insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void)
  {
    var key = makeKey(keyPath);
    
    var oldItems = _get(key) || [];
    if(index == -1){
      oldItems.push(doc);
    }else{
      oldItems.splice(index, 0, doc);
    }
    
    _put(key, oldItems);
    cb(null);
  }
  
  extract(keyPath: string[], index:number, cb: (err: Error, doc:{}) => void)
  {
    var key = makeKey(keyPath);
        
    var oldItems = _get(key) || [];
    var extracted = oldItems.splice(index, 1) || [];
    
    _put(key, oldItems);
    cb(null, extracted[0]);
  }
  
  all(keyPath: string[], cb: (err: Error, result: {}[]) => void) : void
  {
    var key = makeKey(keyPath);        
    cb(null, _get(key) || []);
  }
}

}
