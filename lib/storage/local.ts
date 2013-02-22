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

function parseKey(key: string): string[] {
  return key.split('@');
}

function isLink(doc): bool {
  return _.isString(doc);
}

function isCollectionLink(doc): bool {
  return doc[0] === '/' && doc[doc.length-1] === '/';

}
function createCollectionLink(collection): void {
  var link = '/^' + collection + '@[^@]+$/';
  _put(collection, link);
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
      if (isCollectionLink(value)){
        var regex = new RegExp(value.slice(1, value.length-1));
        var allKeys = localCache.getKeys();
        // get the keys matching our regex but only those that aren't links
        var keys = _.filter(allKeys, (key)=>{
          if(key.match(regex)){
            var value = _get(key);
            return !isLink(value);
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
        return traverseLinks(value);
      }
    } else {
      return {key: key, value: value};
    }
  }
}

export class Local implements IStorage {
  
  create(keyPath: string[], doc: any, cb: (err?: Error, id?: string) => void) {
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
  // Save as an Object where key = itemId, value = add|rm|synced
  // 
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts, cb: (err?: Error) => void): void{
    var
      key = makeKey(keyPath),
      itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds),
      keyValue = traverseLinks(key),
      oldItemIdsKeys = keyValue ? keyValue.value || {} : {},
      newIdKeys = {};

    if(keyPath.length === 1 && itemsKeyPath.length === 1){
      createCollectionLink(keyPath[0]);
      return cb();
    }
    
    key = keyValue ? keyValue.key : key;
    _.each(itemIdsKeys, (id)=>{
      newIdKeys[id] = opts.insync ? 'insync' : 'add';
    })
    _put(key, _.extend(oldItemIdsKeys, newIdKeys));
    
    cb();
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts, cb: (err?: Error) => void) {
    var 
      key = makeKey(keyPath),
      itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds),
      keyValue = traverseLinks(key);

    if(itemIds.length === 0) return cb(); // do nothing

    if(keyValue){
      var keysToDelete = keyValue.value;
      _.each(itemIdsKeys, (id)=>{
        traverseLinks(id, (itemKey)=>{
          if(opts.insync){
            delete keysToDelete[id];
          }else{
            keysToDelete[id] = 'rm';
          }
        });
      });
      _put(keyValue.key, keysToDelete);
      cb();
    }else{
      cb(InvalidKeyError);
    }
  }
  
  find(keyPath: string[], query: {}, opts, cb: (err: Error, result?: {}[]) => void) : void
  {
    this.fetch(keyPath, (err, collection?) => {
      var result = {};
      var sequence = [];
      if(_.isArray(collection)){
        _.each(collection, (elem)=>{
          // var key = elem.keyPath;
          var key = elem.key;
          var op = elem.sync;
          if(op !== 'rm' || !opts.snapshot){ //TODO: more 
            var keyValue = traverseLinks(key);
            if(keyValue){
              var 
                item = keyValue.value;
                // id = item._cid;
              // if(!(result[id]) || op === 'insync'){
                if(!opts.snapshot) item.__op = op;
                // result[id] = item;
                sequence.push(item);
              // }
            }
          }
        });
        return cb(null, sequence);
      }else{
        if(collection){
          _.each(_.keys(collection), (key)=>{
            var op = collection[key]
            if(op !== 'rm' || !opts.snapshot){
              var keyValue = traverseLinks(key);
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
      }
    });
  }
  
  //
  // ISeqStorage
  //
  // insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void)
  // {
  //   var key = makeKey(keyPath);
  //   
  //   var oldItems = _get(key) || [];
  //   if(index == -1){
  //     oldItems.push(doc);
  //   }else{
  //     oldItems.splice(index, 0, doc);
  //   }
  //   
  //   _put(key, oldItems);
  //   cb(null);
  // }
  // 
  // extract(keyPath: string[], index:number, cb: (err: Error, doc:{}) => void)
  // {
  //   var key = makeKey(keyPath);
  //       
  //   var oldItems = _get(key) || [];
  //   var extracted = oldItems.splice(index, 1) || [];
  //   
  //   _put(key, oldItems);
  //   cb(null, extracted[0]);
  // }
  
  all(keyPath: string[], query, opts, cb: (err: Error, result: {}[]) => void) : void
  {
    // var key = makeKey(keyPath);        
    // cb(null, _get(key) || []);
    var all = [];
    var traverse = (kp)=>{
      this.next(keyPath, kp, opts, (err, next?)=>{
        if(!next) return cb(null, all);
        all.push(next);
        traverse(next.keyPath);
      });
    };
      
    this.first(keyPath, opts, (err, first?)=>{
      if(!first) return cb(null, all);
      all.push(first);
      traverse(first.keyPath);
    });
  }

  private initSequence(seq){
    if(seq.length < 2){
      seq[0] = { //first
        key: '##@first',
        prev: -1,
        next: 1
      };
      seq[1] = { //last
        key: '##@last',
        prev: 0,
        next: -1
      }
    }
  }
  
  // first(keyPath: string[], opts: {}, cb: (err: Error, keyPath?:string[]) => void)
  first(keyPath: string[], opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.next(keyPath, ['##', 'first'], opts, cb);
  }

  last(keyPath: string[], opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.prev(keyPath, ['##', 'last'], opts, cb);
  }
  // next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    var key = makeKey(keyPath);
    var refItemKey = makeKey(refItemKeyPath);
    var keyValue = traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;

    var refItem = _.find(itemKeys, (item) => {
      return item.key === refItemKey;
    });

    if(!refItem) return cb(Error('reference item not found'));
    var item = itemKeys[refItem.next];
    if(item.next < 0) return cb(null); //last pointer

    var itemKeyPath = parseKey(item.key);
    this.fetch(itemKeyPath, (err, doc?)=>{
      var iDoc = {
        keyPath: itemKeyPath,
        doc: doc
      };
      cb(null, iDoc);
    });
    // cb(null, parseKey(item.key));
  }
  prev(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    var key = makeKey(keyPath);
    var refItemKey = makeKey(refItemKeyPath);
    var keyValue = traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;

    var refItem = _.find(itemKeys, (item) => {
      return item.key === refItemKey;
    });

    if(!refItem) return cb(Error('reference item not found'));
    var item = itemKeys[refItem.prev];
    if(item.prev < 0) return cb(null); //first pointer

    var itemKeyPath = parseKey(item.key);
    this.fetch(itemKeyPath, (err, doc?)=>{
      var iDoc = {
        keyPath: itemKeyPath,
        doc: doc
      };
      cb(null, iDoc);
    });
    // cb(null, parseKey(item.key));
  }
  // pop(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  // {
  //   var key = makeKey(keyPath);
  //   var keyValue = traverseLinks(key);
  //   var itemKeys = keyValue ? keyValue.value || [] : [];

  //   var refItem = _.find(itemKeys, (item) => {
  //     return item.key === makeKey(['##', 'last']);
  //   });
  //   var item = itemKeys[refItem.prev];
  //   if(item.key === makeKey(['##', 'first'])) return cb(Error('No last item to pop'));
  //   var itemKey = parseKey(item.key);
  //   this.deleteItem(keyPath, itemKey, opts, (err?: Error) => {
  //     if(err) return cb(err);
  //     this.fetch(itemKey, cb);
  //   });
  // }

  // shift(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  // {
  //   var key = makeKey(keyPath);
  //   var keyValue = traverseLinks(key);
  //   var itemKeys = keyValue ? keyValue.value || [] : [];

  //   var refItem = _.find(itemKeys, (item) => {
  //     return item.key === makeKey(['##', 'first']);
  //   });
  //   var item = itemKeys[refItem.next];
  //   if(item.key === makeKey(['##', 'last'])) return cb(Error('No last item to pop'));
  //   var itemKey = parseKey(item.key);
  //   this.deleteItem(keyPath, itemKey, opts, (err?: Error) => {
  //     if(err) return cb(err);
  //     this.fetch(itemKey, cb);
  //   });
  // }
  deleteItem(keyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void)
  {
    var key = makeKey(keyPath);
    var itemKey = makeKey(itemKeyPath);
    var keyValue = traverseLinks(key);
    var itemKeyValue = traverseLinks(itemKey);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;
    itemKey = itemKeyValue ? itemKeyValue.key : itemKey;

    var item = _.find(itemKeys, (item) => {
      return item.key === itemKey;
    });

    item.sync = 'rm'; //tombstone
    //should we do this?
    itemKeys[item.prev].next = item.next;
    itemKeys[item.next].prev = item.prev;

    _put(key, itemKeys);
    cb();
  }
  // push(keyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  // {
  //   this.insertBefore(keyPath, null, itemKeyPath, opts, cb);
  // }
  // unshift(keyPath: string[], itemKeyPath:string[], opts, cb: (err?: Error) => void)
  // {
  //   this.insertAfter(keyPath, ['##', 'first'], itemKeyPath, opts, cb);
  // }
  insertBefore(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  {
    var refItemKey;
    if(refItemKeyPath){
      refItemKey = makeKey(refItemKeyPath);
      var linked = traverseLinks(refItemKey);
      refItemKey = linked ? linked.key : refItemKey;
    }else{
      refItemKey = makeKey(['##', 'last']);
    }
    var key = makeKey(keyPath);
    var itemKey = makeKey(itemKeyPath);
    var keyValue = traverseLinks(key);
    var itemKeys = keyValue ? keyValue.value || [] : [];
    key = keyValue ? keyValue.key : key;
    this.initSequence(itemKeys);

    var refItem = _.find(itemKeys, (item) => {
      return item.key === refItemKey;
    });

    if(!refItem) return cb(Error('reference item not found'));
    var prevItem = itemKeys[refItem.prev];
    
    var newItem = {
      key: itemKey,
      sync: opts.insync ? 'insync' : 'ib',
      prev: refItem.prev,
      next: prevItem.next
    };

    itemKeys.push(newItem);
    prevItem.next = refItem.prev = itemKeys.length-1;

    _put(key, itemKeys);
    cb();
  }
  // insertAfter(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  // {
  //   var key = makeKey(keyPath);
  //   var refItemKey = makeKey(refItemKeyPath);
  //   var itemKey = makeKey(itemKeyPath);
  //   var keyValue = traverseLinks(key);
  //   var itemKeys = keyValue ? keyValue.value || [] : [];
  //   key = keyValue ? keyValue.key : key;
  //   this.initSequence(itemKeys);

  //   var refItem = _.find(itemKeys, (item) => {
  //     return item.key === refItemKey;
  //   });

  //   if(!refItem) return cb(Error('reference item not found'));
  //   var nextItem = itemKeys[refItem.next];
  //   
  //   var newItem = {
  //     key: itemKey,
  //     sync: opts.insync ? 'insync' : 'ib',
  //     prev: nextItem.prev,
  //     next: refItem.next
  //   };

  //   itemKeys.push(newItem);
  //   refItem.next = nextItem.prev = itemKeys.length-1;

  //   _put(key, itemKeys);
  //   cb();
  // }
}

}
