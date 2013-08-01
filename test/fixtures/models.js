define(['gnd'], function(Gnd){
  
  var models = {};

  var AnimalSchema = new Gnd.Schema({
    name: String,
    desc: String,
    selected: Boolean,
    visible: Boolean,
    legs: Number,
    tail: Boolean,
    pos: Number});
  models.Animal = Gnd.Model.extend('animals', AnimalSchema);
  
  var ZooSchema = new Gnd.Schema({
    animals: new Gnd.CollectionSchemaType(models.Animal, 'animals')
  });
  
  models.Zoo = Gnd.Model.extend('zoo', ZooSchema);
  
  var ParadeSchema = new Gnd.Schema({
    animals: new Gnd.SequenceSchemaType(models.Animal, 'animals'),
    animals2: new Gnd.SequenceSchemaType(models.Animal, 'animals'),  
  });
  models.Parade = Gnd.Model.extend('parade', ParadeSchema);
  
  models.Document = Gnd.Model.extend('documents', new Gnd.Schema({
    foo: String,
    baz: String
  }));
  
  return models;
});
