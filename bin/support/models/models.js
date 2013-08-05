/**
  Export all the models that should be accessible by Ground.
*/
define(['gnd', './animal', './zoo'], function(Gnd, Animal, Zoo){
  
  var models = {};
  
  models.Animal = Animal;
  models.Zoo = Zoo;
  
  return models;
});

