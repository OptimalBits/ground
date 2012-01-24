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

Finally, we have a pair of function to be used when custom code must be executed, they are called *before* and *after*. The first function is called before rendering the node content, and the second function is called after the rendering. These functions will prove very useful, for example, *before* can be used to protect a route and make it only available to logged in users, while *after* can be used for doing operations on the DOM after the rendering. Usually is in the *after* function where all the logic for that specific route is placed.


#Classes and Objects

Ginger is object oriented, using standard javascript prototypal inheritance. This provides a simple and powerful enough mechanism for our purposes.

Classes are declared using ginger.Declare

##Events

##Bindings


#Undo / Redo Manager

#Utilities

