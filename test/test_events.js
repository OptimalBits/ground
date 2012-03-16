define(['ginger'], function(ginger){

describe('Events', function(){
  var Obj = ginger.Declare(ginger.Base),
    obj = new Obj();
    
  it('listen to one event', function(done){  
      obj.on('test', function(val){
        expect(val).to.be(42);
        done();
      });
  
      obj.emit('test', 42);
  });
  
  it('stop listening to one event', function(){
    obj.on('test', function(val){
      expect(1).to.be(0);
    }); 
  
    obj.off('test');
  
    obj.emit('test', 'foobar');
  });

  it('listening to several events', function(){
    var counter = 3;
    obj.on('foo bar baz', function(val){
      counter--;
    });
    
    obj.emit('bar', 'foo');
    obj.emit('baz', 'bar');
    obj.emit('foo', 'baz');

    expect(counter).to.be(0);
  });
  
  it('remove all events', function(){
    var counter = 4;
    obj.on('flip flop swap swop', function(val){
      counter--;
    });

    obj.emit('flip', 'foo');
    obj.emit('flop', 'bar');
    obj.emit('swap', 'baz');
    obj.emit('swop', 'foo');
  
    expect(counter).to.be(0);
    
    obj.off();
    
    obj.emit('flip', 'foo');
    obj.emit('flop', 'bar');
    obj.emit('swap', 'baz');
    obj.emit('swop', 'foo');
    
    expect(counter).to.be(0);
  });
  
  it('destructor cleans all the events', function(){
    var counter = 0;
    obj.on('flip flop swap swop', function(val){
      counter++;
    });
    
    obj.release();
    
    obj.emit('flip', 'foo');
    obj.emit('flop', 'bar');
    obj.emit('swap', 'baz');
    obj.emit('swop', 'foo');
    
    expect(counter).to.be(0);
  });
});

});