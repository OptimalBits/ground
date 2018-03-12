/// <reference path="../models/schema.ts" />
/// <reference path="./collection.ts" />

module Gnd {

  /**
    Collection Schema Type. This class can be used to define collection types
    in schemas.

        var ChatSchema = new Schema({
            rooms: new ColectionSchemaType(Room, 'rooms');
        });

    @class CollectionSchemaType
    @extends SchemaType
    @constructor
    @param mode {IModel} A model class defining the type of items to store in the
    sequence.
    @param bucket {String} Bucket where the items are stored in the server.
  */
  export class CollectionSchemaType extends SchemaType
  {
    public static type = Collection;

    constructor(model: IModel, bucket?: string)
    {
      super({type: Collection, ref:{model: model, bucket: bucket || model.__bucket}});
    }

    init(property: string)
    {
      this.definition.ref.bucket = property;
    }

    toObject(obj)
    {
      // undefined since a collection is never serialized.
    }

    fromObject(arg)
    {
      // undefined since a collection is never deserialized
    }

    get(model, args?, opts?)
    {
      var def = this.definition;
      return model.all(def.ref.model, args || {}, def.ref.bucket);
    }
  }

}