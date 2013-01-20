/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  ViewModel class
  
  This class provides declarative bindings for binding views to
  models.
*/

/// <reference path="../third/underscore.browser.d.ts" />

/// <reference path="base.ts" />
/// <reference path="model.ts" />
/// <reference path="dom.ts" />

// TODO: Refactor and implement unbind on the Binder classes.

module Gnd {

var dataBindingReqExp = /^data-/;

export interface Binder
{
  bind(el: Element, value: string, viewModel: ViewModel);
  unbind();
}

export interface IBinder {
  new (): Binder;
}

export class ViewModel extends Base 
{  
  private binders: {[index: string]: IBinder;};
  private contexts: {}[] = [];
  private boundBinders: Binder[] = [];
  
  public formatters: {[index: string]: (input: string)=>string;} = {};
  
  constructor(el: Element, 
              context: {}, 
              formatters?: {}, 
              binders?: IBinder[])
  {
    super();
    
    this.formatters =  formatters || this.formatters;
    
    this.binders = {
      bind: TwoWayBinder,
      each: EachBinder,
      show: ShowBinder,
      class: ClassBinder,
      event: EventBinder
    }
    
    _.extend(this.binders, binders);
    
    this.pushContext(context);
    this.boundBinders = this.bindNode(el);
  }

  destroy()
  {
    this.unbind();
    super.destroy();
  }
  
  unbind(bindings?: Binder[])
  {
    _.each(bindings || this.boundBinders, (binder) => {
      binder.unbind();
    });
    !bindings && (this.boundBinders = []);
  }

  resolveContext(keyPath: string[]): Base
  {
    var root = keyPath[0], context;
    for(var i=this.contexts.length-1; i >= 0; i--){
      context = this.contexts[i][root];
      if(context){
        return this.resolveKeypath(context, _.rest(keyPath));
      }
    }
  }
  
  pushContext(context: {})
  {
    this.contexts.push(context);
  }
  
  popContext()
  {
    this.contexts.pop();
  }
    
  /**
    Binds a node and all of its children recursively.

  */
  bindNode(node: Element): Binder[]
  {
    var binders = [];
    
    if(node.attributes){
      var attributes = node.attributes;
      for(var j=0;j<attributes.length;j++){
        if(dataBindingReqExp.test(attributes[j].name)){
          var type = attributes[j].name.replace(dataBindingReqExp, '');
          var value = attributes[j].value;
          if(this.binders[type]){
            var binder: Binder = new this.binders[type]();
            binder.bind(node, value, this);
            binders.push(binder);
          }
        }
      }
    }
    
    if(node.hasChildNodes()){
      // clone children array to avoid side-effects.
      var children = _.toArray(node.childNodes);
 
      for (var i=0; i<children.length; i++){
        if(isElement(children[i])){
          binders.push.apply(binders, this.bindNode(<Element> children[i]));
        }
      }
    }
    
    return binders;
  }
  
  private resolveKeypath(obj, keyPath): Base
  {
    for(var i=0; i<keyPath.length; i++){
      obj = obj[keyPath[i]];
      if(!obj) return null;      
    }
    return obj;
  }
}

//
// Syntax: "attr0: keyPath; attr1: keyPath "
//
// Syntax: "attr0: keyPath | formatter0; attr1: keyPath | formatter1"

class TwoWayBinder implements Binder
{
  // [ [model, onKeypathFn, eventListener], [...], ...] 
  private bindings: any[][] = [];
  private el: Element;
  private attrBindings: {[index: string]: string[];} = {};
  private attrFormatters: {[index: string]: (input: string)=>string;} = {};
    
  static private re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*(\|\s*(\w+)\s*)?);?)/gi;
  
  private parse(value: string, formatters: {[index: string]: (input: string)=>string;})
  {
    var match, formatter;
    while(match = TwoWayBinder.re.exec(value)){
      var attr = match[3];
      this.attrBindings[attr] = makeKeypathArray(match[4]);
      formatter = formatters[match[7]];
      if(formatter){
        this.attrFormatters[attr] = formatter;
      }
    }
  }
  
  private createBinding(attr: string, el: Element, viewModel: ViewModel)
  {
    var 
      attrBinding = this.attrBindings[attr],
      attrFormatter = this.attrFormatters[attr],
      obj = viewModel.resolveContext(_.initial(attrBinding));
    
    if(obj instanceof Base){
      // TODO: This join('.') will disapear when we have
      // keypath support in Base as an array.
      var 
        keypath = _.rest(attrBinding).join('.'),
        modelListener,
        elemListener = null;
        
      var format = () => {
        return attrFormatter ? attrFormatter(obj.get(keypath)) : obj.get(keypath);
      }
        
      if(attr === 'text'){
        setText(el, format());
        modelListener = () => { setText(el, format());}
      }else{
        setAttr(el, attr, format());
        modelListener = () => { setAttr(el, attr, format()); };
        elemListener = (value) => { obj.set(keypath, getAttr(el, attr)); };
      }
      obj.retain();
      obj.on(keypath, modelListener);
      $(el).on('change', elemListener);
        
      this.bindings.push([obj, keypath, modelListener, elemListener]);
    }else{
      console.log("Warning: not found a valid model: "+attrBinding[0]);
    }
  }
  
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    this.parse(value, viewModel.formatters);
        
    this.el = el;
    
    for(var attr in this.attrBindings){
      this.createBinding(attr, el, viewModel);
    }
  }

  unbind(){
    _.each(this.bindings, (item) => {
      item[0].off(item[1], item[2]);
      item[0].release();
      item[3] && $(this.el).off('change', item[3]);
    });
  }
}

class EachBinder implements Binder
{
  private items: Element[] = [];
  private mappings: {[index: string]: Element;} = {};
  private viewModel: ViewModel;
  private parent: Element;
  
  private collection: Collection;
  private addedListener: (item: Model)=>void;
  private removedListener: (item: Model)=>void;
  private updatedListener: ()=>void;
  
  //
  //  Syntax: data-each="collection: itemContextName"
  //  Ex: data-each="todos: todo" data-bind="todo.description"
  //
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var arr = value.trim().split(':');
    
    if(arr.length !== 2){
      console.log("Warning: syntax error in data-each:"+value);
      return;
    }
    
    var
      mappings = this.mappings,
      nextSibling = el.nextSibling,
      keyPath = makeKeypathArray(arr[0]),
      collection = <Collection> viewModel.resolveContext(keyPath),
      itemContextName = arr[1].trim();
      
    var parent = this.parent = <Element> el.parentNode;
      
    this.viewModel = viewModel;
      
    //
    // Use createDocumentFragment http://ejohn.org/blog/dom-documentfragments/
    // Basically, first add all items to the fragment, then add the fragment.
    // 
    if(collection instanceof Collection){
      this.collection = collection;
      
      parent.removeChild(el);
      el.removeAttribute('data-each');
      el.removeAttribute('id');
    
      var addNode = (item, nextSibling) => {
        var 
          itemNode = <Element> el.cloneNode(true), 
          id = item.id(),
          modelListener = (newId) => {
            if(!(newId in mappings)){ // This check is necessary to avoid side-effects.
              delete mappings[id];
              mappings[newId] = itemNode;
              setAttr(itemNode, 'data-item', newId);
            }
        };
    
        item.retain();
        
        setAttr(itemNode, 'data-item', id);
        mappings[id] = itemNode;

        if(nextSibling){
          parent.insertBefore(itemNode, nextSibling)
        }else{
          parent.appendChild(itemNode);
        }
      
        var context = {};
        context[itemContextName] = item;
      
        viewModel.pushContext(context);
        itemNode['gnd-bindings'] = viewModel.bindNode(itemNode);
        viewModel.popContext();
      
        item.on('id', modelListener);
        itemNode['gnd-obj'] = item;
        itemNode['gnd-listener'] = modelListener;
      }
      
      var addNodes = () => {
        collection.filtered((err: Error, models?: Model[]) => {
          _.each(models, function(item){
            addNode(item, nextSibling);
          });
        });
      }
      
      var refresh = () => {
        this.removeNodes();
        addNodes();
      }
    
      refresh();
      
      this.addedListener = (item: Model) => {
        if(collection.isFiltered(item)){
          addNode(item, nextSibling);
        }
      }
      
      this.removedListener = (item: Model) => {
        if(mappings[item.id()]){
          this.removeNode(item.id());
        }
      }
      
      this.updatedListener = refresh;
      
      collection
        .on('added:', this.addedListener)
        .on('removed:', this.removedListener)
        .on('filterFn sorted: updated:', this.updatedListener);
    }else{
      console.log("Warning: not found a valid collection: "+arr[0]);
    }
  }

  unbind(){
    this.collection.off('added:', this.addedListener);
    this.collection.off('removed:', this.removedListener);
    this.collection.off('filterFn sorted: updated:', this.updatedListener);
    
    this.removeNodes();
  }
  
  private removeNode(id: string)
  {
    var 
      node = this.mappings[id],
      item = node['gnd-obj'];
    
    this.viewModel.unbind(node['gnd-bindings']);
    item.off('id', node['gnd-listener']);
    item.release();
    
    this.parent.removeChild(node);
    delete this.mappings[id];
  }
  
  private removeNodes()
  {
    for(var id in this.mappings){
      this.removeNode(id);
    }
  }
}

class ShowBinder implements Binder 
{
  private bindings: any[][] = [];
  
  //
  // Syntax: data-show="[!]keypath"
  // Example: data-show="todo.isCompleted"
  //
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var
      _value = value.replace('!', ''),
      negate = _value === value ? false : true,
      keypath = makeKeypathArray(_value),
      model = viewModel.resolveContext(_.initial(keypath));
      
    if(model instanceof Base){
      model.retain();
      
      function setVisibility(visible: bool){
        if(negate ? !visible : visible){
          show(el);
        }else{
          hide(el);
        }
      }
      
      var key = 
        _.rest(keypath).join('.'),
        modelListener = (visible) => {
          setVisibility(visible);
        };
      
      setVisibility(model.get(key));
      
      model.on(key, modelListener);
      this.bindings.push([model, key, modelListener]);
    }else{
      console.log("Warning: not found a valid model: "+value);
    }
  }
  
  unbind(){
    _.each(this.bindings, (item) => {
      item[0].off(item[1], item[2]);
      item[0].release();
    });
  };
}

class ClassBinder implements Binder
{
  private bindings: any[][] = [];
  
  //
  // Syntax: data-class="className0 className1 ... classNameN: [!]keypath1; className10 className11 ... className1N: [!]keypath2 ..."
  //
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var 
      classMappings = {}, // Maps class sets to keypaths.
      classSets = value.split(';'),
      classNames = el['className'] === '' ? [] : el['className'].split(' '),
      usedClassNameSets = {};
      
     var processMapping = (keypath: string) => {
      var 
        _keypath = keypath.replace('!', ''),
        negate = _keypath === keypath ? false : true,
        keypathArray = makeKeypathArray(_keypath),
        model = viewModel.resolveContext(_.initial(keypathArray));
        
      if(model instanceof Base){
        model.retain();
          
        var 
          key = _.rest(keypathArray).join('.'),
          addClasses = negate ? !model.get(key) : model.get(key),
          modelListener;
          
        if(addClasses){
          usedClassNameSets[keypath] = keypath;
        }
        
        modelListener = (value) => {
          if(negate ? !value: value){
            usedClassNameSets[keypath] = keypath;
          }else{
            delete usedClassNameSets[keypath];
          }
          updateClassNames();
        }
        
        model.on(key, modelListener);
        
        this.bindings.push([model, key, modelListener]);
      }else{
        console.log("Warning: not found a valid model: "+value);
      }
    }
    
    function updateClassNames(){
      var newClassNames = classNames;
      for(var key in usedClassNameSets){
        newClassNames = _.union(newClassNames, classMappings[key]);
      }
      el['className'] = newClassNames.join(' ');
    }
      
    for(var i=0; i<classSets.length; i++){
      var keyVal = classSets[i].split(':');
      if(keyVal.length === 2){
        var 
          classes = keyVal[0].trim().split(' '),
          keypath = keyVal[1].trim();
           
        classMappings[keypath] = [];
        for(var j=0; j<classes.length; j++){
          classMappings[keypath].push(classes[j].trim());
        }
    
        //
        // Set classes and start listeners
        //
        for(var keypath in classMappings){
          processMapping(keypath);
        }
         
        updateClassNames();
        
      }else{
        console.log("Warning: Syntax error in "+classSets[i]);
      }
    }
  }
  
  unbind(){
    _.each(this.bindings, (item) => {
      item[0].off(item[1], item[2]);
      item[0].release();
    });
  };
}

class EventBinder implements Binder
{
  private bindings: any[][] = [];
  private el: Element;
  
  static private re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*);?)/gi;
  
  private parse(value: string): {[index: string]: string[];}
  {
    var eventBindings = {}, match;
    while(match = TwoWayBinder.re.exec(value)){
      eventBindings[match[3]] = makeKeypathArray(match[4]);
    }
    return eventBindings;
  }
  
  //
  // Syntax: data-event="eventName1: keypath1; eventName2: keypath2; eventName3: keypath3"
  //
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var eventBindings = this.parse(value);
    
    this.el = el;  
    
    var addEvent = (eventName: string) => {
      var 
        keypath = eventBindings[eventName],
        obj = viewModel.resolveContext(_.initial(keypath));
      
      if(obj instanceof Base){
        var 
          eventKeypath = _.rest(keypath).join('.'),
          handler = obj.get(eventKeypath);
        
        obj.retain();

        if(_.isFunction(handler)){
          var elementListener = (evt) => {
            handler.call(obj, el, evt);
          }
          
          $(el).on(eventName, elementListener);
          
          this.bindings.push([obj, eventName, elementListener]);
        }else{
          console.log("Warning: the given handler is not a function: "+keypath);
        }
      }else{
        console.log("Warning: not found an object instance of Gnd.Base: "+keypath[0]);
      }
    }
    
    for(var eventName in eventBindings){
      addEvent(eventName);
    }
  }
 
  unbind(){
    _.each(this.bindings, (item) => {
      item[0].release();
      $(this.el).off(item[1], item[2]);
    });
  }
}

// --- Helpers

if(!String.prototype.trim) {
  String.prototype.trim = Util.trim;
}

function setText(node: Element, value){
  if(isElement(value)){
    node.parentNode.replaceChild(value, node);
  }else{
    if(node.textContent){
      node.textContent = value;
    }else{
      node['innerText'] = value;
    }
  }
}

function makeKeypathArray(keypath: string): string[]
{
  var arr = keypath.trim().split('.');
  for(var i=0; i<arr.length; i++){
    arr[i] = arr[i].trim();
  }
  return arr;
}

} // module Gnd

