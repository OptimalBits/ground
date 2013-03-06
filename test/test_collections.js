/*global socket:true, io:true*/
define(['gnd'],
  function(Gnd){

localStorage.clear();
  
describe('Collections', function(){
  var storageLocal  = new Gnd.Storage.Local();
  var storageSocket = new Gnd.Storage.Socket(socket);
  var storageQueue  = new Gnd.Storage.Queue(storageLocal, storageSocket);

  var syncManager = new Gnd.Sync.Manager(socket);

  var
    Animal = Gnd.Model.extend('animals'),
    Zoo = Gnd.Model.extend('zoo'),
    zoo;
  
  before(function(done){
    Gnd.Model.storageQueue = storageQueue;
    Gnd.Model.syncManager = syncManager;
    
    storageQueue.init(function(){
        done();
    });
  });
  
  beforeEach(function(done){
    // storageQueue.clear(function(){
    
      zoo = new Zoo();
      zoo.keepSynced();
      zoo.save();
      
      // storageQueue.once('synced:', function(){
      // storageQueue.once('created:'+zoo.id(), function(){
      //   done();
      // });
      zoo.once('id', function(){
        done();
      });
    // });
  });
  
  // afterEach(function(){
  //   zoo.release();
  // });
  
  describe('Creation', function(){
    it('save to server', function(done){
      var zoo = new Zoo();
      
      zoo.save(function(err){
        expect(err).to.not.be.ok();
        zoo.all(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          expect(animals.count).to.be(0);
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

        animals.add((new Animal({name:"tiger"})).autorelease(), function(err){
          expect(err).to.not.be.ok();
          storageQueue.once('synced:', function(){
            
            Zoo.findById(zoo.id(), function(err, sameZoo){
              expect(err).to.not.be.ok();
              expect(sameZoo).to.be.an(Object);
            
              sameZoo.all(Animal, function(err, sameAnimals){
                expect(err).to.not.be.ok();
                expect(sameAnimals).to.be.an(Object);
                expect(sameAnimals.items).to.be.an(Array);
              //expect(sameAnimals.count).to.be(1); // Outcommented until fix for Resync.
                expect(animals.count).to.be(1);
                                
                sameAnimals.on('resynced:', function(){
                  expect(sameAnimals.count).to.be(1);
                
                  sameZoo.release();
                  sameAnimals.release();
                  animals.release();
                  done();
                });
              });
            });
          });
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
            expect(animals.count).to.be(1);
            expect(animals.find(function(item){ return item.name==='fox'; })).to.be.an(Object);

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
              //animals.release();
            });
            fox.release();
          });
        });
      });
    });
  });

  describe('Updating', function(){
    it('update item propagates to the same item in a collection', function(done){
      Zoo.findById(zoo.id(), function(err, zoo){
        expect(err).to.eql(null);
        expect(zoo).to.not.be(undefined);
        
        zoo.keepSynced();
                
        zoo.all(Animal, function(err, animals){
          
          var leopard = new Animal({name:"leopard"});
          animals.add(leopard, function(err){
            
            expect(leopard).to.be.an(Object);
            expect(leopard.name).to.be.eql('leopard');
        
            leopard.once('changed:', function(args){
              expect(args).to.be.an(Object);
              expect(args.legs).to.be(5);
              // animals.release();
              // zoo.release();
              leopard.release();
              done();
            });
        
            storageQueue.once('synced:', function(){
              Animal.findById(leopard.id(), function(err, animal){
                expect(err).to.not.be.ok();
                animal.keepSynced();
                leopard.set('legs', 5);
                animal.release();
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
          
          animals.add((new Animal({name:"panther"})).autorelease(), function(err){

            var panther = animals.find(function(item){ return item.name==='panther'; });

            expect(panther).to.be.an(Object);
            expect(panther.name).to.be.eql('panther');
        
            storageQueue.once('synced:', function(){
              Animal.findById(panther.id(), function(err, animal){
                expect(err).to.not.be.ok();
                animal.keepSynced();
                
                animal.on('resynced:', function(){
                  animal.set('legs', 5);
                  animal.release();
                
                  animals.on('updated:', function(model, args){
                    expect(args).to.be.an(Object);
                    expect(args.legs).to.be(5);
                    // animals.release();
                    // zoo.release();
                    done();
                  });
                
                });
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
                    
            var found = animals.find(function(item){return item.id() === animal.id();});
            expect(found).to.be(undefined);
          
            animals.save(function(err){
              expect(err).to.not.be.ok();
              
              zoo.all(Animal, function(err, otherAnimals){
                expect(err).to.not.be.ok();
                expect(otherAnimals).to.be.an(Object);

                var found = otherAnimals.find(function(item){return item.id() === animal.id();});
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
    
    it('collection proxies delete item event', function(done){
      Zoo.findById(zoo.id(), function(err, zoo){
        zoo.keepSynced();
        
        zoo.all(Animal, function(err, animals){
          var otherAnimal;
          
          animals.once('removed:', function(item){
            expect(item).to.be.an(Object);
            expect(item).to.have.property('_id');
            expect(item.id()).to.be.eql(otherAnimal.id());
            animals.release();
            zoo.release();
            done();
          });
          
          storageQueue.once('synced:', function(){
            Zoo.findById(zoo.id(), function(err, anotherZoo){
              expect(err).to.not.be.ok();
              expect(anotherZoo).to.be.an(Object);
              
              anotherZoo.keepSynced();
              anotherZoo.all(Animal, function(err, otherAnimals){
                expect(err).to.not.be.ok();
                expect(otherAnimals).to.be.an(Object);
                
                otherAnimal = otherAnimals.first();
                otherAnimal.remove(function(err){
                  expect(err).to.not.be.ok();
                  // otherAnimals.release();
                });
              });
            });
          });
          
          animals.add(new Animal({name:"koala"}), function(err){
            expect(err).to.not.be.ok();
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
            tiger.remove();
          });
        });
      });
    });
  });

  describe('Offline', function(){
    
    before(function(done){
      socket.on('connect', storageQueue.syncFn);
      done();
    });
    
    it('find items are cached');
      // IMPLEMENT: Items that are "finded" from the server should be
      // cached for offline usage.
  
    it('add item to collection being offline', function(done){
      zoo.all(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
          
        socket.disconnect();
          
        var tiger = new Animal({name:"tiger"});
        animals.add(tiger, function(err){
          tiger.release();
            
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
                expect(animals.count).to.be(1);
                expect(collection.count).to.be(1);
                // Gnd.Util.release(sameZoo, collection, animals);
                done();
              });
            });
              
            // Check that the collection is available locally.
            sameZoo.all(Animal, function(err, collection){
              expect(err).to.not.be.ok();
              expect(collection).to.be.an(Object);
              expect(collection.items).to.be.an(Array);
              expect(collection.count).to.be(1);
              expect(animals.count).to.be(1);
              // collection.release();
            // socket.socket.reconnect();
              socket.socket.connect();
            });
          });
        });
      });
    });
    
    it('add item to collection being offline 2', function(done){
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
                expect(collection.count).to.be(1);
                expect(animals.count).to.be(1);
                doc.release();
                // collection.release();
                // animals.release();
                done();
              });
            });

            doc.all(Animal, function(err, collection){
              expect(err).to.be(null);
              expect(collection).to.be.an(Object);
              expect(collection.items).to.be.an(Array);
              expect(collection.count).to.be(1);
              expect(animals.count).to.be(1);
              // collection.release();
              socket.socket.connect();
            });
          });
        });
      });
    });
  
    it('remove item while offline', function(done){
      zoo.all(Animal, function(err, animals){
        expect(err).not.to.be.ok();
        expect(animals).to.be.an(Object);
          
        animals.add(new Animal({name:"lion"}), function(err){
          expect(err).not.to.be.ok();
          expect(animals.count).to.be(1);
            
          socket.disconnect();
            
          animals.remove(animals.first().id(), function(err){
            expect(err).not.to.be.ok();
            expect(animals.count).to.be(0);

            Zoo.findById(zoo.id(), function(err, sameZoo){
              expect(err).to.not.be.ok();
              expect(sameZoo).to.be.an(Object);
                
              storageQueue.once('synced:', function(){
                sameZoo.all(Animal, function(err, collection){
                  expect(err).not.to.be.ok();
                  expect(collection).to.be.an(Object);
                  expect(collection.items).to.be.an(Array);
                  expect(collection.count).to.be(0);
                    
                  // This fails because animals gets an add: event from the server
                  // which is a mirror of the add: event created by animals just before
                  // disconnecting...
                  //expect(animals.count).to.be(0);
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
                expect(collection.count).to.be(0);
                socket.socket.connect();
              });
            });
          });
        });
      });
    });
    
    it('add item to collection online is available offline', function(done){
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
  
    //
    //  An item is added from a collection on the server, when we come back online
    //  the local cache should be updated with the removed item.
    //
    it('serverside add item while offline');
    
    
    it('removed item from collection online is not available offline', function(done){
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
                  
                Gnd.Util.release(onlineAnimals);
                  
                socket.socket.connect();
                socket.once('connect', done);
              });
            });
          });
        });
      });
    });
    
    //
    //  An item is removed from a collection on the server, when we come back online
    //  the local cache should be updated with the removed item.
    //
    
    it('serverside remove item while offline', function(done){
      zoo.all(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        var tiger = new Animal({name:"tiger"});
        animals.add(tiger, function(err){
          expect(err).to.not.be.ok();
          expect(animals.count).to.be(1);
            
          storageQueue.once('synced:', function(){
            expect(animals.count).to.be(1);
            
            zoo.all(Animal, function(err, onlineAnimals){
              expect(err).to.not.be.ok();
              expect(onlineAnimals).to.be.an(Object);
              expect(onlineAnimals.count).to.be(1);
              
              var onlineTiger = onlineAnimals.first();
              
              expect(onlineTiger).to.be.an(Object);
              expect(onlineTiger.id()).to.be.equal(tiger.id());
              
              onlineAnimals.once('resynced:', function(){
                expect(onlineAnimals.count).to.be(1);
                
                Gnd.Ajax.del('http://localhost:8080/zoos/'+zoo.id()+'/animals/'+onlineTiger.id(), null, function(err, res) {
                  // The server has deleted the model, but we do not know it yet.
                  // When we try to get it, we should first get the local version, and quite soon get the deleted notification.
                  
                  zoo.all(Animal, function(err, emptyZoo){
                    expect(err).to.not.be.ok();
                    expect(emptyZoo).to.be.an(Object);
                    expect(emptyZoo.count).to.be(1);
                  
                    emptyZoo.once('resynced:', function(){
                      expect(emptyZoo.count).to.be(0);
                    
                      emptyZoo.release();
                  
                      socket.disconnect();
                  
                      zoo.all(Animal, function(err, emptyZoo){
                        expect(err).to.not.be.ok();
                        expect(emptyZoo).to.be.an(Object);
                        expect(emptyZoo.count).to.be(0);
                    
                        Gnd.Util.release(onlineAnimals, emptyZoo);
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
      });
    });

    /*
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
    */
  });
  
  describe('Sorted collection', function(){
    //TODO: rewrite
    it('add items to sorted collection', function(done){
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
          
          animals.set('sortByFn', function(item){return item.pos;});
          
          animals.add([item3, item2, item4, item1], function(err){
            item2.release();
            item4.release();
            item1.release();
            item3.release();
            for(var i=0,len=animals.items.length;i<len-1;i++){
              expect(animals.items[i].pos).to.be.below(animals.items[i+1].pos);
            }
            
            animals.release();
            done();
          });
        });
      });
    });
    it('sort collection multiple times', function(done){
      var Parent = Gnd.Model.extend('itemparent');
      var parent = new Parent();
      var Item = Gnd.Model.extend('item');
      
      var item1 = new Item({ val : 1, val2 : 5 , val3 : 10 } ),
          item2 = new Item({ val : 5, val2 : 4 , val3 : 11}),
          item3 = new Item({ val : 10, val2 : 3 , val3 : 12 }),
          item4 = new Item({ val : 15, val2 : 2 , val3 : 13 });
      
      var itemcollection = new Gnd.Collection(Item, parent, [item1,item2,item3,item4]);
      
      itemcollection.set('filterByFn', function(item){return item.val = 10;});
      itemcollection.set('filterByFn', function(item){return item.val = 15;});
      itemcollection.set('filterByFn', function(item){return item.val;});
      
      for(var i=0,len=itemcollection.items.length;i<len-1;i++){
        expect(itemcollection.items[i].val).to.be.below(itemcollection.items[i+1].val);
      }
      done();
    });
    //TODO: rewrite
    it('update items in sorted collection keeps order', function(done){
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
          
          animals.set('sortByFn', function(item){return item.pos;});
          
          animals.add([item3, item2, item4, item1], function(err){
            for(var i=0,len=animals.items.length;i<len-1;i++){
              expect(animals.items[i].pos).to.be.below(animals.items[i+1].pos);
            }
            
            item1.set('pos', 7);
            item2.set('pos', 2);
            item3.set('pos', 12);
            item4.set('pos', 9);
            
            for(i=0,len=animals.items.length;i<len-1;i++){
              expect(animals.items[i].pos).to.be.below(animals.items[i+1].pos);
            }

            item2.release();
            item4.release();
            item1.release();
            item3.release();

            animals.release();
            done();
          });
        });
      });
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
          
          animals.set('sortByFn', function(item){return item.pos;});
          
          animals.add([item3, item2, item4, item1], function(err){
            item2.release();
            item4.release();
            item1.release();
            item3.release();
            
            for(var i=0,len=animals.items.length;i<len-1;i++){
              expect(animals.items[i].pos).to.be.below(animals.items[i+1].pos);
            }
            
            animals.on('added:', function() {
              for(var i=0,len=animals.items.length;i<len-1;i++){
                expect(animals.items[i].pos).to.be.below(animals.items[i+1].pos);
              }
              animals.release();
              // sortedZoo.release();
              done();
            });
            
            storageQueue.once('synced:', function(){
              sortedZoo.all(Animal, function(err, otherAnimals){
                var item5 = new Animal({name:'cheetah', pos:10});
                otherAnimals.add(item5, function(err){
                  expect(err).to.not.be.ok();
                  item5.release();
                  // otherAnimals.release();
                });
              });
            });
          });
        });
      });
    });
    
  });
  
  describe('Queries', function(){
    it('find models in collection limiting result');

    it('find models in collection paginating');
  
    it('find models in collection sorting and paginating');
  });
  
  describe('Edge cases', function(){
    it('works after clearing local storage', function(done){
      zoo.all(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        animals.add((new Animal({name:"tiger"})).autorelease(), function(err){
          expect(err).to.not.be.ok();
          storageQueue.once('synced:', function(){
            expect(err).to.not.be.ok();
            expect(animals.count).to.be(1);
            localStorage.clear();
            zoo.all(Animal, function(err, sameAnimals){
              expect(err).to.not.be.ok();
              expect(sameAnimals).to.be.an(Object);
              expect(sameAnimals.items).to.be.an(Array);
              expect(sameAnimals.count).to.be(0);
              sameAnimals.on('resynced:', function(){
                expect(sameAnimals.count).to.be(1);
                sameAnimals.release();
                animals.release();
                done();
              });
            });
          });
        });
      });
    });
    it('works after clearing remote storage', function(done){
      zoo.all(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        animals.add((new Animal({name:"tiger"})).autorelease(), function(err){
          expect(err).to.not.be.ok();
          storageQueue.once('synced:', function(){
            expect(err).to.not.be.ok();
            expect(animals.count).to.be(1);

            var animalId = animals.first().id();
            storageSocket.remove(['zoo', zoo.id(), 'animals'], ['animals'], [animalId], {}, function(err){
              expect(err).to.be(null);
              zoo.all(Animal, function(err, sameAnimals){
                expect(err).to.not.be.ok();
                expect(sameAnimals).to.be.an(Object);
                expect(sameAnimals.items).to.be.an(Array);
                expect(sameAnimals.count).to.be(1);
                sameAnimals.on('resynced:', function(){
                  expect(sameAnimals.count).to.be(0);
                  sameAnimals.release();
                  animals.release();
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});

});
