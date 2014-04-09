/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Schema.
  Inspired by Moongosejs, to be used both in server and client side.
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
    
    constructor(schema?)//: SchemaDefinition)
    {
      super(this); // should'nt we have super(schema) ?
      this.schema = schema;
      this.compiledSchema = this.compile(schema || {});
    }
    
    /**
      Validates a given property against a given value. Returns a promise that
      is resolved to a boolean determining if the validation passes or fails.
      
      @method validate
      @param [property] {String} property to evaluate.
      @param [value] {Any} value to be validated.
    */
    //validate(property: string, value: any): Promise<boolean>;
    
    /**
      Validate an object against this schema. Returns a promise that
      is resolved to a boolean determining if the validation passes or fails.
      
      @method validate
      @param obj {Any} object to validate.
    */
    validate(obj: any, property?: string, value?: any): Promise<boolean>
    {
      if(property){
        return this.compiledSchema[property].validate(value);
      }else{
        // TODO: Implement validation
        return Promise.resolved(true);
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
        var value;
        
        if(!_.isUndefined(src)){
          value = (extra && extra[property] && extra[property].toObject(src)) ||
            type.toObject(src);
        }else{
          value = type.default();
        }
        if(!_.isUndefined(value)){
          result[property] = value;
        }
      });
      return result;
    }
    
    /**
      Takes a plain object and produces a new object with the properties
      populated according to the schema.
      
      @method fromObject
      @param args {Any} arguments to build the type from.
    */
    fromObject(args: any): any
    {
      var obj = {};
      _.each(this.compiledSchema, (type: SchemaType, property?) => {
        var src = args[property];
        var value = !_.isUndefined(src) ? type.fromObject(src) : type.default();
        
        if(!_.isUndefined(value)){
          obj[property] = value;
        }
      });
      return obj;
    }
    
    /**
      Returns the schema type for the given property if any.
      
      @method getSchemaType
      @param key {String} key to get the schema type.
      @return {SchemaType} schema type if any.
    */
    getSchemaType(key: string){
      return this.compiledSchema[key];
    }
    
    /**
      Gets an object property using the schema type custom getter.
      This is currently used by Collections and Sequences to provide lazy
      instantiation.
      
      @method get
      @param obj {Any} object from where to try to get the property.
      @param key {string} key to use for retrieving the property.
      @param [args] {Object} arguments to be passed to the gettter.
      @param [opts] {Object} options to be passed to the getter.
    */
    //get(obj: any, args?: {}, opts?);
    get(obj: any, key?: string, args?: {}, opts?: {})
    {
      if(_.isString(key)){
        var schema = this.schema[key];
        return schema && schema.get && schema.get(obj, args, opts);
      }
    }
    
    /**
      Returns a plain object with all the default values according to the
      schema definition.
    
      @method default
      @return {Object} plain object with default values.
    */
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
    
    /**
      Sets the default values for the properties in the schema definition that
      are not already set in the given object.

      Note: This method does not perform any validation on the input properties.    
      
      @method defaults
      @param obj {Any} the object to set default values on.
    */
    defaults(obj: any)
    {
      _.each(this.compiledSchema, (type: SchemaType, property?) => {
        var value = type.default();
        if(_.isUndefined(obj[property]) && !_.isUndefined(value)){
          obj[property] = value;
        }
      });
    }

    private compile(schema)
    {
      var compiledSchema = {};
      var types = Schema.types;

      _.each(schema, (definition, property?) => {
        if(definition){
          var type = definition.type ? definition.type : definition;
          
          if(definition.init){
            definition.init(property);
          }

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
      Extends a schema with the properties of another Schema returning a new Schema.
      Note that it will overwrite existing properties with new ones.
      
      @method extend
      @static
      @param parent {Schema} parent schema to be extended.
      @param [child] {Schema} child schema to extend the parent with.
      @return {Schema} a new schema extended from the given parent and child 
      schemas.
    */
    public static extend(parent: Schema, child?: Schema): Schema
    {
      return new Schema(_.extend({}, parent.schema, child ? child.schema : {}));
    }
    
    public isInstanceOf(parent: Schema)
    {
      // Check if this schema containes all properties defined in parent
      // then we can assume that it is an instance of it.
    }
    
    /**
      Compiles a Schema type from its definition. Mostly used internally by the
      Schema class.
    
      @method compileType
      @param type {Schema | SchemaType}
      @param definition {Object}
    */
    public static compileType(type, definition)
    {
      var types = Schema.types;
      
      // Wouldnt be enough with type instanceof SchemaType ? (since Schema inherits from SchemaType)
      if(type instanceof Schema || type instanceof SchemaType){
        return type;
      }
      
      if(type instanceof Array){
        return new ArrayType(definition);
      }

      if(_.isPlainObject(type)){
        return new ObjectType(definition);
      }

      for(var i=0; i<types.length; i++){
        if(type == types[i].type){
          return new types[i](definition);
        }
      }
    }
    
    /**
      Maps every schema key and value to a new object. This method is useful when
      translating the schema to specific backend, such as mongoose.
      
      @method map
      @param iter {Function} (key, value) => any
      @return {Object} mapped object.
    */
    public map(iter: (key, value) => any)
    {
      var result = {};
      _.each(this.compiledSchema, (value, key?) => {
        var def = iter(key, value);
        if(def) result[key] = def;
      });
      return result;
    }
    
    /**
      @property ObjectId
      @type String
      @final
      @static
    */
    public static ObjectId = 'ObjectId';
    
    /**
      @property Abstract
      @type String
      @final
      @static
    */
    public static Abstract = 'Abstract';

    // needed?
    public static Mixed;
    public static Buffer;
    
    // {type: any; Class: ISchemaType;}
    private static types: ISchemaType[] = [
      ObjectType,
      StringType,
      NumberType,
      BooleanType,
      DateType,
      SchemaType,
      ObjectIdType,
      AbstractType,
    ];
  }
  
}

