define(['socket'], function(Storage){

describe('Socket.io Storage', function(){
  
  localStorage.clear();
  storage = new Storage.Socket(socket);
  storageType = "Socket Storage"
  curl(['test/test_storage'])
});

});
