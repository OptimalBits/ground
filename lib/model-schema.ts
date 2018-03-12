/// <reference path="./models/schema.ts" />
/// <reference path="./model.ts" />

module Gnd {
  /**
    Model Schema Type. This class can be used to define models as properties
    in schemas.

        var ChatSchema = new Schema({
          name: new ModelSchemaType(Name);
        });

    @class ModelSchemaType
    @extends SchemaType
    @constructor
    @param model {IModel} A model class defining the type of the model.
  */
  export class ModelSchemaType extends SchemaType
  {
    public static type: IModel = <IModel>Model;
    private model: IModel;

    constructor(model: IModel)
    {
      super({type: model});
    }

    fromObject(args: {module?: string}, opts?)
    {
      if(args instanceof this.definition.type){
        return args;
      }else if(_.isString(args)){
        return this.definition.type.findById(args, opts && opts.autosync);
      }else if(args.module){
        return new ModelProxy(args, args.module);
      }else{
        args['_persisted'] = true; // To avoid triggering a creation server side.
        return this.definition.type.create(args, opts && opts.autosync);
      }
    }

    toObject(obj)
    {
      if(obj instanceof ModelProxy){
        return obj.model.toArgs();
      }else{
        //return super.toObject(obj);
        return obj.toArgs();
      }
    }
  }

}