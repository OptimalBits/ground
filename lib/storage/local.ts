/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage implementation using HTML5 LocalStorage
*/

/// <reference path="storage.ts" />
/// <reference path="../cache.ts" />
/// <reference path="../error.ts" />
/// <reference path="store/store.ts" />
/// <reference path="store/local-storage.ts" />

interface KeyValue {
  key: string;
  value: any;
}

module Gnd.Storage {

var InvalidKeyError = new Error('Invalid Key');

export class Local implements IStorage {
  private store: Store.IStore;

  private contextualizeIds(keyPath: string[], itemIds:string[]): string[] {
    var baseItemPath = this.makeKey(keyPath);
    return _.map(itemIds, (id)=>{
      return this.makeKey([baseItemPath, id]);
    })
  }

  private makeKey(keyPath: string[]): string {
    return keyPath.join('@');
  }

  private parseKey(key: string): string[] {
    return key.split('@');
  }

  private isLink(doc): bool {
    return _.isString(doc);
  }

  private isCollectionLink(doc): bool {
    return doc[0] === '/' && doc[doc.length-1] === '/';

  }
  private createCollectionLink(collection): void {
    var link = '/^' + collection + '@[^@]+$/';
    this.store.put(collection, link);
  }

  private traverseLinks(key: string, fn?: (key:string)=>void): KeyValue
  {
    var value = this.store.get(key);
    if (value){
      fn && fn(key);
      if (this.isLink(value)){
        if (this.isCollectionLink(value)){
          var regex = new RegExp(value.slice(1, value.length-1));
          var allKeys = this.store.allKeys(); //localCache.getKeys();
          // get the keys matching our regex but only those that aren't links
          var keys = _.filter(allKeys, (key)=>{
            if(key.match(regex)){
              var value = this.store.get(key);
              return !this.isLink(value);
            }
            return false;
          });
          return {
            key: key,
            value: _.reduce(keys, function(memo, key){
                memo[key] = 'insync';
                return memo;
            }, {})
          }
        } else {
          return this.traverseLinks(value);
        }
      } else {
        return {key: key, value: value};
      }
    }
  }

  constructor(store: Storage.Store.IStore) {
    this.store = store || new Storage.Store.LocalStore();
  }

  create(keyPath: string[], doc: any, cb: (err?: Error, id?: string) => void) {
    if(!doc._cid){
      doc._cid = Util.uuid();
    }
    this.store.put(this.makeKey(keyPath.concat(doc._cid)), doc);
    cb(null, doc._cid);
  }
  
  fetch(keyPath: string[], cb: (err: Error, doc?: any) => void) {
    var keyValue = this.traverseLinks(this.makeKey(keyPath));
    if(keyValue){
      cb(null, keyValue.value);
    }else {
      cb(InvalidKeyError);  
    } 
  }
  
  put(keyPath: string[], doc: {}, cb: (err?: Error) => void) {
    var 
      key = this.makeKey(keyPath),
      keyValue = this.traverseLinks(this.makeKey(keyPath));
      
    if(keyValue){
      _.extend(keyValue.value, doc);
      this.store.put(keyValue.key, keyValue.value);
      cb();
    }else{
      cb(InvalidKeyError);  
    }
  }
    
  del(keyPath: string[], cb: (err?: Error) => void) {
    this.traverseLinks(this.makeKey(keyPath), (key)=>{
      this.store.del(this.makeKey(keyPath));
    });
    cb();
  }
    
  link(newKeyPath: string[], oldKeyPath: string[], cb: (err?: Error) => void): void
  {
    // Find all the keypaths with oldKeyPath as subpath, replacing them by the new subkeypath
    var oldKey = this.makeKey(oldKeyPath);
    var newKey = this.makeKey(newKeyPath);
    
    var keys = this.store.allKeys(); //localCache.getKeys();
    for(var i=0; i<keys.length; i++){
      if(keys[i].substring(0, oldKey.length) === oldKey){
        // Make Link
        var link = keys[i].replace(oldKey, newKey);
        this.store.put(link, keys[i]);
      }
    }
    cb();  
  }
  
  //
  // ISetStorage
  //  
  // Save as an Object where key = itemId, value = add|rm|synced
  // 
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts, cb: (err?: Error) => void): void{
    var
      key = this.makeKey(keyPath),
      itemIdsKeys = this.contextualizeIds(itemsKeyPath, itemIds),
      keyValue = this.traverseLinks(key),
      oldItemIdsKeys = keyValue ? keyValue.value || {} : {},
      newIdKeys = {};

    if(keyPath.length === 1 && itemsKeyPath.length === 1){
      this.createCollectionLink(keyPath[0]);
      return cb();
    }
    
    key = keyValue ? keyValue.key : key;
    _.each(itemIdsKeys, (id)=>{
      newIdKeys[id] = opts.insync ? 'insync' : 'add';
    })
    this.store.put(key, _.extend(oldItemIdsKeys, newIdKeys));
    
    cb();
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts, cb: (err?: Error) => void) {
    var 
      key = this.makeKey(keyPath),
      itemIdsKeys = this.contextualizeIds(itemsKeyPath, itemIds),
      keyValue = this.traverseLinks(key);

    if(itemIds.length === 0) return cb(); // do nothing

    if(keyValue){
      var keysToDelete = keyValue.value;
      _.each(itemIdsKeys, (id)=>{
        this.traverseLinks(id, (itemKey)=>{
          if(opts.insync){
            delete keysToDelete[id];
          }else{
            keysToDelete[id] = 'rm';
          }
        });
      });
      this.store.put(keyValue.key, keysToDelete);
      cb();
    }else{
      cb(InvalidKeyError);
    }
  }
  
  find(keyPath: string[], query: {}, opts, cb: (err: Error, result?: {}[]) => void) : void
  {
    var result = {};
    if(keyPath.length === 1){
      var collection = this.store.allKeys();
      _.each(collection, (key)=>{
        if(key.indexOf(keyPath[0]) === 0){
          var keyValue = this.traverseLinks(key);
          if(keyValue){
            var item = keyValue.value;
            result[item._cid] = item;
          }
        }
      });
      return cb(null, _.values(result));
    }else{
      this.fetch(keyPath, (err, collection?) => {
        if(collection){
          _.each(_.keys(collection), (key)=>{
            var op = collection[key]
            if(op !== 'rm' || !opts.snapshot){
              var keyValue = this.traverseLinks(key);
              if(keyValue){
                var 
                  item = keyValue.value,
                  id = item._cid;
                if(!(result[id]) || op === 'insync'){
                  if(!opts.snapshot) item.__op = op;
                  result[id] = item;
                }
              }
            }
          });
        }
        return cb(null, _.values(result));
      });
    }
  }
  
  //
  // ISeqStorage
  //
  all(keyPath: string[], query, opts, cb: (err: Error, result: {}[]) => void) : void
  {
    //TODO: optimize
    var all = [];
    var traverse = (kp)=>{
      this.next(keyPath, kp, opts, (err, next?)=>{
        if(!next) return cb(null, all);
        all.push(next);
        traverse(next.id);
      });
    };
      
    traverse(null);
  }

  private initSequence(seq){
    if(seq.length < 2){
      seq[0] = { //first
        _id: '##@_begin',
        prev: -1,
        next: 1
      };
      seq[1] = { //last
        _id: '##@_end',
        prev: 0,
        next: -1
      }
    }
  }
  
  next(keyPath: string[], id: string, opts, cb: (err: Error, doc?:IDoc) => void)
  {
    var options = _.defaults(opts, {snapshot: true});
    var key = this.makeKey(keyPath);
    var keyValue = this.traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;

    // first item of empty sequence is not an error
    if(itemKeys.length === 0 && !id) return cb(null, null);

    id = id || '##@_begin';
    var refItem = _.find(itemKeys, (item) => {
      return item._id === id || item._cid === id;
    });

    if(refItem){
      var item = itemKeys[refItem.next];
      if(item.next < 0) return cb(null); //last pointer

      var itemKeyPath = this.parseKey(item.key);
      var op = item.sync;
      if(op !== 'rm' || !options.snapshot){
        var itemKeyValue = this.traverseLinks(item.key);
        if(itemKeyValue){
          var doc = itemKeyValue.value;
          if(!options.snapshot) doc.__op = op;
          var iDoc = {
            id: item._id || item._cid,
            doc: doc
          };
          cb(null, iDoc);
        }
      }else{
        this.next(keyPath, item._id || item._cid, opts, cb);
      }
    }else{
      return cb(Error('reference item not found'));
    }
    // cb(null, parseKey(item.key));
  }

  deleteItem(keyPath: string[], id: string, opts, cb: (err?: Error) => void)
  {
    var key = this.makeKey(keyPath);
    var keyValue = this.traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;

    var item = _.find(itemKeys, (item) => {
      return item._id === id || item._cid === id;
    });
    if(!item || item.sync === 'rm') return cb(Error(''+ServerError.INVALID_ID));

    if(opts.insync){
      itemKeys[itemKeys[item.prev].next] = 'deleted';
      itemKeys[item.prev].next = item.next;
      itemKeys[item.next].prev = item.prev;
    }else{
      item.sync = 'rm'; //tombstone
    }

    this.store.put(key, itemKeys);
    cb();
  }
  
  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err: Error, id?: string, refId?: string) => void)
  {
    id = id || '##@_end';
    var key = this.makeKey(keyPath);
    var itemKey = this.makeKey(itemKeyPath);
    var keyValue = this.traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;
    this.initSequence(itemKeys);

    var refItem = _.find(itemKeys, (item) => {
      return item._id === id || item._cid === id;
    });

    if(!refItem) return cb(Error('reference item not found'));
    var prevItem = itemKeys[refItem.prev];
    
    var newItem = {
      _cid: opts.id || Util.uuid(),
      key: itemKey,
      sync: opts.insync ? 'insync' : 'ib',
      prev: refItem.prev,
      next: prevItem.next
    };

    itemKeys.push(newItem);
    prevItem.next = refItem.prev = itemKeys.length-1;

    this.store.put(key, itemKeys);
    cb(null, newItem._cid, newItem.next !== '##@_end' ? newItem.next : null);
  }

  meta(keyPath: string[], id: string, sid: string, cb: (err?: Error) => void)
  {
    var key = this.makeKey(keyPath);
    var keyValue = this.traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;

    var item = _.find(itemKeys, (item) => {
      return item._id === id || item._cid === id;
    });
    if(!item) return cb(Error(''+ServerError.INVALID_ID));

    if(sid) item._id = sid;
    switch(item.sync) {
      case 'rm':
        itemKeys[itemKeys[item.prev].next] = 'deleted';
        itemKeys[item.prev].next = item.next;
        itemKeys[item.next].prev = item.prev;
        //TODO: remove tombstone
        break;
      case 'ib':
        item.sync = 'insync';
        break;
    }
    this.store.put(key, itemKeys);
    cb();
  }
}

}
