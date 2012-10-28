define(['ginger'], function(ginger){

describe('Local Cache', function(){
  var cache = ginger.localCache;
  
  var fixture = {
    'foo' : 'payload1',
    'bar' : 'payload2',
    'baz' : 'payload3',
    'qux' : 'payload4'
  };
  
  after(function(){
    cache.setMaxSize(5*1024*1024);
    // but still, why is it not removing in the right order?
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
    });
    it('removes old objects in right order', function(){
      // TO IMPLEMENT...
    });
  });
});


});
