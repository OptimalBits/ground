#Introduction

Ground is a light-weight and flexible javascript framework for NodeJs that provides the building blocks
and the structure to create modern, realtime interactive web applications that are required to work 
seamlessly both online and offline.

It also includes some rather useful features such as a hierarchical routing system, an undo/redo
manager, property bindings and automatic synchronization between clients and servers.

## Features

- Built on top of Curl, jQuery, socket.io and Underscore/LoDash.
- Hierarchical routing system.
- Models with property binding, persistence and synchronization.
- Complete offline support.
- Views with some common widgets based on jQuery UI.
- Canvas Views.
- Events.
- Undo/Redo Manager.

##Modules

Ground is provided as [AMD modules](https://github.com/amdjs/amdjs-api/wiki/AMD), and many of its core functions will 
not work without a module loader. While it should work with any AMD compatible loader, we can only guarantee a 
consistent behavior with [Curl](https://github.com/cujojs/curl). For convenience we will provide a custom and tested
build of curl with every new release of the framework.

##Install



#Routing

In modern web applications, it is desired to avoid page refreshes in order to provide a better user experience 
as well as to help keeping the application state. While it is possible to keep an internal state between the 
application different components, it is often convenient to offer urls that links to different "global" states 
of the application. This is achieved using a client side url routing system.

Ground takes a less traditional approach to url routing. Instead of defining a list of independent routes, 
the routes are assumed to be **hierarchical**, matching  the hierarchical nature of a web page and the 
underlying DOM structure. The framework is smart enough to avoid re-rendering unnecessary DOM nodes, as well as 
deleting the ones that are not part of the current route.

With this approach it is possible to reduce redundancy dramatically and also create transition effects between 
views very easily.

The routing module is used by firstly specifying the root route:

	gnd.route.root = '/'

After that, just listen to any requests. Lets see the simplest possible example:

	gnd.route.listen(function(req){
	  req.get(function(){
	    req.render('/templates/main.jade');	
	  });
	});

In this case we will render the [jade](https://github.com/visionmedia/jade/) template *main.jade* into the *body* tag.
Note that we used jade as an example template engine, any template engine can be used by ground, although it defaults
to [underscore](http://underscorejs.org/#template) microtemplates.

Since the system is hierarchical, if we want to add some more sub routes we can do it like so:

	gnd.route.listen(function(req){
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

Note that the second parameter in the *get* function is a node selector. This parameter is optional
(defaulting to 'body'), and it is used by the render function to place the content, as well as used 
by the framework internally to provide some smart features.

Also note that the framework is taking care of the asynchronicity between calls, for example, the render
function will fetch a template from the server, but the user does not need to wait for it before 
calling the next *get* functions. This is achieved by using promises internally. Sometimes it is 
needed to do something after the function has finished, so render accepts a callback function for this means:

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

	gnd.route.listen(function(req){
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

	gnd.route.listen(function(req){
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

    gnd.route.listen(function(req){
      req.use('template', template);

      req.get(function(){
        gnd.ajax.get('api/sessions', function(err, res){
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
 
#Objects

Javascript does not provided Classes, although it provides a similar mechanism called prototypal inheritance, where
objects just can inherit from other objects.

Ground provides a mechanism to simplify standard prototypal inheritance and it also provides a hierarchy of objects
that will prove quite useful for developing advanced web applications.

Objects inheriting from other objects are just declared using gnd.Declare:

  var myObject = gnd.Declare(Super, [constructor, statics])
  
The only mandatory parameter is Super, which is the super object that your object derives from. At the top of the 
object hierarchy in ground lies the object gnd.Base, which provides some basic functionality that the rest of 
the system expects from all the classes. So at a minimum you should derive from gnd.Base, although usually you 
will be deriving from more specialized objects such as gnd.Model or gnd.View.

The other parameters are optional, but usually quite relevant. The *constructor* allows you to define a customized 
constructor for your object. This constructor can have any number of input parameters, although if you are creating
model objects it is recommended that the first parameter is *args*, which would represent all the serialized 
properties of your model. This will make more sense when we explain about the models later on.

The *statics* parameter is an object with all the static functions for this object, i.e. the functions that you 
can call without needing to instantiate the object.

Lets give some examples:

    // Create a simple object without constructor.
    var Animal = gnd.Derive(gnd.Base);
  
    // It is possible to add static functions and properties also after declaration
    Animal.find = function(name){ ... }
  
    // Create a class with a custom constructor.
    var House = gnd.Declare(gnd.Base, function(floors, colour){
      // Don't forget to  call super class constructor!
      this.super(House);
      this.floors = floors;
      this.colour = colour;
    });

    // Instantiate
    var myHouse = new House(3, 'white');

If your objects are always inheriting from some object from the gnd.Base hierarchy, you can use the simplifed
method *extend*:

    // Create a simple object
    var Animal = gnd.Base.extend();


Objects derived from gnd.Base are not so much different from a normal javascript object, but we get some useful 
features such as:

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

Models in ground are objects that derive from gnd.Base and that provide functionality for persisting as well as 
synchronizing data with a remote server. Models usually are a mirror of a some data representation in a server. 

Ground can take advantage of socket.io, and it provides a [Node](http://nodejs.org) component to simplify 
persistence and synchronization. The server component is designed to scale easily thanks to [Redis](http://redis.io)
which is used as a pub sub system between different nodes running the ground server component.

Besides models there are also ***collections***. A collection is a special object also derived from gnd.Base that 
keeps a collection of models. By using this class, a collection of models can be kept synchronized against 
other instances in other remote clients using a central server with ground server component.

Lets provide a few simple examples:
      
    // Define the root url for storing models
    gnd.Model.set('url', '/models');

    // Declare a Animal Model
    var Animal = gnd.Declare(gnd.Model);
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
    gnd.Model.set('socket', socket);

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

###Serialization

Models are serialized as JSON. The mechanism is quite simple, every model provides a toArgs (aliased to toJSON) which when called 
provides a lean object suitable for being converted to a JSON string using JSON.stringify. The toArgs function provided in the 
Model class is useful for most simple cases, it will produce an object following these rules:

Deserialization is performed calling to the static method fromArgs (aliased to fromJSON). It performs the inverse operation as toArgs. 
Deserializing implies the instantiation of a new Model based on the given arguments. This deserialization can require asynchronouse 
operations, and therefore the signature of fromArgs includes a callback: (args, cb).


##Collections

Besides Models we also have Collections, which provides a convenient way to represent an *ordered set* of models. A Collection is 
able to keep itself synchronized with a server. If elements are added or remove from a collection, all instances of that collection 
can be kept synchronized, including the server backend that persists all the objects.

Usually a collection is instantiated by using the *all* function on a model:

    // Gets all the animals
    Animal.all(function(err, animals){
      // animals will be a collection of Animal models.
    
      // We can listen to events on a collection
      animals.on('removed:', function(item){
        // item was removed from the collection.
      });
      
      animlals.on('added:', function(item){
        // item was added to a collection.
      });
    });
    
    

Collections *retains* all the items that are part of it. So if we for example add a item to a collection, we can safely 
(and often we must to avoid leaks) release it. The collection will release the object automatically if that item is removed 
from it later or if the collection is destroyed.

Oftem times a collection is a *subcollection*, i.e., it is a collection part of some other model. For example:

    // find a zoo
    Zoo.findById(zooId, function(err, parisZoo){
    
      // Gets all the animals from Paris zoo.
      parisZoo.all(Animal, function(err, animals){
        // animals includes all the animals of Paris Zoo.
      });
    });
      

Subcollections is a powerfull concept that allows us to define very complex hierarchies of models and collections.


##Events

Events in ground try to mimick the EventEmitter object from early versions of NodeJS.

One important consideration to keep in mind is that ground events are propagated inmediately
i.e., they do not wait for the next event loop. The reason for this is to provide high 
performance and responsivity. The major implication of this is that you have always to place
your listeners before you emit, otherwise the event will be missed.

##Property bindings


##Reference Counting

In Ground we provide a reference counting mechanism. Reference counting is a simple yet quite effective method 
to avoid memory and event leaks. 

The Base class in Ground provides two methods: retain and release. The former is used to increase the reference 
counter, its called retain because it expresses that the object that called it "retains" a reference to it. 
It is equivalent to sharing the ownership of the retained object. It also means that the object that called
*retain* is now responsible of calling *release* when it is not needed anymore.
 
Everytime *release* is called, the reference counter is decremented, and when it reaches zero, the object is
destroyed by calling the method *destroy*, which is also part of the Base class, although it is quite often
overrided to perform customized clean ups for your classes.

It may seem strange that we need a reference counting mechanism when javascript includes a garbage
collector. Garbage collection is a powerful facility that helps in releasing un-used objects, but 
the garbage collector is only able to free objects that are not referenced by any other object. In complex 
applications, it is necessary some structured mechanism in order to un-reference the objects so that the 
garbage collector can do its job. Also, besides memory, we want to avoid *event leaks*, which occour when
some event are still listening even if we do not care of them anymore. In Ground when an object is destroyed
, by default, all the events associated to it are also removed.

##Undo / Redo

##Offline

A modern web application should be able to work offline. Ground provides a complete synchronization mechanism
between client and server instances of models and collections. Data required by the local instances of
models are cached so that they are available when working offline, and all data produced while being offline
gets updated automatically as soon as the application gets connectivity with the server.

#Views

#Server

Ground provides a server component for [Node](http://nodejs.org) that is necessary for some of the functionality
provided by models, such as automatic synchonization. 

The server can be spawned multiple times in the same machine or in a cluster of machines in order to provide 
scalability, but you will still need a load balancer in front of the nodes. The communication between nodes is
achieved using the excelent pub/sub functionality in [Redis](http://redis.io), so this is a required component
as wel.

The server is designed to work with [Mongoose](http://mongoosejs.com) as database ORM. 


#Utilities

#Demos

#Reference



