/*global socket:true, io:true*/
define(['gnd', 'fixtures/models'], function(Gnd, models){
"use strict";

localStorage.clear();

describe('Sequence Datatype', function(){
  var Animal = models.Animal;
  var Parade = models.Parade;
  
  var parade;
  
  var socket1, sl1, ss1, q1, sm1;
  var socket2, sl2, ss2, q2, sm2;
  
  before(function(done){
    socket1 = io.connect('/', {'force new connection': true});
    sl1  = new Gnd.Storage.Local();
    ss1 = new Gnd.Storage.Socket(socket1);
    q1  = new Gnd.Storage.Queue(sl1, ss1);
    sm1 = new Gnd.Sync.Manager(socket1);
    
    socket1.on('connect', function(){
      socket2 = io.connect('/', {'force new connection': true});
      sl2  = new Gnd.Storage.Local();
      ss2 = new Gnd.Storage.Socket(socket2);
      q2  = new Gnd.Storage.Queue(sl2, ss2);
      sm2 = new Gnd.Sync.Manager(socket2);
      socket2.on('connect', function(){
        done();
      })
    });
  });

  function getSequence(paradeId, sm, sq, keepSynced, seqName, cb){
    if(!cb){
      cb = seqName;
      seqName = 'animals';
    }

    Gnd.using.storageQueue = sq;
    Gnd.using.syncManager = sm;
    
    Parade.findById(paradeId).then(function(parade){
      if(keepSynced) parade.keepSynced();
      // parade.get('animals').then(function(animals){
      // })
      parade.seq(Animal, seqName).then(function(animals){
        expect(animals).to.be.an(Object);
        if(keepSynced){
          sq.waitUntilSynced(function(){
            cb(animals);
          });
        }else{
          cb(animals);
        }
      });
    });
  }

  beforeEach(function(done){
    this.timeout(15000);
    Gnd.using.storageQueue = q1;
    Gnd.using.syncManager = sm1;
    parade = Parade.create();
    parade.once('persisted:', function(){
      done();
    });
    parade.save();
  });

  describe('Push', function(){
    it('one item', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
            expect(err).to.not.be.ok();
            expect(nosyncedAnimals.count).to.be(1);
            expect(nosyncedAnimals.first()).to.have.property('name', 'tiger');
            syncedAnimals.once('inserted:', function(){
              expect(err).to.not.be.ok();
              expect(syncedAnimals).to.be.an(Object);
              expect(syncedAnimals.count).to.be(1);
              syncedAnimals.release();
              nosyncedAnimals.release();
              done();
            });
            nosyncedAnimals.save();
          });
        });
      });
    });
    it('two items', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
            nosyncedAnimals.push((new Animal({name:"panther"})).autorelease()).then(function(err){
              expect(nosyncedAnimals.count).to.be(2);
              syncedAnimals.once('inserted:', function(item, index){
                expect(item).to.have.property('name', 'tiger');
                syncedAnimals.once('inserted:', function(item, index){
                  expect(item).to.have.property('name', 'panther');
                  expect(syncedAnimals.count).to.be(2);
                  var a = ['tiger','panther'];
                  syncedAnimals.each(function(animal, i){
                    expect(animal).to.have.property('name', a[i]);
                  });
                  done();
                });
              });
              nosyncedAnimals.save();
            });
          });
        });
      });
    });
    it('many items', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
            nosyncedAnimals.push((new Animal({name:"panther"})).autorelease()).then(function(err){
              nosyncedAnimals.push((new Animal({name:"lion"})).autorelease()).then(function(err){
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
          nosyncedAnimals.unshift((new Animal({name:"tiger"})).autorelease()).then(function(err){
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
          nosyncedAnimals.unshift((new Animal({name:"tiger"})).autorelease()).then(function(err){
            nosyncedAnimals.unshift((new Animal({name:"panther"})).autorelease()).then(function(err){
              nosyncedAnimals.unshift((new Animal({name:"lion"})).autorelease()).then(function(err){
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
          nosyncedAnimals.insert(0, (new Animal({name:"tiger"})).autorelease()).then(function(err){
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
          nosyncedAnimals.insert(0, (new Animal({name:"tiger"})).autorelease()).then(function(err){
            nosyncedAnimals.insert(0, (new Animal({name:"panther"})).autorelease()).then(function(err){
              nosyncedAnimals.insert(1, (new Animal({name:"lion"})).autorelease()).then(function(err){
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

  describe('Move', function(){
    var seq;
    beforeEach(function(done){
      getSequence(parade.id(), sm1, q1, true, function(animals){
        Animal.create({name: 'tiger'}, true).then(function(animal){
          animals.push(animal).then(function(){
            Animal.create({name: 'dog'}, true).then(function(animal){
              animals.push(animal).then(function(){
                Animal.create({name: 'ant'}, true).then(function(animal){
                  animals.push(animal).then(function(){
                    Animal.create({name: 'shark'}, true).then(function(animal){
                      animals.push(animal).then(function(){
                        expect(animals.count).to.be(4);
                        q1.once('synced:', function(){
                          seq = animals;
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
    });

    describe('Simple moves', function(){
      it('first to last', function(done){
        var target = ['dog','ant','shark','tiger'];
        seq.move(0, 3).then(function(){
          seq.each(function(item, i){
            expect(item).to.have.property('name', target[i]);
          });
          done();
        });
      });
      it('last to first', function(done){
        var target = ['shark','tiger','dog','ant'];
        seq.move(3, 0).then(function(){
          seq.each(function(item, i){
            expect(item).to.have.property('name', target[i]);
          });
          done();
        });
      });
      it('one forward', function(done){
        var target = ['tiger','ant','dog','shark'];
        seq.move(1, 2).then(function(){
          seq.each(function(item, i){
            expect(item).to.have.property('name', target[i]);
          });
          done();
        });
      });
      it('one backward', function(done){
        var target = ['tiger','ant','dog','shark'];
        seq.move(2, 1).then(function(){
          seq.each(function(item, i){
            expect(item).to.have.property('name', target[i]);
          });
          done();
        });
      });
      it('same index', function(done){
        var target = ['tiger','dog','ant','shark'];
        seq.move(1, 1).then(function(){
          seq.each(function(item, i){
            expect(item).to.have.property('name', target[i]);
          });
          done();
        });
      });
    });
    describe('Complex moves', function(){
      it('Many rotations', function(){
        var target = ['tiger','dog','ant','shark'];
        return seq.move(0, 3).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          return seq.move(0, 3)
         }).then(function(){
          return seq.move(0, 3)
         }).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          return seq.move(0, 3);
         }).then(function(){
          seq.each(function(item, i){
            expect(item).to.have.property('name', target[i]);
          });
        });
      });
      it('Many rotations2', function(){
        this.timeout(5000)
        var target = ['tiger','dog','ant','shark'];
        return seq.move(0, 2).then(function(){
          return seq.move(0, 2);
        }).then(function(){
          return seq.move(0, 2);
        }).then(function(){
          return seq.move(1, 3);
        }).then(function(){
          return seq.move(1, 3);
        }).then(function(){
          return seq.move(1, 3);
        }).then(function(){
          return seq.move(0, 1);
        }).then(function(){
          return seq.move(0, 1);
        }).then(function(){
          return seq.move(1, 2);
        }).then(function(){
          return seq.move(1, 2)
        }).then(function(){
          return seq.move(2, 3);
        }).then(function(){
          return seq.move(2, 3);
        }).then(function(){
          return seq.each(function(item, i){
            expect(item).to.have.property('name', target[i]);
          });
        });
      });
    });
    describe('Index out of bounds', function(){
      it('source after', function(done){
        seq.move(10, 3).fail(function(){
          done();
        });
      });
      it('source before', function(done){
        seq.move(-10, 3).fail(function(){
          done();
        });
      });
      it('target before', function(done){
        seq.move(3, -10).fail(function(){
          done();
        });
      });
      it('target after', function(done){
        seq.move(0, 10).fail(function(){
          done();
        });
      });
    });
  });
  describe('Remove', function(){
    it('one item', function(done){
      getSequence(parade.id(), sm1, q1, true, function(syncedAnimals){
        getSequence(parade.id(), sm2, q2, false, function(nosyncedAnimals){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
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
              nosyncedAnimals.remove(0).then(function(err){
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
          nosyncedAnimals.insert(0, (new Animal({name:"tiger"})).autorelease()).then(function(err){
            nosyncedAnimals.insert(0, (new Animal({name:"panther"})).autorelease()).then(function(err){
              nosyncedAnimals.insert(1, (new Animal({name:"lion"})).autorelease()).then(function(err){
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

                      nosyncedAnimals.remove(2).then(function(err){
                        nosyncedAnimals.remove(0).then(function(err){
                          expect(syncedAnimals.count).to.be(3);
                          expect(nosyncedAnimals.count).to.be(1);
                          syncedAnimals.once('removed:', function(){
                            syncedAnimals.once('removed:', function(){
                              expect(syncedAnimals.count).to.be(1);
                              expect(syncedAnimals.first()).to.have.property('name', 'lion');
                              nosyncedAnimals.remove(0).then(function(err){
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
        nosyncedAnimals.unshift((new Animal({name:"tiger"})).autorelease()).then(function(err){
          expect(nosyncedAnimals.first()).to.have.property('name', 'tiger');
          nosyncedAnimals.unshift((new Animal({name:"panther"})).autorelease()).then(function(err){
            expect(nosyncedAnimals.first()).to.have.property('name', 'panther');
            nosyncedAnimals.unshift((new Animal({name:"lion"})).autorelease()).then(function(err){
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
        nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
          expect(nosyncedAnimals.last()).to.have.property('name', 'tiger');
          nosyncedAnimals.push((new Animal({name:"panther"})).autorelease()).then(function(err){
            expect(nosyncedAnimals.last()).to.have.property('name', 'panther');
            nosyncedAnimals.push((new Animal({name:"lion"})).autorelease()).then(function(err){
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
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
            expect(nosyncedAnimals.count).to.be(1);
            syncedAnimals.once('inserted:', function(item, index){
              expect(item).to.have.property('name', 'tiger');
              expect(index).to.be(0);
              expect(syncedAnimals.first()).to.have.property('name', 'tiger');
              nosyncedAnimals.insert(0, (new Animal({name:'cat'})).autorelease()).then(function(err){
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
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
            nosyncedAnimals.unshift((new Animal({name:"panther"})).autorelease()).then(function(err){
              nosyncedAnimals.insert(1,(new Animal({name:"lion"})).autorelease()).then(function(err){
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
                      nosyncedAnimals.insert(2, (new Animal({name:'cat'})).autorelease()).then(function(err){
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
    it('works after clearing local storage', function(done){
      getSequence(parade.id(), sm1, q1, true, function(animals){
        animals.push((new Animal({name: 'tiger'})).autorelease()).then(function(){
          q1.waitUntilSynced(function(){
            localStorage.clear();
            getSequence(parade.id(), sm2, q2, true, function(animals2){
              expect(animals2.count).to.be(1);
              done();
            });
          });
        });
      });
    });
    it('works after clearing remote storage', function(done){
      var paradeId = parade.id();
      Gnd.using.storageQueue = q1;
      Gnd.using.syncManager = sm1;
      Parade.findById(paradeId).then(function(parade){
        parade.keepSynced();
        parade.seq(Animal).then(function(animals){
          expect(animals).to.be.an(Object);
          animals.push((new Animal({name: 'tiger'})).autorelease()).then(function(){
            q1.waitUntilSynced(function(){
              var animalId = animals.items[0].id;
              ss1.deleteItem(['parade', paradeId, 'animals'], animalId, {}).then(function(){
                parade.seq(Animal).then(function(animals2){
                  expect(animals2.count).to.be(0);
                  done();
                });
              });
            });
          });
        });
      });
    });
    it('merges remote changes in items', function(done){
      var paradeId = parade.id();
      Gnd.using.storageQueue = q1;
      Gnd.using.syncManager = sm1;
      Parade.findById(paradeId).then(function(parade){
        parade.keepSynced();
        parade.seq(Animal).then(function(animals){
          expect(animals).to.be.an(Object);
          animals.push(Animal.create({name: 'tiger'})).then(function(){
            q1.waitUntilSynced(function(){
              var animalId = animals.items[0].model.id();
              ss1.put(['animals', animalId], {name: 'panther'}).then(function(){
                parade.seq(Animal).then(function(animals2){
                  expect(animals2.count).to.be(1);
                  expect(animals2.items[0].model.name).to.be('panther');
                  done();
                });
              });
            });
          });
        });
      });
    });
    it('other sequence name', function(done){
      getSequence(parade.id(), sm2, q2, false, 'animals2', function(nosyncedAnimals){
        nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
          nosyncedAnimals.push((new Animal({name:"panther"})).autorelease()).then(function(err){
            expect(nosyncedAnimals.count).to.be(2);
            q2.once('synced:', function(){
              getSequence(parade.id(), sm2, q2, true, 'animals2', function(syncedAnimals){
                expect(syncedAnimals.count).to.be(2);
               // syncedAnimals.once('resynced:', function(){
                  //TODO: when sequences are singletons resynced will never be called
                  expect(syncedAnimals.count).to.be(2);
                  done();
                  //});
              });
            });
            nosyncedAnimals.save();
          });
        });
      });
    });
    it('multi sequences', function(done){
      getSequence(parade.id(), sm2, q2, false, 'animals', function(nosyncedAnimals){
        getSequence(parade.id(), sm2, q2, false, 'animals2', function(nosyncedAnimals2){
          nosyncedAnimals.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
            expect(err).to.be(null);
            nosyncedAnimals.push((new Animal({name:"panther"})).autorelease()).then(function(err){
              expect(err).to.be(null);
              nosyncedAnimals2.push((new Animal({name:"duck"})).autorelease()).then(function(err){
                expect(err).to.be(null);
                nosyncedAnimals2.push((new Animal({name:"goose"})).autorelease()).then(function(err){
                  expect(err).to.be(null);
                  nosyncedAnimals2.push((new Animal({name:"turkey"})).autorelease()).then(function(err){
                    expect(err).to.be(null);
                    expect(nosyncedAnimals.count).to.be(2);
                    expect(nosyncedAnimals2.count).to.be(3);
                    q2.once('synced:', function(){
                      getSequence(parade.id(), sm2, q2, true, 'animals', function(syncedAnimals){
                        getSequence(parade.id(), sm2, q2, true, 'animals2', function(syncedAnimals2){
                          expect(syncedAnimals.count).to.be(2);
                          expect(syncedAnimals2.count).to.be(3);
                          //syncedAnimals2.once('resynced:', function(){
                            //TODO: when sequences are singletons resynced will never be called
                            expect(syncedAnimals.count).to.be(2);
                            expect(syncedAnimals2.count).to.be(3);
                            done();
                            //});
                        });
                      });
                    });
                    nosyncedAnimals.save();
                    nosyncedAnimals2.save();
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
      getSequence(parade.id(), sm2, q2, false, function(animals){
        animals.push((new Animal({name:a[0]})).autorelease()).then(function(err){
          animals.push((new Animal({name:a[1]})).autorelease()).then(function(err){
            animals.push((new Animal({name:a[2]})).autorelease()).then(function(err){
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
        Animal.create({name: 'tiger'}, true).then(function(tiger){
          animals.once('inserted:', function(){
            animals.once('updated:', function(){
              expect(animals.first()).to.have.property('legs', 5);
              animals.release();
              tiger.release();
              done();
            });
            Animal.findById(tiger.id()).then(function(animal){
              animal.keepSynced();
              animal.set('legs', 5);
              animal.release();
            });
          });
          animals.push(tiger);
        });
      });
    });

    it('sequence proxies update item event', function(done){
      getSequence(parade.id(), sm1, q1, true, function(animals){
        animals.once('inserted:', function(){
          var panther = animals.find(function(item){ return item.name==='panther'; });

          expect(panther).to.be.an(Object);
          expect(panther).to.have.property('name', 'panther');
          Animal.findById(panther.id()).then(function(animal){
            animal.keepSynced();
            animals.once('updated:', function(model, args){
              expect(args).to.be.an(Object);
              expect(args.legs).to.be(5);
              animals.release();
              done();
            });
            animal.set('legs', 5);
            animal.release();
          });
        });

        Animal.create({name: 'panther'}, true).then(function(panther){
          animals.push(panther);
        });
      });
    });
  });

  describe('Deleting items', function(){
    it('delete item propagates to the same item in a sequence', function(done){
      getSequence(parade.id(), sm1, q1, true, function(animals){
        Animal.create({name: 'tiger'}, true).then(function(tiger){
          animals.push(tiger).then(function(){
            expect(animals.count).to.be(1);
            animals.once('removed:', function(){
              expect(animals.count).to.be(0);
              done();
            });
            q1.once('synced:', function(){
              Animal.findById(tiger.id()).then(function(animal){
                animal.keepSynced();
                animal.remove().then(function(){
                  animal.release();
                });
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
          synced2.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
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
          synced2.insert(0, (new Animal({name:"tiger"})).autorelease()).then(function(err){
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
          synced2.push((new Animal({name:"tiger"})).autorelease()).then(function(err){
            expect(err).to.not.be.ok();
            expect(synced1.count).to.be(0);
            expect(synced2.count).to.be(1)
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
  
  describe('Offline', function(){
    it('Insert offline resyncs when going online', function(done){
      getSequence(parade.id(), sm1, q1, true, function(sequence){
        
        var tiger = Animal.create({name:"tiger"}, true);
        
        q1.waitUntilSynced(function(){
          socket.once('disconnect', function(){
            Gnd.Ajax.put('/parade/'+parade.id()+'/animals/'+tiger.id(), null).then(function() {
              sequence.once('inserted:', function(){
                expect(sequence.count).to.be(1);
                expect(sequence.first()).to.have.property('name', 'tiger');
                tiger.release();
                done();
              });
              
              socket.socket.connect();
            });
          });
          socket.disconnect();
        });
      });
    })
    
    it('Remove offline resyncs when going online', function(done){
      getSequence(parade.id(), sm1, q1, true, function(sequence){
        
        var tiger = Animal.create({name:"tiger"}, true);
        
        sequence.insert(0, tiger);
        
        q1.waitUntilSynced(function(){
          expect(sequence.count).to.be(1);
          expect(sequence.first()).to.have.property('name', 'tiger');
          
          socket.once('disconnect', function(){
            Gnd.Ajax.del('/parade/'+parade.id()+'/animals/'+sequence.items[0].id, null).then(function() {
              sequence.once('removed:', function(){
                expect(sequence.count).to.be(0);
                done();
              });
              
              socket.socket.connect();
            });
          });
          socket.disconnect();
        });
      });
    })
  });

  describe('Eventual consistency', function(){
    var socket3;
    var sl3;
    var ss3;
    var q3;
    var sm3;

    var seq;
    var seq2;
    var cow;
    var sheep;
    var cow2;
    var sheep2;

    before(function(done){
      socket3 = io.connect('/', {'force new connection': true});
      sl3  = new Gnd.Storage.Local(new Gnd.Storage.Store.MemoryStore());
      ss3 = new Gnd.Storage.Socket(socket3);
      q3  = new Gnd.Storage.Queue(sl3, ss3);
      sm3 = new Gnd.Sync.Manager(socket3);
      socket3.on('connect', done);
    });

    beforeEach(function(done){
      getSequence(parade.id(), sm1, q1, true, function(animals){
        Animal.create({name: 'tiger'}, true).then(function(animal){
          animals.push(animal).then(function(){
            Animal.create({name: 'dog'}, true).then(function(animal){
              animals.push(animal).then(function(){
                Animal.create({name: 'ant'}, true).then(function(animal){
                  animals.push(animal).then(function(){
                    Animal.create({name: 'shark'}, true).then(function(animal){
                      animals.push(animal).then(function(){
                        expect(animals.count).to.be(4);
                        q1.once('synced:', function(){
                          seq = animals;
                          cow = new Animal({name: 'cow'});
                          sheep = new Animal({name: 'cow'});
                          getSequence(parade.id(), sm3, q3, true, function(animals){
                            //Manually start sync with second sync manager
                            sm3.start(animals.getKeyPath());
                            seq2 = animals;
                            cow2 = new Animal({name: 'cow'});
                            sheep2 = new Animal({name: 'cow'});
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
      });
    });

    function seqEqual(s1, s2){
      var items2 = s2.filter(function() {return true});
      s1.each(function(item, i){
        expect(item).to.have.property('name', items2[i].name);
      });
    }

    function getLsIds(seq){
      var ls = seq.storageQueue.localStorage.store.get(seq.getKeyPath().join('@'));
      var s = [];
      function next(ls, i){
        var item = ls[i];
        if(item._id !== '##@_end'){
          s.push(item);
          next(ls, item.next);
        }
      }
      next(ls, ls[0].next);
      var res = [];
      _.each(s, function(item){
        if(item.sync && item.sync === 'insync') {
          res.push(item._id || item);
        }
      });
      return res;
    }

    describe('Consistent sequences', function(){
      it('Initial state equal', function(){
        seqEqual(seq, seq2);
      });
      it('Move propagate from one sequence to another', function(done){
        seq.move(0, 1).then(function(){
          seq2.once('inserted:', function(){
            seqEqual(seq, seq2);
            done();
          });
        });
      });
      it('Multiple moves propagate from one sequence to another', function(done){
        seq.move(0, 1).then(function(){
          seq.move(0, 2).then(function(){
            seq.move(0, 3).then(function(){
              seq.move(2, 3).then(function(){
                seq2.once('inserted:', function(){
                  seq2.once('inserted:', function(){
                    seq2.once('inserted:', function(){
                      seq2.once('inserted:', function(){
                        seqEqual(seq, seq2);
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
      it('remove propagates in both directions', function(done){
        seq.remove(0).then(function(){
          seq2.once('removed:', function(){
            seqEqual(seq, seq2);
            seq2.remove(0).then(function(){
              seq.once('removed:', function(){
                seqEqual(seq, seq2);
                done();
              });
            });
          });
        });
      });

      it('insert propagates in both directions', function(done){
        seq.push(cow).then(function(){
          seq2.once('inserted:', function(){
            seqEqual(seq, seq2);
            seq2.push(sheep2).then(function(){
              seq.once('inserted:', function(){
                seqEqual(seq, seq2);
                done();
              });
            });
          });
        });
      });
      it('Moves propagate in both directions', function(done){
        seq.move(0, 1).then(function(){
          seq2.once('inserted:', function(){
            seqEqual(seq, seq2);
            seq2.move(1, 0).then(function(){
              seq.once('inserted:', function(){
                seqEqual(seq, seq2);
                done();
              });
            });
          });
        });
      });
      it('Multiple moves propagate in both directions', function(done){
        seq.move(0, 1).then(function(){
          seq.move(0, 2).then(function(){
            seq.move(0, 3).then(function(){
              seq.move(2, 3).then(function(){
                seq2.once('inserted:', function(){
                  seq2.once('inserted:', function(){
                    seq2.once('inserted:', function(){
                      seq2.once('inserted:', function(){
                        seqEqual(seq, seq2);
                        seq2.move(0, 1).then(function(){
                          seq2.move(1, 3).then(function(){
                            seq2.move(2, 1).then(function(){
                              seq2.move(3, 1).then(function(){
                                seq.once('inserted:', function(){
                                  seq.once('inserted:', function(){
                                    seq.once('inserted:', function(){
                                      seq.once('inserted:', function(){
                                        seqEqual(seq, seq2);
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
                  });
                });
              });
            });
          });
        });
      });
      it('Simultaneous inserts leads to a consistent state', function(done){
        var numInserts = 6;
        var c = 0;
        var c2 = 0;
        function checkFinished() {
          if(c === numInserts && c2 === numInserts){
            console.log(_.pluck(seq.items, 'id'));
            console.log(_.pluck(seq2.items, 'id'));
            seq.off('inserted:', handleInsert);
            seq.off('inserted:', handleInsert2);
            seqEqual(seq, seq2);
            done();
          }
        }
        function handleInsert(){
          c++;
          // console.log('-1 '+c);
          checkFinished();
        }
        function handleInsert2(){
          c2++;
          // console.log('-2 '+c2);
          checkFinished();
        }
        seq.on('inserted:', handleInsert);
        seq2.on('inserted:', handleInsert2);

        seq.push(cow).then(function(){
          seq.push(sheep).then(function(){
            seq2.push(cow2).then(function(){
              seq2.push(sheep2).then(function(){
                seq.push(cow).then(function(){
                  seq.push(sheep).then(function(){
                  });
                });
              });
            });
          });
        });
      });
      it('Simultaneous deletes lead to a consistent state', function(done){
        var numDeletes = 4;
        var c = 0;
        var c2 = 0;
        function checkFinished() {
          if(c === numDeletes && c2 === numDeletes){
            console.log(_.pluck(seq.items, 'id'));
            console.log(_.pluck(seq2.items, 'id'));
            seq.off('removed:', handleRemove);
            seq.off('removed:', handleRemove2);
            seqEqual(seq, seq2);
            done();
          }
        }
        function handleRemove(){
          c++;
          // console.log('-1 '+c);
          checkFinished();
        }
        function handleRemove2(){
          c2++;
          // console.log('-2 '+c2);
          checkFinished();
        }
        seq.on('removed:', handleRemove);
        seq2.on('removed:', handleRemove2);

        console.log(_.pluck(seq.items, 'id'));
        seq.remove(3).then(function(){
          seq2.remove(2).then(function(){
            seq.remove(1).then(function(){
              seq2.remove(0).then(function(){

              });
            });
          });
        });
      });
      it('Simultaneous deletes of same index lead to a consistent state', function(done){
        var numDeletes = 2;
        var c = 0;
        var c2 = 0;
        function checkFinished() {
          if(c === numDeletes && c2 === numDeletes){
            console.log(_.pluck(seq.items, 'id'));
            console.log(_.pluck(seq2.items, 'id'));
            seq.off('removed:', handleRemove);
            seq.off('removed:', handleRemove2);
            seqEqual(seq, seq2);
            done();
          }
        }
        function handleRemove(){
          c++;
          // console.log('-1 '+c);
          checkFinished();
        }
        function handleRemove2(){
          c2++;
          // console.log('-2 '+c2);
          checkFinished();
        }
        seq.on('removed:', handleRemove);
        seq2.on('removed:', handleRemove2);

        console.log(_.pluck(seq.items, 'id'));
        seq.remove(2).then(function(){
          seq2.remove(2).then(function(){
            seq.remove(1).then(function(){
              seq2.remove(1).then(function(){

              });
            });
          });
        });
      });
      it('Simultaneous inserts and deletes lead to a consistent state', function(done){
        var numInserts = 3;
        var c = 0;
        var c2 = 0;
        function checkFinished() {
          if(c === numInserts && c2 === numInserts){
            console.log(_.pluck(seq.items, 'id'));
            console.log(_.map(seq.items, function(item){ return item.model.name; }));
            console.log(_.pluck(seq2.items, 'id'));
            console.log(_.map(seq2.items, function(item){ return item.model.name; }));
            seq.off('inserted:', handleInsert);
            seq.off('inserted:', handleInsert2);
            seqEqual(seq, seq2);
            done();
          }
        }
        function handleInsert(){
          c++;
          checkFinished();
        }
        function handleInsert2(){
          c2++;
          checkFinished();
        }
        seq.on('inserted:', handleInsert);
        seq2.on('inserted:', handleInsert2);

        console.log(_.pluck(seq.items, 'id'));
        seq.remove(0).then(function(){
          seq.push(cow).then(function(){
            console.log(_.pluck(seq.items, 'id'));
            seq2.remove(2).then(function(){
              seq2.insert(1, sheep2).then(function(){
                seq.remove(2).then(function(){
                  seq.insert(1, cow).then(function(){
                    console.log(_.pluck(seq2.items, 'id'));
                  });
                });
              });
            });
          });
        });
      });
      //Doesn't pass yet
      it.skip('Repeated moves lead to a consistent state', function(done){
        var count = 0;
        function inserted(){
          count++;
          if(count === 8){
            console.log(_.map(seq.items, function(item){return item.id;}));
            console.log(_.map(seq2.items, function(item){return item.id;}));
            seqEqual(seq, seq2);
            seq.off('inserted:', inserted);
            seq2.off('inserted:', inserted);
            done();
          }
          console.log(count);
        }
        seq.on('inserted:', inserted);
        seq2.on('inserted:', inserted);
        seq.move(0, 1).then(function(){
          seq2.move(2, 3).then(function(){
            seq.move(0, 1).then(function(){
              seq.move(0, 1).then(function(){
              });
            });
          });
        });
      });
    });
    describe('Consistent local storage', function(){
      it('Simultaneous moves lead to a consistent state', function(done){
        console.log(_.pluck(seq.items, 'id'));
        console.log(_.map(seq.items, function(item){ return item.model.name; }));
        seq.move(0, 1).then(function(){
          console.log(_.pluck(seq.items, 'id'));
          console.log(_.map(seq.items, function(item){ return item.model.name; }));
          seq2.move(2, 1).then(function(){
            console.log(_.pluck(seq2.items, 'id'));
            console.log(_.map(seq2.items, function(item){ return item.model.name; }));
            seq2.once('resynced:',function(){
              console.log(_.pluck(seq.items, 'id'));
              console.log(_.map(seq.items, function(item){ return item.model.name; }));
              console.log(_.pluck(seq2.items, 'id'));
              console.log(_.map(seq2.items, function(item){ return item.model.name; }));
              seqEqual(seq, seq2);
              done();
            }, 100);
          });
        });
      });
      it('Moves in both directions leads to a consistent local storage state', function(done){
        seq.move(0, 1).then(function(){
          seq2.once('inserted:', function(){
            seqEqual(seq, seq2);
            console.log(getLsIds(seq));
            console.log(getLsIds(seq2));
            expect(_.isEqual(getLsIds(seq), getLsIds(seq2))).to.be.ok();
            expect(_.isEqual(getLsIds(seq), _.map(seq2.items, function(item){return item.id;}))).to.be.ok();
            seq2.move(1, 0).then(function(){
              seq.once('inserted:', function(){
                seqEqual(seq, seq2);
                console.log(getLsIds(seq));
                console.log(getLsIds(seq2));
                expect(_.isEqual(getLsIds(seq), getLsIds(seq2))).to.be.ok();
                expect(_.isEqual(getLsIds(seq), _.map(seq2.items, function(item){return item.id;}))).to.be.ok();
                done();
              });
            });
          });
        });
      });
      it('Some moves in both directions leads to a consistent local storage state', function(done){
        seq2.move(2, 1).then(function(){
          seq.once('inserted:', function(){
            seq2.move(1, 3).then(function(){
              seq.once('inserted:', function(){
                seqEqual(seq, seq2);
                expect(_.isEqual(getLsIds(seq), getLsIds(seq2))).to.be.ok();
                expect(_.isEqual(getLsIds(seq), _.map(seq2.items, function(item){return item.id;}))).to.be.ok();
                done();
              });
            });
          });
        });
      });
      it('Many moves in both directions leads to a consistent local storage state', function(done){
        seq.move(0, 1).then(function(){
          seq2.once('inserted:', function(){
            seq.move(0, 2).then(function(){
              seq2.once('inserted:', function(){
                seq2.move(2, 1).then(function(){
                  seq.once('inserted:', function(){
                    seq2.move(3, 0).then(function(){
                      seq.once('inserted:', function(){
                        seq2.move(3, 0).then(function(){
                          seq.once('inserted:', function(){
                            seq2.move(3, 1).then(function(){
                              seq.once('inserted:', function(){
                                seq2.move(1, 3).then(function(){
                                  seq.once('inserted:', function(){
                                    seq2.move(2, 1).then(function(){
                                      seq.once('inserted:', function(){
                                        seq.move(0, 1).then(function(){
                                          seq2.once('inserted:', function(){
                                            seq.move(0, 1).then(function(){
                                              seq2.once('inserted:', function(){
                                                seq.move(1, 3).then(function(){
                                                  seq2.once('inserted:', function(){
                                                    console.log(_.map(seq.items, function(item){return item.id;}));
                                                    console.log(_.map(seq2.items, function(item){return item.id;}));
                                                    console.log(getLsIds(seq));
                                                    console.log(getLsIds(seq2));
                                                    seqEqual(seq, seq2);
                                                    expect(_.isEqual(getLsIds(seq), getLsIds(seq2))).to.be.ok();
                                                    expect(_.isEqual(getLsIds(seq), _.map(seq2.items, function(item){return item.id;}))).to.be.ok();
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
          });
        });
      });
      it('Repeated moves lead to a consistent local storage state', function(done){
        var count = 0;
        function inserted(){
          count++;
          if(count === 5){
            console.log(_.map(seq.items, function(item){return item.id;}));
            console.log(_.map(seq2.items, function(item){return item.id;}));
            console.log(getLsIds(seq));
            console.log(getLsIds(seq2));
            seqEqual(seq, seq2);
            expect(_.isEqual(getLsIds(seq), getLsIds(seq2))).to.be.ok();
            expect(_.isEqual(getLsIds(seq), _.map(seq2.items, function(item){return item.id;}))).to.be.ok();
            seq2.off('inserted:', inserted);
            done();
          }
        }
        seq2.on('inserted:', inserted);
        seq.move(0, 1).then(function(){
          seq.move(0, 1).then(function(){
            seq.move(0, 1).then(function(){
              seq.move(0, 1).then(function(){
                seq.move(1, 0).then(function(){
                });
              });
            });
          });
        });
      });
    });
  });
  describe('Generic Sequence Merging', function(){
    describe('Simple arrays', function(){
      var fns = {
        id: function(item){
          return item;
        },
        docId: function(item){
          return item;
        },
        keyPath: function(item){
          return 'keypath@'+item;
        },
        doc: function(item){
          return 'doc:'+item;
        },
        inSync: function(item){
          return true;
        }
      };
      describe('Insertion', function(){
        it('append item', function(){
          var source = [1,2,3,4,5];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(5);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 5);
          expect(commands[0]).to.have.property('refId', null);
        });
        it('prepend item', function(){
          var source = [5,1,2,3,4];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(5);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 5);
          expect(commands[0]).to.have.property('refId', 1);
        });
        it('insert item', function(){
          var source = [1,2,5,3,4];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(5);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 5);
          expect(commands[0]).to.have.property('refId', 3);
        });
        it('insert multiple items', function(){
          var source = [6,1,2,5,3,4,7];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(7);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 6);
          expect(commands[0]).to.have.property('refId', 1);
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 5);
          expect(commands[1]).to.have.property('refId', 3);
          expect(commands[2]).to.have.property('cmd', 'insertBefore');
          expect(commands[2]).to.have.property('newId', 7);
          expect(commands[2]).to.have.property('refId', null);
        });
        it('insert subsequence', function(){
          var source = [1,2,5,6,7,3,4];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(7);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 5);
          expect(commands[0]).to.have.property('refId', 3);
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 6);
          expect(commands[1]).to.have.property('refId', 3);
          expect(commands[2]).to.have.property('cmd', 'insertBefore');
          expect(commands[2]).to.have.property('newId', 7);
          expect(commands[2]).to.have.property('refId', 3);
        });
        it('insert into empty sequence', function(){
          var source = [1,2];
          var target = [];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(2);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 1);
          expect(commands[0]).to.have.property('refId', null);
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 2);
          expect(commands[1]).to.have.property('refId', null);
        });
      });
      describe('Removal', function(){
        it('remove last', function(){
          var source = [1,2,3];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(4);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 4);
        });
        it('remove first', function(){
          var source = [2,3,4];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(4);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 1);
        });
        it('remove middle', function(){
          var source = [1,4];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(4);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 2);
          expect(commands[1]).to.have.property('cmd', 'removeItem');
          expect(commands[1]).to.have.property('id', 3);
        });
        it('remove all', function(){
          var source = [];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(4);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 1);
          expect(commands[1]).to.have.property('cmd', 'removeItem');
          expect(commands[1]).to.have.property('id', 2);
          expect(commands[2]).to.have.property('cmd', 'removeItem');
          expect(commands[2]).to.have.property('id', 3);
          expect(commands[3]).to.have.property('cmd', 'removeItem');
          expect(commands[3]).to.have.property('id', 4);
        });
      });
      describe('Moving items around', function(){
        it('move left to right', function(){
          var source = [2,3,4,1];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(7);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 2);
          expect(commands[1]).to.have.property('cmd', 'removeItem');
          expect(commands[1]).to.have.property('id', 3);
          expect(commands[2]).to.have.property('cmd', 'removeItem');
          expect(commands[2]).to.have.property('id', 4);
          expect(commands[3]).to.have.property('cmd', 'insertBefore');
          expect(commands[3]).to.have.property('newId', 2);
          expect(commands[3]).to.have.property('refId', 1);
          expect(commands[4]).to.have.property('cmd', 'insertBefore');
          expect(commands[4]).to.have.property('newId', 3);
          expect(commands[4]).to.have.property('refId', 1);
          expect(commands[5]).to.have.property('cmd', 'insertBefore');
          expect(commands[5]).to.have.property('newId', 4);
          expect(commands[5]).to.have.property('refId', 1);
          expect(commands[6]).to.have.property('cmd', 'update');
        });
        it('move right to left', function(){
          var source = [4,1,2,3];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(5);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 4);
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 4);
          expect(commands[1]).to.have.property('refId', 1);
          expect(commands[2]).to.have.property('cmd', 'update');
          expect(commands[3]).to.have.property('cmd', 'update');
          expect(commands[4]).to.have.property('cmd', 'update');
        });
        it('move multiple', function(){
          var source = [3,1,4,2];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(6);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 3);
          expect(commands[1]).to.have.property('cmd', 'removeItem');
          expect(commands[1]).to.have.property('id', 4);
          expect(commands[2]).to.have.property('cmd', 'insertBefore');
          expect(commands[2]).to.have.property('newId', 3);
          expect(commands[2]).to.have.property('refId', 1);
          expect(commands[3]).to.have.property('cmd', 'insertBefore');
          expect(commands[3]).to.have.property('newId', 4);
          expect(commands[3]).to.have.property('refId', 2);
          expect(commands[4]).to.have.property('cmd', 'update');
          expect(commands[5]).to.have.property('cmd', 'update');
        });
      });
      describe('Replacing items', function(){
        it('Replacing one item', function(){
          var source = [1,2,5,4];
          var target = [1,2,3,4];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(5);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 3);
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 5);
          expect(commands[1]).to.have.property('refId', 4);
        });
        it('Replacing all items', function(){
          var source = [5,6];
          var target = [1,2];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(4);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 1);
          expect(commands[1]).to.have.property('cmd', 'removeItem');
          expect(commands[1]).to.have.property('id', 2);
          expect(commands[2]).to.have.property('cmd', 'insertBefore');
          expect(commands[2]).to.have.property('newId', 5);
          expect(commands[2]).to.have.property('refId', null);
          expect(commands[2]).to.have.property('cmd', 'insertBefore');
          expect(commands[3]).to.have.property('newId', 6);
          expect(commands[3]).to.have.property('refId', null);
        });
      });
      describe('Pending items', function(){
        var fns2 = {
          id: function(item){
            return item.id;
          },
          docId: function(item){
            return item.id;
          },
          keyPath: function(item){
            return 'keypath@'+item;
          },
          doc: function(item){
            return 'doc:'+item;
          },
          inSync: function(item){
            return item.insync;
          }
        };
        it('A pending item should be kept', function(){
          var source = [{id:1,insync:true},{id:2,insync:true}];
          var target = [{id:1,insync:true},{id:2,insync:false},{id:2,insync:true}];
          var commands = Gnd.Sequence.merge(source, target, fns2);
          expect(commands.length).to.be(2);
        });
        it('All pending items should be kept', function(){
          var source = [];
          var target = [{id:1,insync:false},{id:2,insync:false},{id:2,insync:false}];
          var commands = Gnd.Sequence.merge(source, target, fns2);
          expect(commands.length).to.be(0);
        });
        // it('Pending items should be overwritten', function(){
        //   // var source = [{id:1,insync:true}];
        //   var target = [{id:1,insync:false},{id:2,insync:false},{id:2,insync:false}];
        //   var commands = Gnd.Sequence.merge(source, target, fns2);
        //   expect(commands.length).to.be(0);
        // });
      });
    });
    describe('Sequence IStorage', function(){
      
      var Animal = Gnd.Model.extend('animals');
      var Parade = Gnd.Model.extend('parade');

      before(function(){

        var local_socket = io.connect('/', {'force new connection': true});
        var sl  = new Gnd.Storage.Local();
        var ss = new Gnd.Storage.Socket(local_socket);
        var q  = new Gnd.Storage.Queue(sl, ss);
        Gnd.using.storageQueue = q;
      });

      var fns = {
        id: function(item){
          return item.id;
        },
        keyPath: function(item){
          return item.keyPath;
        },
        doc: function(item){
          return item.doc;
        },
        inSync: function(item){
          return item.insync;
        }
      };
      
      function seqEqual(sequence, items){
        expect(sequence.items.length).to.equal(items.length);
        for(var i=0; i<items.length; i++){
          var a = sequence.items[i];
          var b = items[i];
          expect(a.id).to.equal(b.id);
          expect(a.model._id).to.equal(b.doc._id);
          expect(a.insync).to.equal(b.insync || typeof b.insync === 'undefined');
        }
      }

      function populateSeq(sequence, items){
        return Gnd.Promise.map(items, function(item){
          return Animal.create(item.doc, false).then(function(instance){
            return sequence.insertItemBefore(null, instance, item.id, {nosync: true});
          });
        });
      }
      function execCmds(sequence, commands){
        return Gnd.Promise.map(commands, function(cmd){
          switch(cmd.cmd) {
            case 'insertBefore':
              return Animal.create(cmd.doc, false).then(function(instance){
                return sequence.insertItemBefore(cmd.refId, instance, cmd.newId, {nosync: true});
              });
              break;
            case 'removeItem':
              return sequence.deleteItem(cmd.id, {nosync: true});
              break;
            case 'update':
              //ModelDepot will be used so create doesn't create a new instance
              return Animal.create(cmd.doc).then(function(instance){
                return instance.resync(cmd.doc);
              });
              break;
            default:
              throw new Error('Invalid command: '+cmd);
          }
        });
      }

      var parade;
      var animals;
      beforeEach(function(done){
        Parade.create({}, false).then(function(p){
          parade = p;
          p.seq(Animal, 'animals').then(function(a){
            animals = a;
            done();
          });
        });
      });

      afterEach(function(){
        animals.release();
        parade.release();
      });
      describe('Insertion', function(){
        it('into empty sequence', function(done){
          var source = [
            {
              id: 1,
              doc: {
                _id:10,
                name:'a'
              }
            }, {
              id: 2,
              doc: {
                _id:11,
                name:'b'
              }
            }
          ];
          var target = [];
          var commands = Gnd.Sequence.merge(source, target, fns);
          expect(commands.length).to.be(2);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 1);
          expect(commands[0]).to.have.property('refId', null);
          expect(commands[0]).to.have.property('doc');
          expect(commands[0].doc).to.have.property('name' , 'a');
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 2);
          expect(commands[1]).to.have.property('refId', null);
          expect(commands[1]).to.have.property('doc');
          expect(commands[1].doc).to.have.property('name' , 'b');

          execCmds(animals, commands).then(function(){
            console.log(animals.items);
            seqEqual(animals, source);
            done();
          });
        });
        it('append', function(done){
          var source = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } }
          ];
          populateSeq(animals, source.slice(0,1)).then(function(){
            var commands = Gnd.Sequence.merge(source, animals.items, fns);
            expect(commands.length).to.be(2);
            expect(commands[0]).to.have.property('cmd', 'insertBefore');
            expect(commands[0]).to.have.property('newId', 2);
            expect(commands[0]).to.have.property('refId', null);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, source);
              done();
            });
          });
        });
        it('prepend', function(done){
          var source = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } }
          ];
          populateSeq(animals, source.slice(1,2)).then(function(){
            var commands = Gnd.Sequence.merge(source, animals.items, fns);
            expect(commands.length).to.be(2);
            expect(commands[0]).to.have.property('cmd', 'insertBefore');
            expect(commands[0]).to.have.property('newId', 1);
            expect(commands[0]).to.have.property('refId', 2);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, source);
              done();
            });
          });
        });
        it('insert', function(done){
          var source = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } },
            { id: 3, doc: { _id:13 } }
          ];
          populateSeq(animals, source.slice(0,1).concat(source.slice(2,3))).then(function(){
            var commands = Gnd.Sequence.merge(source, animals.items, fns);
            expect(commands.length).to.be(3);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, source);
              done();
            });
          });
        });
      });
      describe('Removal', function(){
        it('Remove last', function(done){
          var source = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } },
            { id: 3, doc: { _id:13 } }
          ];
          populateSeq(animals, source.concat([{ id: 4, doc: { _id:14 } }])).then(function(){
            var commands = Gnd.Sequence.merge(source, animals.items, fns);
            expect(commands.length).to.be(4);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, source);
              done();
            });
          });
        });
        it('Remove first', function(done){
          var source = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } },
            { id: 3, doc: { _id:13 } }
          ];
          populateSeq(animals, [{ id: 4, doc: { _id:14 } }].concat(source)).then(function(){
            var commands = Gnd.Sequence.merge(source, animals.items, fns);
            expect(commands.length).to.be(4);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, source);
              done();
            });
          });
        });
        it('Remove middle', function(done){
          var source = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } },
            { id: 3, doc: { _id:13 } }
          ];
          populateSeq(animals, [source[0],source[2]]).then(function(){
            var commands = Gnd.Sequence.merge(source, animals.items, fns);
            expect(commands.length).to.be(3);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, source);
              done();
            });
          });
        });
        it('Remove all', function(done){
          var source = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } },
            { id: 3, doc: { _id:13 } }
          ];
          populateSeq(animals, []).then(function(){
            var commands = Gnd.Sequence.merge(source, animals.items, fns);
            expect(commands.length).to.be(3);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, source);
              done();
            });
          });
        });
      });
      describe('Moving items', function(){
        it('First to last', function(done){
          var newSeq = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } },
            { id: 3, doc: { _id:13 } }
          ];
          var oldSeq = _.clone(newSeq);
          //1,2,3
          //2,3,1
          oldSeq.push(oldSeq.shift());
          populateSeq(animals, oldSeq).then(function(){
            var commands = Gnd.Sequence.merge(newSeq, animals.items, fns);
            expect(commands.length).to.be(4);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, newSeq);
              done();
            });
          });
        });
        it('Last to first', function(done){
          var newSeq = [
            { id: 1, doc: { _id:11 } },
            { id: 2, doc: { _id:12 } },
            { id: 3, doc: { _id:13 } }
          ];
          var oldSeq = _.clone(newSeq);
          //1,2,3
          //3,1,2
          oldSeq.unshift(oldSeq.pop());
          populateSeq(animals, oldSeq).then(function(){
            var commands = Gnd.Sequence.merge(newSeq, animals.items, fns);
            expect(commands.length).to.be(5);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, newSeq);
              done();
            });
          });
        });
        it('Statically shuffled order', function(done){
          var newSeq = _.map(_.range(4), function(n){
            return { id: n, doc: { _id:'id_'+n } };
          });
          var oldSeq = [newSeq[1],newSeq[2],newSeq[0],newSeq[3]];
          //0,1,2,3
          //1,2,0,3
          populateSeq(animals, oldSeq).then(function(){
            var commands = Gnd.Sequence.merge(newSeq, animals.items, fns);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              console.log(newSeq);
              seqEqual(animals, newSeq);
              done();
            });
          });
        });
        it('Statically shuffled order2', function(done){
          var newSeq = _.map(_.range(4), function(n){
            return { id: n, doc: { _id:'id_'+n } };
          });
          var oldSeq = [newSeq[1],newSeq[0],newSeq[2],newSeq[3]];
          populateSeq(animals, oldSeq).then(function(){
            var commands = Gnd.Sequence.merge(newSeq, animals.items, fns);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              console.log(newSeq);
              seqEqual(animals, newSeq);
              done();
            });
          });
        });
        it('Random Shuffle', function(done){
          // Note: this test uses _.shuffle which isn't deterministic.
          // A deterministic shuffle would be better
          var newSeq = _.map(_.range(30), function(n){
            return { id: n, doc: { _id:'id_'+n } };
          });
          var oldSeq = _.shuffle(newSeq);
          populateSeq(animals, oldSeq).then(function(){
            var commands = Gnd.Sequence.merge(newSeq, animals.items, fns);
            execCmds(animals, commands).then(function(){
              seqEqual(animals, newSeq);
              done();
            });
          });
        });
      });
    });
  });
});

});
