import Cache = module('../lib/cache');

// fake localStorage
localStorage = {
  store: {},

  key: 1,

  getItem: function(key: any): any {
    return this.store[key];
  },
  setItem: function(key: any, value: any) {
    this.store[key] = value;
  },
  removeItem: function(key: any) {
    delete this.store[key];
  },
  clear: function() {
    this.store = {};
  }
};


var c = new Cache.Cache(1024 * 1024);

c.setItem(1, 100);
var item = c.getItem(1);

console.log(item);

