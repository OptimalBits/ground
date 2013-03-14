define(['gnd'], function(Gnd){
"use strict";

describe('Session', function(){
  
  var Animal = Gnd.Model.extend('animals');
  var storageLocal;
  
  function socketConnect(done){
    var socket1 = io.connect('http://localhost:8081', {'force new connection': true});
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
      Gnd.Session.login('tester', 'passwd', function(err, session){
        expect(err).to.not.be.ok();
        expect(session).to.be.ok();
        expect(session).to.have.property('username');
        
        Gnd.Session.authenticated(function(err, session2){
          expect(err).to.not.be.ok();
          expect(session2).to.be.ok();
          expect(session.username).to.be.equal(session2.username);
          
          Gnd.Session.logout(function(err){
            expect(err).to.not.be.ok();
            
            Gnd.Session.authenticated(function(err, session3){
              expect(err).to.be.ok();
              expect(session3).to.not.be.ok();
              done();
            });
          });
        });
      });
    });
    
    it('Cannot create Model if not logged in', function(done){
      Gnd.Session.logout(function(){
        Gnd.Session.authenticated(function(err, session){
          expect(err).to.be.ok();
          expect(session).to.not.be.ok();
          
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
      Gnd.Session.login('tester', 'passwd', function(err, session){
        expect(err).to.not.be.ok();
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
