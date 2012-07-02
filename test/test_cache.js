define(['ginger'], function(ginger){

  describe('localCache', function(){
    describe('instantiation', function(){
      it('with new operator', function(){
        var value1 = 'value1';
        var key1 = 'key1';
        ginger.localCache.write(key1, value1);
        var doc = ginger.localCache.read(key1);
        expect(doc).to.be.equal(value1);
        console.log(ginger.localCache.size);
      });
    });
  });
});
