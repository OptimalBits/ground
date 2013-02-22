define(['gnd'], function(Gnd){

describe('Local Storage', function(){
  curl(['test/test_storage'], function(suite){
    localStorage.clear();
    var storage = new Gnd.Storage.Local();
    var storageType = "Local Storage";
    suite(storage, storageType);
  });
});

});
