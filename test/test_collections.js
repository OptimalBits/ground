define(['ginger'], function(ginger){

ginger.Model.set('socket', socket);

var Animal = ginger.Declare(ginger.Model);
Animal.bucket('animals');
Animal.use('socket');


describe('Collections', function(){
  var Zoo = ginger.Declare(ginger.Model);
  Zoo.bucket('zoo');
  
  var zoo = new Zoo();
  zoo.keepSynced();
    
  it('save to server', function(done){
    zoo.save(function(err){
      expect(err).to.be(null);
      zoo.all(Animal, function(err, animals){
        expect(err).to.be(null);
        expect(animals).to.be.an(Object);
        animals.release();
        done();
      });
    })
  });
  
  it('add item to collection', function(done){
    zoo.all(Animal, function(err, animals){
      expect(err).to.be(null);
      expect(animals).to.be.an(Object);
            
      animals.add(new Animal({name:"tiger"}), function(err){
        expect(err).to.be(null);
        
        Zoo.findById(zoo._id, function(err, doc){
          expect(err).to.be(null);
          expect(doc).to.be.an(Object);
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
      });
    });
  });
  
  it('add item to collection propagates to other collections', function(done){
    Zoo.findById(zoo._id, function(err, mirrorZoo){
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
          zoo.release();
          done();
        });

        mirrorZoo.all(Animal, function(err, animals){
          expect(err).to.be(null);
          expect(animals).to.be.an(Object);
          var fox = new Animal({name:'fox'});
          animals.add(fox, function(err){
            expect(err).to.be(null);
            animals.release();
          })
          fox.release();
        });
      });  
    });
  });

  it('update item propagates to the same item in a collection', function(done){
    Zoo.findById(zoo._id, function(err, zoo){
      var testAnimal;
      
      zoo.keepSynced();
      zoo.all(Animal, function(err, animals){
        var tiger = animals.find(function(item){ return item.name==='tiger'});
        
        expect(tiger).to.be.an(Object);
        expect(tiger.name).to.be.eql('tiger');
        
        tiger.on('changed:', function(args){
          expect(args).to.be.an(Object);
          expect(args.legs).to.be(5);
          console.log(args);
          animals.release();
          zoo.release();
          testAnimal.release();
          done();
        });
        
        Animal.findById(tiger._id, function(err, animal){
          expect(err).to.be(null);
          animal.keepSynced();
          animal.set('legs', 5);
          testAnimal = animal;
        });
      });
    });
  });
  
  it('update item in collection generates changed: event on collection', function(done){
    Zoo.findById(zoo._id, function(err, zoo){      
      zoo.all(Animal, function(err, animals){
        var tiger = animals.find(function(item){ return item.name==='tiger'});
        
        expect(tiger).to.be.an(Object);
        expect(tiger.name).to.be.eql('tiger');
        
        animals.on('updated:', function(item, args){
          expect(item).to.be(tiger);
          expect(args).to.be.an(Object);
          expect(args.legs).to.be(6);
          zoo.release();
          animals.release();
          done();
        });
        
        tiger.set('legs', 6);
      });
    });
  });
  
  describe('Remove', function(){
    it('remove item from collection', function(done){
      Zoo.findById(zoo._id, function(err, zoo){
        zoo.all(Animal, function(err, animals){
          expect(err).to.be(null);
          expect(animals).to.be.an(Object);
          
          var animal = animals.first();
          animals.remove(animal._id);
                    
          var found = animals.find(function(item){return item._id === animal._id});
          expect(found).to.be(undefined);
          
          animals.save(function(err){
            expect(err).to.be(null);
              
            zoo.all(Animal, function(err, otherAnimals){
              expect(err).to.be(null);
              expect(otherAnimals).to.be.an(Object);

              var found = otherAnimals.find(function(item){return item._id === animal._id});
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
    
    it('remove item from collection propagates', function(done){
      Zoo.findById(zoo._id, function(err, zoo){
        zoo.keepSynced();
        
        zoo.all(Animal, function(err, animals){
          var otherAnimal;
          
          animals.on('removed:', function(item){
            expect(item).to.be.an(Object);
            expect(item).to.have.property('_id');
            expect(item._id).to.be.eql(otherAnimal._id);
            animals.release();
            zoo.release();
            done();
          });
        
          Zoo.findById(zoo._id, function(err, anotherZoo){
            anotherZoo.keepSynced();
            anotherZoo.all(Animal, function(err, otherAnimals){
              otherAnimal = otherAnimals.first();
              otherAnimals.remove(otherAnimal._id);
              //otherAnimals.release();
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
      done();
    })
  });
  
  describe('Sorted collection', function(){
    it('add items to sorted collection', function(done){
      var item1 = new ginger.Model({val:1}),
          item2 = new ginger.Model({val:5}),
          item3 = new ginger.Model({val:10}),
          item4 = new ginger.Model({val:15});
          
      var collection = new ginger.Collection();
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
      var item1 = new ginger.Model({val:1}),
          item2 = new ginger.Model({val:5}),
          item3 = new ginger.Model({val:10}),
          item4 = new ginger.Model({val:15});
          
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
        expect(err).to.be(null);
      
        sortedZoo.keepSynced();
      
        sortedZoo.all(Animal, function(err,animals){
          expect(err).to.be(null);
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
              console.log(animals);    
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
