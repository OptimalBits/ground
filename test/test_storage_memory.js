/*global curl:true*/
define(['gnd'], function(Gnd){

describe('Memory Storage', function(){
  curl(['test/test_storage'], function(suite){
    localStorage.clear();
    var storage = new Gnd.Storage.Local(new Gnd.Storage.Store.MemoryStore());
    var storageType = 'Memory Storage';
    suite(storage, storageType);
  });
});

});
