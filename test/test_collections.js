/*global socket:true, io:true*/
define(['gnd', 'fixtures/models'], function(Gnd, models){
"use strict";

localStorage.clear();
  
describe('Collection Datatype', function(){
  var storageSocket, storageQueue;

  var
    Animal = models.Animal,
    Zoo = models.Zoo,
    zoo;

  var socket1, sl1, ss1, q1, sm1;
  var socket2, sl2, ss2, q2, sm2;
  /*
  before(function(done){
    var storageLocal  = new Gnd.Storage.Local();
    storageSocket = new Gnd.Storage.Socket(socket);
  
    Gnd.use.syncManager(socket);
  
    Gnd.use.storage.remote(storageSocket);
    Gnd.use.storage.local(storageLocal);
    
    storageQueue = Gnd.using.storageQueue;
    
    storageQueue.init(function(){
      done();
    });
  });
  */
  
  before(function(done){
    socket1 = io.connect('/', {'force new connection': true});
    sl1  = new Gnd.Storage.Local();
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
        
        storageQueue.init(function(){
          storageQueue.exec().then(done);
        });
      });
    });
  });
  
  beforeEach(function(done){
    Gnd.Model.__useDepot = true;
    Gnd.using.storageQueue = q1;
    Gnd.using.syncManager = sm1;
    storageSocket = ss1;
    
    zoo = new Zoo();
    Zoo.create({}, true).then(function(newZoo){
      zoo = newZoo;
      zoo.save();
      zoo.once('id', function(){
        done();
      });
    });   
  });
  
  // afterEach(function(){
  //   zoo.release();
  // });
  
  describe('Creation', function(){
    it('save to server', function(done){
      var zoo = new Zoo();
      
      zoo.save().then(function(){
        zoo.all(Animal).then(function(animals){
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
      zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
        
        var tiger = new Animal({name:"tiger"});
        animals.add(tiger).then(function(){
          tiger.release();
          storageQueue.waitUntilSynced(function(){
            
            Zoo.findById(zoo.id()).then(function(sameZoo){
              expect(sameZoo).to.be.an(Object);
            
              var sameAnimals = sameZoo.all(Animal);
              
              sameAnimals.once('resynced:', function(){
                expect(sameAnimals).to.be.an(Object);
                expect(sameAnimals.items).to.be.an(Array);
                expect(sameAnimals.count).to.be(1);
                expect(animals.count).to.be(1);
                
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
  
    // This test requires of a singleton factory for Collections.
    it.skip('add item to local collection propagates to other local collections', function(done){
      Zoo.findById(zoo.id()).then(function(mirrorZoo){
        mirrorZoo.keepSynced();
      
        zoo.all(Animal).then(function(animals){
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

          mirrorZoo.all(Animal).then(function(animals){
            expect(animals).to.be.an(Object);
            var fox = new Animal({name:'fox'});
            animals.add(fox).then(function(){
              //animals.release();
            });
            fox.release();
          });
        });
      });
    });
    
    it('add item to local collection propagates to other remote collections', function(done){
      Zoo.findById(zoo.id()).then(function(mirrorZoo){
        mirrorZoo.keepSynced();
      
        zoo.all(Animal).then(function(animals){
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

          Gnd.using.storageQueue = q2;
          Gnd.using.syncManager = sm2;

          mirrorZoo.all(Animal).then(function(animals){
            expect(animals).to.be.an(Object);
            var fox = new Animal({name:'fox'});
            animals.add(fox).then(function(){
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
      Zoo.findById(zoo.id()).then(function(zoo){
        expect(zoo).to.not.be(undefined);

        zoo.keepSynced();

        zoo.all(Animal).then(function(animals){

          var leopard = new Animal({name:"leopard"});
          animals.add(leopard).then(function(){
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

            storageQueue.waitUntilSynced(function(){
              Animal.findById(leopard.id()).then(function(animal){
                animal.keepSynced();
                leopard.set('legs', 5);
                animal.release();
              });
            });
          });
        });
      });
    });

    it('collection proxies local update item event', function(done){
      Zoo.findById(zoo.id()).then(function(zoo){
        var testAnimal;
        expect(zoo).to.be.ok();

        zoo.keepSynced();

        zoo.all(Animal).then(function(animals){

          Animal.create({name:"panther"}).then(function(panther){
            animals.add(panther.autorelease()).then(function(){

              var foundPanther = animals.find(function(item){ return item.name==='panther'; });

              expect(foundPanther).to.be.an(Object);
              expect(foundPanther).to.be(panther);

              storageQueue.waitUntilSynced(function(){
                Animal.findById(panther.id(), true).then(function(animal){

                  animals.on('updated:', function(model, args){
                    expect(args).to.be.an(Object);
                    expect(args.legs).to.be(5);
                    animals.release();
                    zoo.release();
                    animal.release();
                    done();
                  });

                  animal.set('legs', 5);
                });
              });
            });
          });
        });
      });
    });
    
    
    it('collection proxies server updated item event', function(done){
      Zoo.findById(zoo.id(), true).then(function(zoo){
        var testAnimal;
        expect(zoo).to.be.ok();

        zoo.all(Animal).then(function(animals){

          Animal.create({name:"panther"}).then(function(panther){
            animals.add(panther.autorelease()).then(function(){

              var foundPanther = animals.find(function(item){ return item.name==='panther'; });

              expect(foundPanther).to.be.an(Object);
              expect(foundPanther).to.be(panther);

              storageQueue.waitUntilSynced(function(){
                
                Gnd.using.storageQueue = q2;
                Gnd.using.syncManager = sm2;
                
                Animal.findById(panther.id(), true).then(function(animal){

                  animals.on('updated:', function(model, args){
                    expect(args).to.be.an(Object);
                    expect(args.legs).to.be(5);
                    animals.release();
                    zoo.release();
                    animal.release();
                    done();
                  });

                  animal.set('legs', 5);
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
      Zoo.findById(zoo.id(), true).then(function(zoo){
        
        zoo.all(Animal).then(function(animals){
          expect(animals).to.be.an(Object);
          
          animals.add((new Animal({name:"gorilla"})).autorelease()).then(function(){
            var animal = animals.first();
            expect(animal).to.be.an(Object);
            animals.remove(animal.id());
                    
            var found = animals.find(function(item){return item.id() === animal.id();});
            expect(found).to.be(undefined);
          
            animals.save().then(function(){
              
              storageQueue.waitUntilSynced(function(){
                zoo.all(Animal).then(function(otherAnimals){
                  expect(otherAnimals).to.be.an(Object);

                  var found = otherAnimals.find(function(item){return item.id() === animal.id();});
                  expect(found).to.be(undefined);
                  zoo.release();
                  otherAnimals.release();
                  animals.release();
                
                  var counter = 0;
                
                  if(otherAnimals.isDestroyed()){
                    console.log('DONE1');
                    done();
                  }else{
                    counter++;
                    otherAnimals.once('destroy:', function(){
                      expect(otherAnimals.isDestroyed()).to.be(true);
                      counter--;
                      console.log(counter);
                      if(counter == 0){
                        console.log('DONE2');
                        done();
                      }
                    });
                  }
                });
              });
            });
          });
        });
      });
    });

    it('remove item from local collection propagates remove: to remote collection', function(done){
      Zoo.findById(zoo.id(), true).then(function(zoo){

        zoo.all(Animal).then(function(animals){
          var otherAnimal;

          var koala = new Animal({name:"koala"});
          animals.add(koala);

          storageQueue.waitUntilSynced(function(){

            Gnd.using.storageQueue = q2;
            Gnd.using.syncManager = sm2;

            Zoo.findById(zoo.id(), true).then(function(anotherZoo){
              expect(anotherZoo).to.be.an(Object);

              anotherZoo.all(Animal).then(function(otherAnimals){
                expect(otherAnimals).to.be.an(Object);

                animals.once('removed:', function(item){
                  expect(item).to.be.an(Object);
                  expect(item).to.have.property('_id');
                  expect(item.id()).to.be.eql(otherAnimal.id());
                  Gnd.Util.release(animals, zoo, koala, otherAnimals, anotherZoo);
                  done();
                });

                otherAnimal = otherAnimals.first();
                otherAnimals.remove(otherAnimal.id());
              });
            });
          });
        });
      });
    });

  });
  
  describe('Delete', function(){
    it('delete item that is part of a collection', function(done){
      Zoo.findById(zoo.id()).then(function(zoo){
        zoo.keepSynced();
        zoo.all(Animal).then(function(animals){
          var tiger = new Animal({name:"tiger"});
          animals.once('removed:', function(item){
            expect(item).to.be.eql(tiger);
            done();
          });
          
          animals.add(tiger).then(function(){
            tiger.remove();
          });
        });
      });
    });
    
    it('collection proxies delete item event', function(done){
      Zoo.findById(zoo.id()).then(function(zoo){
        zoo.keepSynced();
        
        zoo.all(Animal).then(function(animals){
          var otherAnimal;
          
          var koala = new Animal({name:"koala"});
          animals.add(koala);
          
          storageQueue.waitUntilSynced(function(){
            
            Gnd.using.storageQueue = q2;
            Gnd.using.syncManager = sm2;
            
            Zoo.findById(zoo.id(), true).then(function(anotherZoo){
              expect(anotherZoo).to.be.an(Object);
              
              anotherZoo.all(Animal).then(function(otherAnimals){
                expect(otherAnimals).to.be.an(Object);
                  
                animals.once('removed:', function(item){
                  expect(item).to.be.an(Object);
                  expect(item).to.have.property('_id');
                  expect(item.id()).to.be.eql(otherAnimal.id());
                  Gnd.Util.release(animals, zoo, koala, otherAnimals, anotherZoo);
                  done();
                });
                  
                otherAnimal = otherAnimals.first();
                otherAnimal.remove();
              });
            });
          });
        });
      });
    });
  });

  describe('Offline', function(){
    
    before(function(done){
      socket.on('connect', storageQueue.syncFn);
      storageQueue.waitUntilSynced(function(){
        done();
      });
    });
    
    it('found items are cached', function(done){
      localStorage.clear();
      
      zoo.all(Animal).then(function(animals){
        var bat = new Animal({name:"bat"});
        animals.add(bat);
        
        storageQueue.waitUntilSynced(function(){
          socket.disconnect();
          animals.release();
          
          zoo.all(Animal).then(function(animals){
            var found = animals.findById(bat.id());
            expect(found).to.be.ok();
            socket.socket.connect();
            done();
          });
        });
      });
    });
  
    it('add item to collection being offline', function(done){
      zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
          
        socket.disconnect();
          
        var tiger = new Animal({name:"tiger"});
        animals.add(tiger).then(function(){
          tiger.release();
            
          Zoo.findById(zoo.id()).then(function(sameZoo){
            expect(sameZoo).to.be.an(Object);
              
            storageQueue.waitUntilSynced(function(){
              // Check that the collection has been synced in server.
              sameZoo.all(Animal).then(function(collection){
                expect(collection).to.be.an(Object);
                expect(collection.items).to.be.an(Array);
                expect(animals.count).to.be(1);
                expect(collection.count).to.be(1);
                Gnd.Util.release(sameZoo, collection, animals);
                done();
              });
            });
              
            // Check that the collection is available locally.
            sameZoo.all(Animal).then(function(collection){
              expect(collection).to.be.an(Object);
              expect(collection.items).to.be.an(Array);
              expect(collection.count).to.be(1);
              expect(animals.count).to.be(1);
              collection.release();
            // socket.socket.reconnect();
              socket.socket.connect();
            });
          });
        });
      });
    });
    
    it('add item to collection being offline 2', function(done){
      socket.disconnect();
      zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
          
        animals.add(new Animal({name:"tiger"})).then(function(){
          Zoo.findById(zoo.id()).then(function(doc){
            expect(doc).to.be.an(Object);
            storageQueue.once('synced:', function(){
              doc.all(Animal).then(function(collection){
                expect(collection).to.be.an(Object);
                expect(collection.items).to.be.an(Array);
                expect(collection.count).to.be(1);
                expect(animals.count).to.be(1);
                doc.release();
                collection.release();
                animals.release();
                done();
              });
            });

            doc.all(Animal).then(function(collection){
              expect(collection).to.be.an(Object);
              expect(collection.items).to.be.an(Array);
              expect(collection.count).to.be(1);
              expect(animals.count).to.be(1);
              collection.release();
              socket.socket.connect();
            });
          });
        });
      });
    });
   
    it('remove item while offline', function(done){
      zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
          
        animals.add(new Animal({name:"lion"})).then(function(){
          expect(animals.count).to.be(1);
            
          socket.disconnect();
            
          animals.remove(animals.first().id()).then(function(){
            expect(animals.count).to.be(0);

            Zoo.findById(zoo.id()).then(function(sameZoo){
              expect(sameZoo).to.be.an(Object);
                
              storageQueue.once('synced:', function(){
                sameZoo.all(Animal).then(function(collection){
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
                
              sameZoo.all(Animal).then(function(collection){
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
      zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
        var tiger = new Animal({name:"tiger"});
        animals.add(tiger).then(function(){
                    
          socket.disconnect();
            
          zoo.all(Animal).then(function(offlineAnimals){
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
    
    it.skip('serverside add item to collection offline generates added event when going online', function(done){
    
    
    });
  
    //
    //  An item is added from a collection on the server, when we come back online
    //  the local cache should be updated with the added item.
    //
    it.skip('serverside add item while offline', function(done){
    
    
      done();
    });
    
    it('removed item from collection online is not available offline', function(done){
      zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
        Animal.create({name:"tiger"}).then(function(tiger){
          animals.add(tiger).then(function(){
            
            storageQueue.waitUntilSynced(function(){
              zoo.all(Animal).then(function(onlineAnimals){
                expect(onlineAnimals).to.be.an(Object);
              
                var onlineTiger = onlineAnimals.first();
              
                expect(onlineTiger).to.be.an(Object);
                expect(onlineTiger.id()).to.be.equal(tiger.id());
              
                //onlineAnimals.remove(onlineTiger.id()).then(function(){
                animals.remove(onlineTiger.id()).then(function(){
                  
                  storageQueue.waitUntilSynced(function(){
                    //socket.disconnect();
                
                    zoo.all(Animal).then(function(offlineAnimals){
                      expect(offlineAnimals).to.be.an(Object);
                  
                      var offlineTiger = offlineAnimals.findById(onlineTiger.id());
                      expect(offlineTiger).to.not.be.ok();
                  
                      Gnd.Util.release(onlineAnimals);
                  
                      socket.socket.connect();
                      socket.once('connect', done);
                    });
                  })
                });
              });
            })
          });
        })
      });
    });
    
    //
    //  An item is removed from a collection on the server, when we come back online
    //  the local cache should be updated with the removed item.
    //
    
    it('serverside remove item while offline', function(done){
      zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
        var tiger = new Animal({name:"tiger"});
        animals.add(tiger).then(function(){
          expect(animals.count).to.be(1);
            
          storageQueue.waitUntilSynced(function(){
            expect(animals.count).to.be(1);
            
            var onlineAnimals = zoo.all(Animal);
            
            expect(onlineAnimals).to.be.an(Object);
            expect(onlineAnimals.count).to.be(1);
              
            var onlineTiger = onlineAnimals.first();
              
            expect(onlineTiger).to.be.an(Object);
            expect(onlineTiger.id()).to.be.equal(tiger.id());
              
            onlineAnimals.once('resynced:', function(){
              expect(onlineAnimals.count).to.be(1);
                
              Gnd.Ajax.del('/zoos/'+zoo.id()+'/animals/'+onlineTiger.id(), null).then(function() {
                // The server has deleted the model, but we do not know it yet.
                // When we try to get it, we should first get the local version, and quite soon get the deleted notification.
                  
                var emptyZoo = zoo.all(Animal);
                
                expect(emptyZoo).to.be.an(Object);
                expect(emptyZoo.count).to.be(1);
                    
                /* setTimeout(function(){
                    expect(emptyZoo.count).to.be(0);
                  }, 1000);
                */
                emptyZoo.once('resynced:', function(){
                  expect(emptyZoo.count).to.be(0);
                    
                  emptyZoo.release();
                  
                  socket.disconnect();
                  
                  zoo.all(Animal).then(function(emptyZoo){
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
    
    it.skip('serverside remove item from collection offline generates removed event when going online', function(done){
    
    
    });

    
    it.skip('added item via keepsynced is available offline', function(done){
      // This test checks that if one collection item has been added to a collection
      // due to that the collection is kept synced, it should be made offline.
      // unfortunatelly is a test difficult to implement, we need a separate browser session
      // for it.
      done();
    });
    
    it.skip('removed item via keepsynced is not available offline', function(done){
      // This test checks that if one collection item has been removed from a collection
      // due to that the collection is kept synced, it should be made offline.
      // unfortunatelly is a test difficult to implement, we need a separate browser session
      // for it.
      done();
    });
    
  });
  
  describe('Sorted collection', function(){
    it('add items to sorted collection', function(done){
      var item1 = new Animal({name:'leopard', pos:3}),
          item2 = new Animal({name:'tiger', pos:6}),
          item3 = new Animal({name:'lion', pos:2}),
          item4 = new Animal({name:'panther', pos:8});
          
      var sortedZoo = new Zoo();
      
      sortedZoo.save().then(function(){      
        sortedZoo.keepSynced();
      
        sortedZoo.all(Animal).then(function(animals){
          expect(animals).to.be.an(Object);
          
          animals.set('sortByFn', function(item){return item.pos;});
          
          animals.add([item3, item2, item4, item1]).then(function(){
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
      
      var itemcollection = new Gnd.Collection(Item, 'items', parent, [item1,item2,item3,item4]);
      
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
      
      sortedZoo.save().then(function(){
      
        sortedZoo.keepSynced();
      
        sortedZoo.all(Animal).then(function(animals){
          expect(animals).to.be.an(Object);
          
          animals.set('sortByFn', function(item){return item.pos;});
          
          animals.add([item3, item2, item4, item1]).then(function(){
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
      
      sortedZoo.save().then(function(){
        sortedZoo.keepSynced();
      
        sortedZoo.all(Animal).then(function(animals){
          expect(animals).to.be.an(Object);
          
          animals.set('sortByFn', function(item){return item.pos;});
          
          animals.add([item3, item2, item4, item1]).then(function(){
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
              
              Gnd.using.storageQueue = q2;
              Gnd.using.syncManager = sm2;
              
              sortedZoo.all(Animal).then(function(otherAnimals){
                var item5 = new Animal({name:'cheetah', pos:10});
                otherAnimals.add(item5).then(function(){
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
  
  describe('Filtered collection', function(){
    //TODO: rewrite
    it('add items generate events', function(done){
      
    });
  });
  
  describe('Queries', function(){
    it('find models in orphan collection', function(done){
      var NUM_TIGERS = 10;
      for(var i=0; i<NUM_TIGERS; i++){
        Animal.create({name: 'tiger', legs: i}).save();
      }

      for(var i=0; i<NUM_TIGERS; i++){
        Animal.create({name: 'panther'}).save();
      }
      
      var query = {
        cond: {name: 'tiger'}
      }
      
      storageQueue.waitUntilSynced(function(){
        Animal.find(query).then(function(tigers){
          tigers.each(function(tiger){
            expect(tiger).to.have.property('name');
            expect(tiger.name).to.be('tiger');
          });
          expect(tigers.count).to.be.greaterThan(9);
          done();
        });
      });
    });
    
    it('find models in collection limiting result', function(done){
      var NUM_TIGERS = 10;
      for(var i=0; i<NUM_TIGERS; i++){
        Animal.create({name: 'tiger', legs: i}).save();
      }

      for(var i=0; i<NUM_TIGERS; i++){
        Animal.create({name: 'panther'}).save();
      }
      
      var query = {
        cond: {name: 'tiger'},
        opts: {limit: 5}
      }
      
      storageQueue.waitUntilSynced(function(){
        Animal.find(query).then(function(tigers){
          tigers.each(function(tiger){
            expect(tiger).to.have.property('name');
            expect(tiger.name).to.be('tiger');
          });
          expect(tigers.count).to.be(5);
          done();
        });
      });
    
    });

    it('find models in collection sorting', function(done){
      var NUM_TIGERS = 10;
      for(var i=0; i<NUM_TIGERS; i++){
        Animal.create({name: 'horse', legs: parseInt(1000*Math.random()+1)}).save();
      }

      for(var i=0; i<NUM_TIGERS; i++){
        Animal.create({name: 'panther'}).save();
      }
      
      var query = {
        cond: {name: 'horse'},
        opts: {sort: {legs: 1}, limit: 8}
      }
      
      storageQueue.waitUntilSynced(function(){
        Animal.find(query).then(function(horses){
          var legs = 0;
          console.log(horses)
          horses.each(function(horse){
            expect(horse).to.have.property('name');
            expect(horse.name).to.be('horse');
            expect(horse).to.have.property('legs');
            expect(legs).to.be.within(0, horse.legs);
            legs = horse.legs;
          });
          expect(horses.count).to.be(8);
          done();
        });
      });
    });
  
    it.skip('find models in collection paginating');
  });
  
  describe('Orphan collections', function(){
    it.skip('Add models to orphan collection');
    it.skip('Delete models from orphan collection');
    
  });
  
  describe('Edge cases', function(){
    it('works after clearing local storage', function(done){
      zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
        Animal.create({name: 'tiger'}, true).then(function(tiger){
          animals.add(tiger.autorelease()).then(function(){
            storageQueue.waitUntilSynced(function(){
              expect(animals.count).to.be(1);
              
              localStorage.clear();
              var sameAnimals = zoo.all(Animal);
            
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
      var animals = zoo.all(Animal).then(function(animals){
        expect(animals).to.be.an(Object);
        animals.add((new Animal({name:"tiger"})).autorelease()).then(function(){
          storageQueue.waitUntilSynced(function(){
            expect(animals.count).to.be(1);

            var animalId = animals.first().id();
            storageSocket.remove(['zoo', zoo.id(), 'animals'], ['animals'], [animalId], {}).then(function(err){
              expect(err).to.not.be.ok();
              var sameAnimals = zoo.all(Animal);
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
