define(['gnd'], function(Gnd){
"use strict";

describe('Mutex', function(){
  
  it('no queued synchronous operation', function(done){
    var mutex = Gnd.Mutex();
    
    var entered = false;
    mutex(function(){
      expect(entered).to.be(false);
      entered = true;
      return 42
    }).then(function(result){
      expect(result).to.be(42);
      expect(entered).to.be(true);
      done();
    })
  });

  it('no queued asynchronous operation', function(done){
    var mutex = new Gnd.Mutex();
    
    var entered = false;
    mutex(function(){
      var promise = new Gnd.Promise();
      expect(entered).to.be(false);
      entered = true;
      
      setTimeout(function(){
        promise.resolve(42);
      }, 50);
      
      return promise;
    }).then(function(result){
      expect(result).to.be(42);
      expect(entered).to.be(true);
      done();
    })
  });
  
  it('queued synchronous operations run in order', function(done){
    var mutex = new Gnd.Mutex();
    var counter = 0;
    
    var op1 = function(counter){
      expect(counter).to.be(1);
      return 40;
    }

    var op2 = function(counter){
      expect(counter).to.be(2);
      return 41;
    }
    
    var op3 = function(counter){
      expect(counter).to.be(3);
      return 42;
    }
    
    mutex(function(){
      counter++;
      return op1(counter);
    }).then(function(result){
      expect(result).to.be(40);
    });
    
    mutex(function(){
      counter++;
      return op2(counter);
    }).then(function(result){
      expect(result).to.be(41);
    });
    
    mutex(function(){
      counter++;
      return op3(counter);
    }).then(function(result){
      expect(result).to.be(42);
      done();
    });
    
  });

  it('queued asynchronous operation run in order', function(done){
    var mutex = new Gnd.Mutex();
    var counter = 0;
    
    var op1 = function(counter){
      expect(counter).to.be(1);
      return 40;
    }

    var op2 = function(counter){
      expect(counter).to.be(2);
      return 41;
    }
    
    var op3 = function(counter){
      expect(counter).to.be(3);
      return 42;
    }
    
    mutex(function(){
      var promise = new Gnd.Promise();
      counter++;
      setTimeout(function(){
        promise.resolve(op1(counter));
      }, 50);
      return promise;
    }).then(function(result){
      expect(result).to.be(40);
    });
    
    mutex(function(){
      var promise = new Gnd.Promise();
      counter++;
      setTimeout(function(){
        promise.resolve(op2(counter));
      }, 50);
      return promise;
      
    }).then(function(result){
      expect(result).to.be(41);
    });
    
    mutex(function(){
      var promise = new Gnd.Promise();
      counter++;
      setTimeout(function(){
        promise.resolve(op3(counter));
      }, 50);
      return promise;
      
    }).then(function(result){
      expect(result).to.be(42);
      done();
    });
    
  });
  
});

});
