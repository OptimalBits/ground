define(['ginger'], function(ginger){

describe('Declare', function(){
  var Obj = ginger.Declare(ginger.Base);
    
  describe('static methods', function(){
    it('are inherited', function(){
      Obj.staticFoo = function(val){return val;}
      
      var Obj2 = ginger.Declare(Obj);
      Obj2.staticBar = function(val){return val+1;};
      
      expect(Obj2).to.have.property('staticFoo');
      expect(Obj2.staticFoo(42)).to.be(42);
      
      var Obj3 = ginger.Declare(Obj2);
      expect(Obj3).to.have.property('staticFoo');
      expect(Obj3.staticFoo(42)).to.be(42);
      expect(Obj3).to.have.property('staticBar');
      expect(Obj3.staticBar(42)).to.be(43);
    });
  });
  
  
});

});
