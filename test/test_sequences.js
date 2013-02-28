/*global socket:true*/
define(['gnd'],
  function(Gnd){

localStorage.clear();

describe('Sequencess', function(){
  var storageLocal  = new Gnd.Storage.Local();
  var storageSocket = new Gnd.Storage.Socket(socket);
  var storageQueue  = new Gnd.Storage.Queue(storageLocal, storageSocket);

  var syncManager = new Gnd.Sync.Manager(socket);

  var
    Animal = Gnd.Model.extend('animals'),
    Parade = Gnd.Model.extend('parade'),
    parade;

  before(function(done){
    Gnd.Model.storageQueue = storageQueue;
    Gnd.Model.syncManager = syncManager;

    storageQueue.init(function(){
        done();
    });
  });

  beforeEach(function(done){
    storageQueue.clear();

    parade = new Parade();
    parade.keepSynced();
    parade.save();

    parade.once('id', function(){
      done();
    });
    // storageQueue.once('synced:', function(){
    //   done();
    // });
  });

  afterEach(function(){
    parade.release();
  });

  describe('Creation', function(){
    it('save to server', function(done){
      var parade = new Parade();

      parade.save(function(err){
        expect(err).to.not.be.ok();
        parade.seq(Animal, function(err, animals){
          expect(err).to.not.be.ok();
          expect(animals).to.be.an(Object);
          expect(animals.count).to.be(0);
          animals.release();
          done();
        });
      });
    });
  });

  describe('Push', function(){
    it('one item', function(done){
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        expect(animals.count).to.be(0);

        animals.push((new Animal({name:"tiger"})).autorelease(), function(err){
          expect(err).to.not.be.ok();
          expect(animals.first()).to.have.property('name', 'tiger');
          storageQueue.once('synced:', function(){

            Parade.findById(parade.id(), function(err, sameParade){
              expect(err).to.not.be.ok();
              expect(sameParade).to.be.an(Object);

              sameParade.seq(Animal, function(err, sameAnimals){
                expect(err).to.not.be.ok();
                expect(sameAnimals).to.be.an(Object);
                expect(sameAnimals.count).to.be(1);
                expect(animals.count).to.be(1);
                expect(sameAnimals.first()).to.have.property('name', 'tiger');

                sameAnimals.on('resynced:', function(){
                  expect(sameAnimals.count).to.be(1);

                  sameParade.release();
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

    it('many items', function(done){
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        expect(animals.count).to.be(0);

        animals.push((new Animal({name:"tiger"})).autorelease(), function(err){
          animals.push((new Animal({name:"ant"})).autorelease(), function(err){
            animals.push((new Animal({name:"dog"})).autorelease(), function(err){
              expect(animals.count).to.be(3);
              expect(animals.first()).to.have.property('name', 'tiger');
              expect(err).to.not.be.ok();
              storageQueue.once('synced:', function(){

                Parade.findById(parade.id(), function(err, sameParade){
                  expect(err).to.not.be.ok();
                  expect(sameParade).to.be.an(Object);

                  sameParade.seq(Animal, function(err, sameAnimals){
                    expect(err).to.not.be.ok();
                    expect(sameAnimals).to.be.an(Object);
                    expect(sameAnimals.count).to.be(3);
                    expect(sameAnimals.first()).to.have.property('name', 'tiger');
                    expect(animals.count).to.be(3);

                    sameAnimals.on('resynced:', function(){
                      expect(sameAnimals.count).to.be(3);

                      sameParade.release();
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

    it('push item to sequence propagates to other sequences', function(done){
      Parade.findById(parade.id(), function(err, mirrorParade){
        mirrorParade.keepSynced();
    
        parade.seq(Animal, function(err, animals){
          expect(animals).to.be.an(Object);
          expect(animals.count).to.be(0);
          animals.on('resynced:', function(){
            expect(animals.count).to.be(1);
            expect(animals.first()).to.have.property('name', 'fox');
            animals.release();
            mirrorParade.release();
            done();
          });

          mirrorParade.seq(Animal, function(err, animals){
            expect(err).to.not.be.ok();
            expect(animals).to.be.an(Object);
            var fox = new Animal({name:'fox'});
            animals.push(fox.autorelease(), function(err){
              expect(err).to.not.be.ok();
              expect(animals.first()).to.have.property('name', 'fox');
            });
          });
        });
      });
    });
  });

  describe('Unshift', function(){
    it('one item', function(done){
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        expect(animals.count).to.be(0);

        animals.unshift((new Animal({name:"tiger"})).autorelease(), function(err){
          expect(err).to.not.be.ok();
          expect(animals.first()).to.have.property('name', 'tiger');
          storageQueue.once('synced:', function(){

            Parade.findById(parade.id(), function(err, sameParade){
              expect(err).to.not.be.ok();
              expect(sameParade).to.be.an(Object);

              sameParade.seq(Animal, function(err, sameAnimals){
                expect(err).to.not.be.ok();
                expect(sameAnimals).to.be.an(Object);
                expect(sameAnimals.count).to.be(1);
                expect(animals.count).to.be(1);
                expect(sameAnimals.first()).to.have.property('name', 'tiger');

                sameAnimals.on('resynced:', function(){
                  expect(sameAnimals.count).to.be(1);

                  sameParade.release();
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

    it('many items', function(done){
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        expect(animals.count).to.be(0);

        animals.unshift((new Animal({name:"tiger"})).autorelease(), function(err){
          expect(animals.first()).to.have.property('name', 'tiger');
          animals.unshift((new Animal({name:"ant"})).autorelease(), function(err){
            expect(animals.first()).to.have.property('name', 'ant');
            animals.unshift((new Animal({name:"dog"})).autorelease(), function(err){
              expect(animals.count).to.be(3);
              expect(animals.first()).to.have.property('name', 'dog');
              expect(err).to.not.be.ok();
              storageQueue.once('synced:', function(){

                Parade.findById(parade.id(), function(err, sameParade){
                  expect(err).to.not.be.ok();
                  expect(sameParade).to.be.an(Object);

                  sameParade.seq(Animal, function(err, sameAnimals){
                    expect(err).to.not.be.ok();
                    expect(sameAnimals).to.be.an(Object);
                    expect(sameAnimals.count).to.be(3);
                    expect(sameAnimals.first()).to.have.property('name', 'dog');
                    expect(animals.count).to.be(3);

                    sameAnimals.on('resynced:', function(){
                      expect(sameAnimals.count).to.be(3);

                      sameParade.release();
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

    it('unshift item to sequence propagates to other sequences', function(done){
      Parade.findById(parade.id(), function(err, mirrorParade){
        mirrorParade.keepSynced();
    
        parade.seq(Animal, function(err, animals){
          expect(animals).to.be.an(Object);
          expect(animals.count).to.be(0);
          animals.on('resynced:', function(){
            expect(animals.count).to.be(1);
            expect(animals.first()).to.have.property('name', 'fox');
            animals.release();
            mirrorParade.release();
            done();
          });

          mirrorParade.seq(Animal, function(err, animals){
            expect(err).to.not.be.ok();
            expect(animals).to.be.an(Object);
            var fox = new Animal({name:'fox'});
            animals.unshift(fox.autorelease(), function(err){
              expect(err).to.not.be.ok();
              expect(animals.first()).to.have.property('name', 'fox');
            });
          });
        });
      });
    });
  });

  describe('Insert', function(){
    it('one item', function(done){
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        expect(animals.count).to.be(0);

        animals.insert(0, (new Animal({name:"tiger"})).autorelease(), function(err){
          expect(err).to.not.be.ok();
          expect(animals.first()).to.have.property('name', 'tiger');
          storageQueue.once('synced:', function(){

            Parade.findById(parade.id(), function(err, sameParade){
              expect(err).to.not.be.ok();
              expect(sameParade).to.be.an(Object);

              sameParade.seq(Animal, function(err, sameAnimals){
                expect(err).to.not.be.ok();
                expect(sameAnimals).to.be.an(Object);
                expect(sameAnimals.count).to.be(1);
                expect(animals.count).to.be(1);
                expect(sameAnimals.first()).to.have.property('name', 'tiger');

                sameAnimals.on('resynced:', function(){
                  expect(sameAnimals.count).to.be(1);

                  sameParade.release();
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

    it('many items', function(done){
      var a = ['ant', 'dog', 'tiger'];
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        expect(animals.count).to.be(0);

        animals.insert(0, (new Animal({name:"tiger"})).autorelease(), function(err){
          expect(animals.first()).to.have.property('name', 'tiger');
          animals.insert(0, (new Animal({name:"ant"})).autorelease(), function(err){
            expect(animals.first()).to.have.property('name', 'ant');
            animals.insert(1, (new Animal({name:"dog"})).autorelease(), function(err){
              expect(animals.count).to.be(3);
              expect(err).to.not.be.ok();
              storageQueue.once('synced:', function(){

                Parade.findById(parade.id(), function(err, sameParade){
                  expect(err).to.not.be.ok();
                  expect(sameParade).to.be.an(Object);

                  sameParade.seq(Animal, function(err, sameAnimals){
                    expect(err).to.not.be.ok();
                    expect(sameAnimals).to.be.an(Object);
                    expect(sameAnimals.count).to.be(3);
                    sameAnimals.each(function(animal, i){
                      expect(animal).to.have.property('name', a[i]);
                    });
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

  describe('End Points', function(){
    it('First', function(done){
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        expect(animals.count).to.be(0);

        animals.push((new Animal({name:"tiger"})).autorelease(), function(err){
          animals.push((new Animal({name:"fox"})).autorelease(), function(err){
            animals.push((new Animal({name:"eagle"})).autorelease(), function(err){
              expect(err).to.not.be.ok();
              expect(animals.count).to.be(3);
              var item = animals.first();
              expect(item).to.have.property('name', 'tiger');
              storageQueue.once('synced:', function(){

                Parade.findById(parade.id(), function(err, sameParade){
                  expect(err).to.not.be.ok();
                  expect(sameParade).to.be.an(Object);

                  sameParade.seq(Animal, function(err, sameAnimals){
                    expect(err).to.not.be.ok();
                    expect(sameAnimals).to.be.an(Object);
                  //expect(sameAnimals.count).to.be(3); // Outcommented until fix for Resync.

                    sameAnimals.on('resynced:', function(){
                      expect(sameAnimals.count).to.be(3);
                      var sameItem = sameAnimals.first();
                      expect(sameItem).to.have.property('name', 'tiger');

                      sameParade.release();
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
    it('Last', function(done){
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);
        expect(animals.count).to.be(0);

        animals.push((new Animal({name:"tiger"})).autorelease(), function(err){
          animals.push((new Animal({name:"fox"})).autorelease(), function(err){
            animals.push((new Animal({name:"eagle"})).autorelease(), function(err){
              expect(err).to.not.be.ok();
              expect(animals.count).to.be(3);
              var item = animals.last();
              expect(item).to.have.property('name', 'eagle');
              storageQueue.once('synced:', function(){

                Parade.findById(parade.id(), function(err, sameParade){
                  expect(err).to.not.be.ok();
                  expect(sameParade).to.be.an(Object);

                  sameParade.seq(Animal, function(err, sameAnimals){
                    expect(err).to.not.be.ok();
                    expect(sameAnimals).to.be.an(Object);
                  //expect(sameAnimals.count).to.be(3); // Outcommented until fix for Resync.

                    sameAnimals.on('resynced:', function(){
                      expect(sameAnimals.count).to.be(3);
                      var sameItem = sameAnimals.last();
                      expect(sameItem).to.have.property('name', 'eagle');

                      sameParade.release();
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

  describe('Traversal', function(){
    it('each', function(done){
      var a = ['tiger', 'ant', 'dog'];
      parade.seq(Animal, function(err, animals){
        animals.push((new Animal({name:a[0]})).autorelease(), function(err){
          animals.push((new Animal({name:a[1]})).autorelease(), function(err){
            animals.push((new Animal({name:a[2]})).autorelease(), function(err){
              expect(animals.count).to.be(3);
              expect(err).to.not.be.ok();
              
              animals.each(function(animal, i){
                expect(animal).to.have.property('name', a[i]);
              });
              done();
            });
          });
        });
      });
    });
  });

  describe('Updating', function(){
    it('update item propagates to the same item in a sequence', function(done){
      parade.seq(Animal, function(err, animals){
        var tiger = new Animal({name: 'tiger'});
        animals.push(tiger, function(err){
          expect(err).to.be(null);
          tiger.on('changed:', function(args){
            expect(args).to.be.an(Object);
            expect(args).to.have.property('legs', 5);
            expect(animals.first()).to.have.property('legs', 5);
            animals.release();
            tiger.release();
            done();
          });

          storageQueue.once('synced:', function(){
            Animal.findById(tiger.id(), function(err, animal){
              expect(err).to.not.be.ok();
              animal.keepSynced();
              animal.set('legs', 5);
              animal.release();
            });
          });
        });
      });
    });
  
    it('sequence proxies add item event', function(done){
      parade.seq(Animal, function(err, animals){
        animals.push((new Animal({name:"panther"})).autorelease(), function(err){
          var panther = animals.find(function(item){ return item.name==='panther'; });

          expect(panther).to.be.an(Object);
          expect(panther).to.have.property('name', 'panther');

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
  describe('Remove', function(){
    it('remove item from sequence', function(done){
      parade.seq(Animal, function(err, animals){
        expect(err).to.not.be.ok();
        expect(animals).to.be.an(Object);

        animals.push(new Animal({name:"gorilla"}), function(err){
          expect(err).to.not.be.ok();

          var animal = animals.first();
          expect(animal).to.be.an(Object);
          animals.remove(0, function(err){
            var found = animals.find(function(item){return item.id() === animal.id();});
            expect(found).to.be(undefined);
            parade.seq(Animal, function(err, otherAnimals){
              expect(err).to.not.be.ok();
              expect(otherAnimals).to.be.an(Object);

              var found = otherAnimals.find(function(item){return item.id() === animal.id();});
              expect(found).to.be(undefined);
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
  
    it('sequence proxies delete item event', function(done){
      parade.seq(Animal, function(err, animals){
        var otherAnimal;

        animals.on('removed:', function(item){
          expect(item).to.be.an(Object);
          expect(item).to.have.property('_id');
          expect(item.id()).to.be.eql(otherAnimal.id());
          animals.release();
          done();
        });

        storageQueue.once('synced:', function(){
          Parade.findById(parade.id(), function(err, sameParade){
            expect(err).to.not.be.ok();
            expect(sameParade).to.be.an(Object);

            sameParade.keepSynced();
            sameParade.seq(Animal, function(err, otherAnimals){
              expect(err).to.not.be.ok();
              expect(otherAnimals).to.be.an(Object);

              otherAnimal = otherAnimals.first();
              otherAnimal.remove(function(err){
                expect(err).to.not.be.ok();
                otherAnimals.release();
              });
            });
          });
        });

        animals.push(new Animal({name:"koala"}), function(err){
          expect(err).to.not.be.ok();
        });
      });
    });
  
    it.skip('remove item with collections', function(done){
      done();
    });

  });
  
  // describe('Queries', function(){
  //   it('find models in collection limiting result', function(done){
  //     done();
  //   });

  //   it('find models in collection paginating', function(done){
  //     done();
  //   });
  //
  //   it('find models in collection sorting and paginating', function(done){
  //     done();
  //   });
  // });
//
});

});
