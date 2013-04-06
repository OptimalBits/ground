/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/// <reference path="../viewmodel.ts" />
/// <reference path="twoway.ts" />

module Gnd {

//
//  Syntax: data-each="collection: itemContextName"
//  Ex: data-each="todos: todo" data-bind="todo.description"
//
export class EachBinder implements Binder
{
  private items: Element[] = [];
  private mappings: {[index: string]: Element;} = {};
  private viewModel: ViewModel;
  private parent: Element;
  
  private collection: Collection;
  private addedListener: (item: Model)=>void;
  private removedListener: (item: Model)=>void;
  private updatedListener: ()=>void;
  
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
    if(collection instanceof Container){
      this.collection = collection;
      
      parent.removeChild(el);
      el.removeAttribute('data-each');
      el.removeAttribute('id');
      
      var attachNode = (node: Node, nextSibling?: Element) => {
        if(nextSibling){
          parent.insertBefore(node, nextSibling)
        }else{
          parent.appendChild(node);
        }
      }
    
      var addNode = (item, nextSibling) => {
        var 
          id = item.id(),
          existingNode = mappings[id];

        if(existingNode){
          var oldChild = parent.removeChild(existingNode);
          attachNode(oldChild, nextSibling);
        }else{
          var 
            itemNode = <Element> el.cloneNode(true),
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

          attachNode(itemNode, nextSibling);

          var context = {};
          context[itemContextName] = item;

          viewModel.pushContext(context);
          itemNode['gnd-bindings'] = viewModel.bindNode(itemNode);
          viewModel.popContext();

          item.on('id', modelListener);

          // Save for unbinding later.
          itemNode['gnd-obj'] = item;
          itemNode['gnd-listener'] = modelListener;
        }
      }
      
      var refresh = () => {
        collection.filtered((err: Error, models?: Model[]) => {
          if(!err){
            
            // Gather DOM nodes to be reused
            var newMappings = {};
            _.each(models, (item) => {
              var id = item.id();
              if(mappings[id]){
                newMappings[id] = mappings[id];
              }
            });
            
            // Remove un-used nodes.
            _.each(mappings, (node, id) => {
              !newMappings[id] && this.removeNode(id);
            });
            
            // assign new mapping
            this.mappings = mappings = newMappings;
            
            // Re-add nodes in their proper position.
            _.each(models, (item) => {
              addNode(item, nextSibling);
            });
          }
        });
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

}