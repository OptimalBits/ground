define(['ginger'], function(gnd){

describe('Promises and Tasks', function(){
  it('create and resolve a promise', function(done){  
    var promise = new gnd.Promise();
    
    promise.then(function(val0, val1){
      expect(arguments.length).to.be(2);
      expect(val0).to.be(42);
      expect(val1).to.be(32);
      done()
    });
    promise.resolve(42,32);
  });
  
  it('create and resolve a promise with multiple listeners', function(done){  
    var promise = new gnd.Promise();
    var counter = 3;
    promise.then(function(val0, val1){
      expect(arguments.length).to.be(2);
      expect(val0).to.be(42);
      expect(val1).to.be(32);
      counter--;
      if(counter==0) done();
    });
    promise.then(function(val0, val1){
      expect(arguments.length).to.be(2);
      expect(val0).to.be(42);
      expect(val1).to.be(32);
      counter--;
      if(counter==0) done();
    });
    promise.then(function(val0, val1){
      expect(arguments.length).to.be(2);
      expect(val0).to.be(42);
      expect(val1).to.be(32);
      counter--;
      if(counter==0) done();
    });
    
    promise.resolve(42,32);
  });
  
  it('create a promise, resolve first listen after', function(done){  
    var promise = new gnd.Promise();
    
    promise.resolve(42);
    
    promise.then(function(val){
      expect(val).to.be(42);
      done()
    });
  });
  
  it('listen before and after resolution', function(done){  
    var promise = new gnd.Promise();
    var counter = 2;
    
    promise.then(function(val){
      expect(val).to.be(42);
      counter --;
      if(counter==0) done();
    });
    
    promise.resolve(42);
    
    promise.then(function(val){
      expect(val).to.be(42);
      counter --;
      if(counter==0) done();
    });
  });
  
  it('aborted promise does not trigger then after resolution', function(){  
    var promise = new gnd.Promise();
    
    promise.then(function(){
      expect(0).to.be(true);
    });
    
    promise.abort();
    promise.resolve();
  });
  
  it.skip('simple promise queue with 2 promises triggers after second', function(){
    var promise1 = new gnd.Promise(), promise2 = new gnd.Promise();
    var queue = new gnd.PromiseQueue(promise1, promise2);
    
    var triggered = false;
    queue.then(function(){
      triggered = true;
    });
    promise1.resolve();
    expect(triggered).to.be(false);
    
    promise2.resolve();
    expect(triggered).to.be(true);
  });
  
  it('Task queue with a few elements executes in order', function(done){  
    var queue = new gnd.TaskQueue();
    
    var index = 0;
    
    queue.append(function(cb){
      expect(index).to.be(0);
      index++;
      cb();
    }).append(function(cb){
      expect(index).to.be(1);
      index++;
      cb();
    }).append(function(cb){
      expect(index).to.be(2);
      index++;
      cb();
    }).append(function(cb){
      expect(index).to.be(3);
      index++;
      cb();
    }).end().then(function(){
      expect(index).to.be(4);
      done();
    })
  });
  
  it('Task queue with a few elements is cancelled', function(done){  
      var queue = new gnd.TaskQueue();
      
      var index = 0;
      
      queue.append(function(cb){
        expect(index).to.be(0);
        index++;
        cb();
      }).append(function(cb){
        expect(index).to.be(1);
        index++;
        queue.cancel();
        cb();
      }).append(function(cb){
        expect(1).to.be(false);
        cb();
      }).end().then(function(){
        expect(index).to.be(2);
        done();
      });
    });
});

});