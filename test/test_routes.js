define(['ginger', 'ginger/route'], function(ginger, route){

route.root = '/';


var goToUrl = function(url){
  location.hash = url;
  if ('onhashchange' in window) {
    $(window).trigger('onhashchange');
  }
}

describe('Routes', function(){

describe('simple routes', function(){

  route.stop();
  goToUrl('');
  it('root route', function(done){
    route.listen(function(req){
      req.get(function(){
        route.stop();
        done();
      });
    });
  });
  it('consume routes in correct order', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('foo','#test', function(){
          req.get('bar', '#foo', function(){
            route.stop();
            done();  
          });
        });
        req.get('bar','#test', function(){
          expect(0).to.be.ok();
          done();
        });
      });
    });
    goToUrl('/foo/bar');
  });
  
  it('hierarchical route', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.get('foo','#test', function(){
            req.get('bar', '#foo', function(){
              route.stop();
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
    route.stop();
    goToUrl('');
    route.listen(function(req){
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
  
  it('change one route component in the middle of a route', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.get('foo','#foo', function(){
            req.get('bar', '#bar', function(){
              goToUrl('/test/qux/bar');
            });
          });
          req.get('qux','#qux', function(){
            req.get('bar','#bar', function(){
              done(); 
            });
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  it('autorelease objects after change from one deep route to another deep route', function(done){
    var test = new ginger.Base();
    var foo = new ginger.Base();
    var bar = new ginger.Base();
    
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(pool){
          req.after(function(){
            pool.autorelease(test);
          });
          req.get('foo','#test', function(pool){
            req.after(function(){
              pool.autorelease(foo);
            });
            req.get('bar', '#foo', function(pool){
              req.after(function(){
                pool.autorelease(bar);
                goToUrl('/test/baz/qux');
              });
            });
          });
          req.get('baz','#test', function(){
            req.get('qux','#baz', function(){
              req.after(function(){
                expect(test.isDestroyed()).to.be(false);
                expect(foo.isDestroyed()).to.be(true);
                expect(bar.isDestroyed()).to.be(true);
                goToUrl('/fox');
              });
            });
          });
        });
        req.get('fox', '#main', function(){
          req.after(function(){
            expect(test.isDestroyed()).to.be(true);
            done();
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  it('autorelease objects in route that changes a middle component', function(done){
    var test = new ginger.Base();
    var foo = new ginger.Base();
    var bar = new ginger.Base();
  
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(pool){
          req.after(function(){
            pool.autorelease(test);
          });
          req.get('foo','#foo', function(pool){
            req.after(function(){
              pool.autorelease(foo);
            });
            req.get('bar', '#bar', function(pool){
              req.after(function(){
                pool.autorelease(bar);
                goToUrl('/test/qux/bar');
              });
            });
          });
          req.get('qux','#qux', function(){
            req.get('bar','#bar', function(){
              req.after(function(){
                expect(test.isDestroyed()).to.be(false);
                expect(foo.isDestroyed()).to.be(true);
                expect(bar.isDestroyed()).to.be(true);
                done();
              });
            });
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });  
  
  it('stop listening route', function(){
    route.stop();
  });

  
});

});


});


