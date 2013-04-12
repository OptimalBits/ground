define(['gnd'], function(Gnd){
  
describe('ViewModel', function(){
  var Animal = Gnd.Model.extend('animals');
  var Zoo = Gnd.Model.extend('zoo');
  
  
  describe('data-bind', function(){
    beforeEach(function() {
    });
    
    it('bind a property to text', function(){
      var el = document.createElement('div');
      Gnd.setAttr(el, 'data-bind', 'text: feline.name');
      
      var feline = new Animal({name: 'tiger'});
      var vm = new Gnd.ViewModel(el, {feline: feline});
      expect(Gnd.$(el).text()).to.be.eql('tiger');
      
      for(var name in ['leopard', 'lion', 'panther']){
        feline.set('name', name);
        expect(Gnd.$(el).text()).to.be.eql(name);
      }
    });
    
    it('bind to a subproperty', function(){
      var el = document.createElement('div');
      Gnd.setAttr(el, 'data-bind', 'text: feline.foo.bar');
      
      var feline = new Animal({name: 'tiger', foo: {bar: 'baz'}});
      
      var vm = new Gnd.ViewModel(el, {feline: feline});
      expect(Gnd.$(el).text()).to.be.eql('baz');
      
      for(var name in ['leopard', 'lion', 'panther']){
        feline.set('foo.bar', name);
        expect(Gnd.$(el).text()).to.be.eql(name);
      }
    });

    it('bind to several attributes', function(){
      var el = document.createElement('div');
      Gnd.setAttr(el, 'data-bind', 'text: tiger.name; title: tiger.description ');
      
      var tiger = new Animal({
        name: 'tiger',
        description: 'put description here...'
      });
      var vm = new Gnd.ViewModel(el, {tiger: tiger});
      
      expect(Gnd.$(el).text()).to.be.eql('tiger');
      expect(el.title).to.be.eql('put description here...');
      
      tiger.set('description', 'The tiger (Panthera tigris) is the largest cat species');
      expect(el.title).to.be.eql('The tiger (Panthera tigris) is the largest cat species');
    });
    
    it('bind to several attributes and use formatters', function(){
      var el = document.createElement('div');
      Gnd.setAttr(el, 'data-bind', 'text: tiger.name | uppercase; title: tiger.description | lowercase');
      
      var tiger = new Animal({
        name: 'tiger',
        description: 'PUT DESCRIPTION HERE...'
      });
      var vm = new Gnd.ViewModel(el, {tiger: tiger}, {
        uppercase: function(str){ return str.toUpperCase();},
        lowercase: function(str){ return str.toLowerCase();},
      });
      
      expect(Gnd.$(el).text()).to.be.eql('TIGER');
      expect(el.title).to.be.eql('put description here...');
      
      tiger.set('description', 'The tiger (Panthera tigris) is the largest cat species');
      expect(el.title).to.be.eql('the tiger (panthera tigris) is the largest cat species');
    });
    
    it('bind to several sub elements', function(){
      var tiger = new Animal({name: 'tiger', desc:'1'});
      var lion = new Animal({name: 'lion', desc: '2'});
      var leopard = new Animal({name: 'leopard', desc: '3'});
      
      var el0 = document.createElement('div');
      var el1 = document.createElement('div');
      var el20 = document.createElement('div');
      var el21 = document.createElement('div');
      var el22 = document.createElement('div');
      
      el0.appendChild(el1);
      el1.appendChild(el20);
      el1.appendChild(el21);
      el1.appendChild(el22);
      
      Gnd.setAttr(el20, 'data-bind', 'text: tiger.name; title: lion.desc');
      Gnd.setAttr(el21, 'data-bind', 'text: leopard.name; title: tiger.desc');
      Gnd.setAttr(el22, 'data-bind', 'text: lion.name; title: leopard.desc');
      
      var vm = new Gnd.ViewModel(el0, {tiger: tiger, lion: lion, leopard: leopard});
      
      expect(Gnd.$(el20).text()).to.be.eql('tiger');
      expect(Gnd.$(el21).text()).to.be.eql('leopard');
      expect(Gnd.$(el22).text()).to.be.eql('lion');
      
      expect(el20.title).to.be.eql('2');
      expect(el21.title).to.be.eql('1');
      expect(el22.title).to.be.eql('3');
    });
    
    // This will not work since we cannot listen easily for attr changes...
    /*
    it('bind to attributes works in both directions', function(){
      el = document.createElement('div');
      el.setAttribute('data-bind', 'text: tiger.name; title: tiger.description ');
      
      var tiger = new Animal({
        name: 'tiger',
        description: 'put description here...'
      });
      var vm = new Gnd.ViewModel(el, {tiger: tiger});
      
      expect(el.innerText).to.be.eql('tiger');
      expect(el.title).to.be.eql('put description here...');
      
      tiger.set('description', 'The tiger (Panthera tigris) is the largest cat species');
      expect(el.title).to.be.eql('The tiger (Panthera tigris) is the largest cat species');
      
      el.setAttribute('title', 'The tiger is a beautiful feline');
      expect(tiger.description).to.be.eql('The tiger is a beautiful feline');
    });
    */
    
    it('bind to input elements works in both directions', function(){
      // checkbox
      var el = document.createElement('input');
      el.setAttribute('type', 'checkbox');
      el.checked = false;
      el.setAttribute('data-bind', 'checked: tiger.selected');
      
      var tiger = new Animal({
        selected: true,
        name: 'tiger',
        description: 'put description here...'
      });
      
      var vm = new Gnd.ViewModel(el, {tiger: tiger});
      expect(el.getAttribute('checked')).to.be('true');
      
      tiger.set('selected', false);
      expect(el.checked).to.be(false);
      
      el.checked = true;
      el.setAttribute('checked', 'true');
      Gnd.$(el).trigger('change');
      expect(tiger.selected).to.be(true);
      
      el.checked = false;
      el.setAttribute('checked', 'false');
      Gnd.$(el).trigger('change');
      expect(tiger.selected).to.be(false);
      
      // Text input
      el = document.createElement('input');
      el.setAttribute('type', 'text');
      el.checked = false;
      el.setAttribute('data-bind', 'value: tiger.description');
      
      var vm2 = new Gnd.ViewModel(el, {tiger: tiger});
      expect(el.value).to.be('put description here...');

      tiger.set('description', 'foobar');
      expect(el.value).to.be('foobar');
      
      el.value = 'quxbaz';
      el.setAttribute('value', 'quxbaz');
      Gnd.$(el).trigger('change');
      expect(tiger.description).to.be('quxbaz');
    });
    
    it('unbind elements', function(){
      var tiger = new Animal({name: 'tiger', desc:'1'});
      var lion = new Animal({name: 'lion', desc: '2'});
      var leopard = new Animal({name: 'leopard', desc: '3'});
      
      var el0 = document.createElement('div');
      var el1 = document.createElement('div');
      var el20 = document.createElement('div');
      var el21 = document.createElement('div');
      var el22 = document.createElement('div');
      
      el0.appendChild(el1);
      el1.appendChild(el20);
      el1.appendChild(el21);
      el1.appendChild(el22);
      
      el20.setAttribute('data-bind', 'text: tiger.name; title: lion.desc');
      el21.setAttribute('data-bind', 'text: leopard.name; title: tiger.desc');
      el22.setAttribute('data-bind', 'text: lion.name; title: leopard.desc');
      
      var vm = new Gnd.ViewModel(el0, {tiger: tiger, lion: lion, leopard: leopard});
      
      expect(Gnd.$(el20).text()).to.be.eql('tiger');
      expect(Gnd.$(el21).text()).to.be.eql('leopard');
      expect(Gnd.$(el22).text()).to.be.eql('lion');
      
      expect(el20.title).to.be.eql('2');
      expect(el21.title).to.be.eql('1');
      expect(el22.title).to.be.eql('3');
    
      vm.unbind();
      
      tiger.set('name', 'no listen');
      leopard.set('name', 'no listen');
      lion.set('name', 'no listen');
      
      expect(Gnd.$(el20).text()).to.be.eql('tiger');
      expect(Gnd.$(el21).text()).to.be.eql('leopard');
      expect(Gnd.$(el22).text()).to.be.eql('lion');
      
      expect(el20.title).to.be.eql('2');
      expect(el21.title).to.be.eql('1');
      expect(el22.title).to.be.eql('3');
      
      // Also test input elements
    });
  });
   
  describe('data-show', function(){
    it('changes visibility style', function(){
      var feline = new Animal({name: 'tiger', visible:true});
      
      var el = document.createElement('div');
      el.setAttribute('data-show', 'feline.visible');
      el.style.display = 'block';
      
      var vm = new Gnd.ViewModel(el, {feline: feline});
      expect(el.style.display).to.be.eql('block');
      
      feline.set('visible', false);
      expect(el.style.display).to.be.eql('none');
      
      feline.set('visible', true);
      expect(el.style.display).to.be.eql('block');
    });
    
    it('changes visibility style using negation', function(){
      var feline = new Animal({name: 'tiger', notVisible:false});
      
      var el = document.createElement('div');
      el.setAttribute('data-show', '!feline.notVisible');
      el.style.display = 'block';
      
      var vm = new Gnd.ViewModel(el, {feline: feline});
      expect(el.style.display).to.be.eql('block');
      
      feline.set('notVisible', true);
      expect(el.style.display).to.be.eql('none');
      
      feline.set('notVisible', false);
      expect(el.style.display).to.be.eql('block');
    });
  });
  
  describe('data-class', function(){
    it('adds classes to element', function(){
      var feline = new Animal({name: 'tiger', useClasses:true});
      
      var el = document.createElement('div');
      el.setAttribute('data-class', 'classA classB classC: feline.useClasses');
      
      var vm = new Gnd.ViewModel(el, {feline: feline});
      expect(el.className).to.be.eql('classA classB classC');
      
      feline.set('useClasses', false);
      expect(el.className).to.be.eql('');
    });
    
    it('use negation for adding classes to element', function(){
      var feline = new Animal({name: 'tiger', notUseClasses:false});
      
      var el = document.createElement('div');
      el.setAttribute('data-class', 'classA classB classC: !feline.notUseClasses');
      
      var vm = new Gnd.ViewModel(el, {feline: feline});
      expect(el.className).to.be.eql('classA classB classC');
      
      feline.set('notUseClasses', true);
      expect(el.className).to.be.eql('');
    });
    
    it('several class sets bound to an element', function(){
      var feline = new Animal({name: 'tiger', a:true, b:false, c:false});
      
      var el = document.createElement('div');
      el.setAttribute('data-class', 'classA classB classC: feline.a; classU classV: feline.b; classY classB: feline.c');
      el.className = 'classU';
      
      var vm = new Gnd.ViewModel(el, {feline: feline});
      expect(el.className).to.be.eql('classU classA classB classC');
      
      feline.set('a', false);
      expect(el.className).to.be.eql('classU');
      
      feline.set('b', true);
      expect(el.className).to.be.eql('classU classV');
      
      feline.set('c', true);
      expect(el.className).to.be.eql('classU classV classY classB');
      
      feline.set('a', true);
      expect(el.className).to.be.eql('classU classV classY classB classA classC');
    });
  });
  
  describe('data-event', function(){
    it('Bind document properties to events', function(done){
      var obj = new Gnd.Base();
      
      var el = document.createElement('div');
      el.setAttribute('data-event', 'click: obj.handleClick; change: obj.handleChange');
    
      obj.handleClick = function(node, evt){
        expect(node).to.be(el);
        expect(evt).to.be.ok(evt);
        Gnd.$(el).trigger('change');
      };
      
      obj.handleChange = function(node, evt){
        expect(node).to.be(el);
        expect(evt).to.be.ok(evt);
        done();
        
      };
      
      var vm = new Gnd.ViewModel(el, {obj: obj});
      
      Gnd.$(el).trigger('click');
    });
  });
  describe('data-each', function(){
    var tiger, lion, leopard, zoo, list, listEl;
    
    beforeEach(function(){
      tiger = new Animal({name: 'tiger', pos:1});
      lion = new Animal({name: 'lion', pos:2});
      leopard = new Animal({name: 'leopard', pos:3});
     
      zoo = new Zoo();
      zoo.animals = new Gnd.Collection(Animal, zoo, null, [tiger, lion, leopard]);
      
      list = document.createElement('lu');
      listEl = document.createElement('li');
      listEl.setAttribute('data-each', 'zoo.animals: animal');
      listEl.setAttribute('data-bind', 'text: animal.name');
      list.appendChild(listEl);
    });
    
    it('populate a list from collection', function(){
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      
      expect(list.children.length).to.be(3);
      expect(Gnd.$(list.children[0]).text()).to.be.eql('tiger');
      expect(Gnd.$(list.children[1]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[2]).text()).to.be.eql('leopard');
      
      var jaguar = new Animal({name: 'jaguar'});
      zoo.animals.add(jaguar);
      expect(list.children.length).to.be(4);
      expect(Gnd.$(list.children[3]).text()).to.be.eql('jaguar');
      
      vm.unbind();
    });
    
    it('remove elements from collection', function(){
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      
      expect(list.children.length).to.be(3);
      expect(Gnd.$(list.children[0]).text()).to.be.eql('tiger');
      expect(Gnd.$(list.children[1]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[2]).text()).to.be.eql('leopard');
      
      zoo.animals.remove([lion.id(), tiger.id()]);
      expect(list.children.length).to.be(1);
      expect(Gnd.$(list.children[0]).text()).to.be.eql('leopard');
      
      vm.unbind();
    });
    
    it('update list after filtering', function(){
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      
      expect(list.children.length).to.be(3);
      zoo.animals.set('filterFn', function(item){
        return (item.name === 'lion') || (item.name === 'leopard');
      });
      expect(list.children.length).to.be(2);
      expect(Gnd.$(list.children[0]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[1]).text()).to.be.eql('leopard');
      
      vm.unbind();
    });
    
    it('update list after sort', function(){
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      
      zoo.animals.set('sortByFn', function(item){
        return 3 - item.pos;
      });
      
      expect(list.children.length).to.be(3);
      expect(Gnd.$(list.children[2]).text()).to.be.eql('tiger');
      expect(Gnd.$(list.children[1]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[0]).text()).to.be.eql('leopard');
      
      vm.unbind();
    });
    it('multiple sorting on a collection', function(){
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      
      zoo.animals.set('sortByFn', function(item){
        return 3 - item.pos;
      });
      
      expect(list.children.length).to.be(3);
      expect(Gnd.$(list.children[2]).text()).to.be.eql('tiger');
      expect(Gnd.$(list.children[1]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[0]).text()).to.be.eql('leopard');
   
      zoo.animals.set('sortByFn', function(item){
        return item.pos;
      });
           
      expect(Gnd.$(list.children[0]).text()).to.be.eql('tiger');
      expect(Gnd.$(list.children[1]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[2]).text()).to.be.eql('leopard');

      vm.unbind();
    });
    it('multiple filtering on a collection',function() {
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      expect(list.children.length).to.be(3);
      zoo.animals.set('filterFn',function(item) {
        return (item.name === 'lion') || (item.name === 'leopard');
      });
      expect(list.children.length).to.be(2);
      expect(Gnd.$(list.children[0]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[1]).text()).to.be.eql('leopard');
      zoo.animals.set('filterFn',function(item) {
        return (item.name === 'lion');
      });
      expect(list.children.length).to.be(1);
      expect(Gnd.$(list.children[0]).text()).to.be.eql('lion');
      zoo.animals.set('filterFn',function(item) {
        return (item.name === '');
      });
      expect(list.children.length).to.be(0);
      vm.unbind();
    });
    
    it('Remove filter from a collection',function() {
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      expect(list.children.length).to.be(3);
      zoo.animals.set('filterFn',function(item) {
        return (item.name === 'lion') || (item.name === 'leopard');
      });
      expect(list.children.length).to.be(2);
      expect(Gnd.$(list.children[0]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[1]).text()).to.be.eql('leopard');
      zoo.animals.set('filterFn',null);
      vm.unbind();
    });
  });
  describe('data-each with nested nodes', function(){
    var tiger, lion, leopard, zoo, list, listEl,listNestedEl;
    beforeEach(function(){
      tiger = new Animal({name: 'tiger', pos:1});
      lion = new Animal({name: 'lion', pos:2});
      leopard = new Animal({name: 'leopard', pos:3});
     
      zoo = new Zoo();
      zoo.animals = new Gnd.Collection(Animal, zoo, null, [tiger, lion, leopard]);
      
      list = document.createElement('lu');
      listEl = document.createElement('li');
      listNestedEl = document.createElement('span');
      listEl.setAttribute('data-each', 'zoo.animals: animal');
      listNestedEl.setAttribute('data-bind', 'text: animal.name');
      listEl.appendChild(listNestedEl);
      list.appendChild(listEl);
    });
    it('populate a list from collection', function(){
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      
      expect(list.children.length).to.be(3);
      expect(Gnd.$(list.children[0].children[0]).text()).to.be.eql('tiger');
      expect(Gnd.$(list.children[1].children[0]).text()).to.be.eql('lion');
      expect(Gnd.$(list.children[2].children[0]).text()).to.be.eql('leopard');
      
      var jaguar = new Animal({name: 'jaguar'});
      zoo.animals.add(jaguar);
      expect(list.children.length).to.be(4);
      expect(Gnd.$(list.children[3].children[0]).text()).to.be.eql('jaguar');
      
      vm.unbind();
    });
  });
});

});
