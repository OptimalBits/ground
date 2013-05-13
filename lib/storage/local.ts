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

var InvalidKeyError = () => Error('Invalid Key');

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
          var allKeys = this.store.allKeys();
          // get the keys matching our regex but only those that aren't links
          // otherwise we could get dupplicates (maybe not needed)
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

  create(keyPath: string[], doc: any): Promise
  {
    var promise = new Promise();
    if(!doc._cid){
      doc._cid = Util.uuid();
    }
    this.store.put(this.makeKey(keyPath.concat(doc._cid)), doc);
    
    return promise.resolve(doc._cid);
  }
  
  fetch(keyPath: string[]): Promise
  {
    var promise = new Promise();
    var keyValue = this.traverseLinks(this.makeKey(keyPath));
    if(keyValue){
      promise.resolve(keyValue.value);
    }else {
      promise.reject(InvalidKeyError());
    }
    return promise;
  }
  
  put(keyPath: string[], doc: {}): Promise
  {
    var 
      key = this.makeKey(keyPath),
      keyValue = this.traverseLinks(this.makeKey(keyPath));
      
    if(keyValue){  
      this.store.put(keyValue.key, Util.merge(keyValue.value, doc));
    }else{ 
      //
      // Upsert
      //
      this.store.put(key, doc);
    }
    return Promise.resolved();
  }
    
  del(keyPath: string[]): Promise
  {
    this.traverseLinks(this.makeKey(keyPath), (key)=>{
      this.store.del(this.makeKey(keyPath));
    });
    return new Promise(true);
  }
    
  link(newKeyPath: string[], oldKeyPath: string[]): Promise
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
    return new Promise(true);
  }
  
  //
  // ISetStorage
  //  
  // Save as an Object where key = itemId, value = add|rm|synced
  // 
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts): Promise
  {
    var
      key = this.makeKey(keyPath),
      itemIdsKeys = this.contextualizeIds(itemsKeyPath, itemIds),
      keyValue = this.traverseLinks(key),
      oldItemIdsKeys = keyValue ? keyValue.value || {} : {},
      newIdKeys = {};

    if(keyPath.length === 1 && itemsKeyPath.length === 1){
      this.createCollectionLink(keyPath[0]);
      return Promise.resolved();
    }
    
    key = keyValue ? keyValue.key : key;
    _.each(itemIdsKeys, (id)=>{
      newIdKeys[id] = opts.insync ? 'insync' : 'add';
    })
    this.store.put(key, _.extend(oldItemIdsKeys, newIdKeys));
    
    return Promise.resolved();
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts): Promise
  {
    var 
      key = this.makeKey(keyPath),
      itemIdsKeys = this.contextualizeIds(itemsKeyPath, itemIds),
      keyValue = this.traverseLinks(key);

    if(itemIds.length === 0) return Promise.resolved(); // do nothing

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
      return Promise.resolved()
    }else{
      return Promise.rejected(InvalidKeyError());
    }
  }
  
  find(keyPath: string[], query: {}, opts) : Promise
  {
    var result = {};
    
    var getItems = (collection) => {
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
      return _.values(result);
    }
    
    if(keyPath.length === 1){
      var keyValue = this.traverseLinks(keyPath[0]);
      if(keyValue) return new Promise(getItems(keyValue.value));
      else return Promise.rejected(InvalidKeyError());
    }else{
      return this.fetch(keyPath).then((collection) => getItems(collection), 
        // This is wrong but necessary due to how .all api works right now...
        (err) => []);
    }
  }
  
  //
  // ISeqStorage
  //
  all(keyPath: string[], query, opts) : Promise
  {
    //TODO: optimize
    var all = [];
    var traverse = (kp) => this.next(keyPath, kp, opts).then((next) => {
      if(next){
        all.push(next);
        return traverse(next.id);
      }
    });
    
    return traverse(null).then(() => all);
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
  
  next(keyPath: string[], id: string, opts): Promise // <IDoc>
  {
    var promise = new Promise();
    var options = _.defaults(opts, {snapshot: true});
    var key = this.makeKey(keyPath);
    var keyValue = this.traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;

    // first item of empty sequence is not an error
    if(itemKeys.length === 0 && !id) return promise.resolve();

    id = id || '##@_begin';
    var refItem = _.find(itemKeys, (item) => {
      return item._id === id || item._cid === id;
    });

    if(refItem){
      var item = itemKeys[refItem.next];
      if(item.next < 0) return promise.resolve(); //last pointer

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
          promise.resolve(iDoc);
        }else{
          promise.reject(InvalidKeyError());
        }
      }else{
        return this.next(keyPath, item._id || item._cid, opts);
      }
    }else{
      promise.reject(Error('reference item not found'))
    }
    return promise;
    // cb(null, parseKey(item.key));
  }

  deleteItem(keyPath: string[], id: string, opts): Promise
  {
    var promise = new Promise();
    var key = this.makeKey(keyPath);
    var keyValue = this.traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;

    var item = _.find(itemKeys, (item) => {
      return item._id === id || item._cid === id;
    });
    if(!item || item.sync === 'rm') 
      return promise.reject(new Error(''+ServerError.INVALID_ID));

    if(opts.insync){
      itemKeys[itemKeys[item.prev].next] = 'deleted';
      itemKeys[item.prev].next = item.next;
      itemKeys[item.next].prev = item.prev;
    }else{
      item.sync = 'rm'; //tombstone
    }

    this.store.put(key, itemKeys);
    return promise.resolve()
  }
  
  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts): Promise //  Promise<{id, refId}>
  {
    id = id || '##@_end';
    var promise = new Promise();
    var key = this.makeKey(keyPath);
    var itemKey = this.makeKey(itemKeyPath);
    var keyValue = this.traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;
    this.initSequence(itemKeys);

    var refItem = _.find(itemKeys, (item) => {
      return item._id === id || item._cid === id;
    });

    if(!refItem) return promise.reject(Error('reference item not found'));
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
    var refId = newItem.next !== '##@_end' ? newItem.next : null;
    return promise.resolve({id: newItem._cid, refId: refId});
  }

  meta(keyPath: string[], id: string, sid: string): Promise
  {
    var key = this.makeKey(keyPath);
    var keyValue = this.traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;

    var item = _.find(itemKeys, (item) => {
      return item._id === id || item._cid === id;
    });
    if(!item) return Promise.rejected(Error(''+ServerError.INVALID_ID));

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
    return Promise.resolved();
  }
}

}
