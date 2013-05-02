/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/// <reference path="../viewmodel.ts" />

module Gnd {

export class ClassBinder implements Binder
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
          key = _.last(keypathArray),
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
  }
}

}
