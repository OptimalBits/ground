define(['gnd'], function(Gnd){
    
 
describe('DOM', function(){
    it('select element by Id', function(){
      var $dummy = Gnd.$('#dummy');
      expect($dummy).to.be.a(Gnd.Query);
      expect($dummy.length).to.be(1);
      expect($dummy[0]).to.have.property('id');
      expect($dummy[0].id).to.be('dummy');
    });
    
    it('select element by Class', function(){
      var $dummy = Gnd.$('.test1');
      expect($dummy).to.be.a(Gnd.Query);
      expect($dummy.length).to.be(3);
      expect($dummy[0]).to.have.property('id');
      expect($dummy[0].id).to.be('dummy');
      expect($dummy[1]).to.have.property('id');
      expect($dummy[1].id).to.be('dummy2');
      expect($dummy[2]).to.have.property('id');
      expect($dummy[2].id).to.be('dummy3');
    });
    
    it('select element by Name', function(){
      var $dummy = Gnd.$('div');
      expect($dummy).to.be.a(Gnd.Query);
      expect($dummy.length).to.be(5);
      expect($dummy[0]).to.have.property('nodeName');
      expect($dummy[0].nodeName).to.be('DIV');
      expect($dummy[1]).to.have.property('nodeName');
      expect($dummy[1].nodeName).to.be('DIV');
      expect($dummy[2]).to.have.property('nodeName');
      expect($dummy[2].nodeName).to.be('DIV');
      expect($dummy[3]).to.have.property('nodeName');
      expect($dummy[3].nodeName).to.be('DIV');
      expect($dummy[4]).to.have.property('nodeName');
      expect($dummy[4].nodeName).to.be('DIV');
    });
    
    it('listen to events', function(done){
      var $dummy = Gnd.$('.test1');
      expect($dummy).to.be.a(Gnd.Query);
      expect($dummy.length).to.be(3);
      var counter = 3;
      var handler = function(evt){
        expect(evt).to.be.an(Object);
        counter --;
        if(counter === 0){
          $dummy.off('click', handler);
          done()
        }
      }
      $dummy.on('click', handler);
      $dummy.trigger('click');
    })
    
    it('set attributes', function(){
      var $dummy = Gnd.$('.test1');
      expect($dummy).to.be.a(Gnd.Query);
      expect($dummy.length).to.be(3);
      
      $dummy.attr('test', 'abcd');
      expect($dummy.attr('test')).to.be('abcd');
    });
    
    it('hide / show elements', function(){
      var $test = Gnd.$('.test1').hide();
      for(var i=0; i<$test.length; i++){
        expect($test[i].style.display).to.be('none');
      }
      $test.show();
      for(var i=0; i<$test.length; i++){
        expect($test[i].style.display).to.be('block');
      }
    });
});

    
});
