define(['gnd'], function(Gnd){

describe('Events', function(){
  var obj = new Gnd.EventEmitter();
    
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
  
  it('listen to namespaced events', function(done){
    var counter = 2;
    
    obj.on('foo/qux', function(val){
      expect(val).to.be(42);
      counter--;
      if(counter==0){
        done();
      }
    });
    
    obj.on('foo/baz foo/bar', function(val){
      expect(val).to.be(43);
      counter--;
      if(counter==0){
        done();
      }
    });
    
    obj.emit('qux', 42);
    obj.emit('bar', 43);
  });
  
  it('removed events associated to a namespace', function(done){
    obj.on('qux', function(val){
      expect(val).to.be(44);
      done();
    });
  
    obj.on('foo/bar', function(val){
      expect(1).to.be(0);
    });
    
    obj.off('foo/')
  
    obj.emit('bar', 32);
    obj.emit('qux', 44);
  });
  
  it('added namespaced events using namespace chain', function(done){
    var counter = 2;
    
    obj
      .namespace('fox')
      .on('baz', function(val){
        expect(val).to.be(55);
        counter--;
        if(counter==0){
          done();
        }
      })
      .on('bar', function(val){
        expect(val).to.be(99);
        counter--;
        if(counter==0){
          done();
        }
      })
  
    obj.emit('baz', 55);
    obj.emit('bar', 99);
  });

  it('removed events associated to a namespace using namespace chain', function(){
    obj.namespace('fox').on('bar', function(val){
      expect(1).to.be(0);
    });
    
    obj.namespace('fox').off();  
    obj.emit('bar', 32);
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
    var obj2 = new Gnd.Base();
    
    var counter = 0;
    obj2.on('flip flop swap swop', function(val){
      counter++;
    });
    
    obj2.release();
    
    obj2.emit('flip', 'foo');
    obj2.emit('flop', 'bar');
    obj2.emit('swap', 'baz');
    obj2.emit('swop', 'foo');
    
    expect(counter).to.be(0);
  });

  it('multiple \'once\' registered', function(done){
    var counter = 0;
    obj.once('test', function(){
      counter+=1;
    });
    obj.once('test', function(){
      counter+=1;
    });

    obj.emit('test');

    expect(counter).to.be(2);
    done();
  });
});

});