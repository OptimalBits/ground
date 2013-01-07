define(['gnd', 'jquery'], function(Gnd, $){

var route = Gnd.Route;

// Helpers
var goToUrl = function(url){
  location.hash = url;
  if ('onhashchange' in window) {
    $(window).trigger('onhashchange');
  }
}

describe('Routes', function(){

describe('simple routes', function(){
  it('root route', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        route.stop();
        done();
      });
    });
  });
 
  it('foobar route', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('foo', '#foo', function(){
          req.get('bar', '#bar', function(){
            done();
          });
        });
      });
    });
    goToUrl('/foo/bar');
  });
  
  it('parametric route', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('foo', '#foo', function(){
          req.get(':bar', '#bar', function(){
            expect(req.params.bar).to.be.equal('123456');
            done();
          });
        });
      });
    });
    goToUrl('/foo/123456');
  });
  
  it('foobar route with baz in main and subroute', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('foo', '#foo', function(){
          req.get('bar', '#bar', function(){
            expect(1).to.be(0);
          });
          req.get('baz', '#baz', function(){
            done();
          });
        })
        req.get('baz', function(){
          expect(1).to.be(0);
        });
      });
    });
    goToUrl('/foo/baz');
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
  
  it('changing from one route to another does not execute after on common nodes', function(done){
    var onceTest = 0, onceFoo = 0;
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.after(function(){
            onceTest ++;
          });
          req.get('foo','#foo', function(){
            req.after(function(){
              onceFoo ++;
            })
            req.get('bar', '#bar', function(){
              goToUrl('/test/foo/qux');
            });
            req.get('qux','#qux', function(){
              expect(onceTest).to.be.equal(1);
              expect(onceFoo).to.be.equal(1);
              done();
            });
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  it('changing from one route to another only exits from old nodes once', function(done){
    var onceTest = 0, onceFoo = 0, onceBar = 0;
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.leave(function(){
            onceTest ++;
          });
          req.get('foo','#foo', function(){
            req.leave(function(){
              onceFoo ++;
            })
            req.get('bar', '#bar', function(){
              req.leave(function(){
                onceBar ++;
              })
              goToUrl('/test/foo/qux');
            });
            req.get('qux','#qux', function(){
              expect(onceTest).to.be.equal(0);
              expect(onceFoo).to.be.equal(0);
              expect(onceBar).to.be.equal(1);
              done();
            });
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  it('load json data within route', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.load('fixtures/route_data.json', function(){
          expect(req).to.have.property('data');
          expect(req.data.foo).to.be.eql('bar');
          done();
        });
      });
    });
  });
  
  it('render template', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.render('fixtures/test1.tmpl', function(){
          done();
        })
      });
    });
  });
  
  
  it('autorelease objects after change from one deep route to another deep route', function(done){
    var test = new Gnd.Base();
    var foo = new Gnd.Base();
    var bar = new Gnd.Base();
    
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
    var test = new Gnd.Base();
    var foo = new Gnd.Base();
    var bar = new Gnd.Base();
  
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
  
  it('redirect from a deep route to another deep route', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.get('foo','#test', function(){
            req.get('bar', '#foo', function(){
              req.after(function(){
                req.redirect('/test/baz/qux');
              })
            });
          });
          req.get('baz','#test', function(){
            req.get('qux','#baz', function(){
              req.after(function(){
                done();
              });
            });
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  it('redirect from a deep route to another deep route and redirect to another route', function(done){
    route.stop();
    goToUrl('');
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.get('foo','#test', function(){
            req.get('bar', '#foo', function(){
              req.after(function(){
                req.redirect('/test/baz');
              })
            });
          });
          req.get('baz','#test', function(){
            req.after(function(){
              req.redirect('/test/qux')
            })
          });
          req.get('qux','#baz', function(){
            req.after(function(){
              done();
            })
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  it('Change from a deep route to another deep route, redirect to some route, then redirect to original route', function(done){
    route.stop();
    goToUrl('');
    var counter = 0;
    route.listen(function(req){
      req.get(function(){
        req.get('test', '#main', function(){
          req.get('foo','#test', function(){
            req.get('bar', '#foo', function(){
              req.after(function(){
                counter++;
                if(counter == 2){
                  done();
                }else{
                  goToUrl('/test/baz/foo');
                }
              })
            });
          });
          req.get('qux','#qux', function(){
            req.get('bar','#bar', function(){
              req.after(function(){
                req.redirect('/test/foo/bar');
              });
            });
          });
                    
          req.get('baz','#baz', function(){
            req.get('foo', '#foo', function(){
              req.after(function(){
                req.redirect('/test/qux/bar')
              });
            })
          });
        });
      });
    });
    goToUrl('/test/foo/bar');
  });
  
  it('Simulate the route redirections in a automatic outlogging and consequently manually login', function(done){
    route.stop();
    goToUrl('');
    var counter = 0;
    
    route.listen(function(req){
      req.get(function(){
        req.get('b', '#main', function(){
          req.get('c', '#test', function(){
            req.after(function(){
              goToUrl('/b/d');
            })            
          });
          req.get('d', '#test', function(){
            req.after(function(){
              counter++;
              if(counter==2){
                done();
              }else{
                req.redirect('/e');
              }
            })
          });
        })
        req.get('e', '#main', function(){
          req.after(function(){
            req.redirect('/b/d');
          })
        })
      })
    })
    goToUrl('/b/c');
  });
  
  it('redirect to a deeper route calls after functions correctly', function(done){
    var execAfter = false;
    
    route.stop();
    goToUrl('');
    
    route.listen(function(req){
      req.get(function(){
        if(req.isLast()){
          req.redirect('/foo');
        }
        
        req.after(function(){
          execAfter = true;
        })
      
        req.get('foo', '#foo', function(){
          expect(execAfter).to.be.ok();
          done();
        })
      })      
    });
    
    goToUrl('/');
  });
  
  it('notFound should be called when no routes defined', function(done){
    route.stop();
    goToUrl('');
    
    route.listen(function(req){      
      req.notFound(function(){
        done();
      });
    });
    
    goToUrl('/foo/bar');
  });
  
  it("notFound's after should be called when no matching a route", function(done){
    route.stop();
    goToUrl('');
    
    route.listen(function(req){
      req.get(function(){
        req.get('b', '#main', function(){
          req.get('c', '#test', function(){
            req.after(function(){
              expect(1).to.be(0);
            })            
          });
        });
        req.get('d', '#main', function(){
          req.get('e', '#test', function(){
            req.after(function(){
              done();
            })            
          });
        });
      });
      req.notFound(function(req){
        req.after(function(){
          req.redirect('/d/e');
        });
      });
    });
    
    goToUrl('/foo/bar');
  });
  
  it("notFound's after should be called when partially matching a route", function(done){
    route.stop();
    goToUrl('');
    
    route.listen(function(req){
      req.get(function(){
        req.get('b', '#main', function(){
          req.get('c', '#test', function(){
            req.after(function(){
              expect(1).to.be(0);
            })            
          });
        });
        req.get('d', '#main', function(){
          req.get('e', '#test', function(){
            req.after(function(){
              done();
            })            
          });
        });
      });
      req.notFound(function(req){
        req.after(function(){
          req.redirect('/d/e');
        });
      });
    });
    
    goToUrl('/b/f');
  });
  
  //TODO: Give support for specifying unfinished subroutes
  /*
  it("notFound's after should be called when matching a sub-route", function(done){
    route.stop();
    goToUrl('');
    
    route.listen(function(req){
      req.get(function(){
        req.get('b', '#main', function(){
          req.get('c', '#test', function(){
            req.after(function(){
              expect(1).to.be(0);
            })            
          });
        });
        req.get('d', '#main', function(){
          req.get('e', '#test', function(){
            req.after(function(){
              done();
            })            
          });
        });
      });
      req.notFound(function(req){
        req.after(function(){
          req.redirect('/d/e');
        });
      });
    });
    
    goToUrl('/b');
  });
  */
  
  it('stop listening route', function(){
    route.stop();
  });

});

});


});


