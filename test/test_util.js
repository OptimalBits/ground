define(['gnd'], function(Gnd){

describe('Util', function(){
    
  describe('extending (subclassing)', function(){
    it('without new methods', function(){
      var Obj = Gnd.Util.extend(Gnd.Base)
      var obj = new Obj();
      expect(obj).to.be.a(Obj);
      obj.release();
    });
    
    it('with methods', function(done){
      var Obj = Gnd.Util.extend(Gnd.Base, function(_super){
        return {
          constructor: function(){
            _super.constructor.call(this);
          },
          test: function(){
            done();
          }
        }
      })
      var obj = new Obj();
      expect(obj).to.be.a(Obj);
      obj.test();
    });
    it('with custom constructor', function(done){
      var Obj = Gnd.Util.extend(Gnd.Base, function(){
        return {
          constructor: function(){
            done();
          }
        }
      })
      var obj = new Obj();
    });
  });
});

});
