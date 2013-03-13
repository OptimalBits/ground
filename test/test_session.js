
define(['gnd'], function(Gnd){

describe('Session', function(){
  
  describe('Login / Logout', function(){
    it.skip('Login creates a new session', function(done){
      Gnd.Session.login('tester', 'passwd', function(err, session){
        expect(err).to.not.be.ok();
        expect(session).to.be.ok();
        expect(session).to.have.property('username');
        
        Gnd.Session.authenticated(session.sessionId, function(err, session2){
          expect(err).to.not.be.ok();
          expect(session2).to.be.ok();
          expect(session.username).to.be.equal(session2.username);
          
          Gnd.Session.logout(session.sessionId, function(err){
            expect(err).to.not.be.ok();
            
            Gnd.Session.authenticated(session.sessionId, function(err, session3){
              expect(err).to.be.ok();
              expect(session3).to.not.be.ok();
              done();
            });
          });
        });
      });
    });
    
    it.skip('After login, socket backend can access the session', function(done){
      Gnd.Session.login('tester', 'passwd', function(err, session){
        var socket = io.connect('http://localhost:8080', {'force new connection': true});
        socket.on('connect', function(){
          
          // Get a model
          
          // Update it
          
          // etc.
          
          done();
        });
      });
    });
  });
  
});

});
