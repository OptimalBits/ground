define(['gnd'], function(Gnd){

describe('Promises and Tasks', function(){
  describe('Promises', function(){

  it('create and resolve a promise', function(done){  
    var promise = new Gnd.Promise();
    
    promise.then(function(val){
      expect(arguments.length).to.be(1);
      expect(val).to.be(42);
      done()
    });
    promise.resolve(42);
  });
  
  it('create and resolve a promise with multiple listeners', function(done){  
    var promise = new Gnd.Promise();
    var counter = 3;
    promise.then(function(val){
      expect(arguments.length).to.be(1);
      expect(val).to.be(42);
      counter--;
      if(counter==0) done();
    });
    promise.then(function(val){
      expect(arguments.length).to.be(1);
      expect(val).to.be(42);
      counter--;
      if(counter==0) done();
    });
    promise.then(function(val){
      expect(arguments.length).to.be(1);
      expect(val).to.be(42);
      counter--;
      if(counter==0) done();
    });
    
    promise.resolve(42);
  });
  
  it('create a promise, resolve first listen after', function(done){  
    var promise = new Gnd.Promise();
    
    promise.resolve(42);
    
    promise.then(function(val){
      expect(val).to.be(42);
      done()
    });
  });
  
  it('listen before and after resolution', function(done){  
    var promise = new Gnd.Promise();
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
  
  it('listen before and after rejection', function(done){  
    var promise = new Gnd.Promise();
    var counter = 2;
    
    promise.then(function(val){
      expect(true).to.be(false);
    }, function(err){
      expect(err).to.be(42);
      counter --;
      if(counter==0) done();
    });
    
    promise.reject(42);
    
    promise.then(function(val){
      expect(true).to.be(false);
    }, function(err){
      expect(err).to.be(42);
      counter --;
      if(counter==0) done();
    });
  });
  
  it('then returns a promise that resolves a value', function(done){  
    var promise = new Gnd.Promise();
    var counter = 2;
    
    var promise2 = promise.then(function(val){
      expect(val).to.be(42);
      return 50;
    }, function(err){
      expect(true).to.be(false);
    });
    
    promise.resolve(42);
    
    promise2.then(function(val){
       expect(val).to.be(50);
       done();
    });
  });
  
  it('then returns a promise that resolves a promise', function(done){  
    var promise = new Gnd.Promise();
    var promise3 = new Gnd.Promise();
    
    var promise2 = promise.then(function(val){
      expect(val).to.be(42);
      return promise3;
    }, function(err) {
      expect(true).to.be(false);
    });
    
    promise.resolve(42);
    
    promise2.then(function(val){
      expect(val).to.be(50);
      done();
    });
    
    promise3.resolve(50);
  });
  
  it.skip('then callbacks are called asynchronously', function(done){  
    var promise = new Gnd.Promise();
    var end = false;
    
    var promise2 = promise.then(function(val){
      expect(end).to.be(true);
      expect(val).to.be(42);
      return 50;
    }, function(err){
      expect(true).to.be(false);
    });
    
    promise.resolve(42);
    
    promise2.then(function(val){
       expect(end).to.be(true);
       expect(val).to.be(50);
       done();
    })
    
    end = true;   
  });
  
  it('aborted promise does not trigger then after resolution', function(){  
    var promise = new Gnd.Promise();
    
    promise.then(function(){
      expect(0).to.be(true);
    });
    
    promise.abort();
    promise.resolve();
  });

  it('simple promise queue with 2 promises triggers after second', function(){
    var promise1 = new Gnd.Promise(), promise2 = new Gnd.Promise();
    var queue = new Gnd.PromiseQueue(promise1, promise2);
    
    var triggered = false;
    queue.then(function(){
      expect(triggered).to.be(true);
    });
    
    throw Error('This case always fails until promises are A+ compatible');
    promise1.resolve();
    promise2.resolve();
    triggered = true;
  });
  
});

describe('Tasks', function(){
  it('Task queue with a few elements executes in order', function(done){  
    var queue = new Gnd.TaskQueue();
    
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
    }).end().wait(function(){
      expect(index).to.be(4);
      done();
    })
  });
  
  it('Task queue with a few elements is cancelled', function(done){  
      var queue = new Gnd.TaskQueue();
      
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
      }).end().wait(function(){
        expect(index).to.be(2);
        done();
      });
    });
});

});
});
