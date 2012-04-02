define(['ginger'], function(ginger){

ginger.route.root = '/';


var goToUrl = function(url){
  location.hash = url;
  if ('onhashchange' in window) {
    $(window).trigger('onhashchange');
  }
}

describe('Routes', function(){

describe('simple routes', function(){
  it('root route', function(done){
    ginger.route.listen(function(req){
      req.get(function(){
        ginger.route.stop();
        done();
      });
    });
  });
  
  it('hierarchical route', function(done){
    ginger.route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.get('foo','#test', function(){
            req.get('bar', '#foo', function(){
              ginger.route.stop();
              done();  
            });
          });
          req.get('baz','#test', function(){
            req.get('qux','#baz', function(){
              
            });
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  it('change from one deep route to another deep route', function(done){
    ginger.route.stop();
    goToUrl('');
    ginger.route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.get('foo','#test', function(){
            req.get('bar', '#foo', function(){
              goToUrl('/test/baz/qux');  
            });
          });
          req.get('baz','#test', function(){
            req.get('qux','#baz', function(){
              done(); 
            });
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  
  it('stop listening route', function(){
    ginger.route.stop();
  });


  
});

});


});


