define(['socket'], function(Storage){

describe('Socket.io Storage', function(){  
  storage = new Storage.Socket(socket);
  storageType = "Socket Storage"
  curl(['test/test_storage'])
});

});
