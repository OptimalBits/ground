define(['ginger'], function(ginger){

ginger.Model.set('socket', socket);

var Animal = ginger.Model.extend();
Animal.bucket('animals');
Animal.use('transport', 'socket');

describe('Model', function(){
  var animal = new Animal();
  
  before(function(done){  
    animal.save(function(){
      animal.keepSynced();
      done()
    });
  });
  
  describe('instantiation', function(){
    it('with new operator', function(){
      var instance = new Animal();
      expect(instance).to.be.a(Animal);
    });
    
    it('as a factory method', function(){
      var instance = Animal();
      expect(instance).to.be.a(Animal);
    });
  });
  
  describe('findById', function(){
    it('finds the animal', function(done){
      Animal.findById(animal._id, function(err, doc){
        expect(err).to.be(null);
        expect(doc._id).to.eql(animal._id);
        doc.release();
        done();
      });
    });
  });
  describe('update', function(){
    it('updates the server model', function(done){
      animal.set('name', 'foobar');
      animal.save(function(err){
        expect(err).to.be(null);
        Animal.findById(animal._id, function(err, doc){
          expect(err).to.be(null);
          expect(doc).to.have.property('_id');
          expect(doc._id).to.eql(animal._id);
          expect(doc).to.have.property('name');
          expect(doc.name).to.be.eql('foobar');
          doc.release();
          done();
        });
      });
    });
    it('another instance propagates changes', function(done){
      var otherAnimal;
      Animal.findById(animal._id, function(err, doc){
        expect(err).to.be(null);
        expect(doc).to.have.property('_id');
        expect(doc._id).to.eql(animal._id);
        doc.keepSynced();
        doc.set({legs:4, tail:true});
        otherAnimal = doc;
      });
      
      animal.on('changed:', function(){
        expect(animal).to.have.property('legs');
        expect(animal).to.have.property('tail');
        expect(animal.legs).to.be(4);
        expect(animal.tail).to.be(true);
        otherAnimal.release();
        done();
      });
    });
  });
  
  describe('fetch', function(){
    var dolphin, whale, shark;
    
    before(function(done){
      dolphin = new Animal({name:'dolphin'});
      dolphin.save(function(err){
        whale = new Animal({name:'whale'});
        whale.save(function(err){
          shark = new Animal({name:'shark'});
          shark.save(function(err){
            done();  
          });
        });  
      });
    });
    
    it('all instances of a model', function(done){
      Animal.fetch(function(err, animals){
        expect(err).to.be(null);
        expect(animals).to.be.an(Array);
        done();
      })
    });
    
  });
  
  
  describe('delete', function(){
    it('deletes and propagates delete event', function(done){
      done();/*
      animal.delete(function(err){
        expect(err).to.be(null);
      });
        
      animal.on('delete', function(){
        done();
      });
      */
    });
  });
});



}); // define



