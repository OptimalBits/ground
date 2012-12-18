define(['gnd'], function(Gnd){

describe('Overload', function(){
  var MyObject = function(){
    this.member = "private";
  };
  
  MyObject.prototype.process = Gnd.overload({
    'Number Number Number': function(x, y, z){
      return x+y+z;
    },
    'Number String': function(num, street){
      return street+" "+num;
    },
    'String Function': function(city, cb){
      cb(city);
    },
    'Array': function(arr){
      return arr.join();
    },
    '': function(){
      return this.process(1,2,3)+this.member;
    }
  });
  
  obj = new MyObject();
  
  it('call to overloads function', function(){
    expect(obj.process(5, 6, 7)).to.be(18);
    expect(obj.process(27, "St. Elm")).to.be("St. Elm 27");
    obj.process("Lund", function(city){
      expect(city).to.be.equal("Lund");
    })
    expect(obj.process([1,2,3])).to.be("1,2,3");
    expect(obj.process()).to.be("6private");
  });
  
});

});