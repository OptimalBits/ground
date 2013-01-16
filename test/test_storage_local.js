define(['gnd'], function(Gnd){

describe('Local Storage', function(){
  localStorage.clear();
  storage = new Gnd.Storage.Local();
  storageType = "Local Storage"
  curl(['test/test_storage'])
});

});
