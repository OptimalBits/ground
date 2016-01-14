

describe('Base', function(){
  var Obj = ginger.Base.extend(),
    obj = new Obj();
    
  describe('instantiation', function(){
    it('with new operator', function(){
      var instance = new Obj();
      expect(instance).to.be.a(Obj);
    });
    
    it('as a factory method', function(){
      var instance = Obj();
      expect(instance).to.be.a(Obj);
    });
  });
});