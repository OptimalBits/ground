define(['gnd'], function(Gnd){
"use strict";
  
localStorage.clear();

describe('Model', function(){
  Gnd.use.syncManager(socket);
  
  var storageQueue;
  
  var Animal = Gnd.Model.extend('animals');
  var animal;
  
  before(function(done){
    var storageLocal  = new Gnd.Storage.Local();
    var storageSocket = new Gnd.Storage.Socket(socket);
    
    Gnd.use.storageQueue(storageLocal, storageSocket);
  
    animal = new Animal();
    
    storageQueue = Gnd.using.storageQueue;
    
    storageQueue.init(function(){
      animal.save();
      storageQueue.exec().then(done);
    });
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
      Animal.findById(animal.id()).then(function(doc){
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
        Animal.findById(animal.id()).then(function(doc){
          expect(doc).to.have.property('_id');
          expect(doc.id()).to.eql(animal.id());
          expect(doc).to.have.property('name');
          expect(doc.name).to.be.eql('foobar');
          doc.release();
          done();
        });
      });
      
      animal.set('name', 'foobar');
      animal.save().then(function(){
        expect(animal).to.have.property('_id');
        expect(animal._id).to.be.eql(animal.id());
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

      Animal.findById(animal.id()).then(function(doc){
        expect(doc).to.have.property('_id');
        expect(doc.id()).to.eql(animal.id());
        doc.keepSynced();
        otherAnimal = doc;
        doc.set({legs:4, tail:true});
      });
    });
    
    it('releasing an instance keeps other synchronized', function(done){
      
      var oneFox = new Animal({name:'fox', legs:4});
      storageQueue.once('synced:', function(){
        expect(oneFox).to.have.property('_id');
        
        Animal.findById(oneFox._id).then(function(secondFox){
          expect(secondFox).to.have.property('_id');
          expect(secondFox).to.eql(secondFox);
          
          secondFox.keepSynced();
          
          Animal.findById(oneFox._id).then(function(thirdFox){
            expect(thirdFox).to.have.property('_id', secondFox._id);
            expect(thirdFox).to.have.property('legs', secondFox.legs);
            expect(thirdFox).to.have.property('name', secondFox.name);
            
            thirdFox.keepSynced();
            thirdFox.release();
            secondFox.set('legs', 3);
          });
        });
      });
      
      oneFox.save().then(function(){
        oneFox.keepSynced();
        
        oneFox.once('changed:', function(){
          done();
        });
      });
      
    });
  });

  describe('Offline', function(){
    var animal;
    
    before(function(){
      socket.on('connect', storageQueue.syncFn);
    });
    
    beforeEach(function(done){
      animal = new Animal({tail:true});
      animal.keepSynced();
      animal.save();
      storageQueue.exec().then(done)
    });
      
    //
    // Simulate a disconnect in the middle of an emit.
    //
    it.skip('disconnect', function(done){
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
            storageQueue.once('synced:', function(){
              expect(storageQueue.isEmpty()).to.be(true);
              done();
            });
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
        Animal.findById(tempAnimal.id()).then(function(doc){
          expect(tempAnimal._id).to.be(doc._id);
          expect(tempAnimal2._id).to.be(doc._id);
          expect(doc.legs).to.be(8);
          expect(storageQueue.isEmpty()).to.be(true);
          done();
        });
      });

      tempAnimal.set({legs : 8, name:'gorilla'});
      tempAnimal.save().then(function(){
        tempAnimal.keepSynced();
        
        Animal.findById(tempAnimal.id()).then(function(doc){
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
      var elephant = new Animal({name: 'elephant', legs:4});
      elephant.keepSynced();
      elephant.save(function(err){
        expect(err).to.not.be.ok();
      });
      
      Animal.findById(elephant.id(), true).then(function(otherElephant){
        expect(otherElephant).to.be.ok();
        expect(otherElephant).to.be(elephant);
          
        elephant.once('changed:', function(doc){
          expect(elephant.legs).to.be(5);
          elephant.release();
          otherElephant.release();
          done();
        });
          
        otherElephant.set('legs', 5);
      });
    });
    
    it('keepSynced before save (waiting for sync)', function(done){
      var elephant = new Animal({name: 'elephant', legs:4});
      elephant.keepSynced();
      elephant.save();
      
      storageQueue.once('synced:', function(){
        expect(elephant._persisted).to.be.ok();
        expect(elephant).to.have.property('_id');
        Animal.findById(elephant._id, true).then(function(otherElephant){
          expect(otherElephant).to.be.ok();
          expect(otherElephant).to.be(elephant);
          
          //otherElephant.on('resynced:', function(){
          elephant.once('changed:', function(doc){
            expect(elephant.legs).to.be(5);
            elephant.release();
            otherElephant.release();
            done();
          });
          
          otherElephant.set('legs', 5);
          //});
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
      
      tempAnimal.save().then(function(){
        tempAnimal.keepSynced();
      });
      
      storageQueue.once('synced:', function(){
        expect(tempAnimal).to.have.property('_id');
        
        socket.disconnect();
        tempAnimal.remove().then(function(){
          socket.socket.connect();              
        });
        
        storageQueue.once('synced:', function(){
          Animal.findById(tempAnimal._id).error(function(err, doc){
            expect(err).to.be.an(Error);
            done();
          });
        });
      });
      
    });
    
    it('delete a model deletes it also from local cache', function(done){
      var spiderPig = new Animal();
      spiderPig.set({legs : 8, name:'spider-pig'});
      
      spiderPig.save().then(function(){
        spiderPig.keepSynced();
      });
          
      storageQueue.once('synced:', function(){
        expect(spiderPig).to.have.property('_id');
        
        spiderPig.remove().then(function(){
          
          socket.disconnect();
            
          Animal.findById(spiderPig.id()).error(function(err){
            expect(err).to.be.an(Error);

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
    it.skip('serverside delete while offline', function(done){
      // TO IMPLEMENT;
      done();
    });
    
    //
    // A model updated in the server while being offline gets
    // updated as soon as we get online.
    // (Note: we do not handle conflicts yet).
    //
    it.skip('serverside update while offline', function(done){
      var tempAnimal = new Animal();
      tempAnimal.set({legs : 8, name:'spider'});
      tempAnimal.keepSynced();
      tempAnimal.save();
      
      storageQueue.waitUntilSynced(function(){
        var obj = {legs:7};
        Gnd.Ajax.put('/animals/'+tempAnimal.id(), obj).then(function(){
          socket.socket.disconnect();
          socket.socket.connect();
          
          storageQueue.waitUntilSynced(function(){
            Animal.findById(tempAnimal.id()).then(function(doc){
              doc.on('changed:', function(){
                expect(doc.legs).to.be(7);
                done();
              });
              // This case will be worked-out later...
              // expect(tempAnimal.legs).to.be(7);
            });
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
        Animal.findById(tempAnimal.id()).error(function(err){
          expect(err).to.be.ok();
          done();
        });
      });
      
      tempAnimal.remove().then(function(){

      });
    });
  });
});



}); // define



