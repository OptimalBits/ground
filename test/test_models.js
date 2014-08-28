define(['gnd', 'fixtures/models'], function(Gnd, models){
"use strict";

Gnd.debugMode = true;
  
localStorage.clear();

describe('Model Datatype', function(){
  Gnd.use.syncManager(socket);

  var storageQueue;

  var Animal = models.Animal;
  var animal;

  var socket1, sl1, ss1, q1, sm1;
  var socket2, sl2, ss2, q2, sm2;

  before(function(done){
    socket1 = io.connect('/', {'force new connection': true});
    sl1  = new Gnd.Storage.Local(new Gnd.Storage.Store.MemoryStore());
    ss1 = new Gnd.Storage.Socket(socket1);
    storageQueue  = q1 = new Gnd.Storage.Queue(sl1, ss1);
    sm1 = new Gnd.Sync.Manager(socket1);

    socket1.on('connect', function(){
      socket2 = io.connect('/', {'force new connection': true});
      sl2  = new Gnd.Storage.Local(new Gnd.Storage.Store.MemoryStore());
      ss2 = new Gnd.Storage.Socket(socket2);
      q2  = new Gnd.Storage.Queue(sl2, ss2);
      sm2 = new Gnd.Sync.Manager(socket2);

      socket2.on('connect', function(){
        Gnd.using.storageQueue = q1;
        Gnd.using.syncManager = sm1;

        Animal.create().then(function(doc){
          animal = doc;
          storageQueue.init(function(){
            storageQueue.exec().then(done);
          });
        });
      });
    });
  });
  
  beforeEach(function(){
    Gnd.Model.__useDepot = true;
    Gnd.using.storageQueue = q1;
    Gnd.using.syncManager = sm1;
  });
  
  describe('Instantiation', function(){
    it('with new operator', function(){
      var instance = new Animal();
      expect(instance).to.be.a(Animal);
    });
    it('as a factory method', function(){
      var instance = Animal.create();
      expect(instance).to.be.a(Animal);
    });
  });
  
  describe('findById', function(){
    it('finds the animal', function(done){
      Animal.findById(animal.id()).then(function(doc){
        expect(doc).to.be.ok();
        expect(doc.id()).to.equal(animal.id());
        doc.release();
        done();
      });
    });
  });
  
  describe('Create Model', function(){
    it('after saved it should be persisted', function(done){
      var fox = Animal.create({name:'fox', legs:4});
      fox.save();
      
      fox.on('persisted:', function(){
        done();
      });
    })
    it('autosync should persist automatically', function(done){
      var fox = Animal.create({name:'fox', legs:4}, true);
      
      fox.on('persisted:', function(){
        done();
      });
    })
  })
  
  describe('Update', function(){
    it('updates the server model', function(done){
      var animal = Animal.create();
      
      animal.set('name', 'foobar');
      
      animal.save();
      
      animal.once('created:', function(){
        expect(animal).to.have.property('_id');
        expect(animal._id).to.be.eql(animal.id());
      });
      
      storageQueue.waitUntilSynced(function(){
        Animal.findById(animal.id()).then(function(doc){
          expect(doc.id()).to.eql(animal.id());
          expect(doc).to.have.property('name');
          expect(doc.name).to.be.eql('foobar');
          doc.release();
          done();
        });
      });
    });
    
    it('another instance propagates changes', function(done){
      
      Gnd.Model.__useDepot = false;
      
      Animal.create({name: 'pinguin', legs: 2}, true).then(function(pinguin){
        
        expect(pinguin).to.have.property('legs');
        expect(pinguin).to.have.property('name');
        expect(pinguin.legs).to.be(2);
         
        pinguin.once('persisted:', function(){
          Gnd.using.storageQueue = q2;
          Gnd.using.syncManager = sm2;
          
          Animal.findById(pinguin.id(), true).then(function(pinguin2){
            expect(pinguin2).to.have.property('legs');
            expect(pinguin2).to.have.property('name');
            expect(pinguin2.legs).to.be(2);
            
            // Force start since we only have one global sync proxy(needed for test)
            sm2.start(pinguin2.getKeyPath());

            pinguin2.once('legs', function(legs){
              expect(pinguin2.legs).to.be(3);
            
              pinguin.once('changed:', function(){
                expect(pinguin.name).to.be('super pinguin');
                expect(pinguin.legs).to.be(5);
              
                expect(pinguin2.name).to.be('super pinguin');
                expect(pinguin2.legs).to.be(5);
              
                pinguin.release();
                pinguin2.release();
                
                done();
              });

              pinguin2.set({name:'super pinguin', legs:5});
            })

            pinguin.set({name: 'emperor pinguin', 'legs': 3});
          });
        });
      });
    });

    it('not propagate changes when enabling nosync', function(done){
 
      Gnd.Model.__useDepot = false;
      
      Animal.create({name: 'pinguin', legs: 2}, true).then(function(pinguin){
        expect(pinguin).to.have.property('legs');
        expect(pinguin).to.have.property('name');
        expect(pinguin.legs).to.be(2);
        
        pinguin.save();
         
        pinguin.once('persisted:', function(){
          Gnd.using.storageQueue = q2;
          Gnd.using.syncManager = sm2;
          
          Animal.findById(pinguin.id(), true).then(function(pinguin2){
            expect(pinguin2).to.have.property('legs');
            expect(pinguin2).to.have.property('name');
            expect(pinguin2.legs).to.be(2);
            
            sm2.observe(pinguin2);
            // Force start since we only have one global sync proxy(needed for test)
            sm2.start(pinguin2.getKeyPath());
          
            pinguin2.once('legs', function(legs){
              
              pinguin.on('changed:', function(){
                expect(true).to.be(false);
              });
            
              pinguin2.set({name:'super pinguin', legs:2}, {nosync:true});
                
              q2.waitUntilSynced(function(){
                expect(pinguin.name).to.be('pinguin');
                expect(pinguin.legs).to.be(3);
              
                expect(pinguin2.name).to.be('super pinguin');
                expect(pinguin2.legs).to.be(2);
              
                pinguin.release();
                pinguin2.release();
                
                setTimeout(function(){
                  done();
                }, 100);
              })
            })
          
            pinguin.set('legs', 3);
          });
        });
      });
     
    });
    
    it('releasing an instance keeps other synchronized', function(done){
      
      Animal.create({name:'fox', legs:4}, true).then(function(oneFox){
        oneFox.on('persisted:', function(){
  
          Animal.findById(oneFox.id(), true).then(function(secondFox){
            expect(secondFox).to.eql(oneFox);
          
            Animal.findById(oneFox.id()).then(function(thirdFox){
              expect(thirdFox).to.have.property('legs', secondFox.legs);
              expect(thirdFox).to.have.property('name', secondFox.name);
            
              thirdFox.keepSynced();
              thirdFox.release();
              secondFox.set('legs', 3);
            });
          });
        });
        
        oneFox.once('changed:', function(){
          done();
        });
      });
    });
  });

  describe('Offline', function(){
    var animal;
    
    before(function(){
      socket.on('connect', storageQueue.syncFn);
    });
    
    beforeEach(function(done){
      Animal.create({tail:true}, true).then(function(newAnimal){
        newAnimal.save();
        animal = newAnimal;
        storageQueue.exec().then(done)
      });
    });
      
    //
    // Simulate a disconnect in the middle of an emit.
    //
    /*
    it('disconnect', function(done){
      var otherAnimal;
      animal.off();
      
      var orgEmit = socket.emit;
      socket.emit = function(){
        socket.socket.disconnect();
      }

      Animal.findById(animal.id()).then(function(doc){
        expect(doc).to.have.property('_id');
        expect(doc._id).to.eql(animal._id);
        doc.keepSynced();
        doc.set({legs:3});
        otherAnimal = doc;
        
        Animal.findById(animal.id()).then(function(doc){
          expect(doc).to.have.property('legs');
          expect(doc).to.have.property('tail');
          expect(doc.legs).to.be(3);
          socket.emit = orgEmit;
          socket.socket.connect(function(){
            storageQueue.waitUntilSynced(function(){
              expect(storageQueue.isEmpty()).to.be(true);
              done();
            });
          });
        })
      });
    });
    */
    
    //
    //  Creates a model while offline automatically creates it when
    //  going back to online.
    //
    it('create', function(done){
      socket.disconnect();

      var tempAnimal = Animal.create({legs : 8, name:'gorilla'}, true);
        
      socket.io.connect();
      
      tempAnimal.on('persisted:', function(){
        Animal.findById(tempAnimal.id()).then(function(doc){
          expect(doc.legs).to.be(8);
          storageQueue.waitUntilSynced(function(){
            expect(storageQueue.isEmpty()).to.be(true);
            done();
          });
        });
      })
    });
    
    //
    //  Tests that after doing a findById, the object has been cached and
    //  is available in offline mode.
    //
    it('findById caches object', function(done){
      Animal.create({legs : 8, name:'spider-pig'}, true).then(function(bat){
        socket.disconnect();
      
        Animal.findById(bat.id()).then(function(offlineBat){
          expect(offlineBat).to.be.ok();
          expect(offlineBat.id()).to.be(bat.id());
          socket.io.connect();
          done();
        })
      });
    });
    
    //
    //  A model is instantiated and keep synced before saving,
    //  as soon as it is saved it should be kept synced with other
    //  instances.
    
    it('keepSynced before save', function(done){
      Animal.create({name: 'elephant', legs:4}, true).then(function(elephant){
        
        Animal.findById(elephant.id(), true).then(function(otherElephant){
          expect(otherElephant).to.be.ok();
          expect(otherElephant).to.be(elephant);
          
          elephant.once('changed:', function(doc){
            expect(elephant.legs).to.be(5);
            elephant.release();
            otherElephant.release();
            done();
          });
          
          otherElephant.set('legs', 5);
        });
        
      }) 
    });
    
    it('keepSynced before save (waiting for sync)', function(done){
      var elephant = Animal.create({name: 'elephant', legs:4}, true);
      
      storageQueue.waitUntilSynced(function(){
        expect(elephant.isPersisted()).to.be.ok();
          
        Animal.findById(elephant.id(), true).then(function(otherElephant){
          expect(otherElephant).to.be.ok();
          expect(otherElephant).to.be(elephant);
          
          elephant.once('changed:', function(doc){
            expect(elephant.legs).to.be(5);
            elephant.release();
            otherElephant.release();
            done();
          });
          
          otherElephant.set('legs', 5);
        });
      });
    });

    //
    //  Deletes a model while offline, the model is deleted in the server
    //  as soon as we are back online.
    //
    it('delete', function(done){
      var tempAnimal = Animal.create({legs : 8, name:'spider-pig'}, true);
      
      storageQueue.waitUntilSynced(function(){
        expect(tempAnimal.isPersisted()).to.be.ok();
        
        socket.disconnect();
        
        socket.once('reconnect', function(){
          storageQueue.waitUntilSynced(function(){
            Animal.findById(tempAnimal.id()).fail(function(err){
              expect(err).to.be.an(Error);
              done();
            });
          });
        });
        
        tempAnimal.remove().then(function(){
          socket.io.reconnect();
        });
      });
      
    });
    
    it('delete a model deletes it also from local cache', function(done){
      var spiderPig = Animal.create({legs : 8, name:'spider-pig'}, true);
                
      storageQueue.waitUntilSynced(function(){
        expect(spiderPig.isPersisted()).to.be.ok();
        
        spiderPig.remove().then(function(){
          
          storageQueue.waitUntilSynced(function(){
            socket.once('disconnect', function(){
              Animal.findById(spiderPig.id()).then(function(doc){
                console.log(doc)
              }, function(err){
                expect(err).to.be.an(Error);

                socket.io.reconnect();
                socket.once('reconnect', done);
              });
            })
          
            socket.disconnect();
          });
        });
      });
    });
    
    //
    // A model updated in the server while being offline gets
    // updated as soon as we get online.
    // (Note: we do not handle conflicts yet).
    // 
    it('server side update while offline', function(done){
      var spider = Animal.create({legs : 8, name:'spider'}, true);
      
      storageQueue.waitUntilSynced(function(){
        
        socket.once('disconnect', function(){
          var obj = {legs:7};
          Gnd.Ajax.put('/animals/'+spider.id(), obj).then(function(){
            
            spider.once('legs', function(legs){
              expect(legs).to.be(7);
              done();
            })
            
            socket.io.connect(); 
          });
        })
        socket.disconnect();
      });
    });
  });

  describe('Delete', function(){
    it('local delete propagates delete event', function(done){
      Animal.create({legs : 8, name:'spider'}).then(function(tempAnimal){
        tempAnimal.on('deleted:', function(){
          Animal.findById(tempAnimal.id()).fail(function(err){
            expect(err).to.be.ok();
            done();
          });
        });
      
        tempAnimal.remove();
        tempAnimal.release();
      });
    });
    
    it('remote delete propagates delete event', function(done){
      Gnd.Model.__useDepot = false;
      
      Animal.create({legs : 8, name:'spider'}, true).then(function(tempAnimal){
        tempAnimal.save();
        
        tempAnimal.on('deleted:', function(){
          Animal.findById(tempAnimal.id()).fail(function(err){
            expect(err).to.be.ok();
            done();
          });
        });
      
        Gnd.using.storageQueue.waitUntilSynced(function(){
          Gnd.using.storageQueue = q2;
          Gnd.using.syncManager = sm2;
          
          Animal.findById(tempAnimal.id(), true).then(function(spider){
            sm2.start(spider.getKeyPath());
            
            spider.remove();
          });
        });
      });
    });
  });
  
  describe('Schemas', function(){
    var GuitarSchema;
    
    before(function(){
      GuitarSchema = new Gnd.Schema({
        brand: String,
        model: String,
        numStrings: Number,
        bridge: String
      });
    })
    
    it('Define simple schema', function(){
      
      var obj = GuitarSchema.toObject({
        brand: "Fender",
        model: "Stratocaster",
        numStrings: 6,
        color: "black"
      });

      expect(obj).to.have.property('brand');
      expect(obj.brand).to.be('Fender');
      expect(obj).to.have.property('model');
      expect(obj.model).to.be('Stratocaster');
      expect(obj).to.have.property('numStrings');
      expect(obj.numStrings).to.be(6);
      expect(obj).not.to.have.property('color');
      expect(obj).not.to.have.property('bridge');
    });

    if('Model without any schema', function(){
      var Schemaless = Gnd.Model.extend('schemaless');
      
      var schemaless = new Schemaless();
      
      var args = schemaless.toArgs();
      
      expect(args).to.have.property('_cid');
      expect(args).to.have.property('_id');
      expect(args).to.have.property('persisted');
    });

    it('Define model using a schema', function(){

       var Guitar = Gnd.Model.extend('guitars', GuitarSchema);

       var custom24 = new Guitar({brand: "PRS", 
                                  model: "Custom 24",
                                  color: 'Royal Blue'});

       var args = custom24.toArgs();

       expect(args).to.have.property('brand');
       expect(args.brand).to.be('PRS');
       expect(args).to.have.property('model');
       expect(args.model).to.be('Custom 24');
       expect(args).not.to.have.property('numStrings');
       expect(args).not.to.have.property('bridge');
       expect(args).not.to.have.property('color');
     });
     
     it('Define schema with subschemas', function(){
       var PedalSchema = new Gnd.Schema({
         name: String,
         brand: String
       });
       
       var AmpSchema = new Gnd.Schema({
         brand: String,
         tube: Boolean
       })
       
       var GearSchema = new Gnd.Schema({
         artist: String,
         guitar: GuitarSchema,
         pedal: PedalSchema,
         amp: AmpSchema
       });
       
       var obj = GearSchema.toObject({
         artist: 'Porcupine Tree',
         country: 'England',
         guitar: {
           brand: 'PRS',
           model: 'custom 24',
           bridge: 'Floyd Rose',
           color: 'Turtle Green'
         },
         pedal: {
           name: 'delay',
           brand: 'BOSS',
           type: 'analog'
         },
         amp: {
           brand: 'Orange',
           tube: true
         } 
       });
       
       expect(obj).to.have.property('artist');
       expect(obj.artist).to.be('Porcupine Tree');
       expect(obj).not.to.have.property('country');
      
       expect(obj).to.have.property('guitar');
       expect(obj.guitar).to.have.property('brand');
       expect(obj.guitar.brand).to.be('PRS');
       expect(obj.guitar).to.have.property('bridge');
       expect(obj.guitar.bridge).to.be('Floyd Rose');
       expect(obj.guitar).to.have.property('model');
       expect(obj.guitar.model).to.be('custom 24');
       expect(obj.guitar).not.to.have.property('color');
       
       expect(obj).to.have.property('pedal');
       expect(obj.pedal).to.have.property('name');
       expect(obj.pedal.name).to.be('delay');
       expect(obj.pedal).to.have.property('brand');
       expect(obj.pedal.brand).to.be('BOSS');
       expect(obj.pedal).not.to.have.property('type');
       
       expect(obj).to.have.property('amp');
       expect(obj.amp).to.have.property('brand');
       expect(obj.amp.brand).to.be('Orange');
       expect(obj.amp).to.have.property('tube');
       expect(obj.amp.tube).to.be(true);
     });
     
     it('Define schema with arrays', function(){
       var PedalSchema = new Gnd.Schema({
         name: String,
         brand: String
       });
              
       var GearSchema = new Gnd.Schema({
         artist: String,
         guitar: GuitarSchema,
         pedals: [PedalSchema],
         amps: {type: [String], index: true}
       });
       
       var obj = GearSchema.toObject({
         artist: 'Porcupine Tree',
         country: 'England',
         guitar: {
           brand: 'PRS',
           model: 'custom 24',
           bridge: 'Floyd Rose',
           color: 'Turtle Green'
         },
         pedals: [{
           name: 'delay',
           brand: 'BOSS',
         },{
           name: 'flanger',
           brand: 'Behringer'
         }],
         amps: ['orange', 'fender', 'PRS']
       });
       
       expect(obj).to.have.property('artist');
       expect(obj.artist).to.be('Porcupine Tree');
       expect(obj).not.to.have.property('country');
      
       expect(obj).to.have.property('guitar');
       expect(obj.guitar).to.have.property('brand');
       expect(obj.guitar.brand).to.be('PRS');
       expect(obj.guitar).to.have.property('bridge');
       expect(obj.guitar.bridge).to.be('Floyd Rose');
       expect(obj.guitar).to.have.property('model');
       expect(obj.guitar.model).to.be('custom 24');
       expect(obj.guitar).not.to.have.property('color');
       
       expect(obj).to.have.property('pedals');
       expect(obj.pedals).to.have.length(2);
       expect(obj.pedals[0]).to.have.property('name');
       expect(obj.pedals[0].name).to.be('delay');
       
       expect(obj.pedals[0]).to.have.property('brand');
       expect(obj.pedals[0].brand).to.be('BOSS');
       
       expect(obj.pedals[1]).to.have.property('name');
       expect(obj.pedals[1].name).to.be('flanger');
       
       expect(obj.pedals[1]).to.have.property('brand');
       expect(obj.pedals[1].brand).to.be('Behringer');
       
       expect(obj).to.have.property('amps');
       expect(obj.amps).to.have.length(3);
       expect(obj.amps[0]).to.be('orange');
       expect(obj.amps[1]).to.be('fender');
       expect(obj.amps[2]).to.be('PRS');
     });
     
     it.skip('Define schema with plain objects', function(){

     });
    
     it('applies default values', function(){
       var ConferenceSchema = new Gnd.Schema({
         location: String,
         numDays: {type: Number, default: 3}
       });
       
       var obj = ConferenceSchema.toObject({
         location: 'Berlin'
       });
       
       expect(obj).to.have.property('numDays');
       expect(obj.numDays).to.be(3);
       expect(obj).to.have.property('location');
       expect(obj.location).to.be('Berlin');
     });
     
     it('applies default values on subschemas', function(){
       var RectSchema = new Gnd.Schema({
         x: {type: Number, default: 10},
         y: {type: Number, default: 5},
         w: {type: Number, default: 20},
         h: {type: Number, default: 30},
         round_corners: Boolean
       })
       
       var WidgetSchema = new Gnd.Schema({
         rect: RectSchema,
         color: {type: String, default: "red"}
       });
       
       var obj = WidgetSchema.toObject({});
       
       expect(obj).to.have.property('rect');
       expect(obj).to.have.property('color');
       expect(obj.color).to.be('red')
       
       expect(obj.rect).to.have.property('x');
       expect(obj.rect.x).to.be(10);
       expect(obj.rect).to.have.property('y');
       expect(obj.rect.y).to.be(5);
       expect(obj.rect).to.have.property('h');
       expect(obj.rect.w).to.be(20);
       expect(obj.rect).to.have.property('w');
       expect(obj.rect.h).to.be(30);       
     });
     
     it('Setting an object on a property defined as Model instances the model', function(done){
       var CarSchema = new Gnd.Schema({
         color: String,
         brand: String
       });
       
       var CarModel = Gnd.Model.extend('cars', CarSchema);

       var DriverSchema = new Gnd.Schema({
         name: String,
         car: new Gnd.ModelSchemaType(CarModel)
       });
       
       var DriverModel = Gnd.Model.extend('drivers', DriverSchema);
       
       var driver = new DriverModel({name: 'Vettel'});

       driver.on('car', function(doc){
         expect(doc).to.be.an(CarModel);
         expect(doc).to.have.property('brand');
         expect(doc).to.have.property('color');
         done();
       });
     
       driver.set({car: {brand: 'Red Bull', color: 'Blue'}});

     })
     
     it('Setting an object on a deep property defined as Model instances the model', function(done){
       var CarSchema = new Gnd.Schema({
         color: String,
         brand: String
       });
       
       var CarModel = Gnd.Model.extend('cars', CarSchema);

       var DriverSchema = new Gnd.Schema({
         name: String,
         car: new Gnd.ModelSchemaType(CarModel)
       });
       
       var DriverModel = Gnd.Model.extend('drivers', DriverSchema);
       
       var RaceSchema = new Gnd.Schema({
         location: String,
         bestDriver: new Gnd.ModelSchemaType(DriverModel)
       });
       
       var RaceModel = Gnd.Model.extend('races', RaceSchema)
       
       var race = new RaceModel();
       
       race.on('bestDriver', function(doc){
         console.log(doc);
         done();
       })
       
       race.set('bestDriver', {name: 'Alonso', car: {color: 'red', brand: 'Ferrari'}});
     })
     
     it('Setting an object on a nested model property instances the model', function(done){
       var WheelSchema = new Gnd.Schema({
         type: String,
         brand: String
       });
       
       var WheelModel = Gnd.Model.extend('wheels', WheelSchema);
       
       var CarSchema = new Gnd.Schema({
         color: String,
         brand: String,
         wheel: new Gnd.ModelSchemaType(WheelModel)
       });
       
       var CarModel = Gnd.Model.extend('cars', CarSchema);

       var DriverSchema = new Gnd.Schema({
         name: String,
         car: new Gnd.ModelSchemaType(CarModel)
       });
       
       var DriverModel = Gnd.Model.extend('drivers', DriverSchema);
       
       var driver = new DriverModel({name: 'Vettel'});

       driver.on('car', function(doc){
         expect(doc).to.be.an(CarModel);
         expect(doc).to.have.property('brand');
         expect(doc).to.have.property('color');
         expect(doc).to.have.property('wheel');
         expect(doc.wheel).to.be.an(WheelModel);
         expect(doc.wheel.type).to.be.eql('hard');
         expect(doc.wheel.brand).to.be.eql('Bridgestone');
         done();
       });
       
       // We would like the following events to also be emitted
       /*
       driver.on('car.brand', function(doc){
         done();
       })       
       driver.on('car.wheel', function(doc){
         done();
       })
       driver.on('car.wheel.brand', function(doc){
         done();
       })
       */
     
       driver.set({car: {brand: 'Red Bull', color: 'Blue', wheel: {type: 'hard', brand: 'Bridgestone'}}});
     })
     
     it.skip('Setting an object on a nested model property instances the model 2', function(done){
       var WheelSchema = new Gnd.Schema({
         type: String,
         brand: String
       });
       
       var WheelModel = Gnd.Model.extend('wheels', WheelSchema);
       
       var CarSchema = new Gnd.Schema({
         color: String,
         brand: String,
         wheel: new Gnd.ModelSchemaType(WheelModel)
       });
       
       var CarModel = Gnd.Model.extend('cars', CarSchema);

       var DriverSchema = new Gnd.Schema({
         name: String,
         car: new Gnd.ModelSchemaType(CarModel)
       });
       
       var DriverModel = Gnd.Model.extend('drivers', DriverSchema);
       
       var driver = new DriverModel({name: 'Vettel'});

       driver.on('car', function(doc){
         expect(doc).to.be.an(CarModel);
         expect(doc).to.have.property('brand');
         expect(doc).to.have.property('color');
         expect(doc).to.have.property('wheel');
         expect(doc.wheel).to.be.an(WheelModel);
         expect(doc.wheel.type).to.be.eql('hard');
         expect(doc.wheel.brand).to.be.eql('Bridgestone');
         done();
       });
       
       // We would like the following events to also be emitted
       /*
       driver.on('car.brand', function(doc){
         done();
       })       
       driver.on('car.wheel', function(doc){
         done();
       })
       driver.on('car.wheel.brand', function(doc){
         done();
       })
       */
     
       driver.set('car.wheel', {type: 'hard', brand: 'Bridgestone'});
     });
  
     it.skip('Schema validates values');

  });


});



}); // define



