define(['gnd'], function(Gnd){

describe('View', function(){
  
  it('Create view based on html', function(){
    var $views = Gnd.$('#views');
    
    var view = new Gnd.View({
      html: '<div><p>hello world</p><div>',
      root: $views[0]
    });
    
    view.render();
    
    expect($views[0].childNodes.length).to.be(3);
    
  });
  
});

});

