/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Schema.
  Inspired by Moongosejs, to be used both in server and client side.
*/
/**

*/

/// <reference path="schemaType" />
/// <reference path="../promise" />

module Gnd
{ 
  
  export interface SchemaDefinition{
    [index: string]: SchemaType;
  }
  
  /**
    Schemas allows to define data structures that can be used both client and
    server side effectively simplifying the synchronization and validation 
    of data.
    
    The syntax of the Schema is heavily inspired by [Mongoose](http://mongoosejs.com).
    
    Schemas are normally used to create Models.
    
    Examples:
    
        var AnimalSchema = new Schema({
          name: String,
          lengs: Number
        });

        var Animal = Model.extend('animals', AnimalSchema);
    
    @class Schema
    @extends SchemaType
    @constructor
    @param schema {SchemaDefinition}
  */
  export class Schema extends SchemaType
  {
    private compiledSchema: {};
    private schema: {};
    
    constructor(schema?: SchemaDefinition)
    {
      super(this);
      this.schema = schema;
      this.compiledSchema = this.compile(schema || {});
    }
    
    validate(obj: any, property?: string, value?: any): Promise<bool>
    {
      if(property){
        return this.compiledSchema[property].validate(value);
      }else{
        return new Promise<bool>(true);
        /*
        return Promise.map(_.keys(this.schema), (property) =>
          this.validate(obj, property, obj[property]));
          */
      }
    }
  
    /**
      Takes the corresponding properties from the given obj
      according to the schema and returns them in a plain object compatible
      with JSON.stringify.
    
      @method toObject
      @param obj {Any}
      @param [extra] {Object} an object pairing properties with Schemas. This is useful
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

    //get(obj: any, args?: {}, opts?);
    get(obj: any, key?: string, args?: {}, opts?: {})
    {
      if(_.isString(key)){
        var schema = this.schema[key];
        return schema && schema.get && schema.get(obj, args, opts);
      }else{
        return schema;
      }
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
            console.log(definition)
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
      
      if(type instanceof Schema || type instanceof SchemaType){
        return type;
      }

      if(type instanceof Array){
        return new ArrayType(definition);
      }

      for(var i=0; i<types.length; i++){
        if(types[i].type == type){
          return new types[i](definition);
        }
      }
    }
    
    public map(iter: (key, value) => any)
    {
      var result = {};
      _.each(this.compiledSchema, (value, key?) => {
        var def = iter(key, value);
        if(def) result[key] = def;
      });
      return result;
    }

    public static ObjectId = 'ObjectId';
    public static Abstract = 'Abstract';

    // needed?
    public static Mixed;
    public static Buffer;
    
    // {type: any; Class: ISchemaType;}
    private static types: ISchemaType[] = [
      StringType,
      NumberType,
      BooleanType,
      DateType,
      SchemaType,
      ObjectIdType,
      AbstractType
    ];
  }
  
}

