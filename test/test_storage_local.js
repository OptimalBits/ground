/*global curl:true*/
define(['gnd'], function(Gnd){

describe('Local Storage', function(){
  curl(['test/test_storage'], function(suite){
    localStorage.clear();
    var storage = new Gnd.Storage.Local(new Gnd.Storage.Store.LocalStore());
    var storageType = "Local Storage";
    suite(storage, storageType);
  });
});

});
