#Introduction

Ground is a compact, modern web development framework providing you with all the building blocks necessary to create realtime interactive web applications that are required to work seamlessly both online and offline.

Ground is light (15Kb + 5Kb of dependencies), and well suited for both desktop and mobile applications.

In ground, most of the application logic is moved from the server to the client, whereas the server
acts mostly as an scalable, efficient storage and synchronization controller.

It includes also some rather useful features such as a hierarchical routing system, an undo/redo
manager, property and declarative bindings, reference counting and automatic synchronization between clients and servers. It is design to always maintaining a high performance and low memory consumption.

Ground is written in [Typescript](http://www.typescriptlang.org/), for modularity and stability and is suitable for both javascript and typescript projects.


##Highlights

- Designed and optimized for Node.js servers.
- Hierarchical routing system simplifies routing by matching the DOM hierarchical nature.
- Models, Collections with property **bindings**, **persistence** and client-server **synchronization**.
- **offline** support.
- *Declarative Bindings* for easily connecting views and models.
- Sessions and rights managements support.


##Philosophy

The philosophy of Ground is to focus on *performance* and *simplicity*. It should be a complete Web framework 
that is fun to use, that uses efficiently the newest web browser technologies, and that relies on Node.js server technology to 
provide scalability and synchronization. It tries to be un-orthodox in some areas, like providing a hierarchical 
routing system or only relaying on socket.io for communication instead of AJAX.


##Dependencies

Ground depends on the following external libraries: Curl, Socket.io and Underscore or LoDash.

Ground is provided both as a set of typescript classes, and as a javascript AMD module. It can be included using script tags or using an [AMD loader](https://github.com/amdjs/amdjs-api/wiki/AMD). While it should work with any AMD compatible loader, we recommend [Curl](https://github.com/cujojs/curl) since it is already a required dependency.


##Install

Install Ground by using npm:

    npm install gnd
    

#Demos

  Take a look at some demos created with Ground that demonstrate some of its highlights:

  * [Hierarchical Routing](http://gnd.io/demos/route)
  * [Dynamic lists](http://gnd.io/demos/list)
  * [Dynamic tables](http://gnd.io/demos/table)
  * [Realtime multi user chat](http://gnd.io/demos/chat)


#Routing

In modern web applications, it is desired to avoid page refreshes in order to provide a better user experience 
as well as to help keeping the application state and reduce latency. While it is possible to keep an internal state between the 
application different components, it is often convenient to offer urls that links to different "global" states 
of the application. This is achieved using a client side url routing system.

Ground takes a less traditional approach to url routing. Instead of defining a list of independent routes, 
the routes are assumed to be **hierarchical**, matching  the hierarchical nature of a web page and the 
underlying DOM structure. The framework is smart enough to avoid re-rendering unnecessary DOM nodes, as well as 
deleting the ones that are not part of the current route.

With this approach it is possible to reduce redundancy dramatically and also create transition effects between views very easily.

##Basics

The routing module is started by specifying an optional root (defaults to '/') and a function callback where
all the routes will be defined. Lets see the simplest possible example:

	Gnd.Route.listen(function(req: Request){
	  req.get(function(){
	    req.render('/templates/main.jade');	
	  });
	});

In this case we will render the [jade](https://github.com/visionmedia/jade/) template *main.jade* into the *body* tag.

Note that we used jade as an example template engine, any template engine can be used by ground, although it defaults
to [underscore](http://underscorejs.org/#template) microtemplates.

The template engine to use is defined by the *use* method of Gnd global object, for example to use jade as template engine:

    Gnd.use.template(templ: string){
      return jade.compile(templ);
    });

Since the system is hierarchical, if we want to add some more sub routes we can do it like so:

	Gnd.Route.listen(function(req){
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
calling the next *get* functions. This is achieved by using promises internally. 


##Entering the routes

The *get* method in the Request class defines a subroute in the route hierarchy. The callback parameter is used to determine what is going to happen when that subroute is matched by the url, for example we can call *get* again to define a new subroute or we can call several other methods that make useful things. These methods can be called in any order, but Ground will always call them in a specified order, and depending if we are entering or exiting the route different methods are called:

When entering the route:

    Request##before(done?: ()=>void)
    Request##load(url: string, done?: ()=>void)
    Request##render(urlTemplate: string, urlCss?: string, done?: ()=>void)
    
    Request##enter(el: HTMLElement, done?: ()=>void)
    Request##after(done?: ()=>void)

When exiting the route:
    
    Request##exit(el: HTMLElement, done?: ()=>void)
    

###Asynchronous and synchronous operations

Sometimes it is needed to do something after the function has finished, so render accepts a callback function for this means:

	req.render('/templates/products.jade', function(done){
	  // Do something asynchronous...
	  done();
	});

The callback takes an optional parameter done. This is a function used to tell the system that your function has finished doing what it was doing.
You need this parameter only when your function performs asynchronous operations. If your callback is just doing simple synchronous stuff, just
skip the parameter and the system will understand that it is a synchronous callback:

	req.render('/templates/products.jade', function(){
	  // Do something synchronous
	});

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

*load* will fetch the data from the server and place it in req.data, which will be used by *render* placing it in the *context* variable of the template system.

###Transitions

The framework also provides a mechanism to make transitions between routes possible. They are enabled by using the pair of functions *Request##enter* and *Request##exit*.

*enter* will be called when the top DOM node for the route has been rendered, but it is still hidden. If you do not call *enter*, Ground will just show the DOM node directly without animation, otherwise, you can specify an animation using any framework of your choosing.

Lets see a simple example conveing animations using jquery:

	Gnd.Route.listen(function(req){
	  req.get(function(){
	    req
		    .render('/templates/main.jade')
	      .enter(function(el, done){
          $(el).fadeIn(done)
        })
	      .exit(function(el, done){
          $(el).fadeOut(done)
        });
	  });
	});

The call to *exit* will perform a *fade out* operation on the content of the *body*, while the call to *exit* will *fade in* the rendered template. By using exit and enter its possible to combine many different animations for different parts of the web page or application. The order in which *enter* and *exit* are called is irrelevant, there can only be one call for every node in the route hierarchy and the system will call them when necessary. Also note that in the example we are using an asynchronous call, which means that the rendering of the route will wait until the animation has completed, in some cases we may not want to wait, and run all the animations in parallel for a different visual effect:

    Gnd.Route.listen(function(req){
      req.get(function(){
        req
          .render('/templates/main.jade')
          .enter(function(el){
            $(el).fadeIn()
          })
          .exit(function(el){
            $(el).fadeOut()
          });
        });
      });

###Before and After

We have also a pair of function to be used when custom code must be executed, they are called ***before*** and ***after***. The first function is called before rendering the node content, and the second function is called after the rendering. These functions will prove very useful, for example, *before* can be used to protect a route and make it only available to logged in users, while *after* can be used for doing operations on the DOM after the rendering. Usually is in the *after* function where all the logic for that specific route is placed.

In order to avoid large files with many route handlers that would keep the code large and clunky, we can use external route handlers. Simply provide a path to a handler in the get method instead of the function callback. Lets see a more complete example:

    Gnd.Route.listen(function(req){
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
    

###Auto release pools

Ground uses a reference counting based mechanism to avoid memory and event leaks. This mechanism requires the user to manually call *release*. Usually, when entering a new route, several objects are created and it can be difficult to keep track when to release them. For this reason the route system provides autorelease pools where you can put all  the created objects and the pools will be released automatically when leaving the route.

Example:

    // TO BE ADDED


#Classes



##Base


###Property bindings


###Reference Counting

In Ground we provide a reference counting mechanism. Reference counting is a simple yet quite effective method 
to avoid memory and event leaks. 

The Base class in Ground provides two methods: retain and release. The former is used to increase the reference 
counter, its called retain because it expresses that the object that called it "retains" a reference to it. 
It is equivalent to sharing the ownership of the retained object. It also means that the object that called
*retain* is now responsible of calling *release* when it is not needed anymore.
 
Every time *release* is called, the reference counter is decremented, and when it reaches zero, the object is
destroyed by calling the method *destroy*, which is also part of the Base class, although it is quite often
overrided to perform customized clean ups for your classes.

It may seem strange that we need a reference counting mechanism when javascript includes a garbage
collector. Garbage collection is a powerful facility that helps in releasing un-used objects, but 
the garbage collector is only able to free objects that are not referenced by any other object. In complex 
applications, it is necessary some structured mechanism in order to un-reference the objects so that the 
garbage collector can do its job. Also, besides memory, we want to avoid *event leaks*, which occour when
some event are still listening even if we do not care of them anymore. In Ground when an object is destroyed
, by default, all the events associated to it are also removed.#

Javascript does not provided Classes, although it provides a similar mechanism called prototypal inheritance, where objects just can inherit from other objects.

Ground provides a mechanism to simplify standard prototypal inheritance and it also provides a hierarchy of objects that will prove quite useful for developing advanced web applications.

Objects inheriting from other objects are just declared using gnd.Declare:

    var myObject = gnd.Declare(Super, [constructor, statics])
  
The only mandatory parameter is Super, which is the super object that your object derives from.
At the top of the object hierarchy in ground lies the object gnd.Base, which provides some 
basic functionality that the rest of the system expects from all the classes. So at a 
minimum you should derive from gnd.Base, although usually you will be deriving from more
specialized objects such as gnd.Model or gnd.View.

The other parameters are optional, but usually quite relevant. The *constructor* allows
you to define a customized constructor for your object. This constructor can have any
number of input parameters, although if you are creating model objects it is 
recommended that the first parameter is *args*, which would represent all the serialized 
properties of your model. This will make more sense when we explain about the models later on.

The *statics* parameter is an object with all the static functions for this object, i.e. the 
functions that you can call without needing to instantiate the object.

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

If your objects are always inheriting from some object from the gnd.Base hierarchy, you 
can use the simplified method *extend*:

    // Create a simple object
    var Animal = gnd.Base.extend();

Objects derived from gnd.Base are not so much different from a normal javascript object, 
but we get some useful features such as:

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

If we want we can bind two properties from two different objects, and they will be keep 
synchronized at all times:

    var cat = new Animal();
  
    // bind legs property from fox to cat
    cat.bind('legs', fox);
  
When binding, if the properties are different at the moment of bind, the target object 
(cat in this case), will get the value of the 'legs' property from the fox.

It is also possible to bind properties with different names:

    cat.bind('colour', fox, 'tail');
    
    cat.set('colour', 'brown');
    
    // Will output 'brown'
    console.log(fox.colour);

    // Just unbind when finished
    cat.unbind('colour');
  

Finally, the Base class provides reference counting. When a class is instantiated, it 
will get a reference count of 1. We can call retain to increase the count and release
to decrease it. If the count reaches to zero, the class will call to its *destroy* 
function, which in the base class takes care of removing all the events associated to it. 
Reference count proves to be an important mechanism in order to avoid memory leaks 
and dangling event listeners, which could otherwise lead to strange side effects and
suboptimal memory usage. So in order to keep the system clean, always call *release*
on the objects that are not going to be used any more.


## Models

Models in ground are objects that derive from gnd.Base and that provide functionality
for persisting as well as synchronizing data with a remote server. Models usually are
a mirror of a some data representation in a server. 

Ground can take advantage of socket.io, and it provides a [Node](http://nodejs.org)
component to simplify persistence and synchronization. The server component is designed
to scale easily thanks to [Redis](http://redis.io) which is used as a pub sub system
between different nodes running the ground server component.

Besides models there are also ***collections*** and ***sequences***.
A collection is a special object also derived from gnd.Base that keeps a collection 
of models whereas a Sequence is an ordered list of Models. Models, Collections and
Sequences are lass, a collection of models can be kept synchronized
against other instances in other remote clients using a central server with ground
server component.

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


If there is a connection to the server using socket.io, we can also have 
synchronization support:

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

In the example above we achieved automatic synchronization between the client and
the server, but also with other remote clients that had an instance of Animal with the 
same ._id as fox and that had enabled synchronization with keepSynced().

###Serialization

Models are serialized as JSON. The mechanism is quite simple, every model provides
a toArgs (aliased to toJSON) which when called provides a lean object suitable for 
being converted to a JSON string using JSON.stringify. The toArgs function provided in the 
Model class is useful for most simple cases, it will produce an object following these rules:

Deserialization is performed calling to the static method fromArgs (aliased to fromJSON).
It performs the inverse operation as toArgs. Deserializing implies the instantiation of a 
new Model based on the given arguments. This deserialization can require asynchronouse 
operations, and therefore the signature of fromArgs includes a callback: (args, cb).


##Collections

Besides Models we also have Collections, which provides a convenient way to represent an
*ordered set* of models. A Collection is able to keep itself synchronized with a server. 
If elements are added or remove from a collection, all instances of that collection 
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

Often times a collection is a *subcollection*, i.e., it is a collection part of some other model. For example:

    // find a zoo
    Zoo.findById(zooId, function(err, parisZoo){
    
      // Gets all the animals from Paris zoo.
      parisZoo.all(Animal, function(err, animals){
        // animals includes all the animals of Paris Zoo.
      });
    });
      

Subcollections is a powerfull concept that allows us to define very complex hierarchies of models and collections.

##Sequences

Sequences provides a convenient way to represent a list of model instances. A sequence can be kept synchronized across many clients and is implemented as a Commutative Replicated Data Type (CRDT) meaning that all operations are commutative. This means tha sequences will eventually converge to a common state even when multiple client simultaneously modifies the same sequence.

A sequence is instantiated by using the *seq* function on a model:

    // Get the animals sequence
    parade.seq(Animal, function(err, animals){
      
      // Push a model to the back of the sequence
      animals.push((new Animal({name: 'tiger'}).autorelease(), function(err){

      });

      // Unshift a model to the front of the sequence
      animals.unshift((new Animal({name: 'lion'}).autorelease(), function(err){

      });

      // Insert a model at index 1 of the sequence
      animals.insert(1, (new Animal({name: 'panther'}).autorelease(), function(err){

      });

      // Remove the model at index 2 from the sequence
      animals.remove(1, function(err){

      });
    });

Sequences also provide a number of functional methods for traversing the sequence items such as *each*, *pluck*, *first*, *last* etc. To traverse all items in a sequence you could do:

    // Get the animals sequence
    parade.seq(Animal, function(err, animals){
      animals.each(function(animal){
        console.log(animal.name);
      });
    });

Sequences *retains* all the items that are part of it. So if we for example add a item to a collection, we can safely 
(and often we must to avoid leaks) release it. The collection will release the object automatically if that item is removed 
from it later or if the collection is destroyed.

##Events

Events in ground try to mimick the EventEmitter object from early versions of NodeJS.

One important consideration to keep in mind is that ground events are propagated inmediately
i.e., they do not wait for the next event loop. The reason for this is to provide high 
performance and responsivity. The major implication of this is that you have always to place
your listeners before you emit, otherwise the event will be missed.




##Undo / Redo

##Offline

A modern web application should be able to work offline. Ground provides a complete synchronization mechanism between client and server instances of models and collections. Data required by the local instances of models are cached so that they are available when working offline, and all data produced while being offline gets updated automatically as soon as the application gets connectivity with the server.


#Views



##ViewModel and Declarative Bindings

Ground supports the popular MVVM pattern, as a specialization of the MVC. This
pattern implies that the controller is replaced by a ViewModel
(The model of the view), which provides mechanisms for easily binding model properties to a View (in this case just some HTML portion). 

The bindings are expressed in the view as *data* attributes in any valid HTML tag that forms the view. With this pattern, the view still stays free of 
application logic, but the view can react when the underlying model is modified in some way.

Lets start with a simple dynamic list example:

HTML View:

    <lu id="myTodoList">
      <li>Todo List Header<li/>
      <li data-each="todos: todo" data-bind="text: todo.description" data-class="active: todo.isActive"><li/>
      <li>Todo List footer<li/>
    <lu/>
    
Javascript:

    var todos = new Collection([
      {description:"Prepare Food", active: true},
      {description:"Clean the house", active: false},
      {description:"Go to a meeting", active: true},
    ]);

    var viewModel = 
      new ViewModel(document.getElementById('myTodoList'), {todos: collection});

This example demonstrates binding a Collection to a list. The bindings will not just populate the list from the 
collection, but also keep it up-to-date at all times, adding and removing items as necessary. For example, if the filter function in the model is updated,
the HTML list will just show the filtered nodes, or if some item that is part
of the list is updated, the list will also display the changes automatically.

Nested bindings are also supported, so it is possible to nest collections of collections that behave as expected:

    // TODO: Add an example here...

The ViewModel class accepts in its constructor customized data binders, but
out fo the box it provides the most common ones: *bind*, *each*, *show*, *class* and *event*.


###Available binders

Ground provides a basic set of binders that cover the most common needs, but more binders can be added easily if necessary.

####bind

This binder binds an attribute or the innerHTML of a tag with the given model properties. It accepts the following syntax:

    data-bind="attr0: keypath0; attr1: keypath1; ... ;attrn: keypathn"

The attr's are tag attributes. The special attribute *text* is used to represent the inner HTML of the node.

Examples: 

    <img data-bind="src: myimage.src; alt: myimage.desc"></img>
    <h1 data-bind="text: obj.title"></h1>

####each

The each binder is used to bind collections and sequences. Its syntax is as
follows:

    data-each="keypath: alias"

The HTML node where data-each is placed will be repeated as many times as elements in the bound collection. The node is allowed to have any other binders,
also it may have subnodes with binders as well, and even the data-each binder, allowing as much nesting as necessary.


####show

This binder is used to show or hide an HTML element depending on the value of a property bound to it:

    data-show="[!]keypath"
    
It supports negating the keypath value (using the optional exclamation character), and by that it becomes in practice a *data-hide* binder.


####class

This binder is used to add one or several css classes to an HTML element depending on the given properties.

    data-class="className0, className1, ... classNameN: [!]keypath1; className10, className11, ... className1N: [!]keypath2 ..."

An arbitrary set of classes can therefore be associated to a boolean value in the specified keypath. The keypath can be negated in a similar way to the show binder.


####event

This binder attaches a event to a given element. This binder is particularly useful combined with the *each* binder, since it will bind events
to nodes that are added and removed dynamically.

    data-event="eventName1: keypath1; eventName2: keypath2; ... "

The events that can be bound to keypaths are any standard DOM events, such as
*change*, *click*, *keyup*, etc


#Server

Ground provides a server component for [Node](http://nodejs.org) that is necessary for some of the functionality
provided by models, such as automatic synchronization. 

The server can be spawned multiple times in the same machine or in a cluster of machines in order to provide 
scalability, but you will still need a load balancer in front of the nodes. The communication between nodes is
achieved using the excellent pub/sub functionality in [Redis](http://redis.io), so this is a required component
as well.

The server is designed to work with [Mongoose](http://mongoosejs.com) as database ORM. 


#Utilities



##DOM

You will notice that when developing applications with Ground, you will not need to interact with the DOM as often as you may do, in fact, Ground encourages to avoid interacting with the DOM as much as possible. Using complex queries to create behaviour in a web application often leads to code of poor quality and innecessary complexity. Still, there are situations where it is unavoidable to access to the DOM, for example when attaching a root element to a ViewModel or defining entry elements in a hierarchical route. 

Instead of leaving the DOM manipulation to a heavy weight library such as jQuery, Ground provides a minimal set of efficient and cross browser utilities to fullfill most of the required needs. The methods provided try to be close to jQuery APIs.

###Selection

You make selections as in jQuery by using the $ method. Only a few selectors
are available, and they will all return an array like wrapper object with all
the HTML elements that match the query:

    Gnd.$(queryString: string, context?: HTMLElement): Gnd.Query;

You can use the context to constraint the query to just a subtree of the DOM.

- By Id

        var $myid = Gnd.$('#myid')  

- By class name
    
        var $redBoxes = Gnd.$('.red-box')
    
- By Name

        var $alldivs = Gnd.$('div');


###Creation


DOM fragments can be created by giving HTML code:

    var $fragment = Gnd.$('<div><p>Hello World</p><div>')
    Gnd.$('body')[0].appendChild($fragment[0]);


###Attributes

Attributes can be read and wrote similar to jQuery:

    Gnd.$(div).attr('', )

    var attr = $(div).attr('');

###Text and Html



###Events



#[Reference](http://gnd.io/api)


In progress

