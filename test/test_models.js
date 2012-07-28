define(['ginger'], function(ginger){

ginger.Model.set('socket', socket);

var Animal = ginger.Model.extend();
Animal.bucket('animals');
Animal.use('transport', 'socket');

describe('Model', function(){
  var animal = new Animal();
  
  before(function(done){  
    animal.save(function(){
      animal.keepSynced();
      done();
    });
  });
  
  describe('Instantiation', function(){
    it('with new operator', function(){
      var instance = new Animal();
      expect(instance).to.be.a(Animal);
    });
    
    it('as a factory method', function(){
      var instance = Animal();
      expect(instance).to.be.a(Animal);
    });
  });
  
  describe('findById', function(){
    it('finds the animal', function(done){
      Animal.findById(animal.cid, function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc.cid).to.eql(animal.cid);
        doc.release();
        done();
      });
    });
  });
  describe('Update', function(){
    it('updates the server model', function(done){
      animal.set('name', 'foobar');
      animal.save(function(err){
        expect(err).to.not.be.ok();
        expect(animal).to.have.property('_id');
        Animal.findById(animal._id, function(err, doc){
          expect(err).to.not.be.ok();
          expect(doc).to.have.property('_id');
          expect(doc._id).to.eql(animal._id);
          expect(doc).to.have.property('name');
          expect(doc.name).to.be.eql('foobar');
          doc.release();
          done();
        });
      });
    });
    it('another instance propagates changes', function(done){
      var otherAnimal;

      animal.once('changed:', function(){
        expect(animal).to.have.property('legs');
        expect(animal).to.have.property('tail');
        expect(animal.legs).to.be(4);
        expect(animal.tail).to.be(true);
        otherAnimal.release();
        done();
      });

      Animal.findById(animal._id, function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc).to.have.property('_id');
        expect(doc._id).to.eql(animal._id);
        doc.keepSynced();
        doc.set({legs:4, tail:true});
        otherAnimal = doc;
      });
    });
    
    it('releasing an instance keeps other synchronized', function(done){
      var oneFox = new Animal({name:'fox', legs:4});
      oneFox.save(function(err){
        expect(err).to.not.be.ok();
        expect(oneFox).to.have.property('_id');
        oneFox.keepSynced();
        
        oneFox.once('changed:', function(){  
          done();
        });
            
        Animal.findById(oneFox._id, function(err, secondFox){
          expect(err).to.not.be.ok();
          expect(secondFox).to.have.property('_id');
          expect(secondFox).to.eql(secondFox);
          
          secondFox.keepSynced();
          
          Animal.findById(oneFox._id, function(err, thirdFox){
            expect(err).to.not.be.ok();
            expect(secondFox).to.have.property('_id');
            expect(secondFox).to.eql(secondFox);
            
            thirdFox.keepSynced();
            
            thirdFox.on('destroy:', function(){
              secondFox.set('legs', 3);
            });
            
            thirdFox.release();
          });
        });
      });
    });
  });
  
  describe('Fetch', function(){
    var dolphin, whale, shark;
    
    before(function(done){
      dolphin = new Animal({name:'dolphin'});
      dolphin.save(function(err){
        whale = new Animal({name:'whale'});
        whale.save(function(err){
          shark = new Animal({name:'shark'});
          shark.save(function(err){
            done();  
          });
        });  
      });
    });
    
    it('all instances of a model', function(done){
      Animal.fetch(function(err, animals){
        expect(err).not.to.be.ok();
        expect(animals).to.be.an(Array);
        done();
      })
    });
  });
  
  describe('Offline', function(){
    var animal = new Animal({tail:true});
    
    before(function(done){  
      animal.save(function(){
        animal.keepSynced();
        done()
      });
    });
  
    //
    // Simulate a disconnect in the middle of an emit.
    //
    it('disconnect', function(done){
      var otherAnimal;
      animal.off();
      
      var orgEmit = socket.emit
      socket.emit = function(){
        socket.socket.disconnect();
      }

      Animal.findById(animal._id, function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc).to.have.property('_id');
        expect(doc._id).to.eql(animal._id);
        doc.keepSynced();
        doc.set({legs:3});
        otherAnimal = doc;
        
        Animal.findById(animal._id, function(err, doc){
          expect(doc).to.have.property('legs');
          expect(doc).to.have.property('tail');
          expect(doc.legs).to.be(3);
          socket.emit = orgEmit;
          socket.socket.connect(function(){
            done();  
          });
        });
      });
    });
    
    /**
      Creates a model while offline automatically creates it when 
      going back to online.
    */
    it('create', function(done){
      socket.disconnect();

      var tempAnimal = new Animal(), tempAnimal2;
      
      ginger.once('inSync:', function(){
        Animal.findById(tempAnimal._id, function(err, doc){
          expect(tempAnimal._id).to.be(doc._id);
          expect(tempAnimal2._id).to.be(doc._id);
          expect(err).to.not.be.ok();
          expect(doc.legs).to.be(8);
          done();
        });
      });

      tempAnimal.set({legs : 8, name:'spider'});
      tempAnimal.save(function(err){
        expect(err).to.not.be.ok()
        tempAnimal.keepSynced();
        Animal.findById(tempAnimal.cid, function(err, doc){
          tempAnimal2 = doc;
          tempAnimal2.keepSynced();
          socket.socket.connect();           
        });
      });
    });
    
    /**
      A model is instantiated and keep synced before saving,
      as soon as it is saved it should be kept synced with other
      instances.
    */
    it('keepSynced before save', function(done){
      var elephant = new Animal({legs:4});
      elephant.keepSynced();
      elephant.save(function(err){
        expect(err).to.not.be.ok();
        expect(elephant.__persisted).to.be.ok();
        expect(elephant).to.have.property('_id');
        Animal.findById(elephant._id, function(err, otherElephant){
          expect(err).to.not.be.ok()
          expect(otherElephant).to.be.ok();
          
          otherElephant.keepSynced();
          
          elephant.once('changed:', function(doc){
            expect(elephant.legs).to.be(5);
            elephant.release();
            otherElephant.release();
            done();
          });
          
          otherElephant.set('legs', 5);
        });
      });
    });
    
    /**
      Tests that after doing a findById, the object has been cached and 
      is available in offline mode.
    */
    it('findById caches object', function(){
      // TO IMPLEMENT: This case 
    });

    /**
      Deletes a model while offline, the model is deleted in the server
      as soon as we are back online.
    */
    it('delete', function(done){
      var tempAnimal = new Animal();
      tempAnimal.set({legs : 8, name:'spider-pig'});

      ginger.once('inSync:', function(){
        Animal.findById(tempAnimal._id, function(err, doc){
          expect(err).to.be.an(Error);
          done();
        });
      });

      tempAnimal.save(function(){
        tempAnimal.keepSynced();
        expect(tempAnimal).to.have.property('_id');
        socket.disconnect();
        tempAnimal.delete(function(){
          socket.socket.connect();              
        });
      });
    });
    
    it('delete a model deletes it also from local cache', function(done){
      var spiderPig = new Animal();
      spiderPig.set({legs : 8, name:'spider-pig'});
      
      spiderPig.save(function(err){
        expect(err).to.not.be.ok();
        expect(spiderPig).to.have.property('_id');
        spiderPig.keepSynced();
          
        spiderPig.delete(function(err){
          expect(err).to.not.be.ok();
          
          socket.disconnect();
            
          Animal.findById(spiderPig.id(), function(err, doc){
            expect(doc).to.not.be.ok();
          
            socket.socket.connect();
            socket.once('connect', done);
          });
        });
      });
    });
    
    /**
      A model updated in the server while being offline gets 
      updated as soon as we get online.
      (Note: we do not handle conflicts yet).
    */
    it('serverside update while offline', function(done){
      var tempAnimal = new Animal();
      tempAnimal.set({legs : 8, name:'spider'});
      tempAnimal.save(function(){
        tempAnimal.keepSynced();
        
        ginger.once('sync:'+tempAnimal._id, function(){
          Animal.findById(tempAnimal._id, function(err, doc){
            expect(tempAnimal.legs).to.be(7);
            done();    
          });
        });

        var obj = {legs:7}
        ginger.ajax.put('http://localhost:8080/animals/'+tempAnimal._id,obj, function(err, res) { 
          socket.socket.disconnect();
          socket.socket.connect();
        });
      });
    });
    it('serverside update while offline with multiple instances', function(done){
      // TO IMPLEMENT;
      done();
    });
  });

  describe('Delete', function(){
    it('deletes and propagates delete event', function(done){
      animal.delete(function(err){
        expect(err).to.not.be.ok();
      });
        
      animal.on('deleted:', function(){
        Animal.findById(animal.cid, function(err, res){
          expect(err).to.be.ok();
          expect(res).to.not.be.ok();
          done();
        });
      });
    });
  });

});



}); // define



