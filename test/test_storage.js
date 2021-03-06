define(function(){
return function(storage, storageType){
  describe(storageType, function(){
    var zooId;
    var key1;
    it('create a simple document', function(done){
      storage.create(['documents'], {foo:'bar'}).then(function(key){
        storage.fetch(['documents', key]).then(function(doc){
          expect(doc.foo).to.be.equal('bar');
          key1 = key;
          done();
        });
      });
    });
    
    it('modifies a simple document', function(done){
      storage.put(['documents', key1], {baz:'qux'}).then(function(key){
        storage.fetch(['documents', key1]).then(function(doc){
          expect(doc.foo).to.be.equal('bar');
          expect(doc.baz).to.be.equal('qux');
          done();
        });
      });
    });
    
    it('links a simple document', function(done){
      if(storage.link){
        storage.link(['linked_document'], ['documents', key1]).then(function(){
          storage.fetch(['linked_document']).then(function(doc){
            expect(doc.foo).to.be.equal('bar');
            expect(doc.baz).to.be.equal('qux');
            done();
          });
        });
      }else{
        done();
      }
    });

    it('deletes a simple document', function(done){
      storage.del(['documents', key1]).then(function(){
        storage.fetch(['documents', key1]).fail(function(err){
          expect(err).to.be.an(Error);
          done();
        });
      });
    });
    
    describe('Set / Collections', function(){
      var id2, id4;
      
      it('add a few items to a set', function(done){
        storage.create(['zoo'], {}).then(function(id){
          zooId = id;
          storage.create(['animals'], {legs:3}).then(function(id1){
            expect(id1).to.be.ok();
            storage.create(['animals'], {legs:5}).then(function(id){
              id2 = id;
              expect(id2).to.be.ok();
              storage.create(['animals'], {legs:2}).then(function(id3){
                expect(id3).to.be.ok();
                storage.create(['animals'], {legs:7}).then(function(id){
                  id4 = id;
                  expect(id4).to.be.ok();
                  storage.add(['zoo', zooId, 'animals'], ['animals'], [id1, id2, id3, id4], {}).then(function(){
                    storage.find(['zoo', zooId, 'animals'], {}, {}).then(function(items){
                      expect(items).to.be.an(Array);
                      expect(items).to.have.length(4);
                      // FIX THIS since order is not guaranteed!
                      expect(items[0]).to.have.property('legs', 3);
                      expect(items[1]).to.have.property('legs', 5);
                      expect(items[2]).to.have.property('legs', 2);
                      expect(items[3]).to.have.property('legs', 7);
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
      
      it('remove and add a few items to a set', function(done){
        storage.remove(['zoo', zooId, 'animals'], ['animals'], [id2, id4], {}).then(function(){
          storage.create(['animals'], {legs:1}).then(function(id){
            storage.add(['zoo', zooId, 'animals'], ['animals'], [id], {}).then(function(){
              storage.find(['zoo', zooId, 'animals'], {}, {snapshot: true}).then(function(items){
                expect(items).to.be.an(Array);
                expect(items).to.have.length(3);
                // FIX THIS since order is not guaranteed!
                expect(items[0]).to.have.property('legs', 3);
                expect(items[1]).to.have.property('legs', 2);
                expect(items[2]).to.have.property('legs', 1);
                done();
              });
            });
          });
        });
      });
    });
    
    describe('Sequences', function(){
      describe('insertBefore', function(){
        it('to the left', function(done){
          storage.create(['parade'], {}).then(function(paradeId){
            storage.create(['animals'], {name:'tiger'}).then(function(id1){
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id1], {}).then(function(){
                storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                  expect(items).to.have.property('length',1);
                  expect(items[0].doc).to.have.property('name','tiger');
                  storage.create(['animals'], {name:'dog'}).then(function(id2){
                    expect(id2).to.be.ok();
                    storage.insertBefore(['parade', paradeId, 'animals'], items[0].id, ['animals', id2], {}).then(function(){
                      storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                        expect(items).to.have.property('length',2);
                        expect(items[0].doc).to.have.property('name','dog');
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
        it('push one item', function(done){
          storage.create(['parade'], {}).then(function(paradeId){
            storage.create(['animals'], {name:'tiger'}).then(function(id1){
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id1], {}).then(function(){
                storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                  expect(items).to.have.property('length',1);
                  expect(items[0].doc).to.have.property('name','tiger');
                  done();
                });
              });
            });
          });
        });
        it('push many items', function(done){
          storage.create(['parade'], {}).then(function(paradeId){
            storage.create(['animals'], {name:'cat'}).then(function(id1){
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id1], {}).then(function(){
                storage.create(['animals'], {name:'fox'}).then(function(id2){
                  expect(id2).to.be.ok();
                  storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id2], {}).then(function(){
                    storage.create(['animals'], {name:'eagle'}).then(function(id3){
                      expect(id3).to.be.ok();
                      storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id3], {}).then(function(){
                        storage.create(['animals'], {name:'shark'}).then(function(id4){
                          expect(id4).to.be.ok();
                          storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id4], {}).then(function(){
                            storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                              expect(items).to.an(Array);
                              expect(items).to.have.property('length',4);
                              expect(items[0].doc).to.have.property('name','cat');
                              expect(items[1].doc).to.have.property('name','fox');
                              expect(items[2].doc).to.have.property('name','eagle');
                              expect(items[3].doc).to.have.property('name','shark');
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
        // It is not invalid anymore since we accept client as ids
        it.skip('invalid reference keypath', function(done){
          storage.create(['parade'], {}).then(function(paradeId){
            storage.create(['animals'], {name:'tiger'}).then(function(id1){
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], 'jklöjlöasdf', ['animals', id1], {}).fail(function(err){
                expect(err).to.be.ok();
                storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                  expect(items).to.have.property('length',0);
                  done();
                });
              });
            });
          });
        });
      });
      describe('all', function(){
        it('one item', function(done){
          storage.create(['parade'], {}).then(function(paradeId){
            storage.create(['animals'], {name:'cat'}).then(function(id1){
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id1], {}).then(function(){
                storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                  expect(items).to.have.property('length', 1);
                  done();
                });
              });
            });
          });
        });
        it('many items', function(done){
          storage.create(['parade'], {}).then(function(paradeId){
            storage.create(['animals'], {name:'cat'}).then(function(id){
              expect(id).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}).then(function(){
                storage.create(['animals'], {name:'frog'}).then(function(id){
                  expect(id).to.be.ok();
                  storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}).then(function(){
                    storage.create(['animals'], {name:'dog'}).then(function(id){
                      expect(id).to.be.ok();
                      storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}).then(function(){
                        storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                          expect(items).to.have.property('length', 3);
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
        it('empty sequence', function(done){
          storage.create(['parade'], {}).then(function(paradeId){
            storage.create(['animals'], {name:'cat'}).then(function(id1){
              expect(id1).to.be.ok();
              storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                expect(items).to.have.property('length', 0);
                done();
              });
            });
          });
        });
      });

      describe('delete', function(){
        var paradeId;
        beforeEach(function(done){
          storage.create(['parade'], {}).then(function(id){
            expect(id).to.be.ok();
            paradeId = id;
            storage.create(['animals'], {name:'tiger'}).then(function(id){
              expect(id).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}).then(function(){
                storage.create(['animals'], {name:'monkey'}).then(function(id){
                  expect(id).to.be.ok();
                  storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}).then(function(){
                    storage.create(['animals'], {name:'prawn'}).then(function(id){
                      expect(id).to.be.ok();
                      storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}).then(function(){
                        storage.create(['animals'], {name:'shark'}).then(function(id){
                          expect(id).to.be.ok();
                          storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}).then(function(){
                            storage.create(['animals'], {name:'dog'}).then(function(id){
                              expect(id).to.be.ok();
                              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}).then(function(){
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
        it('delete first', function(done){
          storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
            expect(items).to.have.property('length',5);
            expect(items[0].doc).to.have.property('name','tiger');
            storage.deleteItem(['parade', paradeId, 'animals'], items[0].id, {}).then(function(){
              storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                expect(items).to.have.property('length',4);
                expect(items[0].doc).to.have.property('name','monkey');
                done();
              });
            });
          });
        });
        it('delete last', function(done){
          storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
            expect(items).to.have.property('length',5);
            expect(items[4].doc).to.have.property('name','dog');
            storage.deleteItem(['parade', paradeId, 'animals'], items[4].id, {}).then(function(){
              storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                expect(items).to.have.property('length',4);
                done();
              });
            });
          });
        });
        it('delete middle', function(done){
          storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
            expect(items).to.have.property('length',5);
            storage.deleteItem(['parade', paradeId, 'animals'], items[2].id, {}).then(function(){
              storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items2){
                expect(items2).to.have.property('length',4);
                expect(items[3].doc).to.eql(items2[2].doc);
                done();
              });
            });
          });
        });
        it('delete all', function(done){
          storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
            expect(items).to.have.property('length',5);
            storage.deleteItem(['parade', paradeId, 'animals'], items[0].id, {}).then(function(){
              storage.deleteItem(['parade', paradeId, 'animals'], items[1].id, {}).then(function(){
                storage.deleteItem(['parade', paradeId, 'animals'], items[2].id, {}).then(function(){
                  storage.deleteItem(['parade', paradeId, 'animals'], items[3].id, {}).then(function(){
                    storage.deleteItem(['parade', paradeId, 'animals'], items[4].id, {}).then(function(){
                      storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
                        expect(items).to.have.property('length',0);
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
        it('delete non-existing item', function(done){
          storage.deleteItem(['parade', paradeId, 'animals'], 'asdf', {}).then(function(){
            //Already gone - no error
            done();
          }, function(err){
            //Already gone - error in socket backend currently...
            done();
          });
        });
        it('delete already deleted item', function(done){
          storage.all(['parade', paradeId, 'animals'], {}, {}).then(function(items){
            expect(items).to.have.property('length',5);
            expect(items[0].doc).to.have.property('name', 'tiger');
            storage.deleteItem(['parade', paradeId, 'animals'], items[0].id, {}).then(function(){
              storage.deleteItem(['parade', paradeId, 'animals'], items[0].id, {}).then(function(){
                //Double delete should not raise an error
                done();
              });
            });
          });
        });
      });
    });
  });
};
});
