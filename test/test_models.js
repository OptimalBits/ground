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
      //console.log(JSON.stringify(animal));
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
      Animal.findById(animal.cid, function(err, doc){
        expect(err).to.be(null);
        expect(doc.cid).to.eql(animal.cid);
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
        expect(animal).to.have.property('_id');
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

      animal.on('changed:', function(){
        expect(animal).to.have.property('legs');
        expect(animal).to.have.property('tail');
        expect(animal.legs).to.be(4);
        expect(animal.tail).to.be(true);
        otherAnimal.release();
        done();
      });

      Animal.findById(animal._id, function(err, doc){
        expect(err).to.be(null);
        expect(doc).to.have.property('_id');
        expect(doc._id).to.eql(animal._id);
        doc.keepSynced();
        doc.set({legs:4, tail:true});
        otherAnimal = doc;
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
  
    describe('linus', function(){

    it('test disconnect', function(done){
      var otherAnimal;
      animal.off();

      var orgEmit = socket.emit

      socket.emit = function(){
        socket.socket.disconnect();
       // arguments;
        //orgEmit(arguments);
      }

      Animal.findById(animal._id, function(err, doc){
        expect(err).to.be(null);
        expect(doc).to.have.property('_id');
        expect(doc._id).to.eql(animal._id);
        doc.keepSynced();
        doc.set({legs:3});
        otherAnimal = doc;
        
        Animal.findById(animal._id, function(err, doc){
          expect(doc).to.have.property('legs');
          expect(doc).to.have.property('tail');
          expect(doc.legs).to.be(3);
          socket.emit = orgEmit;
          socket.socket.connect(function(){
            done();  
          });



        });
      });
    });
    
    it('test create offline', function(done){
      socket.disconnect();

      var tempAnimal = new Animal();
      var tempAnimal2;
      
      ginger.once('inSync:', function(){
          Animal.findById(tempAnimal._id, function(err, doc){
            expect(tempAnimal._id).to.be(doc._id);
            expect(tempAnimal2._id).to.be(doc._id);
            expect(err).to.be(null);
            expect(doc.legs).to.be(8);
            done();
        });
      });

      tempAnimal.set({legs : 8, name:'spider'});
      tempAnimal.save(function(){
        tempAnimal.keepSynced();
        Animal.findById(tempAnimal.cid, function(err, doc){
          tempAnimal2 = doc;
          tempAnimal2.keepSynced();
          socket.socket.connect();              
        });
      });
    });

    it('test delete offline', function(done){
      var tempAnimal = new Animal();
      tempAnimal.set({legs : 8, name:'spider'});

      ginger.once('inSync:', function(){
          Animal.findById(tempAnimal._id, function(err, doc){
            expect(err).to.be.an(Error);
            done();
        });
      });

      tempAnimal.save(function(){
        tempAnimal.keepSynced();
        expect(tempAnimal).to.have.property('_id');
        socket.disconnect();
        tempAnimal.delete(function(){
          socket.socket.connect();              
        });
      });
    });
  


    it('serverside update while offline', function(done){
      var tempAnimal = new Animal();
      tempAnimal.set({legs : 8, name:'spider'});
      tempAnimal.save(function(){
        tempAnimal.keepSynced();
        socket.socket.disconnect();

        ginger.ajax.put('http://localhost:8080/animals/'+tempAnimal._id, {legs:7}, function(err, res) { 
          console.log(err, 'hej');
          socket.socket.connect();
          done();

        });
      });
    });
  });

  describe('delete', function(){
    it('deletes and propagates delete event', function(done){
      animal.delete(function(err){
        expect(err).to.be(null);
      });
        
      animal.on('deleted:', function(){
        done();
      });
    });
  });



});



}); // define



