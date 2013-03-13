define(['gnd'], function(Gnd){
"use strict";

describe('View', function(){
  
  it('Create view based on html', function(){
    var $views = Gnd.$('#views');
    
    var view = new Gnd.View('#views', {
      html: '<div><p>hello world</p></div>'
    });
    
    view.render();
    
    expect($views[0].childNodes.length).to.be(1);
    expect($views[0].childNodes[0].childNodes.length).to.be(1);
    expect($views[0].childNodes[0].childNodes[0].innerHTML).to.be('hello world');
  });
  
});

});
