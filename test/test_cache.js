define(['gnd'], function(Gnd){

describe('Local Cache', function(){
  var cache;
  
  var fixture = {
    'foo' : 'payload1',
    'bar' : 'payload2',
    'baz' : 'payload3',
    'qux' : 'payload4',       
  };

  before(function() {
    cache = new Gnd.Cache();
  });
  
  after(function(){
    cache.setMaxSize(5*1024*1024);
  });
  
  describe('Clean up', function(){
    it('Clear all items', function(){
      var numItems = cache.length,
        storageLength = localStorage.length;
      
      cache.clear();
      expect(cache.length).to.be(0);
      expect(localStorage.length).to.be.equal(storageLength-numItems);
      localStorage.clear();
    });
  });
  
  describe('Add items', function(){  
    it('One item', function(){ 
      var value1 = 'value1', key1 = 'key1';
      cache.setItem(key1, value1);
            
      expect(cache.getItem(key1)).to.be.equal(value1);
      expect(cache.size).to.be.equal(value1.length);
      cache.clear();
    });
    it('Several items', function(){
      var size = 0, numItems = 0;
        
      for(var key in fixture){
        cache.setItem(key, fixture[key]);
        size += fixture[key].length;
        numItems++;
      }
        
      for(var key in fixture){
        expect(cache.getItem(key)).to.be.equal(fixture[key]);
      }
          
      expect(cache.size).to.be(size);
      expect(cache.length).to.be(numItems);
      cache.clear();
    });

    it('handles values containing the "|" character', function(){
      cache.setMaxSize(50);

      cache.setItem(1, 'abc|123');
      cache.setItem(2, '|123');
      cache.setItem(3, '|||');
      cache.setItem(4, '|');
      expect(cache.length).to.be.equal(4);

      expect(cache.getItem(1)).to.be.equal('abc|123');
      expect(cache.getItem(2)).to.be.equal('|123');
      expect(cache.getItem(3)).to.be.equal('|||');
      expect(cache.getItem(4)).to.be.equal('|');

      cache.clear();
      expect(localStorage.length).to.be.equal(0);
    });
    
    // Easy to implement but would cost additional JSON parsing and serialization
    // it('handles any kind of object', function(){
    //   cache.setMaxSize(50);

    //   cache.setItem(1, 1);
    //   cache.setItem(2, 'a');
    //   cache.setItem(3, {x:1,y:2});
    //   cache.setItem(4, [1,2,3]);
    //   expect(cache.length).to.be.equal(4);

    //   expect(cache.getItem(1)).to.be.equal(1);
    //   expect(cache.getItem(2)).to.be.equal('a');
    //   expect(cache.getItem(3)).to.be.equal({x:1,y:3});
    //   expect(cache.getItem(4)).to.be.equal([1,2,4]);

    //   cache.clear();
    //   expect(localStorage.length).to.be.equal(0);
    // });
  });
  
  describe('Remove items', function(){
    it('One item', function(){
      var value1 = 'value1', key1 = 'key1';
      cache.setItem(key1, value1);
    
      expect(cache.getItem(key1)).to.be.equal(value1);
      expect(cache.size).to.be.equal(value1.length);
        
      cache.removeItem(key1);
        
      expect(cache.getItem(key1)).to.be(undefined);
      expect(cache.size).to.be(0);
      expect(cache.length).to.be(0);
      expect(localStorage.length).to.be.equal(0);
        
      cache.clear();
    });
    it('Several items', function(){
      for(var key in fixture){
        cache.setItem(key, fixture[key]);
      }
      for(var key in fixture){
        cache.removeItem(key, fixture[key]);
      }
      for(var key in fixture){
        expect(cache.getItem(key)).to.be(undefined);
      }
        
      expect(cache.size).to.be.equal(0);
      expect(cache.length).to.be(0);
      expect(localStorage.length).to.be.equal(0);
        
      cache.clear();
    });
  });

  describe('Trigger replacement', function(){    
    it('Very small cache', function(){
      var key1 = 'key1', value1 = 'value1', key2 = 'key2', value2 = 'value2';
      cache.setMaxSize(8);
        
      cache.setItem(key1, value1);
      expect(cache.getItem(key1)).to.be.equal(value1);
        
      expect(cache.getItem(key2)).to.be.undefined;
        
      cache.setItem(key2, value2);
        
      expect(cache.getItem(key2)).to.be.equal(value2);
      expect(cache.getItem(key1)).to.be(undefined);
      expect(cache.length).to.be(1);
      expect(localStorage.length).to.be.equal(1);
        
      cache.clear();
      expect(localStorage.length).to.be.equal(0);
    });

    it('Not enough room', function(){
      cache.setMaxSize(4);
        
      cache.setItem('foobar', '12345');
        
      expect(cache.getItem('foobar')).to.be(undefined);
      expect(cache.size).to.be.equal(0);
      expect(cache.length).to.be(0);
      expect(localStorage.length).to.be.equal(0);
     });

    it('large value after several small objects', function(){
      var small = 'value', 
        large = 'Future Crew is the best demo group ever...',
        size = (small.length+1)*10;
        
      cache.setMaxSize(size);
        
      for(var i=0; i<10;i++){
        cache.setItem(Math.random()*1000, small+i);  
      }
      expect(cache.size).to.be(size);
      expect(cache.length).to.be(10);

      cache.setItem('large', large);
      expect(cache.length).to.be((10-Math.floor(large.length/(small.length+1)))+1)
      expect(cache.size).to.be((cache.length-1)*(small.length+1)+large.length);

      cache.clear();
      expect(localStorage.length).to.be.equal(0);
    });

    it('handles setting of same key multiple times', function(){
      cache.setMaxSize(5);

      cache.setItem(1, '1');
      cache.setItem(2, '2');
      cache.setItem(3, '3');
      cache.setItem(4, '4');
      cache.setItem(5, '5');
      expect(cache.size).to.be.equal(5); // full
      expect(cache.length).to.be.equal(5);

      cache.setItem(1, 'a'); // 1 is now most recently used
      cache.setItem(6, 'x'); // should invalidate 2
      cache.setItem(7, 'x'); // should invalidate 3
      cache.setItem(8, 'x'); // should invalidate 4
      cache.setItem(9, 'x'); // should invalidate 5

      expect(cache.getItem(2)).to.be.undefined;
      expect(cache.getItem(3)).to.be.undefined;
      expect(cache.getItem(4)).to.be.undefined;
      expect(cache.getItem(5)).to.be.undefined;
      expect(cache.getItem(1)).to.be.equal('a'); // 1 is most recently used

      cache.setItem(10, 'xxxx'); // should invalidate everything except 1
      expect(cache.size).to.be.equal(5); // full
      expect(cache.length).to.be.equal(2);
      expect(cache.getItem(1)).to.be.equal('a'); // 1 is most recently used

      cache.setItem(11, 'x'); // should invalidate 10
      expect(cache.size).to.be.equal(2); //not full
      expect(cache.length).to.be.equal(2);

      cache.setItem(12, 'xxxx'); // should invalidate 1
      expect(cache.getItem(1)).to.be.undefined;

      cache.clear();
      expect(localStorage.length).to.be.equal(0);
    });

    it('removes old objects in right order', function(){
      cache.setMaxSize(10);

      cache.setItem(1, '1');
      cache.setItem(2, '11');
      cache.setItem(3, '111');
      cache.setItem(4, '1111');
      expect(cache.size).to.be.equal(10); // full
      expect(cache.length).to.be.equal(4);

      cache.setItem(5, '2'); // 1 is invalidated
      expect(cache.getItem(1)).to.be.undefined;
      expect(cache.size).to.be.equal(10); // full

      expect(cache.getItem(2)).to.be.equal('11'); // 2 is now most recently used

      cache.setItem(6, '22'); // 3 is invalidated
      expect(cache.getItem(3)).to.be.undefined;
      expect(cache.size).to.be.equal(9); // not full

      cache.setItem(7, '2'); // we still have place for one
      expect(cache.size).to.be.equal(10); // full
      expect(cache.length).to.be.equal(5);

      cache.setItem(8, '22');
      expect(cache.getItem(4)).to.be.undefined;
      expect(cache.size).to.be.equal(8); // not full
      expect(cache.length).to.be.equal(5);

      cache.setItem(9, '33');
      expect(cache.size).to.be.equal(10); // full
      expect(cache.length).to.be.equal(6);

      cache.setItem(10, 'xxxxxxxxxx');
      expect(cache.getItem(9)).to.be.undefined;
      expect(cache.size).to.be.equal(10); // full
      expect(cache.length).to.be.equal(1);

      cache.clear();
      expect(localStorage.length).to.be.equal(0);
    });
  });

  describe('Mulitple caches', function(){
    it('cache populates correctly', function(){
      cache.setMaxSize(10);

      cache.setItem(1, '1');
      cache.setItem(2, '11');
      cache.setItem(3, '111');
      expect(cache.length).to.be.equal(3);

      var c2 = new Gnd.Cache();
      expect(c2.length).to.be.equal(3);
      expect(c2.getItem(1)).to.be.equal('1');
      expect(c2.getItem(2)).to.be.equal('11');
      expect(c2.getItem(3)).to.be.equal('111');

      cache.clear();
      expect(cache.length).to.be(0);
    });
  });
});


});
