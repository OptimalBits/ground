
/**
  Ground Web Framework (c) 2011-2016 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Rest server backend.
*/
/// <reference path="../log.ts" />
/// <reference path="../server.ts" />
/// <reference path="../error.ts" />

module Gnd {
  /**
    Server REST backend for Express. Works in tandem with
    {{#crossLink "Storage.Socket"}}{{/crossLink}}

    @class RestBackend
    @constructor
    @param router {ExpressRouter} A ExpressJs router instance where the API will be defined.
    @param bodyParser {} A body parser middleware compatible with Express.
    @param server {Server} a Gnd server instance.
    @param authorize An authorization middleware, should put userId in req.
  */
  export class RestBackend {

    private toKeyPath(url) {
      url = url[0] === '/' ? url.substr(1) : url;
      url = _.last(url) === '/' ? url.slice(0, -1) : url;
      return url.split('/');
    }

    constructor(app, bodyParser, server: Server, authorize?) {
      var clientId = null;
      authorize = authorize || _authorize;

      function sendResult(res, result, successCode?) {
        if (result) {
          result.then(function (val) {
            res.status(successCode || 200).send(val);
          }, function (err) {
            var status = 500;
            switch (err.code) {
              case Gnd.ServerError.INVALID_SESSION:
              case Gnd.ServerError.MISSING_RIGHTS:
                status = 401;
                break;
              case Gnd.ServerError.INVALID_ID:
              case Gnd.ServerError.MODEL_NOT_FOUND:
              case Gnd.ServerError.DOCUMENT_NOT_FOUND:
              case Gnd.ServerError.MISSING_SEQUENCE_CONTAINER:
              case Gnd.ServerError.MISSING_SEQUENCE_ENDPOINTS:
                status = 404;
                break;
              case Gnd.ServerError.NO_CONNECTION:
              case Gnd.ServerError.INTERNAL_ERROR:
              case Gnd.ServerError.ERROR_INSERTING_CONTAINER:
                status = 500;
                break;
            }

            console.warn(err);

            res.status(status).send(err);
          });
        } else {
          res.send(500);
        }
      }

      app.get('*', authorize, (req, res, next) => {
        var keyPath = this.toKeyPath(req.path);

        var query = {
          cond: req.query.cond || {},
          fields: req.query.fields,
          opts: {
            skip: parseInt(req.query.skip ||  0),
            limit: parseInt(req.query.limit || 100)
          }
        };

         //
        // TODO: We should return the total count if we are using skip and limit
        // (or provide another REST API for getting counts)
        server.storage.entityType(keyPath).then(function (type) {
          switch (type) {
            case Storage.EntityType.Model:
              sendResult(res, server.fetch(req.userId, keyPath, query.fields));
              break;
            case Storage.EntityType.Collection:
              sendResult(res, server.find(req.userId, keyPath, query, {}));
              break;
            case Storage.EntityType.Sequence:
              sendResult(res, server.all(req.userId, keyPath, query, {}));
              break;
          }
        });
      });

      //
      // PUT /zoo/:id/animals
      /* [id1, id2, id3, id4 ... ];
      */
      app.put('*', authorize, bodyParser.json(), (req, res, next) => {
        var keyPath = this.toKeyPath(req.path);
        var opts = {};

        if(_.isEmpty(req.body)){
          res.status(422).send('Cannot put an empty object');
          return;
        }

        server.storage.entityType(keyPath).then(function (type) {
          switch (type) {
            case Storage.EntityType.Model:
              sendResult(res, server.put(clientId, req.userId, keyPath, req.body, opts));
              break;
            case Storage.EntityType.Collection:
              sendResult(res, server.add(clientId, req.userId, keyPath, null, req.body, opts));
              break;
            case Storage.EntityType.Sequence:
              sendResult(res, server.insertBefore(clientId, req.userId, keyPath, req.body[0], null, opts));
              break;
          }
        });
      });

      app.delete('*', authorize, (req, res, next) => {
        var ids = req.query.id;
        var checkQuery = function () {
          if (!_.isArray(ids)) {
            res.status(422).send('Invalid query data, ids be an array');
            return false;
          };
          return true;
        }

        var keyPath = this.toKeyPath(req.path);

        var opts = {};

        server.storage.entityType(keyPath).then(function (type) {
          switch (type) {
            case Storage.EntityType.Model:
              sendResult(res, server.del(clientId, req.userId, keyPath, opts));
              break;
            case Storage.EntityType.Collection:
              if (checkQuery()) {
                sendResult(res, server.remove(clientId, req.userId, keyPath, null, ids, opts));
              }
              break;
            case Storage.EntityType.Sequence:
              if (checkQuery()) {
                sendResult(res, server.deleteItem(clientId, req.userId, req.body.path, ids, opts));
              }
              break;
          }
        });
      });

      //
      // TODO: Add support for creating collection and sequence items in one
      // API call
      //
      app.post('*', authorize, bodyParser.json(), (req, res, next) => {
        var keyPath = this.toKeyPath(req.path);

        var opts = {};

        if (keyPath.length === 1) {
          sendResult(res, server.create(req.userId, keyPath, req.body, opts), 201);
        } else {
          server.storage.entity(keyPath).then(function (entity) {
            switch (entity.type) {
              case Storage.EntityType.Collection:
                //
                // create all models and insert them
                // (Note: non atomic risk for dangling items.)
                // TODO: check that the parent ID actually is correct before creating children.
                sendResult(res, server.create(req.userId, [entity.bucket], req.body, opts).then((ids) => {
                  return server.add(clientId, req.userId, keyPath, null, ids, opts);
                }), 201);

                break;
              case Storage.EntityType.Sequence:
                //
                // create all models and insert them into the sequence
                // (Note: non atomic risk for dangling items.)
                //
                //sendResult(res, server.insertBefore(clientId, req.userId, keyPath, req.body[0], null, opts));
                break;
              default:
              // TODO: Send error
            }
          });
        }

        /*
          When the entity is a collection or sequence we need to:
          - create the collection item.
          - add the item to the parent model collection property.

          server.storage.entity(keyPath).then(function(entity){
            entity.type  -> Model/Collection/Sequence
            entity.model -> Animal
          })
        */
      });

      //
      // Dummy authorization middlware to use when none specified.
      //
      function  _authorize(req, res, next) {
        req.userId = null;
        next();
      }
    }
  }

}
