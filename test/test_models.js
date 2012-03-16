define(['ginger'], function(ginger){

ginger.Model.use('socket', socket);

var Animal = ginger.Declare(ginger.Model);
Animal.bucket('animals');

describe('Model', function(){
  var animal = new Animal();
  
  before(function(done){  
    animal.save(function(){
      animal.keepSynced();
      done()
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



