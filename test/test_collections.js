define(['util', 'local', 'socket', 'storage', 'base', 'model', 'sync', 'collection'],
  function(Util, Local, Socket, Storage, Base, Model, Sync, Collection){

localStorage.clear();

var storageLocal  = new Local.Local();
var storageSocket = new Socket.Socket(socket);
var storageQueue  = new Storage.Queue(storageLocal, storageSocket);

var syncManager = new Sync.Manager(socket);

Model.Model.storageQueue = storageQueue;
Model.Model.syncManager = syncManager;

var Animal = Model.Model.extend('animals');
var animal = new Animal();

var Zoo, zoo;
Zoo = Model.Model.extend('zoo');
  
before(function(done){
  storageQueue.init(function(){
    zoo = new Zoo();
    zoo.keepSynced();
    
    animal.save();
    zoo.save();
    
    storageQueue.once('synced:', function(){
      done();
    })
  })
});

describe('Collections', function(){
  describe('Creation', function(){ 
    it('save to server', function(done){
      var zoo = new Zoo();
      
      zoo.save(function(err){
        expect(err).to.not.be.ok();
        zoo.all(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          animals.release();
          done();
        });
      });
    });
  });

  describe('Addition', function(){
    it('add item to collection', function(done){      
      zoo.all(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
            
        animals.add(new Animal({name:"tiger"}), function(err){
          expect(err).to.not.be.ok();
          storageQueue.once('synced:', function(){
            Zoo.findById(zoo.id(), function(err, doc){
              expect(err).to.not.be.ok();
              expect(doc).to.be.an(Object);
              doc.all(Animal, function(err, collection){
                expect(err).to.not.be.ok();
                expect(collection).to.be.an(Object);
                expect(collection.items).to.be.an(Array);
                expect(collection.items.length).to.be(1);
                expect(animals.items.length).to.be(1);
                doc.release();
                collection.release();
                animals.release();
                done();
              });
            });
          })
        });
      });
    });
  
    it('add item to collection propagates to other collections', function(done){
      Zoo.findById(zoo.id(), function(err, mirrorZoo){
        mirrorZoo.keepSynced();
      
        zoo.all(Animal, function(err, animals){
          expect(animals).to.be.an(Object);
          animals.on('added:', function(instance){
            expect(instance).to.have.property('name');
            expect(instance.name).to.be.eql('fox');
            expect(animals.items.length).to.be(2);
            expect(animals.find(function(item){ return item.name==='tiger'})).to.be.an(Object);

            animals.release();
            mirrorZoo.release();
            done();
          });

          mirrorZoo.all(Animal, function(err, animals){
            expect(err).to.not.be.ok();
            expect(animals).to.be.an(Object);
            var fox = new Animal({name:'fox'});
            animals.add(fox, function(err){
              expect(err).to.not.be.ok();
              animals.release();
            })
            fox.release();
          });
        });  
      });
    });
  });

  describe('Updating', function(){
    it('update item propagates to the same item in a collection', function(done){
      Zoo.findById(zoo.id(), function(err, zoo){
        var testAnimal;

        expect(err).to.eql(null);
        expect(zoo).to.not.be(undefined);
      
        zoo.keepSynced();
                
        zoo.all(Animal, function(err, animals){
          
          animals.add(new Animal({name:"leopard"}), function(err){

            var leopard = animals.find(function(item){ return item.name==='leopard'});

            expect(leopard).to.be.an(Object);
            expect(leopard.name).to.be.eql('leopard');
        
            leopard.on('changed:', function(args){
              expect(args).to.be.an(Object);
              expect(args.legs).to.be(5);
              animals.release();
              zoo.release();
              testAnimal.release();
              done();
            });
        
            storageQueue.once('synced:', function(){
              Animal.findById(leopard.id(), function(err, animal){
                expect(err).to.not.be.ok();
                animal.keepSynced();
                animal.set('legs', 5);
                testAnimal = animal;
              });
            });
          });
        });
      });
    });
  
    it('collection proxies add item event', function(done){
      Zoo.findById(zoo.id(), function(err, zoo){
        var testAnimal;

        expect(err).to.not.be.ok();
        expect(zoo).to.not.be(undefined);
      
        zoo.keepSynced();
                
        zoo.all(Animal, function(err, animals){
          
          animals.add(new Animal({name:"panther"}), function(err){

            var panther = animals.find(function(item){ return item.name==='panther'});

            expect(panther).to.be.an(Object);
            expect(panther.name).to.be.eql('panther');
        
            animals.on('updated:', function(model, args){
              expect(args).to.be.an(Object);
              expect(args.legs).to.be(5);
              animals.release();
              zoo.release();
              testAnimal.release();
              done();
            });
        
            storageQueue.once('synced:', function(){
              Animal.findById(panther.id(), function(err, animal){
                expect(err).to.not.be.ok();
                animal.keepSynced();
                animal.set('legs', 5);
                testAnimal = animal;
              });
            });
          });
        });
      });
    });
  });
  describe('Remove', function(){
    it('remove item from collection', function(done){
      Zoo.findById(zoo.id(), function(err, zoo){
        zoo.keepSynced();
        
        zoo.all(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          
          animals.add(new Animal({name:"gorilla"}), function(err){   
            expect(err).to.not.be.ok();
          
            var animal = animals.first();
            expect(animal).to.be.an(Object);
            animals.remove(animal.id());
                    
            var found = animals.find(function(item){return item.id() === animal.id()});
            expect(found).to.be(undefined);
          
            animals.save(function(err){
              expect(err).to.not.be.ok();
              
              zoo.all(Animal, function(err, otherAnimals){
                expect(err).to.not.be.ok();
                expect(otherAnimals).to.be.an(Object);

                var found = otherAnimals.find(function(item){return item.id() === animal.id()});
                expect(found).to.be(undefined);
                zoo.release();
                otherAnimals.release();
                animals.release();
                expect(otherAnimals.isDestroyed()).to.be(true);
                expect(animals.isDestroyed()).to.be(true);
                done();
              });
            });
          });
        });
      });
    });
    
    it('collection  proxies delete item event', function(done){
      Zoo.findById(zoo.id(), function(err, zoo){
        zoo.keepSynced();
        
        zoo.all(Animal, function(err, animals){
          var otherAnimal;
          
          animals.add(new Animal({name:"koala"}), function(err){   
            expect(err).to.not.be.ok();
          
            animals.on('removed:', function(item){
              expect(item).to.be.an(Object);
              expect(item).to.have.property('_id');
              expect(item.id()).to.be.eql(otherAnimal.id());
              animals.release();
              zoo.release();
              done();
            });

            Zoo.findById(zoo.id(), function(err, anotherZoo){
              expect(err).to.not.be.ok();
              expect(anotherZoo).to.be.an(Object);
              
              anotherZoo.keepSynced();
              anotherZoo.all(Animal, function(err, otherAnimals){
                expect(err).to.not.be.ok()
                expect(otherAnimals).to.be.an(Object);
                
                otherAnimal = otherAnimals.first();
                otherAnimal.delete(function(err){
                  expect(err).to.not.be.ok();
                  otherAnimals.release();
                });
              });
            });
          });
        });
      });
    });
  
    it('remove item with collections', function(done){
      done();
    });
  });
  
  describe('Delete', function(){
    it('delete item that is part of a collection', function(done){
      Zoo.findById(zoo.id(), function(err, zoo){
        zoo.keepSynced();
        zoo.all(Animal, function(err, animals){
          var tiger = new Animal({name:"tiger"});
          animals.once('removed:', function(item){
            expect(item).to.be.eql(tiger);
            done();
          });
          
          animals.add(tiger, function(err){
            tiger.delete();
          });
        });
      });
    });
  });

  describe('Offline', function(){
    if('find items are cached', function(done){
      // IMPLEMENT: Items that are "finded" from the server should be
      // cached for offline usage.
      done();    
    });
  
    it('add item to collection being offline', function(done){
      var zoo = new Zoo();
      zoo.keepSynced();
      
      zoo.save(function(err){
        expect(err).to.not.be.ok();
        zoo.all(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          
          socket.disconnect();
          
          animals.add(new Animal({name:"tiger"}), function(err){
            expect(err).to.not.be.ok();
            
            Zoo.findById(zoo.id(), function(err, sameZoo){
              expect(err).to.not.be.ok();
              expect(sameZoo).to.be.an(Object);
              
              storageQueue.once('synced:', function(){
                // Check that the collection has been synced in server.
                sameZoo.all(Animal, function(err, collection){
                  
                  
                  expect(err).to.be(null);
                  expect(collection).to.be.an(Object);
                  expect(collection.items).to.be.an(Array);
                  expect(animals.items.length).to.be(1);
                  expect(collection.items.length).to.be(1);
                  Util.release(sameZoo, collection, animals);
                  done();
                });
              });
              
              // Check that the collection is available locally.              
              sameZoo.all(Animal, function(err, collection){
                expect(err).to.not.be.ok();
                expect(collection).to.be.an(Object);
                expect(collection.items).to.be.an(Array);
                expect(collection.items.length).to.be(1);
                expect(animals.items.length).to.be(1);
                collection.release();
                socket.socket.reconnect();
              });
            });
          });
        });
      });
    });

    it('add item to collection being offline 2', function(done){
      var zoo = new Zoo({name:'add item test 2'});
      zoo.keepSynced();
      zoo.save(function(err){
        socket.disconnect();
        zoo.all(Animal, function(err, animals){
          expect(err).to.be(null);
          expect(animals).to.be.an(Object);
          
          animals.add(new Animal({name:"tiger"}), function(err){
            expect(err).to.be(null);
            Zoo.findById(zoo.id(), function(err, doc){
              expect(err).to.be(null);
              expect(doc).to.be.an(Object);
              storageQueue.once('synced:', function(){
                doc.all(Animal, function(err, collection){
                  expect(err).to.be(null);
                  expect(collection).to.be.an(Object);
                  expect(collection.items).to.be.an(Array);
                  expect(collection.items.length).to.be(1);
                  expect(animals.items.length).to.be(1);
                  doc.release();
                  collection.release();
                  animals.release();
                  done();
                });
              });

              doc.all(Animal, function(err, collection){
                expect(err).to.be(null);
                expect(collection).to.be.an(Object);
                expect(collection.items).to.be.an(Array);
                expect(collection.items.length).to.be(1);
                expect(animals.items.length).to.be(1);
                collection.release();
                socket.socket.connect();
              });
            });
          });
        });
      });
    });
    
    it('remove item while offline', function(done){
      var zoo = new Zoo({name:'remove item offline'});
      zoo.keepSynced();
      zoo.save(function(err){
        expect(err).not.to.be.ok();
        
        zoo.all(Animal, function(err, animals){
          expect(err).not.to.be.ok();
          expect(animals).to.be.an(Object);
          
          animals.add(new Animal({name:"lion"}), function(err){
            expect(err).not.to.be.ok();
            expect(animals.items.length).to.be(1);
            
            socket.disconnect();
            
            animals.remove(animals.first().cid, function(err){
              expect(err).not.to.be.ok();
              expect(animals.items.length).to.be(0);

              Zoo.findById(zoo.id(), function(err, sameZoo){
                expect(err).to.not.be.ok();
                expect(sameZoo).to.be.an(Object);
                
                storageQueue.once('synced:', function(){
                  sameZoo.all(Animal, function(err, collection){
                    expect(err).not.to.be.ok();
                    expect(collection).to.be.an(Object);
                    expect(collection.items).to.be.an(Array);
                    expect(collection.items.length).to.be(0);
                    
                    // This fails because animals gets an add: event from the server
                    // which is a mirror of the add: event created by animals just before
                    // disconnecting...
                    //expect(animals.items.length).to.be(0);
                    sameZoo.release();
                    collection.release();
                    animals.release();
                    done();
                  });
                });
                
                sameZoo.all(Animal, function(err, collection){
                  expect(err).not.to.be.ok();
                  expect(collection).to.be.an(Object);
                  expect(collection.items).to.be.an(Array);
                  expect(collection.items.length).to.be(0);
                  socket.socket.connect();
                });
              });
            });
          });
        });
      });
    });
    it('add item to collection online is available offline', function(done){
      var zoo = new Zoo({name:'add item test 2'});
      zoo.keepSynced();
      zoo.save(function(err){
        zoo.all(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          var tiger = new Animal({name:"tiger"});
          animals.add(tiger, function(err){
            expect(err).to.not.be.ok();
          
            socket.disconnect();
            
            zoo.all(Animal, function(err, offlineAnimals){
              expect(err).to.not.be.ok();
              expect(offlineAnimals).to.be.an(Object);
              
              var offlineTiger = offlineAnimals.first();
              
              expect(offlineTiger).to.be.an(Object);
              expect(offlineTiger.id()).to.be.equal(tiger.id());
              socket.socket.connect();
              socket.once('connect', done);
            });
          });
        });
      });
    });
    
    /**
      An item is added from a collection on the server, when we come back online 
      the local cache should be updated with the removed item.
    */
    it('serverside add item while offline', function(done){
      // TO IMPLEMENT;
      done();
    });
    
    it('removed item from collection online is not available offline', function(done){
      var zoo = new Zoo({name:'remove item not available offline'});
      zoo.keepSynced();
      zoo.save(function(err){
        zoo.all(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          var tiger = new Animal({name:"tiger"});
          animals.add(tiger, function(err){
            expect(err).to.not.be.ok();
            
            zoo.all(Animal, function(err, onlineAnimals){
              expect(err).to.not.be.ok();
              expect(onlineAnimals).to.be.an(Object);
              
              var onlineTiger = onlineAnimals.first();
              
              expect(onlineTiger).to.be.an(Object);
              expect(onlineTiger.id()).to.be.equal(tiger.id());
              
              onlineAnimals.remove(onlineTiger.id(), function(err){
                expect(err).to.not.be.ok();
                socket.disconnect();
                
                zoo.all(Animal, function(err, offlineAnimals){
                  expect(err).to.not.be.ok();
                  expect(offlineAnimals).to.be.an(Object);
                  
                  var offlineTiger = offlineAnimals.findById(onlineTiger.id());
                  expect(offlineTiger).to.not.be.ok();
                  
                  Util.release(onlineAnimals);
                  
                  socket.socket.connect();
                  socket.once('connect', done);
                });
              });
            });
          });
        });
      });
    });
    
    /**
      An item is removed from a collection on the server, when we come back online 
      the local cache should be updated with the removed item.
    */
    it('serverside remove item while offline', function(done){
      var zoo = new Zoo({name:'remove item serverside'});
      zoo.keepSynced();
      zoo.save(function(err){
        zoo.all(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          var tiger = new Animal({name:"tiger"});
          animals.add(tiger, function(err){
            expect(err).to.not.be.ok();
            
            zoo.all(Animal, function(err, onlineAnimals){
              expect(err).to.not.be.ok();
              expect(onlineAnimals).to.be.an(Object);
              
              var onlineTiger = onlineAnimals.first();
              
              expect(onlineTiger).to.be.an(Object);
              expect(onlineTiger.id()).to.be.equal(tiger.id());
              
              Util.ajax.del('http://localhost:8080/zoos/'+zoo.id()+'/animals/'+onlineTiger.id(), null, function(err, res) { 
                
                zoo.all(Animal, function(err, emptyZoo){
                  expect(err).to.not.be.ok();
                  expect(emptyZoo).to.be.an(Object);
                  expect(emptyZoo.items.length).to.be(0);
                  
                  emptyZoo.release();
                  
                  socket.disconnect();
                  
                  zoo.all(Animal, function(err, emptyZoo){
                    expect(err).to.not.be.ok();
                    expect(emptyZoo).to.be.an(Object);
                    expect(emptyZoo.items.length).to.be(0);
                    
                    Util.release(onlineAnimals, emptyZoo);
                    socket.socket.connect();
                    socket.once('connect', done);
                  });
                });
              });
            });
          });
        });
      });      
    });

    
    it('added item via keepsynced is available offline', function(done){
      // This test checks that if one collection item has been added to a collection
      // due to that the collection is kept synced, it should be made offline.
      // unfortunatelly is a test difficult to implement, we need a separate browser session
      // for it.
      done();
    });
    
    it('removed item via keepsynced is not available offline', function(done){
      // This test checks that if one collection item has been removed from a collection
      // due to that the collection is kept synced, it should be made offline.
      // unfortunatelly is a test difficult to implement, we need a separate browser session
      // for it.
      done();
    });
    
  });
  
  describe('Sorted collection', function(){
    it('add items to sorted collection', function(done){
      var item1 = new Model.Model({val:1}),
          item2 = new Model.Model({val:5}),
          item3 = new Model.Model({val:10}),
          item4 = new Model.Model({val:15});
          
      var collection = new Collection.Collection();
      collection.add(item3);
      collection.add(item2);
      collection.add(item4);
      collection.add(item1);
      
      collection.set('sortByFn', function(item){return item.val});
      
      for(var i=0,len=collection.items.length;i<len-1;i++){
        expect(collection.items[i].val).to.be.below(collection.items[i+1].val);
      }
            
      done();
    });
    
    it('update items in sorted collection keeps order', function(done){
      var item1 = new Model.Model({val:1}),
          item2 = new Model.Model({val:5}),
          item3 = new Model.Model({val:10}),
          item4 = new Model.Model({val:15});
          
      var collection = new ginger.Collection();
      
      collection.set('sortByFn', function(item){return item.val});
      
      collection.add(item3);
      collection.add(item2);
      collection.add(item4);
      collection.add(item1);
      
      for(var i=0,len=collection.items.length;i<len-1;i++){
        expect(collection.items[i].val).to.be.below(collection.items[i+1].val);
      }
      
      item1.set('val', 7);
      item2.set('val', 2);
      item3.set('val', 12);
      item4.set('val', 9);
      
      for(var i=0,len=collection.items.length;i<len-1;i++){
        expect(collection.items[i].val).to.be.below(collection.items[i+1].val);
      }
      done();
    });
    
    it('propagated items in sorted collection keeps order', function(done){
      var item1 = new Animal({name:'leopard', pos:3}),
          item2 = new Animal({name:'tiger', pos:6}),
          item3 = new Animal({name:'lion', pos:2}),
          item4 = new Animal({name:'panther', pos:8});
          
      var sortedZoo = new Zoo();
      
      sortedZoo.save(function(err){
        expect(err).to.not.be.ok();
      
        sortedZoo.keepSynced();
      
        sortedZoo.all(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          
          animals.set('sortByFn', function(item){return item.pos});
          
          animals.add([item3, item2, item4, item1], function(err){
            item2.release()
            item4.release()
            item1.release()
            item3.release()        
            
            for(var i=0,len=animals.items.length;i<len-1;i++){
              expect(animals.items[i].pos).to.be.below(animals.items[i+1].pos);
            }
            
            animals.on('added:', function() {
              for(var i=0,len=animals.items.length;i<len-1;i++){
                expect(animals.items[i].pos).to.be.below(animals.items[i+1].pos);
              }
              animals.release();
              sortedZoo.release();
              done();
            });
            
            sortedZoo.all(Animal, function(err, otherAnimals){
              var item5 = new Animal({name:'cheetah', pos:10});
              otherAnimals.add(item5, function(err){
                expect(err).to.be(null);
                item5.release();
                otherAnimals.release();
              }); 
            })
          }); 
        });
      });
    });
    
  });
  
  describe('Queries', function(){
    it('find models in collection limiting result', function(done){
      done();
    });

    it('find models in collection paginating', function(done){
      done();
    });
  
    it('find models in collection sorting and paginating', function(done){
      done();
    });
  });
  
});

});
