define(['../models/animal'], function(Animal){

  return function(pool){
    var req = this;
    
    req.render('assets/templates/configure.html');
  }
  
}); //define
