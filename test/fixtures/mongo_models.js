var
  mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

//
// Animals
//
var Animal = new Schema({
  _cid: {type: String},
  legs: {type: Number},
  tail: {type: Boolean},
  name: {type: String}
});

var Animal = mongoose.model('Animal', Animal);
module.exports.animals = Animal;

var Zoo = new Schema({
  _cid: {type: String},
  animals: [{ type: Schema.ObjectId, ref: 'Animal' }],
  birds: [{ name: String }],
});

Zoo.statics.add = function(id, setName, itemIds, cb){
  var update = {$addToSet: {}};
  update.$addToSet[setName] = {$each:itemIds};
  this.update({_id:id}, update, cb);
};

var Parade = new Schema({
  _cid: {type: String},
  animals: [{ type: Schema.ObjectId, ref: 'Animal' }],
  animals2: [{ type: Schema.ObjectId, ref: 'Animal' }]
});

Parade.statics.add = function(id, setName, itemIds, cb){
  var update = {$addToSet: {}};
  update.$addToSet[setName] = {$each:itemIds};
  this.update({_id:id}, update, cb);
};

module.exports.zoo = mongoose.model('Zoo', Zoo);
module.exports.parade = mongoose.model('Parade', Parade);

//
// Documents
//

var Document = new Schema({
  foo: {type: String},
  baz: {type: String}
});

var Document = mongoose.model('Document', Document);
module.exports.documents = Document;

