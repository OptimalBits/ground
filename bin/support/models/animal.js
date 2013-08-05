define(['gnd'], function(Gnd){

  var AnimalSchema = new Gnd.Schema({
    name: {type: String},
    desc: {type: String},
    legs: Number
  });

  return Gnd.Model.extend('animals', AnimalSchema);
})
