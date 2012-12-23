define(['gnd'], function(Gnd){

describe('Util', function(){
    
  describe('extending (subclassing)', function(){
    it('without new methods', function(){
      var Obj = Gnd.Util.extend(Gnd.Base)
      obj = new Obj();
  
      var instance = new Obj();
      expect(instance).to.be.a(Obj);
      instance.release();
    });
    
    it('with methods', function(done){
      var Obj = Gnd.Util.extend(Gnd.Base, function(){
        return {
          test: function(){
            done();
          }
        }
      })
      obj = new Obj();
      
      var instance = new Obj();
      expect(instance).to.be.a(Obj);
      instance.test();
    });
  });
});

});
