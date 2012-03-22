#Ginger MVC Framework

Ginger is a minimalistic javascript framework designed to create modern, interactive web applications. It has been inspired by other great frameworks such as Backbone, Spine, Batman and Sammy, but with some ideas of its own and some unique features.

Note that this framework is still under heavy development and subject to API changes. All feedback is therefore very much appreciated.

## Features

- Built on top of Curl, jQuery and Underscore.
- Hierarchical routing system.
- Models with property binding, persistence and synchronization.
- Views with some common widgets based on jQuery UI.
- Canvas Views.
- Events.
- Undo/Redo Manager.

#AMD Modules

Ginger is built as a set of AMD modules, and will not work without a module loader. While it should work with any AMD compatible loader, we can only guarantee a consistent behavior with Curl (@unscriptable). For convenience we will provide a custom build of curl with every new release of the framework.

#Routing

When creating a modern web application, it is desired to avoid page refreshes in order to provide a better user experience as well as to help keeping the application state. While it is possible to keep an internal state between the application different components, it is often convenient to offer urls that links to different "global" states of the application. This is achieved using a client side url routing system.

Ginger takes a less traditional approach to url routing. Instead of defining a list of independent routes, the routes are assumed to be **hierarchical**, matching  the hierarchical nature of a web page and the underlying DOM. The framework is smart enough to not re-render unnecessary DOM nodes, as well as deleting the ones that are not part of the current route.

With this approach it is possible to reduce redundancy dramatically and also create transition effects between views very easily.

The routing module is used by firstly specifying the root route:

	ginger.route.root = '/'

And after that, just listen to any requests. Lets see the simplest possible example:

	ginger.route.listen(function(req){
	  req.get(function(){
	    req.render('/templates/main.jade');	
	  });
	});

Since the system is hierarchical, if we want to add some more sub routes we can do it it like so:

	ginger.route.listen(function(req){
	  req.get(function(){
	    req.render('/templates/main.jade');

		req.get('products', '#content', function(){
		  req.render('/templates/products.jade');

		  req.get('foo', '#content', function(){
			req.render('/templates/foo.jade');
		  });

		  req.get('bar', '#content', function(){
			req.render('/templates/bar.jade');
		  });
		});

		req.get('about', '#content', function(){
		  req.render('/templates/about.jade');
		});
	  });
	});

This simple example will handle the following routes:

	/
	/products
	/products/foo
	/products/bar
	/about

Note that the second parameter in the *get* function is a node selector. This parameter is optional (defaulting to 'body'), and it is used by the render function to place the content, as well as used by the framework internally to provide some smart features.

Also Note that the framework is taking care of the asynchronicity between calls, for example, the render function will fetch a template from the server, but the user does not need to wait for it before calling the next *get* functions. This is achieved by using promises internally. Sometimes it is needed to do something after the function has finished, so render accepts a callback function for this means:

	req.render('/templates/products.jade', function(done){
	  // Do something asynchronous...
	  done();
	});

The callback takes an optional parameter done. This is a function used to tell the system that your function has finished doing what it was doing. You need this parameter when your function also performs asynchronous operations. If your callback is just doing simple synchronous stuff, just skip the parameter and the system will understand that it is a synchronous callback:

	req.render('/templates/products.jade', function(){
	  // Do something synchronous
	});


Just don't forget to call done() when you are ready, so that the system can continue processing other actions.

Templates usually need data that may be fetched from the server as well. For that purpose, the function *load* can be used. Let's see an example:

	ginger.route.listen(function(req){
	  req.get(function(){
	    req.render('/templates/main.jade');	

		req.get('news', '#content', function(){
		  req
	        .load('/data/news.json');
	        .render('/templates/news.jade');
		});
	  });
	});

*load* will fetch the data from the server and place it in req.data, which will be used by *render* placing it in the *locals* variable of the template system.

The framework also provides an easy function to make transitions between routes. They are enabled by using the pair of functions *enter* and *exit*. The first one will define what animation to run when entering the route, and the second one will define what animation to run when exiting the route.

	ginger.route.listen(function(req){
	  req.get(function(){
	    req
	      .enter('fadeOut');
		  .render('/templates/main.jade');
	      .exit('fadeIn');
	  });
	});

The call to *exit* will perform a *fade out* operation on the content of the *body*, while the call to *exit* will *fade in* the rendered template. By using exit and enter its possible to combine many different animations for different parts of the web page or application. Also note that the order in which *enter* and *exit* are called is irrelevant, there can only be one call for every node in the route hierarchy and the system will call them when necessary.

We have also a pair of function to be used when custom code must be executed, they are called ***before*** and ***after***. The first function is called before rendering the node content, and the second function is called after the rendering. These functions will prove very useful, for example, *before* can be used to protect a route and make it only available to logged in users, while *after* can be used for doing operations on the DOM after the rendering. Usually is in the *after* function where all the logic for that specific route is placed.

In order to avoid large files with many route handlers that would keep the code large and clunky, we can use external route handlers. Simply provide a path to a handler in the get method instead of the function callback. Lets see a more complete example:

    ginger.route.listen(function(req){
      req.use('template', template);

      req.get(function(){
        ginger.ajax.get('api/sessions', function(err, res){
          req.user = res;
          if(req.isLast()){
            req.before(function(done){
              if(req.user){
         	    req.redirect('/main');
              }else{
                req.redirect('/login')
              }
              done();
            });
          } 
        })

      req.enter('show');
      req.render('views/layout.jade', 'css/main.less');
    
      req.get('login', '#container', 'main/login');
      req.get('admin','#container', 'main/admin');
      req.get('register','#container', 'main/registration');
        
      req.notFound = function(){
        req.render('views/notfound.jade');  
      }  
    });
 
#Classes and Objects

Ginger is object oriented, using standard javascript prototypal inheritance. This provides a simple and powerful enough mechanism for our purposes.

Classes are declared using ginger.Declare:

    ginger.Declare(Super, [constructor, statics])
  
  
The only mandatory parameter is Super, which is the super class that your class derives from. The top of the class hierarchy in ginger is the class ginger.Base, which provides some ground functionality that the rest of the system expects from all the classes. So at a minimum you should derive from ginger.Base, although usually you will be deriving from more specialized classes such as ginger.Model or ginger.View.

The other parameters are optional, but usually quite relevant. The *constructor* allows you to define a customized constructor
for your class. This constructor can have any number of input parameters, although if you are creating model classes it is recommended that the first parameter is *args*, which would represent all the serialized properties of your model. This will make more sense when we explain about the models later on.

The *statics* parameter is an object with all the static functions for this class, i.e. the functions that you can call without needing to instantiate the class.

Lets give some examples:

    // Create a simple class without constructor.
    var Animal = ginger.Declare(ginger.Base);
  
    // It is possible to add static functions and properties also after declaration
    Animal.find = function(name){ ... }
  
    // Create a class with a custom constructor.
    var House = ginger.Declare(ginger.Base, function(floors, colour){
      // Don't forget to  call super class constructor!
      this.super(House);
      this.floors = floors;
      this.colour = colour;
    });

    // Instantiate
    var myHouse = new House(3, 'white');
  
Classes like these are not so much different from a normal javascript object, but we get some useful features such as:

  - Events
  - Bindings
  - Reference counting
  
Lets give some examples for every feature:

    // Instantiate a fox
    var fox = new Animal();
  
    // Listen to changes to the property 'name'
    fox.on('name', function(name){
      console.log(name);
    });
  
    // Set the name attribute
    fox.set('name', 'mulder');

    // stop listening to name property.
    fox.off('name');

If we want we can bind two properties from two different objects, and they will be keep synchronized at all times:

    var cat = new Animal();
  
    // bind legs property from fox to cat
    cat.bind('legs', fox);
  
When binding, if the properties are different at the moment of bind, the target object (cat in this case), will get the
value of the 'legs' property from the fox.

It is also possible to bind properties with different names:

    cat.bind('colour', fox, 'tail');
    
    cat.set('colour', 'brown');
    
    // Will output 'brown'
    console.log(fox.colour);

    // Just unbind when finished
    cat.unbind('colour');
  

Finally, the Base class provides reference counting. When a class is instantiated, it will get a reference count of 1. We can call retain to increase the count and release to decrease it. If the count reaches to zero, the class will call to its *destroy* function, which in the base class takes care of removing all the events associated to it. Reference count proves to be an important mechanism in order to avoid memory leaks and dangling event listeners, which could otherwise lead to strange side effects and suboptimal memory usage. So in order to keep the system clean, always call *release* on the objects that are not going to be used any more.


## Models

Models in ginger are classes that derive from ginger.Base and that provide functionality for persisting as well as synchronizing data with a remote server. Models usually are a mirror of a some data representation in a server. 

Ginger can take advantage of socket.io, and it provides a nodejs component to simplify persistence and synchronization. The server component is designed to scale easily thanks to Redis which is used as a pub sub system between different nodes running the ginger server component.

Besides models there are also ***collections***. A collection is a special class also derived from ginger.Base that keeps a collection of models. By using this class, a collection of models can be kept synchronized against other instances in other remote clients using a central server with ginger server component.

So lets start with some examples:
      
      // Define the root url for storing models
      ginger.Model.set('url', '/models');

      // Declare a Animal Model
      var Animal = ginger.Declare(ginger.Model);
      Animal.use('transport', 'ajax');      

      var fox = new Animal({legs:4, colour:'brown'});

      // Save the model
      fox.save(function(err){
        console.log(err);
      })

      // Find all animals
      Animal.all(function(err, animals){
		// animals is a collection
      });

If there is a connection to the server using socket.io, we can also have synchronization support:

      // Set a socket for realtime communication with a server.
      ginger.Model.set('socket', socket);

      // Select socket as transport
      Animal.transport('transport', 'ajax');

      fox.keepSynced();

      // Now we don't need to explicitly save anymore
      fox.set('colour', 'white');

      // Lets find this fox in the server
      Animal.findById(fox._id, function(err, whiteFox){
        // The white box will have color white.
        console.log(whiteFox);
        whiteFox.release();
      });

      // Clean up
      fox.release();

In the example above we achieved automatic synchronization between the client and the server, but also with other remote clients that had an instance of Animal with the same ._id as fox and that had enabled synchronization with keepSynced().

Besides Models we also have Collections, which provides a convenient way to represent several models in a collection, and support automatic synchronization for keeping all the instances in the collection synchronized as well as support for objects that are added and removed to the collection.


##Events

##Bindings

#Undo / Redo Manager

#Utilities

