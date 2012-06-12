
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

var Animal = new Schema({
  lengs             : {type: Number},
  tail              : {type: Boolean},
  name              : {type: String}
})

var Animal = mongoose.model('Animal', Animal)
module.exports.Animal = mongoose.model('Animal')
module.exports.animals = mongoose.model('Animal')

var Zoo = new Schema({
  animals :  [{ type: Schema.ObjectId, ref: 'Animal' }]
})

mongoose.model('Zoo', Zoo)
module.exports.Zoo = mongoose.model('Zoo')
//module.exports.Zoo.exclude = 'animals'
module.exports.zoo = module.exports.Zoo;
