#Introduction

Ground is a compact, modern web development framework that provides you a firm foundation to create rich, modular, scalable, realtime interactive web applications that are required to work seamlessly both online and offline.

Ground is light (22Kb + 5Kb of dependencies), and well suited for both desktop and mobile applications.

In ground, most of the application logic is moved from the server to the client, whereas the server acts mostly as an scalable, efficient distributed storage and synchronization controller.

It includes also some rather useful features such as a hierarchical routing system, an undo/redo manager, property and declarative bindings, reference counting and automatic synchronization between clients and servers. It is design to always maintaining a high performance and low memory consumption.

Ground is written in [Typescript](http://www.typescriptlang.org/), for modularity and stability and is suitable for both javascript and typescript projects.


##Highlights

- Designed and optimized for Node.js servers.
- Hierarchical routing system simplifies routing by matching the DOM hierarchical nature.
- Define models and use them both client and server side.
- Models, Collections and Sequences with property **bindings**, **persistence** and client-server **synchronization**.
- **Offline** support.
- *Declarative Bindings* for easily connecting views and models.
- Sessions and rights managements support.


##Philosophy

The philosophy of Ground is to focus on *performance* and *simplicity*. We wrote the complex code so that you don't. 

It should be a complete Web framework that is fun to use, that uses efficiently the newest web browser technologies, and that relies on Node.js server technology to provide scalability and synchronization. It provides some innovations such as hierarchical routes and bi-directional client / server communication.


##Dependencies

Ground depends on the following external libraries: Curl, Socket.io and Underscore or LoDash.

Ground is provided both as a set of typescript classes, and as a javascript AMD module. It can be included using script tags or using an [AMD loader](https://github.com/amdjs/amdjs-api/wiki/AMD). While it should work with any AMD compatible loader, we recommend [Curl](https://github.com/cujojs/curl) since it is already a required dependency.


##Install

Install Ground by using npm:

    npm install gnd -g
    

##Command line

Ground provides a command line tool that can be used to generate the skeleton of a ground application. This is a very convenient way to start playing with the framework with a minimum effort. For example:

    gnd myapplication
    
Will generate a ground application in the directory myapplication. Enter in the directory and execute:

    npm install
    
This will install all the required dependencies, then just fire the server with the application:

    node server.js

The hello world application is available at 

    http://localhost:8080


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
(defaulting to 'body'), and it is used by the render function to place the content, as well as used by the framework internally to provide some smart features.

Also note that the framework is taking care of the asynchronicity between calls, for example, the render function will fetch a template from the server, but the user does not need to wait for it before calling the next *get* functions.


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


##Models

Models in Ground are used to represent persistend data in a structured way. They provide mechanisms to keep data automatically synchronized between clients and servers as well as data validation.

The properties in a Model are defined using a Schema, which is heavily inspired by [MongooseJs](http://http://mongoosejs.com/) (a MongoDB ORM).


###Defining the Schema

The first thing to do in order to use a Model is to define its Schema:

    var AnimalSchema = new Gnd.Schema({
      name: String,
      legs: Number,
      tail: Boolean,
    });

*AnimalSchema* is a simple schema that will be used to define an *Animal* model. Ths syntax for the schema is fully compatible with [Mongoose schemas](http://mongoosejs.com/docs/guide.html) with a few differences, for example when defining *Sequences* and *Collection* properties (see the Sequences and Collections section for details).

All models receive a base schema with the following properties that should never be overwriten by the user:

    {_cid: String, 
     _id: Schema.ObjectId,
     _persisted: Boolean}
     

###Creating a model

A model is created by extending the Model base class:

    var Animal = Gnd.Model.extend('animals', AnimalSchema);

The first parameter, 'animals', is used to define the bucket where this model is going to be stored in the storage. Buckets are top level containers for all our models and used to build *keypaths* (see the keypaths section).


###Model instances

A Model acts as a super class for creating model instances. All model instances have a client id (##cid) and optionally a server or persisted id (##_id). When a model instance has a persisted id, it means that the instance is safelly persisted in some server storage, and that it can be retrieved by any client that has the correct rights to do so.

A model is instantiated using the *create* method:

    // Model##create(args?: {}, keepSynced?: bool): Promise<Model>
    var tiger = Animal.create({name: 'tiger'}, true);

Model instances are singletons, meaning that you cannot have 2 instances in memory with the same cid or persistent id. If for example a *cid* or *_id* is given as arguments to the create method, it may return an already instantiated model:

    var tiger2 = Animal.create({cid: tiger.cid});
    console.log(tiger === tiger2) // outputs true

A model instance includes all the properties defined in its schema. If the model is kept synced with the server, the properties will be automatically updated if any client changes them. But in order for the synchronization mechanism to work, properties must be set using the *set* method:

    tiger.set('legs', 4);

It is also highly recommended to use the *get* method when retrieving some model property in order to enable *lazy* collection and sequence instantiation (more on this in the Collections and Sequences section).


###Model Events

Models generates events when they are updated or deleted. The update events are
inherit from the Base class, (see property events in Base class), while the *deleted:* event is generated when a model has been deleted, which implies that it has been removed from all the storages (or it is about to be removed since they are eventual consistent).


###Finding models

Models are automatically stored in the best storage available. If a server storage is defined it will always store first locally to keep a cached version of the model instance, and after that, store it in the server. If the application is offline it will store it on the server as soon as it goes online again.

Stored models can be retrieved using the findById static method that all models inherit automatically:

    // Model##findById(keyPathOrId, keepSynced?: bool, args?: {}): Model
    var tiger3 = Animal.findById(tiger.id(), true);

*findById* will return a model instance according to the given id or keypath. It is important to understand that a model instance is also a promise (Promise<Model>), i.e. a promise that resolves to itself. This is very useful in order to be able to work with models before they actually are delivered by some storage. If you really want to know when the model has got the best possible data in the current conditions you can just *then* it:

    tiger3.then(function(tiger){
      // tiger is the model instance with most fresh populated data.
    });

Please read section regarding resync to understand why this works.


###Understanding *resync*

Models (as well as Collections and Sequences) can be kept automatically synchronized with a server. The synchronization implies that any change to a model instance is automatically persisted in the server, and the changes are propagated to any other clients that also may have the same model instantiated.

Everytime a model is gets new data from the server via the automatic synchronization mechanism, a resync operation is performed, which changes the local instance of the model and emits *changed* events accordingly for any property that has been updated.

The resync operation can also performed when the instantiated model was persisted locally or remotely on a server:

    var tiger = Animal.findById('1234');
    
    tiger.on('name', function(name){
      console.log(name); // outputs "Tiger"
    });


This initial resync operations are executed before the model promise is resolved, meaning that a resolved model has all the properties available locally or remotelly (it can be seen as if the model is resolved when the best available data for it has been populated):

    var tiger = Animal.findById('1234');

    tiger.then(function(){
      console.log(tiger.name); // outputs "Tiger"
    });


###Model Hierarchies



###Serialization

Serialization of models is performed via the *toArgs* method. This method is usually not recommended to be overrided since its default implementation uses the model schema and it is designed to work seamlesly with the server component.


##Containers

Ground provides 2 container classes to keep sets of models: Collections for unordered sets of models, and Sequences for ordered sets of models. Both containers support automatic synchronization with servers and other clients and are implemented as [CRDTs](http://hal.upmc.fr/docs/00/55/55/88/PDF/techreport.pdf) which we believe have very convenient features for a distributed architecture such as Ground.


###Keypaths

Keypaths are arrays of strings that define a location where a model or models are located in the storage hierarchy. 

A keypath is built by alternating buckets and model ids, with an unlimited length. This allows to describe complex hierarchies of models and containers in a simple and unified way.

Some typical keypath looks like these:

    ['cars'] // An orphan collection with all available cars
    
    ['cars', '534acf7e9da0867393000020'] // A Car instance (just one Model)
    
    ['zoos', '51c1d0e4f867c09141000010', 'animals'] // An animals collection for one Zoo instance.


###Collections

Collections are containers for keeping unordered sets of models. They are the most common type of container, and is suitable for large sets as well as small ones. Even if the models are kept unordered in the storage, it is still possible to sort and filter the elements locally, which is useful when visualizing collections in a UI.

Collections are normally defined as a property in a parent model, although they can also be defined as orphan collections. All model instances are always part of some orphan collection, which is represented as a keypath with just some bucket name:

    ['animals']

Collections can as models be kept auto synchronized with the server, and in that case all instances of the given collection will be updated automatically as soon as some client perform any change on them.


####Defining collections in schemas

Collections can be conveniently defined in a model schema:

    var ZooSchema = new Gnd.Schema({
      name: {type: String},
      animals: new Gnd.CollectionSchemaType(Animal, 'animals')
    });

    var Zoo = Gnd.Model.extend('zoo', ZooSchema);

Model properties such as *animals* collection in the above example are not populated when the model is instantiated. They are instead lazily populated when the property is accessed the first time:

    // get(key?: string, args?:{}, opts?: {})
    var animals = cphZoo.get('animals')
    
    // We can listen to events on a collection
    animals.on('removed:', function(item){
      // item was removed from animals.
    });
    
    animlals.on('added:', function(item){
      // item was added to animals.
    });

*animals* will be populated lazily after calling get. In the same way as models, the collection returned by get is a Promise<Collection>, meaning that it is empty initially but will be populated as soon as data is received from the different storages available. This works efficiently combined with ViewModels, where the data will be displayed as soon as it is available.

The *get* method accepts in its options a *Query* object, so that the received collection can be filtered or sorted as desired.

####Instantiating collections

Althoug the recommended way to instantiate a collection is using the *get* method on a model, sometimes is required to retrieve a collection directly. This can be achieved with the *all* method on a model:

    // Get an orphan collection with all animals
    var animals = Animal.all();

    // Get all animals for a given zoo
    var animals = Animal.all(cphZoo, 'animals');

####Reference counting

Collections *retains* all the items that are part of it. So if we for example add an item to a collection, we can safely (and often we must to avoid leaks) release it. The collection will release the object automatically if that item is removed from it later or if the collection is destroyed.

####Collection Events

Collections emits a few events that notifies about its changes:

  - *updated:* emitted when some element in the collection has changed any property.
  - *sorted:* emitted when the sorting function has been changed.
  - *added:* emitted when an item has been added to the collection.
  - *removed:* emitted when an item has been removed from the collection.
  - *resynced:* emitted when the collection has been resynced.
  
###Sequences

Sequences provides a convenient way to represent a sorted list of model instances. They are specially useful when a sorted list of objects can be accessed and manipulated by several users simultaneously.

A sequence can be kept synchronized across many clients and is implemented as a Commutative Replicated Data Type (CRDT) in order to achieve eventual consistency. This implies that sequences will eventually converge to a common state even when multiple client simultaneously modifies the same sequence.

Sequences likewise Collections are normally defined as properties in models using a schema datatype


####Defining sequences in schemas

Collections can be conveniently defined in a model schema:

    var UserSchema = new Gnd.Schema({
      name: {type: String},
      playlist: new Gnd.SequenceSchemaType(Song, 'songs')
    });

    var Users = Gnd.Model.extend('User', UserSchema);

Model properties such as the *playlist* sequence in the above example are not populated when the model is instantiated. They are instead lazily populated when the property is accessed the first time:

    // get(key?: string, args?:{}, opts?: {})
    var playlist = myUser.get('playlist');

*playlist* will be populated lazily after calling get. In the same way as models, the sequence returned by *get* is a Promise<Sequence>, meaning that it is empty initially but will be populated as soon as data is received from the different storages available. This works efficiently combined with ViewModels, where the data will be displayed as soon as it is available.

####Instantiating sequences

A sequence can also be instantiated by using the *seq* function on a model:

    // Get the animals sequence
    var playlist = myUser.seq(Song, 'songs');
      
    // Push a model to the back of the sequence
    playlist.push((new Animal({name: 'tiger'}).autorelease());

    // Unshift a model to the front of the sequence
    playlist.unshift((new Animal({name: 'lion'}).autorelease());

    // Insert a model at index 1 of the sequence
    playlist.insert(1, (new Animal({name: 'panther'}).autorelease());

    // Remove the model at index 2 from the sequence
    playlist.remove(2);

Sequences also provide a number of functional methods for traversing the sequence items such as *each*, *pluck*, *first*, *last* etc. To traverse all items in a sequence you could do:

    var playlist = myUser.seq(Song, 'songs');
    
    playlist.then(function(){
      playlist.each(function(song){
        console.log(song.name);
      });
    });

####Reference counting

Sequences *retains* all the items that are part of it. So if we for example add a item to a sequence, we can safely 
(and often we must to avoid leaks) release it. The sequence will release the object automatically if that item is removed from it later or if the sequence is destroyed.

####Sequence Events

Sequences emits a few events that notifies about its changes:

  - *updated:* emitted when some model in the sequence has changed any property.
  - *inserted:* emitted when an item has been inserted in the sequence.
  - *removed:* emitted when an item has been removed from the sequence.
  - *resynced:* emitted when the sequence has been resynced.


##Events

Events in ground try to mimick the EventEmitter object from early versions of NodeJS.

One important consideration to keep in mind is that ground events are propagated inmediately
i.e., they do not wait for the next event loop. The reason for this is to provide high 
performance and responsivity. The major implication of this is that you have always to place
your listeners before you emit, otherwise the event will be missed.


##Promises

Ground provides a ver minimal Promise implementation that follows [Promise /A+](http://promises-aplus.github.com/promises-spec).

<a href="http://promises-aplus.github.com/promises-spec"><img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" alt="Promises/A+ logo" align="right" /></a>

TODO: Examples:


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

