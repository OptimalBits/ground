/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Model Schema.
  Compatible schema with MoongoseJs, to be used both in server and client side.
*/
/**
var AnimalSchema = new Schema({
  name: String,
  lengs: Number
});

var Animal = Model.extend('animals', AnimalSchema);

Animal.findById();
Animal.findOne({})

Base model schema:
{
  _id: ObjectId,
  _cid: String,
  persisted: bool,
}
*/

/// <reference path="../promise" />

module Gnd
{  
  interface ISchemaType
  {
    new (definition): SchemaType;
  }
   
  export class SchemaType
  { 
    public definition;
    
    constructor(definition)
    {
      this.definition = definition;
    }
    
    validate(val: any): Promise
    {
      return new Promise(true);
    }
    
    toObject(obj)
    {
      return obj;
    }
    
    default()
    {
      return this.definition.default;
    }
  }
  
  class StringType extends SchemaType
  {
  }
  
  class NumberType extends SchemaType
  {
  }
  
  class BooleanType extends SchemaType
  {
  }
  
  class DateType extends SchemaType
  {
  }
  
  class ObjectIdType extends SchemaType
  {
  }
  
  class ArrayType extends SchemaType
  {
    private schema: Schema;
    
    constructor(def)
    {
      super(def);
      var type = (def.type || def)[0];
      this.schema = Schema.compileType(type, def);
    }
    
    toObject(arr)
    {
      return _.map(arr, (item) => this.schema.toObject(item));
    }
  }
  
  // AbstractType is a special type that reads __schema from the
  // obj. This is in order to allow abstract schemas whose implementations
  // are not known until runtime.
  class AbstractType extends SchemaType
  {
    toObject(obj)
    {
      var schema = obj.__schema || obj.constructor.__schema;
      return schema ? schema.toObject(obj): undefined;
    }
  }
  
  /*
  export interface SchemaDefinition{
    [index: string]: SchemaType;
  }
  */

  export class Schema extends SchemaType
  {
    private compiledSchema: {};
    private schema: {};
    
    constructor(schema?: {})
    {
      super(this);
      this.schema = schema;
      this.compiledSchema = this.compile(schema || {});
    }
    
    validate(obj: any, property?: string, value?: any): Promise // Promise<bool>
    {
      if(property){
        return this.compiledSchema[property].validate(value);
      }else{
        return Promise.map(_.keys(this.schema), (property) =>
          this.validate(obj, property, obj[property]));
      }
    }

    /**
      toObject - Takes the corresponding properties from the given obj
      according to the schema and returns them in a plain object compatible
      with JSON.stringify.
      
      extraSchemas is an object pairing properties with Schemas. This is useful
      to override some properties Schemas in run time.
    */
    toObject(obj: any, extra?: {[index: string]: Schema;}): any
    {
      var result = {};
      
      _.each(this.compiledSchema, (type: SchemaType, property?) => {
        var src = obj[property];
        if(!_.isUndefined(src)){
          result[property] = 
            (extra && extra[property] && extra[property].toObject(src)) ||
            type.toObject(src);
        }else{
          var value = type.default();
          if(!_.isUndefined(value)){
            result[property] = value;
          }
        }
      });
      return result;
    }

    default(){
      var result = {}, empty = true;
      _.each(this.compiledSchema, (type: SchemaType, property?) => {
        var value = type.default();
        if(!_.isUndefined(value)){
          result[property] = value;
          empty = false;
        }
      });

      return empty ? undefined : result;
    }

    private compile(schema)
    {
      var compiledSchema = {};
      var types = Schema.types;

      _.each(schema, (definition, property?) => {
        if(definition){
          var type = definition.type ? definition.type : definition;

          var compiledType = Schema.compileType(type, definition);
          if(compiledType){
            compiledSchema[property] = compiledType;
          }else{
            throw Error("Invalid type definition:"+definition);
          }
        }
      });
      return compiledSchema;
    }

    /**
      Extends a schema with the properties of another Schema creatign a new Schema.
      Note that it will overwrite existing properties with new ones.
    */
    public static extend(parent: Schema, child?: Schema): Schema
    {
      return new Schema(_.extend({}, parent.schema, child ? child.schema : {}));
    }
    
    public static compileType(type, definition)
    {
      var types = Schema.types;
      
      if(type instanceof Schema){
        return type;
      }

      if(type instanceof Array){
        return new ArrayType(definition);
      }

      for(var i=0; i<types.length; i++){
        if(types[i].type == type && types[i].Class){
          return new types[i].Class(definition);
        }
      }
    }

    public static ObjectId = 'ObjectId';
    public static Abstract = 'Abstract';
    public static Buffer;
    public static Mixed;
    
    // {type: any; Class: ISchemaType;}
    private static types: any[] = [
      {type: String, Class: StringType},
      {type: Number, Class: NumberType},
      {type: Boolean, Class: BooleanType},
      {type: Date, Class: DateType},
      {type: Object, Class: SchemaType},
      {type: Schema.ObjectId, Class: ObjectIdType},
      {type: Schema.Abstract, Class: AbstractType}
    ];
  }
  
}

