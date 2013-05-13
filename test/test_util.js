define(['gnd'], function(Gnd){

describe('Util', function(){
    
  describe('extending (subclassing)', function(){
    it('without new methods', function(){
      var Obj = Gnd.Util.extend(Gnd.Base)
      var obj = new Obj();
      expect(obj).to.be.a(Obj);
      obj.release();
    });
    
    it('with methods', function(done){
      var Obj = Gnd.Util.extend(Gnd.Base, function(_super){
        return {
          constructor: function(){
            _super.constructor.call(this);
          },
          test: function(){
            done();
          }
        }
      })
      var obj = new Obj();
      expect(obj).to.be.a(Obj);
      obj.test();
    });
    it('with custom constructor', function(done){
      var Obj = Gnd.Util.extend(Gnd.Base, function(){
        return {
          constructor: function(){
            done();
          }
        }
      })
      var obj = new Obj();
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
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(1);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 5);
          expect(commands[0]).to.have.property('refId', null);
        });
        it('prepend item', function(){
          var source = [5,1,2,3,4];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(1);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 5);
          expect(commands[0]).to.have.property('refId', 1);
        });
        it('insert item', function(){
          var source = [1,2,5,3,4];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(1);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 5);
          expect(commands[0]).to.have.property('refId', 3);
        });
        it('insert multiple items', function(){
          var source = [6,1,2,5,3,4,7];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(3);
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
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(3);
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
          var commands = Gnd.Util.mergeSequences(source, target, fns);
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
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(1);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 4);
        });
        it('remove first', function(){
          var source = [2,3,4];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(1);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 1);
        });
        it('remove middle', function(){
          var source = [1,4];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(2);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 2);
          expect(commands[1]).to.have.property('cmd', 'removeItem');
          expect(commands[1]).to.have.property('id', 3);
        });
        it('remove all', function(){
          var source = [];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
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
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(6);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 2);
          expect(commands[0]).to.have.property('refId', 1);
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 3);
          expect(commands[1]).to.have.property('refId', 1);
          expect(commands[2]).to.have.property('cmd', 'insertBefore');
          expect(commands[2]).to.have.property('newId', 4);
          expect(commands[2]).to.have.property('refId', 1);
          expect(commands[3]).to.have.property('cmd', 'removeItem');
          expect(commands[3]).to.have.property('id', 2);
          expect(commands[4]).to.have.property('cmd', 'removeItem');
          expect(commands[4]).to.have.property('id', 3);
          expect(commands[5]).to.have.property('cmd', 'removeItem');
          expect(commands[5]).to.have.property('id', 4);
        });
        it('move right to left', function(){
          var source = [4,1,2,3];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(2);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 4);
          expect(commands[0]).to.have.property('refId', 1);
          expect(commands[1]).to.have.property('cmd', 'removeItem');
          expect(commands[1]).to.have.property('id', 4);
        });
        it('move multiple', function(){
          var source = [3,1,4,2];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(4);
          expect(commands[0]).to.have.property('cmd', 'insertBefore');
          expect(commands[0]).to.have.property('newId', 3);
          expect(commands[0]).to.have.property('refId', 1);
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 4);
          expect(commands[1]).to.have.property('refId', 2);
          expect(commands[2]).to.have.property('cmd', 'removeItem');
          expect(commands[2]).to.have.property('id', 3);
          expect(commands[3]).to.have.property('cmd', 'removeItem');
          expect(commands[3]).to.have.property('id', 4);
        });
      });
      describe('Replacing items', function(){
        it('Replacing one item', function(){
          var source = [1,2,5,4];
          var target = [1,2,3,4];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
          expect(commands.length).to.be(2);
          expect(commands[0]).to.have.property('cmd', 'removeItem');
          expect(commands[0]).to.have.property('id', 3);
          expect(commands[1]).to.have.property('cmd', 'insertBefore');
          expect(commands[1]).to.have.property('newId', 5);
          expect(commands[1]).to.have.property('refId', 4);
        });
        it('Replacing all items', function(){
          var source = [5,6];
          var target = [1,2];
          var commands = Gnd.Util.mergeSequences(source, target, fns);
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
          var commands = Gnd.Util.mergeSequences(source, target, fns2);
          expect(commands.length).to.be(0);
        });
        it('All pending items should be kept', function(){
          var source = [];
          var target = [{id:1,insync:false},{id:2,insync:false},{id:2,insync:false}];
          var commands = Gnd.Util.mergeSequences(source, target, fns2);
          expect(commands.length).to.be(0);
        });
      });
    });
    describe('Sequence IStorage', function(){
      var Animal = Gnd.Model.extend('animals');
      var Parade = Gnd.Model.extend('parade');

      socket = io.connect('/', {'force new connection': true});
      sl  = new Gnd.Storage.Local();
      ss = new Gnd.Storage.Socket(socket);
      q  = new Gnd.Storage.Queue(sl, ss);
      Gnd.using.storageQueue = q;

      var fns = {
        id: function(item){
          return item.id;
        },
        docId: function(item){
          // return item.doc._id;
          return item.id;
        },
        keyPath: function(item){
          return item.keyPath;
        },
        doc: function(item){
          return item.doc;
        },
        inSync: function(item){
          return !item.pending;
        }
      };
      
      function seqEqual(sequence, items){
        expect(sequence.items.length).to.equal(items.length);
        for(var i=0; i<items.length; i++){
          var a = sequence.items[i];
          var b = items[i];
          expect(a.id).to.equal(b.id);
          expect(a.model.id()).to.equal(b.doc._id);
          expect(a.pending).to.equal(!!b.pending);
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
          var commands = Gnd.Util.mergeSequences(source, target, fns);
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
            var commands = Gnd.Util.mergeSequences(source, animals.items, fns);
            expect(commands.length).to.be(1);
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
            var commands = Gnd.Util.mergeSequences(source, animals.items, fns);
            expect(commands.length).to.be(1);
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
            var commands = Gnd.Util.mergeSequences(source, animals.items, fns);
            expect(commands.length).to.be(1);
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
            var commands = Gnd.Util.mergeSequences(source, animals.items, fns);
            expect(commands.length).to.be(1);
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
            var commands = Gnd.Util.mergeSequences(source, animals.items, fns);
            expect(commands.length).to.be(1);
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
            var commands = Gnd.Util.mergeSequences(source, animals.items, fns);
            expect(commands.length).to.be(1);
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
            var commands = Gnd.Util.mergeSequences(source, animals.items, fns);
            expect(commands.length).to.be(3);
            execCmds(animals, commands).then(function(){
              console.log(animals.items);
              seqEqual(animals, source);
              done();
            });
          });
        });
      });
    });
  });
});

});
