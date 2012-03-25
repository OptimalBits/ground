define(['ginger'], function(ginger){

describe('Base', function(){
  var Obj = ginger.Declare(ginger.Base),
    obj = new Obj();
    
  describe('property changes', function(){
    it('listen to property change', function(done){
      obj.on('foo', function(foo){
        expect(foo).to.be(42);
        done();
      });
      
      obj.set('foo', 42);
      obj.off('foo');
    });
    
    it('listen to any change', function(done){
      obj.on('changed:', function(args){
        expect(args).to.be.an(Object);
        expect(args).to.have.property('bar');
        expect(args).to.not.have.property('foo');
        done();
      });
      
      obj.set('bar', 42);
      obj.off('changed:');
    });
    
    it('listen to several properties changed at once', function(done){
      var counter = 2;
      obj.on('bar', function(value){
        expect(value).to.be(43);
        counter--;
        if(counter == 0){
          done();
        }
      });
      obj.on('baz', function(value){
        expect(value).to.be(48);
        counter--;
        if(counter == 0){
          done();
        }
      });
      obj.set({bar:43, baz:48});
      obj.off('bar');
      obj.off('baz');
    });
  });
  
  describe('keypaths', function(){
    it('gets a property described by a keypath', function(){
      obj.baz = {foo:32, bar:56};
      
      expect(obj.get('baz.foo')).to.be(32);
      expect(obj.get('baz.bar')).to.be(56);
    });

    it('sets a property described by a keypath', function(){
      obj.baz = {foo:32, bar:56};
      
      obj.set('baz.foo', 42);
      obj.set('baz.bar', 49);
      
      expect(obj.get('baz.foo')).to.be(42);
      expect(obj.get('baz.bar')).to.be(49);
    });
    
    it('changed: returns a proper object for a keypath', function(){
    
    });
  
    it('listen to change in a property described by a keypath', function(done){
      obj.baz = {foo:32, bar:56};
    
      obj.on('baz.foo', function(value){
        expect(value).to.be(42);
        expect(obj.get('baz.foo')).to.be(42);
        expect(obj.baz.foo).to.be(42);
        done();
      });
    
      obj.set('baz.foo', 42);
    });
  });
  
  describe('property formating', function(){
    it('assigns a format function to a property', function(){
      obj.format('baz', function(val){
        return Math.round(val);
      });
      
      obj.set('baz', 42.3);
      
      expect(obj.format('baz')).to.be(42);
    });
    
    it('assigns a format function to a keypath', function(){
      obj.format('foobar.foo', function(val){
        return Math.round(val);
      });
      
      obj.set('foobar.foo', 42.3);
      
      expect(obj.format('foobar.foo')).to.be(42);
    });
    
  });
  
  describe('bindings', function(){
  
  });
  
  describe('reference counting', function(){
  
  });

  describe('release pools', function(){
  
  });

});

});
