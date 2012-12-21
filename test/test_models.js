define(['gnd', 'jquery'],
  function(Gnd, $){
  
localStorage.clear();

describe('Model', function(){
  var storageLocal  = new Gnd.Storage.Local();
  var storageSocket = new Gnd.Storage.Socket(socket);
  var storageQueue  = new Gnd.Storage.Queue(storageLocal, storageSocket);

  var syncManager = new Gnd.Sync.Manager(socket);
  
  var Animal = Gnd.Model.extend('animals');
  var animal = new Animal();
  
  before(function(done){
    Gnd.Model.storageQueue = storageQueue;
    Gnd.Model.syncManager = syncManager;
    
    storageQueue.init(function(){
      animal.save();
      storageQueue.once('synced:', function(){
        done();
      })
    })
  });
  
  describe('Instantiation', function(){
    it('with new operator', function(){
      var instance = new Animal();
      expect(instance).to.be.a(Animal);
    });
    /*
    it('as a factory method', function(){
      var instance = Animal();
      expect(instance).to.be.a(Animal);
    });*/
  });
  
  describe('findById', function(){
    it('finds the animal', function(done){
      Animal.findById(animal.id(), function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc).to.be.ok();
        expect(doc.id()).to.equal(animal.id());
        doc.release();
        done();
      });
    });
  });
  
  describe('Update', function(){
    it('updates the server model', function(done){
      storageQueue.once('synced:', function(){
        Animal.findById(animal.id(), function(err, doc){
          expect(err).to.not.be.ok();
          expect(doc).to.have.property('_id');
          expect(doc.id()).to.eql(animal.id());
          expect(doc).to.have.property('name');
          expect(doc.name).to.be.eql('foobar');
          doc.release();
          done();
        });
      })
      
      animal.set('name', 'foobar');
      animal.save(function(err){
        expect(err).to.not.be.ok();
        expect(animal).to.have.property('_id');
        expect(animal._id).to.be.eql(animal.id())
      });
    });
    
    it('another instance propagates changes', function(done){
      var otherAnimal;
      
      animal.keepSynced();
      animal.once('changed:', function(){
        expect(animal).to.have.property('legs');
        expect(animal).to.have.property('tail');
        expect(animal.legs).to.be(4);
        expect(animal.tail).to.be(true);
        otherAnimal.release();
        done();
      });

      Animal.findById(animal.id(), function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc).to.have.property('_id');
        expect(doc.id()).to.eql(animal.id());
        doc.keepSynced();
        doc.set({legs:4, tail:true});
        otherAnimal = doc;
      });
    });
    
    it('releasing an instance keeps other synchronized', function(done){
      
      var oneFox = new Animal({name:'fox', legs:4});
      storageQueue.once('synced:', function(){
        expect(oneFox).to.have.property('_id');
        
        Animal.findById(oneFox._id, function(err, secondFox){
          expect(err).to.not.be.ok();
          expect(secondFox).to.have.property('_id');
          expect(secondFox).to.eql(secondFox);
          
          secondFox.keepSynced();
          
          Animal.findById(oneFox._id, function(err, thirdFox){
            expect(err).to.not.be.ok();
            expect(thirdFox).to.have.property('_id', secondFox._id);
            expect(thirdFox).to.have.property('legs', secondFox.legs);
            expect(thirdFox).to.have.property('name', secondFox.name);
            
            thirdFox.keepSynced();
            
            thirdFox.on('destroy:', function(){
              secondFox.set('legs', 3);
            });
            
            thirdFox.release();
          });
        });
      });
      
      oneFox.save(function(err){
        expect(err).to.not.be.ok();
        oneFox.keepSynced();
        
        oneFox.once('changed:', function(){  
          done();
        });
      });
      
    });
  });
  /*
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
  */
  describe('Offline', function(){
    var animal = new Animal({tail:true});
    
    before(function(done){
      socket.on('connect', storageQueue.syncFn);
      animal.save();
      animal.keepSynced();
      storageQueue.once('synced:', function(){
        done();
      });
    });
  
    //
    // Simulate a disconnect in the middle of an emit.
    //
    it('disconnect', function(done){
      var otherAnimal;
      animal.off();
      
      var orgEmit = socket.emit;
      socket.emit = function(){
        socket.socket.disconnect();
      }

      Animal.findById(animal.id(), function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc).to.have.property('_id');
        expect(doc._id).to.eql(animal._id);
        doc.keepSynced();
        doc.set({legs:3});
        otherAnimal = doc;
        
        Animal.findById(animal.id(), function(err, doc){
          expect(err).to.not.be.ok();
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
    
    //
    //  Creates a model while offline automatically creates it when 
    //  going back to online.
    //
    it('create', function(done){
      socket.disconnect();

      var tempAnimal = new Animal(), tempAnimal2;
            
      storageQueue.once('synced:', function(){
        Animal.findById(tempAnimal.id(), function(err, doc){
          expect(tempAnimal._id).to.be(doc._id);
          expect(tempAnimal2._id).to.be(doc._id);
          expect(err).to.not.be.ok();
          expect(doc.legs).to.be(8);
          done();
        });
      });

      tempAnimal.set({legs : 8, name:'gorilla'});
      tempAnimal.save(function(err){
        expect(err).to.not.be.ok()
        tempAnimal.keepSynced();
        
        Animal.findById(tempAnimal.id(), function(err, doc){
          tempAnimal2 = doc;
          tempAnimal2.keepSynced();
          socket.socket.connect();           
        });
      });
    });
    
    //
    //  A model is instantiated and keep synced before saving,
    //  as soon as it is saved it should be kept synced with other
    //  instances.
    
    it('keepSynced before save', function(done){
      var elephant = new Animal({legs:4});
      elephant.keepSynced();
      elephant.save(function(err){
        expect(err).to.not.be.ok();
      });
      
      storageQueue.once('synced:', function(){
        expect(elephant._persisted).to.be.ok();
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
    
    //
    //  Tests that after doing a findById, the object has been cached and 
    //  is available in offline mode.
    //
    it('findById caches object', function(){
      // TO IMPLEMENT: This case 
    });

    //
    //  Deletes a model while offline, the model is deleted in the server
    //  as soon as we are back online.
    //
    it('delete', function(done){
      var tempAnimal = new Animal();
      tempAnimal.set({legs : 8, name:'spider-pig'});
      
      tempAnimal.save(function(err){
        expect(err).to.not.be.ok();
        tempAnimal.keepSynced();
      });
      
      storageQueue.once('synced:', function(){
        expect(tempAnimal).to.have.property('_id');
        
        socket.disconnect();
        tempAnimal.delete(function(){
          socket.socket.connect();              
        });
        
        storageQueue.once('synced:', function(){
          Animal.findById(tempAnimal._id, function(err, doc){
            expect(err).to.be.an(Error);
            done();
          });
        });
      });
      
    });
    
    it('delete a model deletes it also from local cache', function(done){
      var spiderPig = new Animal();
      spiderPig.set({legs : 8, name:'spider-pig'});
      
      spiderPig.save(function(err){
        expect(err).to.not.be.ok();
        spiderPig.keepSynced();
      });
          
      storageQueue.once('synced:', function(){
        expect(spiderPig).to.have.property('_id');
        
        spiderPig.delete(function(err){
          expect(err).to.not.be.ok();
          
          socket.disconnect();
            
          Animal.findById(spiderPig.id(), function(err, doc){
            expect(err).to.be.an(Error);
            expect(doc).to.not.be.ok();

            socket.socket.connect();
            socket.once('connect', done);
          });
        });
      });
    });
    
    //
    //  A model is deleted while being offline, as soon as we get back
    //  online the client must delete the object.
    //
    it('serverside delete while offline', function(done){
      // TO IMPLEMENT;
      done();
    });
    
    //
    // A model updated in the server while being offline gets 
    // updated as soon as we get online.
    // (Note: we do not handle conflicts yet).
    //
    it('serverside update while offline', function(done){
      var tempAnimal = new Animal();
      tempAnimal.set({legs : 8, name:'spider'});
      tempAnimal.save(function(){
        tempAnimal.keepSynced();
      });
      
      storageQueue.once('synced:', function(){
        var obj = {legs:7}
        Gnd.Util.ajax.put('http://localhost:8080/animals/'+tempAnimal.id(), obj, function(err, res) { 
          socket.socket.disconnect();
          socket.socket.connect();
        });
        
        storageQueue.once('synced:', function(){
          Animal.findById(tempAnimal._id, function(err, doc){
            expect(doc.legs).to.be(7);
            // This case will be worked-out later...
            // expect(tempAnimal.legs).to.be(7);
            done();    
          });
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
      var tempAnimal = new Animal();
      tempAnimal.set({legs : 8, name:'spider'});
      
      tempAnimal.on('deleted:', function(){
        Animal.findById(tempAnimal.id(), function(err, res){
          expect(err).to.be.ok();
          expect(res).to.not.be.ok();
          done();
        });
      });
      
      tempAnimal.delete(function(err){
        expect(err).to.not.be.ok();
      });
    });
  });
});



}); // define



