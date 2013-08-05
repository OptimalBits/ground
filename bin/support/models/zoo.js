define(['gnd', './animal'], function(Gnd, Animal){

  var ZooSchema = new Gnd.Schema({
    name: {type: String},
    birds: new Gnd.CollectionSchemaType(Animal, 'animals'),
    mammals: new Gnd.CollectionSchemaType(Animal, 'animals'),
    parade: new Gnd.SequenceSchemaType(Animal, 'animals'),
  });

  return Gnd.Model.extend('zoo', ZooSchema);
});
