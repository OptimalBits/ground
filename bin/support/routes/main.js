define(['gnd'], function(Gnd){

return function(pool){
  var req = this; // this points to this Request object.
  
  // If this is the last component we render a default template
  if(req.isLast()){
    req.render('assets/templates/welcome.html');
  }

  // As an example, this route is handled via an external file
  req.get('configure', '#main', 'routes/configure');

  req.get('models', '#main', function(){
    req.render('assets/templates/models.html');
  });

  req.get('routes', '#main', function(){
    req.render('assets/templates/routes.html');
  });

  req.get('views', '#main', function(){
    req.render('assets/templates/views.html');
  });

  req.get('build', '#main', function(){
    req.render('assets/templates/build.html');
  });

}

}); // define
