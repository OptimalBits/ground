define(['gnd'], function(Gnd){

describe('Socket.io Storage', function(){  
  storage = new Gnd.Storage.Socket(socket);
  storageType = "Socket Storage"
  curl(['test/test_storage'])
});

});
