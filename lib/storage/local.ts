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

interface KeyValue {
  key: string;
  value: any;
}

var InvalidKeyError = new Error('Invalid Key');

function traverseLinks(key: string, fn?: (key:string)=>void): KeyValue
{
  var value = _get(key);
  if (value){
    fn && fn(key);
    if (isLink(value)){
      return traverseLinks(value);
    } else {
      return {key: key, value: value};
    }
  }
}

export class Local implements IStorage {
  
  create(keyPath: string[], doc: any, cb: (err: Error, key: string) => void) {
    if(!doc._cid){
      doc._cid = Util.uuid();
    }
    _put(makeKey(keyPath.concat(doc._cid)), doc);
    cb(null, doc._cid);
  }
  
  fetch(keyPath: string[], cb: (err: Error, doc?: any) => void) {
    var keyValue = traverseLinks(makeKey(keyPath));
    if(keyValue){
      cb(null, keyValue.value);
    }else {
      cb(InvalidKeyError);  
    } 
  }
  
  put(keyPath: string[], doc: {}, cb: (err?: Error) => void) {
    var 
      key = makeKey(keyPath),
      keyValue = traverseLinks(makeKey(keyPath));
      
    if(keyValue){
      _.extend(keyValue.value, doc);
      _put(keyValue.key, keyValue.value);
      cb();
    }else{
      cb(InvalidKeyError);  
    }
  }
    
  del(keyPath: string[], cb: (err?: Error) => void) {
    traverseLinks(makeKey(keyPath), (key)=>{
      localCache.removeItem(makeKey(keyPath));
    });
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
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err?: Error) => void): void{
    var
      key = makeKey(keyPath),
      itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds),
      keyValue = traverseLinks(key),
      oldItemIdsKeys = keyValue ? keyValue.value || [] : [];
    
    //
    // TODO: we could potentially mix in the same item just pointed by
    // different links...      
    _put(key, _.union(oldItemIdsKeys, itemIdsKeys));
    cb();
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err?: Error) => void) {
    var 
      key = makeKey(keyPath),
      itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds),
      keyValue = traverseLinks(key);

    if(keyValue){
      var moreKeysToDelete = [];
      for(var i=0; i<itemIdsKeys.length; i++){          
        traverseLinks(itemIdsKeys[i], (itemKey)=>{
          moreKeysToDelete.push(itemKey);
        });
      }
      
      _put(keyValue.key, _.difference(keyValue.value, itemIdsKeys, moreKeysToDelete));
      cb();
    }else{
      cb(InvalidKeyError);
    }
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result?: {}[]) => void) : void
  {
    this.fetch(keyPath, (err, collection?) => {
      var result = [];
      if(collection){
        for(var i=0; i<collection.length;i++){
          var keyValue = traverseLinks(collection[i]);
          if(keyValue){
            result.push(keyValue.value);
          }
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
