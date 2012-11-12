define(['local'], function(Storage){

describe('Local Storage', function(){
  localStorage.clear();
  var storage = new Storage.Local();
    
  it('create a simple document', function(done){
    storage.create(['documents'], {foo:'bar'}, function(err, key){
      expect(err).to.not.be.ok();
      storage.get(['documents'], function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc.foo).to.be.equal('bar');
        done();
      });
    });
  });
  
  it('modifies a simple document', function(done){
    storage.put(['documents'], {baz:'qux'}, function(err, key){
      expect(err).to.not.be.ok();
      storage.get(['documents'], function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc.foo).to.be.equal('bar');
        expect(doc.baz).to.be.equal('qux');
        done();
      });
    });
  });
  
  it('links a simple document', function(done){
    storage.link(['documents2'], ['documents2'], function(err){
      expect(err).to.not.be.ok();
      storage.get(['documents'], function(err, doc){
        expect(err).to.not.be.ok();
        expect(doc.foo).to.be.equal('bar');
        expect(doc.baz).to.be.equal('qux');
        done();
      });
    });
  });

  it('deletes a simple document', function(done){
    storage.del(['documents'], function(err){
      expect(err).to.not.be.ok();
      storage.get(['documents'], function(err, doc){
        expect(err).to.be.ok();
        expect(doc).to.not.be.ok();
        done();
      });
    });
  });
  
  describe('Set / Collections', function(){
    it('add a few items to a set', function(done){
      storage.create(['animals'], {legs:3, cid:1}, function(err){
        expect(err).to.not.be.ok();
        storage.create(['animals'], {legs:5, cid:2}, function(err){
          expect(err).to.not.be.ok();
          storage.create(['animals'], {legs:2, cid:3}, function(err){
            expect(err).to.not.be.ok();
            storage.create(['animals'], {legs:7, cid:4}, function(err){
              expect(err).to.not.be.ok();
              storage.add(['documents', 'mycollection'], ['animals'], ['1','2','3','4'], function(err){
                expect(err).to.not.be.ok();
                storage.find(['documents', 'mycollection'], {}, {}, function(err, items){
                  expect(err).to.not.be.ok();
                  expect(items).to.be.an(Array);
                  expect(items).to.have.length(4);
                  // FIX THIS since order is not guaranteed!
                  expect(items[0]).to.eql({legs:3,cid:1});
                  expect(items[1]).to.eql({legs:5,cid:2});
                  expect(items[2]).to.eql({legs:2,cid:3});
                  expect(items[3]).to.eql({legs:7,cid:4});
                  done();
                });
              });
            })
          })
        })
      })
    });
    
    it('remove and add a few items to a set', function(done){
      storage.remove(['documents','mycollection'], ['animals'], [2, 4], function(err){
        storage.create(['animals'], {legs:1, cid:5}, function(err){
          expect(err).to.not.be.ok();
          storage.add(['documents','mycollection'], ['animals'], [5], function(err){
            storage.find(['documents', 'mycollection'], {}, {}, function(err, items){
              expect(err).to.not.be.ok();
              expect(items).to.be.an(Array);
              expect(items).to.have.length(3);
              // FIX THIS since order is not guaranteed!
              expect(items[0]).to.eql({legs:3,cid:1});
              expect(items[1]).to.eql({legs:2,cid:3});
              expect(items[2]).to.eql({legs:1,cid:5});
              done();
            });
          })
        });
      })
    });
  });
    
  describe('Sequences', function(){
    it('append a few items to a sequence', function(done){
      storage.insert(['birds'], -1, {name:'duck'}, function(err){
        expect(err).to.not.be.ok();
        storage.insert(['birds'], -1, {name:'eagle'}, function(err){
          expect(err).to.not.be.ok();
          storage.insert(['birds'], -1, {name:'hawk'}, function(err){
            expect(err).to.not.be.ok();
            storage.all(['birds'], function(err, items){
              expect(err).to.not.be.ok();
              expect(items).to.be.an(Array);
              expect(items).to.have.length(3);
              expect(items[0]).to.eql({name:'duck'});
              expect(items[1]).to.eql({name:'eagle'});
              expect(items[2]).to.eql({name:'hawk'});
              done();
            });
          });
        });
      });
    });
    
    it('remove and add a few items to a set', function(done){
      storage.extract(['birds'], 1, function(err, item){
        expect(err).to.not.be.ok();
         expect(item).to.eql({name:'eagle'});
         storage.insert(['birds'], 0, {name:'albatros'}, function(err){
           expect(err).to.not.be.ok();
           storage.all(['birds'], function(err, items){
            expect(err).to.not.be.ok();
            expect(items).to.be.an(Array);
            expect(items).to.have.length(3);
            expect(items[0]).to.eql({name:'albatros'});
            expect(items[1]).to.eql({name:'duck'});
            expect(items[2]).to.eql({name:'hawk'});
            done();
          });
        });
      });
    });
  });
});

});


