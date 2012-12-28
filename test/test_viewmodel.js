define(['gnd'], function(Gnd){

describe('ViewModel', function(){
  var Animal = Gnd.Model.extend('animals');
  var Zoo = Gnd.Model.extend('zoo');
  
  describe('data-bind', function(){
    beforeEach(function() {
    });
    
    it('bind a property to text', function(){
      el = document.createElement('div');
      el.setAttribute('data-bind', 'text: feline.name');
      
      var feline = new Animal({name: 'tiger'});
      var vm = new Gnd.ViewModel(el, {feline: feline});
      expect(el.innerText).to.be.eql('tiger');
      
      for(var name in ['leopard', 'lion', 'panther']){
        feline.set('name', name);
        expect(el.innerText).to.be.eql(name);
      }
    });

    it('bind to several attributes', function(){
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
      
      el20.setAttribute('data-bind', 'text: tiger.name; title: lion.desc');
      el21.setAttribute('data-bind', 'text: leopard.name; title: tiger.desc');
      el22.setAttribute('data-bind', 'text: lion.name; title: leopard.desc');
      
      var vm = new Gnd.ViewModel(el0, {tiger: tiger, lion: lion, leopard: leopard});
      
      expect(el20.innerText).to.be.eql('tiger');
      expect(el21.innerText).to.be.eql('leopard');
      expect(el22.innerText).to.be.eql('lion');
      
      expect(el20.title).to.be.eql('2');
      expect(el21.title).to.be.eql('1');
      expect(el22.title).to.be.eql('3');      
    });
  });
  
  describe('data-each', function(){
    it('populate a list from a collection', function(){
      var tiger = new Animal({name: 'tiger'});
      var lion = new Animal({name: 'lion'});
      var leopard = new Animal({name: 'leopard'});
      
      var zoo = new Zoo();
      zoo.animals = new Gnd.Collection(Animal, Zoo, [tiger, lion, leopard]);
      
      var list = document.createElement('lu');
      var listEl = document.createElement('li');
      listEl.setAttribute('data-each', 'zoo.animals: animal');
      listEl.setAttribute('data-bind', 'text: animal.name');
      list.appendChild(listEl);
      
      var vm = new Gnd.ViewModel(list, {zoo: zoo});
      
      expect(list.children.length).to.be(3);
      expect(list.children[0].innerText).to.be.eql('tiger');
      expect(list.children[1].innerText).to.be.eql('lion');
      expect(list.children[2].innerText).to.be.eql('leopard');
      
      var jaguar = new Animal({name: 'jaguar'});
      zoo.animals.add(jaguar);
      expect(list.children.length).to.be(4);
      expect(list.children[3].innerText).to.be.eql('jaguar');
    });
    
    it('update list after filtering', function(){
      
    });
    
    it('update list after sort', function(){
      
    });
    
    it('nested collections', function(){
  
    });
  });
  
  describe('data-class', function(){
    
  });
  
  describe('data-show', function(){
    
  });
  
});

});
