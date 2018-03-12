
/**
  Ground Web Framework (c) 2011-2016 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Rest server backend.
*/
/// <reference path="../../typings/main.d.ts" />
/// <reference path="../log.ts" />
/// <reference path="../server.ts" />
/// <reference path="../error.ts" />

module Gnd {  
  /**
    REST backend methods.
    @class Rest
  */
  export class Rest {

    static get(server: Server, keyPath, userId, query) {
      //
      // TODO: We should return the total count if we are using skip and limit
      // (or provide another REST API for getting counts)
      return server.storage.entityType(keyPath).then(function (type) {
        switch (type) {
          case Storage.EntityType.Model:
            return server.fetch(userId, keyPath, query.fields);
          case Storage.EntityType.Collection:
            return server.find(userId, keyPath, query, {});
          case Storage.EntityType.Sequence:
            return server.all(userId, keyPath, query, {});
        }
      });
    }

    /* [id1, id2, id3, id4 ... ]; */
    static put(server, clientId, keyPath, userId, data: object | string[] | string, itemKeyPath?: string[]) {
      return server.storage.entityType(keyPath).then(function (type) {
        switch (type) {
          case Storage.EntityType.Model:
            return server.put(clientId, userId, keyPath, data, {});
          case Storage.EntityType.Collection:
            return server.add(clientId, userId, keyPath, null, data, {});
          case Storage.EntityType.Sequence:
            return server.insertBefore(clientId, userId, keyPath, data, itemKeyPath, {});
        }
      });
    }

    static delete(server, clientId, keyPath, userId, ids: string[], sequenceItemPath) {
      var checkQuery = function () {
        if (!_.isArray(ids)) {
          return false;
        };
        return true;
      }
      return server.storage.entityType(keyPath).then(function (type) {
        switch (type) {
          case Storage.EntityType.Model:
            return server.del(clientId, userId, keyPath, {});
          case Storage.EntityType.Collection:
            if (checkQuery()) {
              return server.remove(clientId, userId, keyPath, null, ids, {});
            }
          case Storage.EntityType.Sequence:
            if (checkQuery()) {
              return  server.deleteItem(clientId, userId, sequenceItemPath, ids, {});
            }
        }
      });
    }

    //
    // TODO: Add support for creating collection and sequence items in one
    // API call
    //
    static post(server, clientId, keyPath, userId, data, opts) {
      if (keyPath.length === 1) {
        return server.create(userId, keyPath, data, opts);
      } else {
        return server.storage.entity(keyPath).then(function (entity) {
          switch (entity.type) {
            case Storage.EntityType.Collection:
              //
              // create all models and insert them
              // (Note: non atomic risk for dangling items.)
              // TODO: check that the parent ID actually is correct before creating children.
              return  server.create(userId, [entity.bucket], data, opts).then((ids) => {
                return server.add(clientId, userId, keyPath, null, ids, opts);
              });
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
    }
  }

}
