
/// <reference path="../models/schema.ts" />
/// <reference path="./sequence.ts" />

module Gnd {
  /**
    Sequence Schema Type. This class can be used to define collection types
    in schemas.

        var PlaylistSchema = new Schema({
          name: String,
          songs: new SequenceSchemaType(Song, 'songs');
        });

    @class SequenceSchemaType
    @extends SchemaType
    @constructor
    @param mode {IModel} A model class defining the type of items to store in the
    sequence.
    @param bucket {String} Bucket where the items are stored in the server.
  */
  export class SequenceSchemaType extends SchemaType
  {
    public static type = Sequence;

    constructor(model: IModel, bucket?: string)
    {
      super({type: Sequence, ref:{model: model, bucket: bucket || model.__bucket}});
    }

    init(property: string)
    {
      this.definition.ref.bucket = property;
    }

    toObject(obj)
    {
      // undefined since a sequence is never serialized.
    }

    fromObject(arg)
    {
      // undefined since a collection is never deserialized
    }

    get(model, args?, opts?)
    {
      var def = this.definition;
      return model.seq(def.ref.model, args || {}, def.ref.bucket);
    }
  }
}