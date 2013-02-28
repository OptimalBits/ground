/*global curl:true, socket:true*/
define(['gnd'], function(Gnd){

describe('Socket.io Storage', function(){
  curl(['test/test_storage'], function(suite){
    var storage = new Gnd.Storage.Socket(socket);
    var storageType = "Socket Storage";
    suite(storage, storageType);
  });
});

});
