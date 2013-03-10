
define(['gnd'], function(Gnd){

describe('Session', function(){
  
  describe('Login / Logout', function(){
    it('Login creates a new session', function(){
      Gnd.Session.login('tester', 'passwd', function(err, session){
        expect(err).to.not.be.ok();
        expect(session).to.be.ok();
        expect(session).to.have.property('sessionId');
        
        Gnd.Session.authenticated(session.sessionId, function(err, session2){
          expect(err).to.not.be.ok();
          expect(session2).to.be.ok();
          expect(session.sessionId).to.be.equal(session2.sessionId);
          
          Gnd.Session.logout(session.sessionId, function(err){
            expect(err).to.not.be.ok();
            
            Gnd.Session.authenticated(session.sessionId, function(err, session3){
              expect(err).to.be.ok();
              expect(session3).to.not.be.ok();
            });
          });
        });
      
      });
    });
  });
  
});

});
