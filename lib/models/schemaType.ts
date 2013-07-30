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
  /*
  class Schema{
    public static ObjectId = 'ObjectId';
    public static Abstract = 'Abstract';

    // needed?
    public static Mixed;
    public static Buffer;
  }
  */
  
  export interface ISchemaType
  {
    type;
    new (definition): SchemaType;
  }
   
  /**
  
    @class SchemaType
    @constructor
  */
  export class SchemaType
  { 
    public static type: any = Object;
    public definition;
    
    constructor(definition)
    {
      this.definition = definition;
    }
    
    validate(val: any): Promise<bool>
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
  
  export class StringType extends SchemaType
  {
    public static type = String;
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
  }
  
  export class ObjectIdType extends SchemaType
  {
    public static type = 'ObjectId';
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
  
  // AbstractType is a special type that reads __schema from the
  // obj. This is in order to allow abstract schemas whose implementations
  // are not known until runtime.
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
