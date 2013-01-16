define(function(){

describe(storageType, function(){
  var zooId;
  var key1;
  it('create a simple document', function(done){
    storage.create(['documents'], {foo:'bar'}, function(err, key){
      expect(err).to.not.be.ok();
      expect(err).to.not.be.a('string');
      storage.fetch(['documents', key], function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc.foo).to.be.equal('bar');
        key1 = key;
        done();
      });
    });
  });
  
  it('modifies a simple document', function(done){
    storage.put(['documents', key1], {baz:'qux'}, function(err, key){
      expect(err).to.not.be.ok();
      storage.fetch(['documents', key1], function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc.foo).to.be.equal('bar');
        expect(doc.baz).to.be.equal('qux');
        done();
      });
    });
  });
  
  it('links a simple document', function(done){
    if(storage.link){
      storage.link(['linked_document'], ['documents', key1], function(err){
        expect(err).to.not.be.ok();
        storage.fetch(['linked_document'], function(err, doc){
          expect(err).to.not.be.ok();
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
    storage.del(['documents', key1], function(err){
      expect(err).to.not.be.ok();
      storage.fetch(['documents', key1], function(err, doc){
        expect(err).to.be.ok();
        expect(doc).to.not.be.ok();
        done();
      });
    });
  });
  
  describe('Set / Collections', function(){
    var id2, id4;
    
    it('add a few items to a set', function(done){
      storage.create(['zoo'], {}, function(err, id){
        zooId = id;
        storage.create(['animals'], {legs:3}, function(err, id1){
          expect(err).to.not.be.ok();
          expect(id1).to.be.ok();
          storage.create(['animals'], {legs:5}, function(err, id){
            id2 = id;
            expect(err).to.not.be.ok();
            expect(id2).to.be.ok();
            storage.create(['animals'], {legs:2}, function(err, id3){
              expect(err).to.not.be.ok();
              expect(id3).to.be.ok();
              storage.create(['animals'], {legs:7}, function(err, id){
                id4 = id;
                expect(err).to.not.be.ok();
                expect(id4).to.be.ok();
                storage.add(['zoo', zooId, 'animals'], ['animals'], [id1, id2, id3, id4], {}, function(err){
                  expect(err).to.not.be.ok();
                  storage.find(['zoo', zooId, 'animals'], {}, {}, function(err, items){
                    expect(err).to.not.be.ok();
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
      storage.remove(['zoo', zooId, 'animals'], ['animals'], [id2, id4], {}, function(err){
        storage.create(['animals'], {legs:1}, function(err, id){
          expect(err).to.not.be.ok();
          storage.add(['zoo', zooId, 'animals'], ['animals'], [id], {}, function(err){
            storage.find(['zoo', zooId, 'animals'], {}, {}, function(err, items){
              expect(err).to.not.be.ok();
              expect(items).to.be.an(Array);
              expect(items).to.have.length(3);
              // FIX THIS since order is not guaranteed!
              expect(items[0]).to.have.property('legs', 3);                    
              expect(items[1]).to.have.property('legs', 2);
              expect(items[2]).to.have.property('legs', 1);
              done();
            });
          })
        });
      })
    });
  });
  
  describe('Sequences', function(){
    it('append a few items to a sequence', function(done){
      storage.insert(['zoo', zooId, 'birds'], -1, {name:'duck'}, function(err){
        expect(err).to.not.be.ok();
        storage.insert(['zoo', zooId, 'birds'], -1, {name:'eagle'}, function(err){
          expect(err).to.not.be.ok();
          storage.insert(['zoo', zooId, 'birds'], -1, {name:'hawk'}, function(err){
            expect(err).to.not.be.ok();
            storage.all(['zoo', zooId, 'birds'], function(err, items){
              expect(err).to.not.be.ok();
              expect(items).to.be.an(Array);
              expect(items).to.have.length(3);
              expect(items[0]).to.have.property('name', 'duck');
              expect(items[1]).to.have.property('name', 'eagle');
              expect(items[2]).to.have.property('name', 'hawk');
              done();
            });
          });
        });
      });
    });
    
    it('remove and add a few more items to a sequence', function(done){
      storage.extract(['zoo', zooId,'birds'], 1, function(err, item){
        expect(err).to.not.be.ok();
         expect(item).to.have.property('name', 'eagle');
         storage.insert(['zoo', zooId, 'birds'], 0, {name:'albatros'}, function(err){
           expect(err).to.not.be.ok();
           storage.all(['zoo', zooId, 'birds'], function(err, items){
            expect(err).to.not.be.ok();
            expect(items).to.be.an(Array);
            expect(items).to.have.length(3);
            expect(items[0]).to.have.property('name', 'albatros');
            expect(items[1]).to.have.property('name', 'duck');
            expect(items[2]).to.have.property('name', 'hawk');
            done();
          });
        });
      });
    });
  });
  
});


});
