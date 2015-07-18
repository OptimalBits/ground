/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  SchemaTypes
  Inspired by Moongosejs, to be used both in server and client side.
*/

/// <reference path="../promise" />
/// <reference path="schema" />

module Gnd
{    
  export interface ISchemaType
  {
    type;
    new (definition): SchemaType;
  }
   
  /**
    This class is the base class for all schema types, including the Schema class
    itself, allowing nesting schemas.
  
    @class SchemaType
    @constructor
    @param definition {Any}
  */
  export class SchemaType
  { 
    public static type: any = Object;
    public definition;
    
    constructor(definition)
    {
      this.definition = definition;
    }
    
    /**
      Validates a value against the types definition. This method should be
      overrided by SchemaType subclasses.
    
      @method validate
      @param val {Any} value to be validated.
    */
    validate(val: any): Promise<boolean>
    {
      return Promise.resolved(true);
    }
    
    /**
      Converts the given object to a plain object according to this type 
      definition. This method should be overrided by SchemaType subclasses.
     
      @method toObject
      @param obj {Any} object to be "serialized"
    */
    toObject(obj)
    {
      return obj;
    }
    
    /**
      Converts the given args to a the type specified by the SchemaType
      definition. This method should be overrided by SchemaType subclasses.
     
      @method fromObject
      @param args {Any} some argument or arguments to convert to the type.
    */
    fromObject(args, opts?)
    {
      return args;
    }

    /**
      Returns the default value for this type definition.
    */
    default()
    {
      return _.cloneDeep(this.definition.default);
    }
  }
  
  export class StringType extends SchemaType
  {
    public static type = String;
  }
  
  export class ObjectType extends SchemaType
  {
    public static type = Object;
  }
  
  export class NumberType extends SchemaType
  {
    public static type = Number;
  }
  
  export class BooleanType extends SchemaType
  {
    public static type = Boolean;
  }
  
  export class DateType extends SchemaType
  {
    public static type = Date;
    
    fromObject(dateString){
      return new Date(dateString);
    }
  }
  
  export class ObjectIdType extends SchemaType
  {
    public static type = 'ObjectId';
  }
  
  export class MongoObjectIdType extends SchemaType
  {
    public static type = 'MongoObjectId';
  }

  export class ArrayType extends SchemaType
  {
    public static type = Array;
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
  
  /**
    AbstractType is a special schema type that reads __schema from the
    obj. This is in order to allow abstract schemas whose implementations
    are not known until runtime.
    
    @class AbstractType
    @extends SchemaType
  */ 
  export class AbstractType extends SchemaType
  {
    public static type = 'Abstract';
    toObject(obj)
    {
      var schema = obj.__schema || obj.constructor.__schema;
      return schema ? schema.toObject(obj): undefined;
    }
  }
}
