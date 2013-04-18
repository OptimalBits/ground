/*global socket:true, io:true*/
define(['gnd'],
  function(Gnd){

localStorage.clear();

describe('Storage Queue', function(){
  var storageLocal  = new Gnd.Storage.Local();
  var storageSocket = new Gnd.Storage.Socket(socket);
  var storage= new Gnd.Storage.Queue(storageLocal, storageSocket);

  var syncManager = new Gnd.Sync.Manager(socket);

  before(function(done){
    storage.init(function(){
      done();
    });
  });

  beforeEach(function(done){
    storage.exec().then(done);
  });

  describe('Sequences', function(){
    var keyPath;
    beforeEach(function(done){
      storage.create(['parade'], {}, function(err, id){
        expect(err).to.not.be.ok();
        expect(id).to.be.ok();
        storage.once('created:'+id, function(sid){
          keyPath = ['parade', sid, 'animals'];
          done();
        });
      });
    });
    describe('Traversal', function(){
      it('next on empty sequence', function(done){
        storage.next(keyPath, null, {}, function(err, item){
          expect(err).to.not.be.ok();
          expect(item).to.not.be.ok();
          done();
        });
      });
      it('next on a non persisted sequence', function(done){
        storage.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.create(['animals'], {name:'prawn'}, function(err, id){
              expect(err).to.not.be.ok();
              expect(id).to.be.ok();
              storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
                expect(err).to.not.be.ok();
                storage.create(['animals'], {name:'shark'}, function(err, id){
                  expect(err).to.not.be.ok();
                  expect(id).to.be.ok();
                  storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.next(keyPath, null, {}, function(err, item){
                      expect(err).to.not.be.ok();
                      expect(item).to.be.an(Object);
                      expect(item.doc).to.have.property('name', 'tiger');
                      storage.next(keyPath, item.id, {}, function(err, item){
                        expect(err).to.not.be.ok();
                        expect(item).to.be.an(Object);
                        expect(item.doc).to.have.property('name', 'prawn');
                        storage.next(keyPath, item.id, {}, function(err, item){
                          expect(err).to.not.be.ok();
                          expect(item).to.be.an(Object);
                          expect(item.doc).to.have.property('name', 'shark');
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
    describe('Insert', function(){
      it('insertBefore as push', function(done){
        storage.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.next(keyPath, null, {}, function(err, item){
              expect(err).to.not.be.ok();
              expect(item).to.be.an(Object);
              expect(item.doc).to.have.property('name', 'tiger');
              done();
            });
          });
        });
      });
      it('insertBefore as unshift', function(done){
        storage.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.next(keyPath, null, {}, function(err, item){
              expect(err).to.not.be.ok();
              expect(item).to.be.an(Object);
              expect(item.doc).to.have.property('name', 'tiger');
              storage.create(['animals'], {name:'dog'}, function(err, id){
                expect(err).to.not.be.ok();
                expect(id).to.be.ok();
                storage.insertBefore(keyPath, item.id, ['animals', id], {}, function(err){
                  expect(err).to.not.be.ok();
                  storage.next(keyPath, null, {}, function(err, item){
                    expect(err).to.not.be.ok();
                    expect(item).to.be.an(Object);
                    expect(item.doc).to.have.property('name', 'dog');
                    done();
                  });
                });
              });
            });
          });
        });
      });
      it('many insertBefores as push', function(done){
        storage.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.create(['animals'], {name:'prawn'}, function(err, id){
              expect(err).to.not.be.ok();
              expect(id).to.be.ok();
              storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
                expect(err).to.not.be.ok();
                storage.create(['animals'], {name:'shark'}, function(err, id){
                  expect(err).to.not.be.ok();
                  expect(id).to.be.ok();
                  storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.next(keyPath, null, {}, function(err, item){
                      expect(err).to.not.be.ok();
                      expect(item).to.be.an(Object);
                      expect(item.doc).to.have.property('name', 'tiger');
                      storage.next(keyPath, item.id, {}, function(err, item2){
                        expect(err).to.not.be.ok();
                        expect(item2).to.be.an(Object);
                        expect(item2.doc).to.have.property('name', 'prawn');
                        storage.next(keyPath, item2.id, {}, function(err, item){
                          expect(err).to.not.be.ok();
                          expect(item).to.be.an(Object);
                          expect(item.doc).to.have.property('name', 'shark');
                          storage.next(keyPath, null, {}, function(err, item){
                            expect(err).to.not.be.ok();
                            expect(item).to.be.an(Object);
                            expect(item.doc).to.have.property('name', 'tiger');
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
    describe('Delete', function(){
      beforeEach(function(done){
        storage.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.once('synced:', function(){
              done();
            });
          });
        });
      });
      it('delete one item', function(done){
        storage.next(keyPath, null, {}, function(err, item){
          expect(err).to.not.be.ok();
          expect(item).to.be.an(Object);
          expect(item.doc).to.have.property('name', 'tiger');
          storage.deleteItem(keyPath, item.id, {}, function(err){
            expect(err).to.not.be.ok();
            done();
          });
        });
      });
      it('deletion is persisted', function(done){
        storage.next(keyPath, null, {}, function(err, item){
          expect(err).to.not.be.ok();
          expect(item).to.be.an(Object);
          expect(item.doc).to.have.property('name', 'tiger');
          storage.deleteItem(keyPath, item.id, {}, function(err){
            expect(err).to.not.be.ok();
            storage.once('synced:', function() {
              storage.all(keyPath, {}, {}).then(function(docs){
                expect(docs).to.be.ok();
                expect(docs).to.have.property('length', 0);
                done();
              });
            });
          });
        });
      });
    });
    describe('All', function(){
      beforeEach(function(done){
        storage.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.create(['animals'], {name:'monkey'}, function(err, id){
              expect(err).to.not.be.ok();
              expect(id).to.be.ok();
              storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
                expect(err).to.not.be.ok();
                storage.create(['animals'], {name:'fish'}, function(err, id){
                  expect(err).to.not.be.ok();
                  expect(id).to.be.ok();
                  storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.once('synced:', function(){
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
      it('all gets all...', function(done){
        storage.all(keyPath, {}, {}).then(function(docs){
          expect(docs).to.be.ok();
          expect(docs).to.have.property('length', 3);
          expect(docs[0]).to.have.property('doc');
          expect(docs[0].doc).to.have.property('name', 'tiger');
          expect(docs[1]).to.have.property('doc');
          expect(docs[1].doc).to.have.property('name', 'monkey');
          expect(docs[2]).to.have.property('doc');
          expect(docs[2].doc).to.have.property('name', 'fish');
          done();
        });
      });
      it('all after delete', function(done){
        storage.next(keyPath, null, {}, function(err, item){
          expect(err).to.not.be.ok();
          expect(item).to.be.ok();
          storage.deleteItem(keyPath, item.id, {}, function(err){
            expect(err).to.not.be.ok();
            storage.all(keyPath, {}, {}).then(function(docs){
              expect(docs).to.be.ok();
              expect(docs).to.have.property('length', 2);
              expect(docs[0]).to.have.property('doc');
              expect(docs[0].doc).to.have.property('name', 'monkey');
              expect(docs[1]).to.have.property('doc');
              expect(docs[1].doc).to.have.property('name', 'fish');
              done();
            });
          });
        });
      });
      it('all after insert', function(done){
        storage.create(['animals'], {name:'spider'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.all(keyPath, {}, {}).then(function(docs){
              expect(docs).to.be.ok();
              expect(docs).to.have.property('length', 4);
              expect(docs[0]).to.have.property('doc');
              expect(docs[0].doc).to.have.property('name', 'tiger');
              expect(docs[1]).to.have.property('doc');
              expect(docs[1].doc).to.have.property('name', 'monkey');
              expect(docs[2]).to.have.property('doc');
              expect(docs[2].doc).to.have.property('name', 'fish');
              expect(docs[3]).to.have.property('doc');
              expect(docs[3].doc).to.have.property('name', 'spider');
              done();
            });
          });
        });
      });
    });
    describe('Offline', function(){
      beforeEach(function(done){
        storage.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.create(['animals'], {name:'monkey'}, function(err, id){
              expect(err).to.not.be.ok();
              expect(id).to.be.ok();
              storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
                expect(err).to.not.be.ok();
                storage.once('synced:', function(){
                  done();
                });
              });
            });
          });
        });
      });
      before(function(done){
        socket.on('connect', storage.syncFn);
        done();
      });
      it('items are cached when going offline', function(done){
        socket.disconnect();
        storage.all(keyPath, {}, {}).then(function(docs){
          expect(docs).to.be.ok();
          expect(docs).to.have.property('length', 2);
          expect(docs[0]).to.have.property('doc');
          expect(docs[0].doc).to.have.property('name', 'tiger');
          expect(docs[1]).to.have.property('doc');
          expect(docs[1].doc).to.have.property('name', 'monkey');
          socket.socket.connect();
          done();
        });
      });
      it('insert item while offline', function(done){
        socket.disconnect();
        storage.create(['animals'], {name:'camel'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(keyPath, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();

            storage.once('synced:', function(){
              storage.all(keyPath, {}, {}).then(function(docs){
                expect(docs).to.be.ok();
                expect(docs).to.have.property('length', 3);
                expect(docs[0]).to.have.property('doc');
                expect(docs[0].doc).to.have.property('name', 'tiger');
                expect(docs[1]).to.have.property('doc');
                expect(docs[1].doc).to.have.property('name', 'monkey');
                expect(docs[2]).to.have.property('doc');
                expect(docs[2].doc).to.have.property('name', 'camel');
                storage.once('resync:'+Gnd.Storage.Queue.makeKey(keyPath), function(docs){
                  expect(docs).to.be.ok();
                  expect(docs).to.have.property('length', 3);
                  expect(docs[0]).to.have.property('doc');
                  expect(docs[0].doc).to.have.property('name', 'tiger');
                  expect(docs[1]).to.have.property('doc');
                  expect(docs[1].doc).to.have.property('name', 'monkey');
                  expect(docs[2]).to.have.property('doc');
                  expect(docs[2].doc).to.have.property('name', 'camel');
                  done();
                });
              });
            });

            storage.all(keyPath, {}, {}).then(function(docs){
              expect(docs).to.be.ok();
              expect(docs).to.have.property('length', 3);
              expect(docs[0]).to.have.property('doc');
              expect(docs[0].doc).to.have.property('name', 'tiger');
              expect(docs[1]).to.have.property('doc');
              expect(docs[1].doc).to.have.property('name', 'monkey');
              expect(docs[2]).to.have.property('doc');
              expect(docs[2].doc).to.have.property('name', 'camel');
              socket.socket.connect();
            });
          });
        });
      });
      it('serverside insert while offline', function(done){
        storage.create(['animals'], {name:'camel'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.once('created:'+id, function(sid){
            socket.disconnect();
            Gnd.Ajax.put('/parade/'+keyPath[1]+'/seq/animals/'+sid, null, function(err, res) {
              socket.once('connect', function(){
                storage.all(keyPath, {}, {}).then(function(docs){
                  expect(docs).to.be.ok();
                  expect(docs).to.have.property('length', 2);
                  expect(docs[0]).to.have.property('doc');
                  expect(docs[0].doc).to.have.property('name', 'tiger');
                  expect(docs[1]).to.have.property('doc');
                  expect(docs[1].doc).to.have.property('name', 'monkey');
                  storage.once('resync:'+Gnd.Storage.Queue.makeKey(keyPath), function(docs){
                    expect(docs).to.be.ok();
                    expect(docs).to.have.property('length', 3);
                    expect(docs[0]).to.have.property('doc');
                    expect(docs[0].doc).to.have.property('name', 'tiger');
                    expect(docs[1]).to.have.property('doc');
                    expect(docs[1].doc).to.have.property('name', 'monkey');
                    expect(docs[2]).to.have.property('doc');
                    expect(docs[2].doc).to.have.property('name', 'camel');
                    done();
                  });
                });
              });

              socket.socket.connect();
            });
          });
        });
      });
      it('remove item while offline', function(done){
        socket.disconnect();
        storage.next(keyPath, null, {}, function(err, item){
          expect(err).to.be(null);
          expect(item).to.be.an(Object);
          storage.deleteItem(keyPath, item.id, {}, function(err){
            expect(err).to.not.be.ok();

            storage.once('synced:', function(){
              storage.all(keyPath, {}, {}).then(function(docs){
                expect(docs).to.be.ok();
                expect(docs).to.have.property('length', 1);
                expect(docs[0]).to.have.property('doc');
                expect(docs[0].doc).to.have.property('name', 'monkey');
                storage.once('resync:'+Gnd.Storage.Queue.makeKey(keyPath), function(docs){
                  expect(docs).to.be.ok();
                  expect(docs).to.have.property('length', 1);
                  expect(docs[0]).to.have.property('doc');
                  expect(docs[0].doc).to.have.property('name', 'monkey');
                  done();
                });
              });
            });

            storage.all(keyPath, {}, {}).then(function(docs){
              expect(docs).to.be.ok();
              expect(docs).to.have.property('length', 1);
              expect(docs[0]).to.have.property('doc');
              expect(docs[0].doc).to.have.property('name', 'monkey');
              socket.socket.connect();
            });
          });
        });
      });
      it('serverside remove while offline', function(done){
        storage.next(keyPath, null, {}, function(err, item){
          expect(err).to.be(null);
          expect(item).to.be.an(Object);
          socket.disconnect();
          Gnd.Ajax.del('/parade/'+keyPath[1]+'/seq/animals/'+item.id, null, function(err, res) {
            socket.once('connect', function(){
              storage.all(keyPath, {}, {}).then(function(docs){
                expect(docs).to.be.ok();
                expect(docs).to.have.property('length', 2);
                expect(docs[0]).to.have.property('doc');
                expect(docs[0].doc).to.have.property('name', 'tiger');
                expect(docs[1]).to.have.property('doc');
                expect(docs[1].doc).to.have.property('name', 'monkey');
                storage.once('resync:'+Gnd.Storage.Queue.makeKey(keyPath), function(docs){
                  expect(docs).to.be.ok();
                  expect(docs).to.have.property('length', 1);
                  expect(docs[0]).to.have.property('doc');
                  expect(docs[0].doc).to.have.property('name', 'monkey');
                  done();
                });
              });
            });
            socket.socket.connect();
          });
        });
      });
      it('inserted while online are available offline');
      it('deleted while online are not available offline');
    });
  });

  describe('Syncing', function(){
    it('Insert on non synced parent', function(done){
      storage.create(['parade'], {}, function(err, paradeId){
        expect(err).to.not.be.ok();
        expect(paradeId).to.be.ok();
        storage.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            storage.next(['parade', paradeId, 'animals'], null, {}, function(err, item){
              expect(err).to.not.be.ok();
              expect(item).to.be.an(Object);
              expect(item.doc).to.have.property('name', 'tiger');
              done();
            });
          });
        });
      });
    });
  });

  describe('Run', function(){
    var socket1 = io.connect('/', {'force new connection': true});
    var sm  = new Gnd.Storage.Local(new Gnd.Storage.Store.MemoryStore());
    var sm2  = new Gnd.Storage.Local(new Gnd.Storage.Store.MemoryStore());
    var ss = new Gnd.Storage.Socket(socket1);
    var q = new Gnd.Storage.Queue(sm, ss, false);
    var q2 = new Gnd.Storage.Queue(sm2, ss);

    beforeEach(function(done){
      q.exec().then(done);
    });
    it('changes propagates to other queues on exec()', function(done){
      q.create(['parade'], {}, function(err, paradeId){
        var kp = ['parade', paradeId, 'animals'];
        q.once('created:'+paradeId, function(sid){
          kp = ['parade', sid, 'animals'];
        });
        expect(err).to.not.be.ok();
        expect(paradeId).to.be.ok();
        q.create(['animals'], {name:'tiger'}, function(err, id){
          expect(err).to.not.be.ok();
          expect(id).to.be.ok();
          q.insertBefore(kp, null, ['animals', id], {}, function(err){
            expect(err).to.not.be.ok();
            function fail(){
              clearTimeout(t);
              expect(false).to.be.ok();
            }
            var t = setTimeout(function(){
              q.off('synced:', fail);
              q2.all(kp, {}, {}).then(function(docs){
                //q2 should not have the new animal yet
                expect(docs).to.have.property('length', 0);
                q2.once('resync:'+Gnd.Storage.Queue.makeKey(kp), function(docs){
                  expect(docs).to.have.property('length', 0);
                  q.exec();
                });
              });
              q.waitUntilSynced(function(){
                q.all(kp, {}, {}).then(function(docs){
                  expect(docs).to.be.ok();
                  expect(docs).to.have.property('length', 1);
                  expect(docs[0]).to.have.property('doc');
                  expect(docs[0].doc).to.have.property('name', 'tiger');
                  q.once('resync:'+Gnd.Storage.Queue.makeKey(kp), function(docs){
                    expect(docs).to.be.ok();
                    expect(docs).to.have.property('length', 1);
                    expect(docs[0]).to.have.property('doc');
                    expect(docs[0].doc).to.have.property('name', 'tiger');
                    q2.all(kp, {}, {}).then(function(docs){
                      //q2 local storage still doesn't have the new animal...
                      expect(docs).to.have.property('length', 0);
                      q2.once('resync:'+Gnd.Storage.Queue.makeKey(kp), function(docs){
                        //... but receives it on resync
                        expect(docs).to.have.property('length', 1);
                        expect(docs[0].doc).to.have.property('name', 'tiger');
                        done();
                      });
                    });
                  });
                });
              });
            }, 100);

            q.on('synced:', fail);
          });
        });
      });
    });
  });
});
});
