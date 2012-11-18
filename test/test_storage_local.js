define(['local'], function(Storage){

describe('Local Storage', function(){
  
  localStorage.clear();
  storage = new Storage.Local();
  storageType = "Local Storage"
  curl(['test/test_storage'])
});

});
