define(['gnd'], function(Gnd){
"use strict";

describe.skip('Session', function(){
  
  var Animal = Gnd.Model.extend('animals');
  var storageLocal;
  
  function socketConnect(done){
    var socket1 = io.connect('http://localhost:9999', {'force new connection': true});
    socket1.on('connect', function(){
      
      var storageRemote = new Gnd.Storage.Socket(socket1);
      Gnd.use.storageQueue(storageLocal, storageRemote);
      done();
    });
  }
  
  before(function(){
    storageLocal = new Gnd.Storage.Local();
  
  });
  
  describe('Login / Logout', function(){
    it('Login creates a new session', function(done){
      Gnd.Session.login('tester', 'passwd').then(function(session){
        expect(session).to.be.ok();
        expect(session).to.have.property('username');
        
        Gnd.Session.authenticated().then(function(session2){
          expect(session2).to.be.ok();
          expect(session.username).to.be.equal(session2.username);
          
          Gnd.Session.logout().then(function(){
            
            Gnd.Session.authenticated().then(function(session3){
            
            }, function(err){
              expect(err).to.be.an(Error);
              done();
            });
          });
        });
      });
    });
    
    it('Cannot create Model if not logged in', function(done){
      Gnd.Session.logout().then(function(){
        Gnd.Session.authenticated().then(function(){}, function(err){
          expect(err).to.be.an(Error);
          
          socketConnect(function(){
            var animal = new Animal({name: 'kangaroo' });
            animal.save();
      
            Gnd.using.storageQueue.once('error:', function(err){
              expect(err).to.be.ok();
              done();
            });
          });
        });
      });
    });
    
    it('Can create Model if logged in', function(done){
      Gnd.Session.login('tester', 'passwd').then(function(session){
        expect(session).to.be.ok();
          
        socketConnect(function(){
          var animal = new Animal({name: 'kangaroo' });
          animal.save();
      
          Gnd.using.storageQueue.once('error:', function(){
            expect(false).to.be(true);
          });
        
          Gnd.using.storageQueue.once('synced:', function(){
            done();
          });
        });
      });
    });
    
  });
  
});

});
