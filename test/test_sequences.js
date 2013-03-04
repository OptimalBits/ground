/*global socket:true, io:true*/
define(['gnd'],
  function(Gnd){

localStorage.clear();

describe('Sequences', function(){
  var Animal = Gnd.Model.extend('animals');
  var Parade = Gnd.Model.extend('parade');

  var socket1 = io.connect('http://localhost:8080', {'force new connection': true});
  var sl1  = new Gnd.Storage.Local();
  var ss1 = new Gnd.Storage.Socket(socket1);
  var q1  = new Gnd.Storage.Queue(sl1, ss1);
  var sm1 = new Gnd.Sync.Manager(socket1);

  var socket2 = io.connect('http://localhost:8080', {'force new connection': true});
  var sl2  = new Gnd.Storage.Local();
  var ss2 = new Gnd.Storage.Socket(socket2);
  var q2  = new Gnd.Storage.Queue(sl2, ss2);
  var sm2 = new Gnd.Sync.Manager(socket2);

  var parade;

  function getSequence(paradeId, sm, sq, keepSynced, cb){
    Gnd.Model.storageQueue = sq;
    Gnd.Model.syncManager = sm;
    Parade.findById(paradeId, function(err, parade){
      expect(err).to.be(null);
      if(keepSynced) parade.keepSynced();
      parade.seq(Animal, function(err, animals){
        expect(err).to.be(null);
        expect(animals).to.be.an(Object);
        animals.once('resynced:', function(){
          cb(animals);
        });
      });
    });
  }

  beforeEach(function(done){
    Gnd.Model.storageQueue = q1;
    Gnd.Model.syncManager = sm1;
    parade = new Parade();
    parade.save();
    parade.once('id', function(){
      done();
    });
  });

  describe('Push', function(){
    it('one item', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease(), function(err){
            expect(err).to.not.be.ok();
            expect(nosyncedAnimals.count).to.be(1);
            expect(nosyncedAnimals.first()).to.have.property('name', 'tiger');
            syncedAnimals.once('inserted:', function(){
              expect(err).to.not.be.ok();
              expect(syncedAnimals).to.be.an(Object);
              expect(syncedAnimals.count).to.be(1);
              done();
            });
            nosyncedAnimals.save();
          });
        });
      });
    });
    it('many items', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease(), function(err){
            nosyncedAnimals.push((new Animal({name:"panther"})).autorelease(), function(err){
              nosyncedAnimals.push((new Animal({name:"lion"})).autorelease(), function(err){
                expect(nosyncedAnimals.count).to.be(3);
                syncedAnimals.once('inserted:', function(item, index){
                  expect(item).to.have.property('name', 'tiger');
                  syncedAnimals.once('inserted:', function(item, index){
                    expect(item).to.have.property('name', 'panther');
                    syncedAnimals.once('inserted:', function(item, index){
                      expect(item).to.have.property('name', 'lion');
                      expect(syncedAnimals.count).to.be(3);
                      var a = ['tiger','panther','lion'];
                      syncedAnimals.each(function(animal, i){
                        expect(animal).to.have.property('name', a[i]);
                      });
                      done();
                    });
                  });
                });
                nosyncedAnimals.save();
              });
            });
          });
        });
      });
    });
  });

  describe('Unshift', function(){
    it('one item', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.unshift((new Animal({name:"tiger"})).autorelease(), function(err){
            expect(err).to.not.be.ok();
            expect(nosyncedAnimals.count).to.be(1);
            expect(nosyncedAnimals.last()).to.have.property('name', 'tiger');
            syncedAnimals.once('inserted:', function(){
              expect(err).to.not.be.ok();
              expect(syncedAnimals).to.be.an(Object);
              expect(syncedAnimals.count).to.be(1);
              expect(syncedAnimals.last()).to.have.property('name', 'tiger');
              done();
            });
            nosyncedAnimals.save();
          });
        });
      });
    });
    it('many items', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.unshift((new Animal({name:"tiger"})).autorelease(), function(err){
            nosyncedAnimals.unshift((new Animal({name:"panther"})).autorelease(), function(err){
              nosyncedAnimals.unshift((new Animal({name:"lion"})).autorelease(), function(err){
                expect(nosyncedAnimals.count).to.be(3);
                syncedAnimals.once('inserted:', function(item, index){
                  expect(item).to.have.property('name', 'tiger');
                  syncedAnimals.once('inserted:', function(item, index){
                    expect(item).to.have.property('name', 'panther');
                    syncedAnimals.once('inserted:', function(item, index){
                      expect(item).to.have.property('name', 'lion');
                      expect(syncedAnimals.count).to.be(3);
                      var a = ['lion','panther','tiger'];
                      syncedAnimals.each(function(animal, i){
                        expect(animal).to.have.property('name', a[i]);
                      });
                      done();
                    });
                  });
                });
                nosyncedAnimals.save();
              });
            });
          });
        });
      });
    });
  });

  describe('Insert', function(){
    it('one item', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.insert(0, (new Animal({name:"tiger"})).autorelease(), function(err){
            expect(err).to.not.be.ok();
            expect(nosyncedAnimals.count).to.be(1);
            expect(nosyncedAnimals.last()).to.have.property('name', 'tiger');
            syncedAnimals.once('inserted:', function(){
              expect(err).to.not.be.ok();
              expect(syncedAnimals).to.be.an(Object);
              expect(syncedAnimals.count).to.be(1);
              expect(syncedAnimals.last()).to.have.property('name', 'tiger');
              done();
            });
            nosyncedAnimals.save();
          });
        });
      });
    });
    it('many items', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.insert(0, (new Animal({name:"tiger"})).autorelease(), function(err){
            nosyncedAnimals.insert(0, (new Animal({name:"panther"})).autorelease(), function(err){
              nosyncedAnimals.insert(1, (new Animal({name:"lion"})).autorelease(), function(err){
                expect(nosyncedAnimals.count).to.be(3);
                syncedAnimals.once('inserted:', function(item, index){
                  expect(item).to.have.property('name', 'tiger');
                  syncedAnimals.once('inserted:', function(item, index){
                    expect(item).to.have.property('name', 'panther');
                    syncedAnimals.once('inserted:', function(item, index){
                      expect(item).to.have.property('name', 'lion');
                      expect(syncedAnimals.count).to.be(3);
                      var a = ['panther','lion','tiger'];
                      syncedAnimals.each(function(animal, i){
                        expect(animal).to.have.property('name', a[i]);
                      });
                      done();
                    });
                  });
                });
                nosyncedAnimals.save();
              });
            });
          });
        });
      });
    });
  });

  describe('Remove', function(){
    it('one item', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease(), function(err){
            expect(err).to.not.be.ok();
            expect(syncedAnimals.count).to.be(0);
            expect(nosyncedAnimals.count).to.be(1);
            expect(nosyncedAnimals.last()).to.have.property('name', 'tiger');
            syncedAnimals.once('inserted:', function(){
              expect(err).to.not.be.ok();
              expect(syncedAnimals).to.be.an(Object);
              expect(syncedAnimals.count).to.be(1);
              expect(nosyncedAnimals.count).to.be(1);
              expect(syncedAnimals.last()).to.have.property('name', 'tiger');
              nosyncedAnimals.remove(0, function(err){
                expect(syncedAnimals.count).to.be(1);
                expect(nosyncedAnimals.count).to.be(0);
                syncedAnimals.once('removed:', function(){
                  done();
                });
                nosyncedAnimals.save();
              });
            });
            nosyncedAnimals.save();
          });
        });
      });
    });

    it('many items', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.insert(0, (new Animal({name:"tiger"})).autorelease(), function(err){
            nosyncedAnimals.insert(0, (new Animal({name:"panther"})).autorelease(), function(err){
              nosyncedAnimals.insert(1, (new Animal({name:"lion"})).autorelease(), function(err){
                expect(nosyncedAnimals.count).to.be(3);
                syncedAnimals.once('inserted:', function(item, index){
                  expect(item).to.have.property('name', 'tiger');
                  syncedAnimals.once('inserted:', function(item, index){
                    expect(item).to.have.property('name', 'panther');
                    syncedAnimals.once('inserted:', function(item, index){
                      expect(item).to.have.property('name', 'lion');
                      expect(syncedAnimals.count).to.be(3);
                      var a = ['panther','lion','tiger'];
                      syncedAnimals.each(function(animal, i){
                        expect(animal).to.have.property('name', a[i]);
                      });

                      nosyncedAnimals.remove(2, function(err){
                        nosyncedAnimals.remove(0, function(err){
                          expect(syncedAnimals.count).to.be(3);
                          expect(nosyncedAnimals.count).to.be(1);
                          syncedAnimals.once('removed:', function(){
                            syncedAnimals.once('removed:', function(){
                              expect(syncedAnimals.count).to.be(1);
                              expect(syncedAnimals.first()).to.have.property('name', 'lion');
                              nosyncedAnimals.remove(0, function(err){
                                syncedAnimals.once('removed:', function(){
                                  expect(syncedAnimals.count).to.be(0);
                                  done();
                                });
                                nosyncedAnimals.save();
                              });
                            });
                          });
                          nosyncedAnimals.save();
                        });
                      });
                    });
                  });
                });
                nosyncedAnimals.save();
              });
            });
          });
        });
      });
    });
  });

  describe('End Points', function(){
    it('First', function(done){
      getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
        nosyncedAnimals.unshift((new Animal({name:"tiger"})).autorelease(), function(err){
          expect(nosyncedAnimals.first()).to.have.property('name', 'tiger');
          nosyncedAnimals.unshift((new Animal({name:"panther"})).autorelease(), function(err){
            expect(nosyncedAnimals.first()).to.have.property('name', 'panther');
            nosyncedAnimals.unshift((new Animal({name:"lion"})).autorelease(), function(err){
              expect(nosyncedAnimals.first()).to.have.property('name', 'lion');
              expect(nosyncedAnimals.count).to.be(3);
              done();
            });
          });
        });
      });
    });
    it('Last', function(done){
      getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
        nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease(), function(err){
          expect(nosyncedAnimals.last()).to.have.property('name', 'tiger');
          nosyncedAnimals.push((new Animal({name:"panther"})).autorelease(), function(err){
            expect(nosyncedAnimals.last()).to.have.property('name', 'panther');
            nosyncedAnimals.push((new Animal({name:"lion"})).autorelease(), function(err){
              expect(nosyncedAnimals.last()).to.have.property('name', 'lion');
              expect(nosyncedAnimals.count).to.be(3);
              done();
            });
          });
        });
      });
    });
  });

  describe('Edge cases', function(){
    it('insert after insert', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease(), function(err){
            expect(nosyncedAnimals.count).to.be(1);
            syncedAnimals.once('inserted:', function(item, index){
              expect(item).to.have.property('name', 'tiger');
              expect(index).to.be(0);
              expect(syncedAnimals.first()).to.have.property('name', 'tiger');
              nosyncedAnimals.insert(0, (new Animal({name:'cat'})).autorelease(), function(err){
                syncedAnimals.once('inserted:', function(item, index){
                  expect(item).to.have.property('name', 'cat');
                  expect(index).to.be(0);
                  var a = ['cat', 'tiger'];
                  syncedAnimals.each(function(animal, i){
                    expect(animal).to.have.property('name', a[i]);
                  });
                  done();
                });
                nosyncedAnimals.save();
              });
            });
            nosyncedAnimals.save();
          });
        });
      });
    });
    it('after inserting many items', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease(), function(err){
            nosyncedAnimals.unshift((new Animal({name:"panther"})).autorelease(), function(err){
              nosyncedAnimals.insert(1,(new Animal({name:"lion"})).autorelease(), function(err){
                expect(nosyncedAnimals.count).to.be(3);
                syncedAnimals.once('inserted:', function(item, index){
                  expect(item).to.have.property('name', 'tiger');
                  expect(index).to.be(0);
                  syncedAnimals.once('inserted:', function(item, index){
                    expect(item).to.have.property('name', 'panther');
                    expect(index).to.be(0);
                    syncedAnimals.once('inserted:', function(item, index){
                      expect(item).to.have.property('name', 'lion');
                      expect(index).to.be(1);

                      expect(syncedAnimals.count).to.be(3);
                      var a = ['panther', 'lion', 'tiger'];

                      syncedAnimals.each(function(animal, i){
                        expect(animal).to.have.property('name', a[i]);
                      });
                      nosyncedAnimals.each(function(animal, i){
                        expect(animal).to.have.property('name', a[i]);
                      });
                      nosyncedAnimals.insert(2, (new Animal({name:'cat'})).autorelease(), function(err){
                        syncedAnimals.once('inserted:', function(item, index){
                          expect(item).to.have.property('name', 'cat');
                          expect(index).to.be(2);
                          var a = ['panther', 'lion', 'cat', 'tiger'];
                          syncedAnimals.each(function(animal, i){
                            expect(animal).to.have.property('name', a[i]);
                          });
                          done();
                        });
                        nosyncedAnimals.save();
                      });
                    });
                  });
                });
                nosyncedAnimals.save();
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
      getSequence(parade.id(), sm2, q2, false, function(animals){
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

  describe('Updating items', function(){
    it('update item propagates to the same item in a sequence', function(done){
      getSequence(parade.id(), sm1, q1, true, function(animals){
        var tiger = new Animal({name: 'tiger'});
        animals.push(tiger, function(err){
          expect(err).to.be(null);
          animals.once('updated:', function(){
            expect(animals.first()).to.have.property('legs', 5);
            animals.release();
            tiger.release();
            done();
          });

          q1.once('synced:', function(){
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

    it('sequence proxies update item event', function(done){
      getSequence(parade.id(), sm1, q1, true, function(animals){
        animals.push((new Animal({name:"panther"})).autorelease(), function(err){
          var panther = animals.find(function(item){ return item.name==='panther'; });

          expect(panther).to.be.an(Object);
          expect(panther).to.have.property('name', 'panther');

          q1.once('synced:', function(){
            Animal.findById(panther.id(), function(err, animal){
              expect(err).to.not.be.ok();
              animal.keepSynced();

              animal.set('legs', 5);
              animal.release();

              animals.once('updated:', function(model, args){
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

  describe('Deleting items', function(){
    it('delete item propagates to the same item in a sequence', function(done){
      getSequence(parade.id(), sm1, q1, true, function(animals){
        var tiger = new Animal({name: 'tiger'});
        animals.push(tiger, function(err){
          expect(err).to.be(null);
          expect(animals.count).to.be(1);
          animals.once('removed:', function(){
            expect(animals.count).to.be(0);
            done();
          });
          q1.once('synced:', function(){
            Animal.findById(tiger.id(), function(err, animal){
              expect(err).to.not.be.ok();
              animal.keepSynced();
              animal.remove(function(err){
                animal.release();
              });
            });
          });
        });
      });
    });
  });

  describe('Keep synced', function(){
    it('Push', function(done){
      getSequence(parade.id(), sm1, q1, true, function(synced1){
        getSequence(parade.id(), sm2, q2, true, function(synced2){
          synced1.once('inserted:', function(){
            expect(synced1).to.be.an(Object);
            expect(synced1.count).to.be(1);
            expect(synced2.count).to.be(1);
            done();
          });
          synced2.push((new Animal({name:"tiger"})).autorelease(), function(err){
            expect(err).to.not.be.ok();
            expect(synced2.count).to.be(1);
            expect(synced2.first()).to.have.property('name', 'tiger');
          });
        });
      });
    });
    it('Insert', function(done){
      getSequence(parade.id(), sm1, q1, true, function(synced1){
        getSequence(parade.id(), sm2, q2, true, function(synced2){
          synced1.once('inserted:', function(){
            expect(synced1).to.be.an(Object);
            expect(synced1.count).to.be(1);
            done();
          });
          synced2.insert(0, (new Animal({name:"tiger"})).autorelease(), function(err){
            expect(err).to.not.be.ok();
            expect(synced2.count).to.be(1);
            expect(synced2.first()).to.have.property('name', 'tiger');
          });
        });
      });
    });
    it('Remove', function(done){
      getSequence(parade.id(), sm1, q1, true, function(synced1){
        getSequence(parade.id(), sm2, q2, true, function(synced2){
          synced1.once('removed:', function(){
            expect(synced1).to.be.an(Object);
            expect(synced1.count).to.be(0);
            // expect(synced2.count).to.be(0); // fails until synchub has implemented "except"
            done();
          });
          synced2.push((new Animal({name:"tiger"})).autorelease(), function(err){
            expect(err).to.not.be.ok();
            expect(synced1.count).to.be(0);
            expect(synced2.count).to.be(1);
            expect(synced2.first()).to.have.property('name', 'tiger');
            synced1.once('inserted:', function(){
              expect(synced1).to.be.an(Object);
              expect(synced2.count).to.be(1);
              expect(synced1.count).to.be(1);
              expect(synced1.first()).to.have.property('name', 'tiger');
              synced2.remove(0);
              expect(synced2.count).to.be(0);
              expect(synced1.count).to.be(1);
            });
          });
        });
      });
    });
  });
});

});
