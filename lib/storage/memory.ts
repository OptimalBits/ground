
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


// function _get(key: string): any {
//   var doc = localCache.getItem(key);
//   if(doc){
//     return JSON.parse(doc);
//   }
//   return null;
// }
// 
// function contextualizeIds(keyPath: string[], itemIds:string[]): string[] {
//   var baseItemPath = makeKey(keyPath);
//   return _.map(itemIds, function(id){
//     return makeKey([baseItemPath, id]);
//   })
// }
// 
// function _put(key: string, doc: any): void {
//   localCache.setItem(key, JSON.stringify(doc));
// }
// 
// function makeKey(keyPath: string[]): string {
//   return keyPath.join('@');
// }
// 
// function isLink(doc): bool {
//   return _.isString(doc);
// }
// 
// function isCollectionLink(doc): bool {
//   return doc[0] === '/' && doc[doc.length-1] === '/';
// 
// }
// function createCollectionLink(collection): void {
//   var link = '/^' + collection + '@[^@]+$/';
//   _put(collection, link);
// }
// 
// interface KeyValue {
//   key: string;
//   value: any;
// }
// 
var InvalidKeyError = new Error('Invalid Key');
// 
// function traverseLinks(key: string, fn?: (key:string)=>void): KeyValue
// {
//   var value = _get(key);
//   if (value){
//     fn && fn(key);
//     if (isLink(value)){
//       if (isCollectionLink(value)){
//         var regex = new RegExp(value.slice(1, value.length-1));
//         var allKeys = localCache.getKeys();
//         // get the keys matching our regex but only those that aren't links
//         var keys = _.filter(allKeys, (key)=>{
//           if(key.match(regex)){
//             var value = _get(key);
//             return !isLink(value);
//           }
//           return false;
//         });
//         return {
//           key: key,
//           value: _.reduce(keys, function(memo, key){
//               memo[key] = 'insync';
//               return memo;
//           }, {})
//         }
//       } else {
//         return traverseLinks(value);
//       }
//     } else {
//       return {key: key, value: value};
//     }
//   }
// }

export class Memory implements IStorage {
  private storage = {};

  // function _put(key: string, doc: any): void {
  //   storage[key] = doc;
  // }

  private makeKey(keyPath: string[]): string {
    return keyPath.join('@');
  }

  
  create(keyPath: string[], doc: any, cb: (err?: Error, id?: string) => void) {
    if(!doc._cid){
      doc._cid = Util.uuid();
    }
    // this._this.makeKey(keyPath.concat(doc._cid));
    cb(null, doc._cid);
  }
  
  fetch(keyPath: string[], cb: (err: Error, doc?: any) => void) {
    cb(null, 'asdf');
    // var keyValue = traverseLinks(makeKey(keyPath));
    // if(keyValue){
    //   cb(null, keyValue.value);
    // }else {
    //   cb(InvalidKeyError);  
    // } 
  }
  
  put(keyPath: string[], doc: {}, cb: (err?: Error) => void) {
    // var 
    //   key = makeKey(keyPath),
    //   keyValue = traverseLinks(makeKey(keyPath));
    //   
    // if(keyValue){
    //   _.extend(keyValue.value, doc);
    //   _put(keyValue.key, keyValue.value);
    //   cb();
    // }else{
    //   cb(InvalidKeyError);  
    // }
  }
    
  del(keyPath: string[], cb: (err?: Error) => void) {
    // traverseLinks(makeKey(keyPath), (key)=>{
    //   localCache.removeItem(makeKey(keyPath));
    // });
    // cb();
  }
    
  link(newKeyPath: string[], oldKeyPath: string[], cb: (err?: Error) => void): void
  {
    // // Find all the keypaths with oldKeyPath as subpath, replacing them by the new subkeypath
    // var oldKey = makeKey(oldKeyPath);
    // var newKey = makeKey(newKeyPath);
    // 
    // var keys = localCache.getKeys();
    // for(var i=0; i<keys.length; i++){
    //   if(keys[i].substring(0, oldKey.length) === oldKey){
    //     // Make Link
    //     var link = keys[i].replace(oldKey, newKey);
    //     _put(link, keys[i]);
    //   }
    // }
    // cb();  
  }
  
  //
  // ISetStorage
  //  
  // Save as an Object where key = itemId, value = add|rm|synced
  // 
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts, cb: (err?: Error) => void): void{
    // var
    //   key = makeKey(keyPath),
    //   itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds),
    //   keyValue = traverseLinks(key),
    //   oldItemIdsKeys = keyValue ? keyValue.value || {} : {},
    //   newIdKeys = {};

    // if(keyPath.length === 1 && itemsKeyPath.length === 1){
    //   createCollectionLink(keyPath[0]);
    //   return cb();
    // }
    // 
    // key = keyValue ? keyValue.key : key;
    // _.each(itemIdsKeys, (id)=>{
    //   newIdKeys[id] = opts.insync ? 'insync' : 'add';
    // })
    // _put(key, _.extend(oldItemIdsKeys, newIdKeys));
    // 
    // cb();
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts, cb: (err?: Error) => void) {
    // var 
    //   key = makeKey(keyPath),
    //   itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds),
    //   keyValue = traverseLinks(key);

    // if(itemIds.length === 0) return cb(); // do nothing

    // if(keyValue){
    //   var keysToDelete = keyValue.value;
    //   _.each(itemIdsKeys, (id)=>{
    //     traverseLinks(id, (itemKey)=>{
    //       if(opts.insync){
    //         delete keysToDelete[id];
    //       }else{
    //         keysToDelete[id] = 'rm';
    //       }
    //     });
    //   });
    //   _put(keyValue.key, keysToDelete);
    //   cb();
    // }else{
    //   cb(InvalidKeyError);
    // }
  }
  
  find(keyPath: string[], query: {}, opts, cb: (err: Error, result?: {}[]) => void) : void
  {
    // this.fetch(keyPath, (err, collection?) => {
    //   var result = {};
    //   if(collection){
    //     _.each(_.keys(collection), (key)=>{
    //       var op = collection[key]
    //       if(op !== 'rm' || !opts.snapshot){
    //         var keyValue = traverseLinks(key);
    //         if(keyValue){
    //           var 
    //             item = keyValue.value,
    //             id = item._cid;
    //           if(!(result[id]) || op === 'insync'){
    //             if(!opts.snapshot) item.__op = op;
    //             result[id] = item;
    //           }
    //         }
    //       }
    //     });
    //   }
    //   cb(null, _.values(result));
    // });
  }
  
  //
  // ISeqStorage
  //
  all(keyPath: string[], query, opts, cb: (err: Error, result: {}[]) => void) : void
  {
    // var key = makeKey(keyPath);        
    // cb(null, _get(key) || []);
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

  next(keyPath: string[], id: string, opts, cb: (err: Error, doc?:IDoc) => void)
  {
    // var options = _.defaults(opts, {snapshot: true});
    // var key = makeKey(keyPath);
    // var keyValue = traverseLinks(key);
    // var itemKeys = keyValue ? keyValue.value || [] : [];
    // key = keyValue ? keyValue.key : key;

    // // first item of empty sequence is not an error
    // if(itemKeys.length === 0 && !id) return cb(null, null);

    // id = id || '##@_begin';
    // var refItem = _.find(itemKeys, (item) => {
    //   return item._id === id || item._cid === id;
    // });

    // if(refItem){
    //   var item = itemKeys[refItem.next];
    //   if(item.next < 0) return cb(null); //last pointer

    //   var itemKeyPath = parseKey(item.key);
    //   var op = item.sync;
    //   if(op !== 'rm' || !options.snapshot){
    //     var itemKeyValue = traverseLinks(item.key);
    //     if(itemKeyValue){
    //       var doc = itemKeyValue.value;
    //       if(!options.snapshot) doc.__op = op;
    //       var iDoc = {
    //         id: item._id || item._cid,
    //         doc: doc
    //       };
    //       cb(null, iDoc);
    //     }
    //   }else{
    //     this.next(keyPath, item._id || item._cid, opts, cb);
    //   }

    //   // var itemKeyPath = parseKey(item.key);
    //   // this.fetch(itemKeyPath, (err, doc?)=>{
    //   //   var iDoc = {
    //   //     keyPath: itemKeyPath,
    //   //     doc: doc
    //   //   };
    //   //   cb(null, iDoc);
    //   // });
    // }else{
    //   return cb(Error('reference item not found'));
    // }
    // // cb(null, parseKey(item.key));
  }

  deleteItem(keyPath: string[], id: string, opts, cb: (err?: Error) => void)
  {
    // var key = makeKey(keyPath);
    // var keyValue = traverseLinks(key);
    // var itemKeys = keyValue ? keyValue.value || [] : [];
    // key = keyValue ? keyValue.key : key;

    // var item = _.find(itemKeys, (item) => {
    //   return item._id === id || item._cid === id;
    // });
    // if(!item || item.sync === 'rm') return cb(Error('Tried to delete a non-existent item'));

    // if(opts.insync){
    //   itemKeys[itemKeys[item.prev].next] = 'deleted';
    //   itemKeys[item.prev].next = item.next;
    //   itemKeys[item.next].prev = item.prev;
    // }else{
    //   item.sync = 'rm'; //tombstone
    // }

    // _put(key, itemKeys);
    // cb();
  }
  
  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err: Error, id?: string) => void)
  {
    // console.log('insert before');
    // console.log(itemKeyPath);
    // id = id || '##@_end';
    // var key = makeKey(keyPath);
    // var itemKey = makeKey(itemKeyPath);
    // var keyValue = traverseLinks(key);
    // var itemKeys = keyValue ? keyValue.value || [] : [];
    // key = keyValue ? keyValue.key : key;
    // this.initSequence(itemKeys);

    // var refItem = _.find(itemKeys, (item) => {
    //   return item._id === id || item._cid === id;
    // });

    // if(!refItem) return cb(Error('reference item not found'));
    // var prevItem = itemKeys[refItem.prev];
    // 
    // var newItem = {
    //   _cid: Util.uuid(),
    //   key: itemKey,
    //   sync: opts.insync ? 'insync' : 'ib',
    //   prev: refItem.prev,
    //   next: prevItem.next
    // };

    // itemKeys.push(newItem);
    // prevItem.next = refItem.prev = itemKeys.length-1;

    // _put(key, itemKeys);
    // cb(null, newItem._cid);
  }

  set(keyPath: string[], id: string, sid: string, cb: (err?: Error) => void)
  {
    // var key = makeKey(keyPath);
    // var keyValue = traverseLinks(key);
    // var itemKeys = keyValue ? keyValue.value || [] : [];
    // key = keyValue ? keyValue.key : key;

    // var item = _.find(itemKeys, (item) => {
    //   return item._id === id || item._cid === id;
    // });
    // if(!item) return cb(Error('Tried to set a non-existent item'));

    // if(sid) item._id = sid;
    // switch(item.sync) {
    //   case 'rm':
    //     itemKeys[itemKeys[item.prev].next] = 'deleted';
    //     itemKeys[item.prev].next = item.next;
    //     itemKeys[item.next].prev = item.prev;
    //     //TODO: remobe tombstone
    //     break;
    //   case 'ib':
    //     item.sync = 'insync';
    //     break;
    // }

    // _put(key, itemKeys);
    // cb();
  }
}

}
