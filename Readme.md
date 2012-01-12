#Ginger MVC Framework

Ginger is a minimalistic javascript framework designed to create modern, interactive web applications. It has been inspired by other great frameworks such as Backbone, Spine, Batman and Sammy, but with some ideas of its own and some unique features.

Note that this framework is still under heavy development and 

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

Ginger takes a less traditional approach to url routing. Instead of defining a list of independent routes, the routes are assumed to be hierarchical, matching  the hierarchical nature of a web page and the underlying DOM. 

With this approach it is possible to reduce redundancy dramatically and also create transition effects between views more easily.

#Classes and Objects

Ginger is object oriented, using standard javascript prototypal inheritance. This provides a simple and powerful enough mechanism for our purposes.

Classes are declared using ginger.Declare

##Events

##Bindings


#Undo / Redo Manager


