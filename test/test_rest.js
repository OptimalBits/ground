define(['gnd'], function(Gnd) {
  "use strict";

  var TEST_SERVER = 'http://localhost:10000/'

  describe('Rest API', function() {

    describe('Models', function() {
      it('should create an instance of a Model', function() {
        var animal = {
          name: 'tiger'
        };
        return Gnd.Ajax.post(TEST_SERVER + 'animals', animal).then(function(cid) {
          console.log(cid);
          return cid;
        }).then(function(cid){
          return Gnd.Ajax.get(TEST_SERVER + 'animals/' + cid);
        }).then(function(doc){
          expect(doc.name).to.be.eql(animal.name);
        });
      });

      it('should give proper error if creating an instance on invalid enpoint', function() {

      });

      it('should edit an instance of a Model', function(){
        var animalCid;
        var animal = {
          name: 'lion'
        }
        return Gnd.Ajax.post(TEST_SERVER + 'animals', animal).then(function(cid) {
          return cid;
        }).then(function(cid){
          animalCid = cid;
          return Gnd.Ajax.put(TEST_SERVER + 'animals/' + cid, {name: 'simba'} );
        }).then(function(){
          return Gnd.Ajax.get(TEST_SERVER + 'animals/' + animalCid);
        }).then(function(doc){
          expect(doc.name).to.be.eql('simba');
        });
      });

      it('should edit remove an instance of a Model', function(){
        var animalCid;
        var animal = {
          name: 'zebra'
        }
        return Gnd.Ajax.post(TEST_SERVER + 'animals', animal).then(function(cid) {
          return cid;
        }).then(function(cid){
          animalCid = cid;
          return Gnd.Ajax.del(TEST_SERVER + 'animals/' + cid);
        }).then(function(){
          return Gnd.Ajax.get(TEST_SERVER + 'animals/' + animalCid);
        }).then(function(doc){
          expect(doc).to.be.undefined;
        }, function(err){
          console.log(err);
        });
      });

      it('should return an error if using non-unique property (on a unique property)');
      it('should return an error if using invalid property');

      it('should notify a change in a model instance');
      it('should notify removing a model instance');
    });

    describe('Collections', function() {
      it('should return a models bucket as a collection', function(){
        var createAnimals = [
          'elephant',
          'mouse',
          'cat',
          'dog',
        ].map(function(name){
          return Gnd.Ajax.post(TEST_SERVER + 'animals', {
            name: name
          });
        });

        return Gnd.Promise.all(createAnimals).then(function(){
          return Gnd.Ajax.get(TEST_SERVER + 'animals').then(function(result){
            expect(result.length).to.be.above(1);
          });
        });
      });

      it('should add some items into a collection', function(){
        var zooCid;
        var zoo = {
          name: 'Fuengirla City Zoo'
        };

        var animals = ['rino', 'buffalo', 'giraff', 'panther'].map(function(name){
          return {
            name: name
          };
        });

        return Gnd.Ajax.post(TEST_SERVER + 'zoo', zoo).then(function(cid){
          zooCid = cid;
          return Promise.all(animals.map(function(animal){
            return  Gnd.Ajax.post(TEST_SERVER + 'animals', animal);
          })).then(function(animalsCids){
            return Gnd.Ajax.put(TEST_SERVER + 'zoo/' + zooCid + '/animals', animalsCids);
          });
        }).then(function(){
          return Gnd.Ajax.get(TEST_SERVER + 'zoo/' + zooCid + '/animals');
        }).then(function(result){
          expect(result.length).to.be.eql(4);
          console.log(result);
          //
          // TODO: check every item in the collection to be equal the
          // animals.
        });
      });

      it('should remove an item from a collection', function(){
        var zooCid;
        var zoo = {
          name: 'Fuengirla City Zoo'
        };

        var animals = ['rino', 'buffalo', 'giraff', 'panther'].map(function(name){
          return {
            name: name
          };
        });
        var cids;

        return Gnd.Ajax.post(TEST_SERVER + 'zoo', zoo).then(function(cid){
          zooCid = cid;
          return Promise.all(animals.map(function(animal){
            return  Gnd.Ajax.post(TEST_SERVER + 'animals', animal);
          })).then(function(animalsCids){
            cids = animalsCids;
            return Gnd.Ajax.put(TEST_SERVER + 'zoo/' + zooCid + '/animals', animalsCids);
          });
        }).then(function(){
          return Gnd.Ajax.get(TEST_SERVER + 'zoo/' + zooCid + '/animals');
        }).then(function(result){
          expect(result.length).to.be.eql(4);
          //
          // TODO: check every item in the collection to be equal the
          // animals.
        }).then(function(){
          var query = _.map(cids, function(cid, index){
            return ('id='+cid) + (index === cids.length-1 ? '' : '&');
          }).join('');

          return Gnd.Ajax.del(TEST_SERVER + 'zoo/' + zooCid + '/animals?' + query);
        }).then(function(){
          return Gnd.Ajax.get(TEST_SERVER + 'zoo/' + zooCid + '/animals');
        }).then(function(result){
          expect(result.length).to.be.eql(0);
        });
      });

      it('should return all the items in a collection');


      it('should return all the items according to a search condition');
      it('should return all the items supporting pagination');
      it('should notify a item was added to a collection');

    });

    describe('Sequences', function() {
      it('should put some items last in a sequence', function(){
        var paradeCid;
        var parade = {
          name: 'Disneyland Parade'
        };

        var animals = ['rino', 'buffalo', 'giraff', 'panther'].map(function(name){
          return {
            name: name
          };
        });

        return Gnd.Ajax.post(TEST_SERVER + 'parade', parade).then(function(cid){
          paradeCid = cid;
          return Promise.all(animals.map(function(animal){
            return  Gnd.Ajax.post(TEST_SERVER + 'animals', animal);
          })).then(function(animalsCids){
            return Gnd.Ajax.put(TEST_SERVER + 'parade/' + paradeCid + '/animals', [animalsCids[0]]);
          });
        }).then(function(){
          Gnd.Ajax.get(TEST_SERVER + 'parade/' + paradeCid + '/animals');
        }).then(function(result){
          console.log(result);
          //expect(result.length).to.be.eql(4);

          //
          // TODO: check every item in the collection to be equal the
          // animals.
        })
      });

      it('should put an item first in a sequence');
      it('should put an item in the middle of sequence');
      it('should return all the items in a sequence');
      it('should remove an item from a sequence');
      it('should remove an item from a sequence');
    });
  });
});
