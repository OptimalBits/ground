import Cache = module('../lib/cache');

var lc = new Cache.Cache(1024*1024);
var item;

lc.setItem(1, 100);
item = lc.getItem(1);

console.log(item);
