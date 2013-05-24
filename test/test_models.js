define(['gnd'], function(Gnd){
"use strict";
  
localStorage.clear();

describe('Model Datatype', function(){
  Gnd.use.syncManager(socket);
  
  var storageQueue;
  
  var Animal = Gnd.Model.extend('animals');
  var animal;
  
  var socket1, sl1, ss1, q1, sm1;
  var socket2, sl2, ss2, q2, sm2;
  
  before(function(done){
    socket1 = io.connect('/', {'force new connection': true});
    sl1  = new Gnd.Storage.Local(new Gnd.Storage.Store.MemoryStore());
    ss1 = new Gnd.Storage.Socket(socket1);
    storageQueue  = q1 = new Gnd.Storage.Queue(sl1, ss1);
    sm1 = new Gnd.Sync.Manager(socket1);
    
    socket1.on('connect', function(){
      socket2 = io.connect('/', {'force new connection': true});
      sl2  = new Gnd.Storage.Local(new Gnd.Storage.Store.MemoryStore());
      ss2 = new Gnd.Storage.Socket(socket2);
      q2  = new Gnd.Storage.Queue(sl2, ss2);
      sm2 = new Gnd.Sync.Manager(socket2);
      
      socket2.on('connect', function(){
        Gnd.using.storageQueue = q1;
        Gnd.using.syncManager = sm1;
  
        Animal.create().then(function(doc){
          animal = doc;
          storageQueue.init(function(){
            storageQueue.exec().then(done);
          });
        });
      });
    });
  });
  
  beforeEach(function(){
    Gnd.Model.__useDepot = true;
    Gnd.using.storageQueue = q1;
    Gnd.using.syncManager = sm1;
  });
  
  describe('Instantiation', function(){
    it('with new operator', function(){
      var instance = new Animal();
      expect(instance).to.be.a(Animal);
    });
    it.skip('as a factory method', function(){
      var instance = Animal.create();
      expect(instance).to.be.a(Animal);
    });
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
      animal.set('name', 'foobar');
      animal.save().then(function(){
        expect(animal).to.have.property('_id');
        expect(animal._id).to.be.eql(animal.id());
      });
      
      storageQueue.waitUntilSynced(function(){
        Animal.findById(animal.id()).then(function(doc){
          expect(doc).to.have.property('_id');
          expect(doc.id()).to.eql(animal.id());
          expect(doc).to.have.property('name');
          expect(doc.name).to.be.eql('foobar');
          doc.release();
          done();
        });
      });
    });
    
    it('another instance propagates changes', function(done){
      
      Gnd.Model.__useDepot = false;
      
      Animal.create({name: 'pinguin', legs: 2}, true).then(function(pinguin){
        pinguin.save();
        
        expect(pinguin).to.have.property('legs');
        expect(pinguin).to.have.property('name');
        expect(pinguin.legs).to.be(2);
         
        pinguin.once('id', function(){
          Gnd.using.storageQueue = q2;
          Gnd.using.syncManager = sm2;
          
          Animal.findById(pinguin.id(), true).then(function(pinguin2){
            expect(pinguin2).to.have.property('legs');
            expect(pinguin2).to.have.property('name');
            expect(pinguin2.legs).to.be(2);
            
            sm2.start(pinguin2.getKeyPath());
          
            pinguin2.once('legs', function(legs){
              expect(pinguin2.legs).to.be(3);
            
              pinguin.on('changed:', function(){
                expect(pinguin.name).to.be('super pinguin');
                expect(pinguin.legs).to.be(2);
              
                expect(pinguin2.name).to.be('super pinguin');
                expect(pinguin2.legs).to.be(2);
              
                pinguin.release();
                pinguin2.release();
                
                done();
              })
            
              pinguin2.set({name:'super pinguin', legs:2});
            })

            pinguin.set('legs', 3);
          });
        });
      });
    });

    it('not propagate changes when enabling nosync', function(done){
 
      Gnd.Model.__useDepot = false;
      
      Animal.create({name: 'pinguin', legs: 2}, true).then(function(pinguin){
        expect(pinguin).to.have.property('legs');
        expect(pinguin).to.have.property('name');
        expect(pinguin.legs).to.be(2);
        
        pinguin.save();
         
        pinguin.once('id', function(){
          Gnd.using.storageQueue = q2;
          Gnd.using.syncManager = sm2;
          
          Animal.findById(pinguin.id(), true).then(function(pinguin2){
            expect(pinguin2).to.have.property('legs');
            expect(pinguin2).to.have.property('name');
            expect(pinguin2.legs).to.be(2);
            
            sm2.start(pinguin2.getKeyPath());
          
            pinguin2.once('legs', function(legs){
              
              pinguin.on('changed:', function(){
                expect(true).to.be(false);
              });
            
              pinguin2.set({name:'super pinguin', legs:2}, {nosync:true});
                
              q2.waitUntilSynced(function(){
                expect(pinguin.name).to.be('pinguin');
                expect(pinguin.legs).to.be(3);
              
                expect(pinguin2.name).to.be('super pinguin');
                expect(pinguin2.legs).to.be(2);
              
                pinguin.release();
                pinguin2.release();
                
                setTimeout(function(){
                  done();
                }, 100);
              })
            })
          
            pinguin.set('legs', 3);
          });
        });
      });
     
    });
    
    it('releasing an instance keeps other synchronized', function(done){
      
      Animal.create({name:'fox', legs:4}, true).then(function(oneFox){   
        oneFox.save();
           
        storageQueue.waitUntilSynced(function(){
          expect(oneFox).to.have.property('_id');
        
          Animal.findById(oneFox.id(), true).then(function(secondFox){
            expect(secondFox).to.have.property('_id');
            expect(secondFox).to.eql(secondFox);
          
            Animal.findById(oneFox.id()).then(function(thirdFox){
              expect(thirdFox).to.have.property('_id', secondFox._id);
              expect(thirdFox).to.have.property('legs', secondFox.legs);
              expect(thirdFox).to.have.property('name', secondFox.name);
            
              thirdFox.keepSynced();
              thirdFox.release();
              secondFox.set('legs', 3);
            });
          });
        });
        
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
      Animal.create({tail:true}, true).then(function(newAnimal){
        newAnimal.save();
        animal = newAnimal;
        storageQueue.exec().then(done)
      });
    });
      
    //
    // Simulate a disconnect in the middle of an emit.
    //
    /*
    it('disconnect', function(done){
      var otherAnimal;
      animal.off();
      
      var orgEmit = socket.emit;
      socket.emit = function(){
        socket.socket.disconnect();
      }

      Animal.findById(animal.id()).then(function(doc){
        expect(doc).to.have.property('_id');
        expect(doc._id).to.eql(animal._id);
        doc.keepSynced();
        doc.set({legs:3});
        otherAnimal = doc;
        
        Animal.findById(animal.id()).then(function(doc){
          expect(doc).to.have.property('legs');
          expect(doc).to.have.property('tail');
          expect(doc.legs).to.be(3);
          socket.emit = orgEmit;
          socket.socket.connect(function(){
            storageQueue.waitUntilSynced(function(){
              expect(storageQueue.isEmpty()).to.be(true);
              done();
            });
          });
        })
      });
    });
    */
    
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
    //  Tests that after doing a findById, the object has been cached and
    //  is available in offline mode.
    //
    it('findById caches object', function(done){
      Animal.create({legs : 8, name:'spider-pig'}, true).then(function(bat){
        socket.disconnect();
      
        Animal.findById(bat.id()).then(function(offlineBat){
          expect(offlineBat).to.be.ok();
          expect(offlineBat.id()).to.be(bat.id());
          socket.socket.connect();
          done();
        })
      });
    });
    
    //
    //  A model is instantiated and keep synced before saving,
    //  as soon as it is saved it should be kept synced with other
    //  instances.
    
    it('keepSynced before save', function(done){
      Animal.create({name: 'elephant', legs:4}, true).then(function(elephant){
        elephant.save();
        
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
        
      }) 
    });
    
    it('keepSynced before save (waiting for sync)', function(done){
      Animal.create({name: 'elephant', legs:4}, true).then(function(elephant){
        elephant.save();
      
        storageQueue.waitUntilSynced(function(){
          expect(elephant._persisted).to.be.ok();
          expect(elephant).to.have.property('_id');
          
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
          //});
          });
        });
      });
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
          Animal.findById(tempAnimal._id).fail(function(err){
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
            
          Animal.findById(spiderPig.id()).fail(function(err){
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
    it.skip('serverside update while offline with multiple instances', function(done){
      // TO IMPLEMENT;
      done();
    });
  });

  describe('Delete', function(){
    it('local delete propagates delete event', function(done){
      Animal.create({legs : 8, name:'spider'}).then(function(tempAnimal){
        tempAnimal.on('deleted:', function(){
          Animal.findById(tempAnimal.id()).fail(function(err){
            expect(err).to.be.ok();
            done();
          });
        });
      
        tempAnimal.remove();
        tempAnimal.release();
      });
    });
    
    it('remote delete propagates delete event', function(done){
      Gnd.Model.__useDepot = false;
      
      Animal.create({legs : 8, name:'spider'}, true).then(function(tempAnimal){
        tempAnimal.save();
        
        tempAnimal.on('deleted:', function(){
          Animal.findById(tempAnimal.id()).fail(function(err){
            expect(err).to.be.ok();
            done();
          });
        });
      
        Gnd.using.storageQueue.waitUntilSynced(function(){
          Gnd.using.storageQueue = q2;
          Gnd.using.syncManager = sm2;
          
          Animal.findById(tempAnimal.id(), true).then(function(spider){
            sm2.start(spider.getKeyPath());
            
            spider.remove();
          });
        });
      });
    });
  });
  
  
});



}); // define



