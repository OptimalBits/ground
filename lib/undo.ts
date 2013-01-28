/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Undo / Redo Manager
  
  Minimalistic undo / redo manager.
*/

/// <reference path="event.ts" />


module Gnd {

export class UndoManager extends EventEmitter {
  private undones : any[] = [];
  private actions : any[] = [];
  private undoFn : any = null;
  private group : any = null;
  private name : string;

  beginUndo(undoFn, name){
    this.undoFn = undoFn
    this.name = name
  }
  
  endUndo(doFn, fn){
    this.action(doFn, this.undoFn, fn, this.name)
    this.undoFn = null
  }

  action(doFn, undoFn, fn, name){
    this.undones.length = 0
    name = _.isString(fn)?fn:name
    var action = {'do':doFn, undo:undoFn, fn:fn, name:name}
    if(this.group){
      this.actions.push(action)
    }else{
      this.group.push(action)
    }
    doFn(fn);
  }

  beginGroup(name){
    this.group = {name: name, actions:[]}
  }

  endGroup(){
    ;(function(group){
      this.action( function(){
        for(var i=0, len = group.length; i<len; i++){
          group[i].action['do'](group[i].action.fn)
        }
      },
      function(){
        for(var i=0, len=group.length; i<len;i++){
          group[i].action.undo(group[i].action.fn)
        }
      },
      ()=>{},
      group.name)
    }(this.group))
  
    this.group = null
  }

  canUndo(){
    return this.actions.length > 0;
  }
 
  canRedo(){
    return this.undones.length > 0;
  }

  undo(){
    var action = this.actions.pop();
    if(action){
      action.undo(action.fn)
      var name = action.name || ''
      this.emit('undo', name)
      this.undones.push(action);
    }
  }

  redo(){
    var action = this.undones.pop();
    if(action){
      action['do'](action.fn)
      var name = action.name || ''
      this.emit('redo', name)
      this.actions.push(action);
    }
  }
}

}