/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  The right manager takes a RightsRules object as input and keeps updated 
  all the rights over models, collections and sequences.
*/


module Gnd {

export enum Rights {
  CREATE,
  GET,
  PUT,
  DEL
}

export interface Acl
{
  isAllowed(userId: string, resource: string, permissions: string, cb: (err, allowed) => void): void;
}

export interface Rules
{
  create?: any;
  del?: any;
  put?: any;
  add?: any;
  remove?: any;
}

export class RightsManager 
{
  private acl: Acl;
  private rules: Rules;
  
  constructor(acl?: Acl, rules?: Rules){
    this.acl = acl;
    this.rules = rules;
  }
  
  checkRights(userId: string, 
              keyPath: string[], 
              rights: Rights,
              cb:(err?: Error, allowed?: bool) => void);
  checkRights(userId: string, 
              keyPath: string[], 
              rights: Rights[], 
              cb:(err?: Error, allowed?: bool) => void);
  checkRights(userId: string, 
              keyPath: string[], 
              rights: any, 
              cb:(err?: Error, allowed?: bool) => void)
  {
    if(this.acl){
      this.acl.isAllowed(userId, keyPath.join('/'), rights, cb);
    }else{
      cb(null, true);
    }
  }
  
  create(userId: string, keyPath: string[], doc: any, cb:(err?: Error) => void)
  {
    if(!this.acl) {
      cb();
    }
  }
  
  put(userId: string, keyPath: string[], doc: any, cb: (err?: Error) => void)
  {
    if(!this.acl) {
      cb();
    }
  }
  
  del(userId: string, keyPath: string[], cb: (err?: Error) => void)
  {
    if(!this.acl) {
      cb();
    }
  }
  
  add(userId: string, 
      keyPath: string[],
      itemsKeyPath: string[],
      itemIds:string[],
      cb: (err?: Error) => void)
  {
    if(!this.acl) {
      cb();
    }
  }
  
  remove(userId: string, 
         keyPath: string[], 
         itemsKeyPath: string[], 
         itemIds:string[], 
         cb: (err?: Error) => void)
  {
    if(!this.acl) {
      cb();
    }
  }
}

// acl.addUserRoles(userId, userId)
/*
function(acl){
  
  function addCreateRights(userId, keypath, doc, cb){
    acl.allow(userId, keypath.join('/'), [GET, PUT, DEL], cb);
  }
  
  function removeRights(userId, keypath, cb){
    acl.removeAllow(userId, keypath.join('/'), [GET, PUT, DEL], cb);
  }
  
return
{
  create: {
    '*': defaultCreateRights, 
    'medias/:id': addCreateRights,
    'displays/:id': addCreateRights,
    'playlists/:id': () => {
      addCreateRights();
      acl.allow(userId, keypath.concat('entries').join('/'), [ADD, REMOVE, FIND], cb);
    },
    'group/:id': () => {
      addCreateRights();
      acl.allow(userId, keypath.concat('resources').join('/'), [ADD, REMOVE, FIND], cb);
      acl.allow(userId, keypath.concat('users').join('/'), [ADD, REMOVE, FIND], cb);
    },
    
    'resource/:id': (userId, keypath, doc, cb) => {
      doc.permissions
      acl.
    }
    
    'users/:id/playlists': addCreateRights,
    {
      acl.allow(userId, keypath.concat())
      
      'playlists/:id/entries':
    },
    
    'users/:id/calendars': addCreateRights,
    'users/:id/groups': addCreateRights,
  },
  
  del:{
    '*': defaultRemoveRights,
    'users/:id/medias', 
     'users/:id/displays',
     'users/:id/playlists',
     'users/:id/calendars',
     'users/:id/groups', removeRights;
  },
  
  add: {
    'groups/:id/users': function(userId, keypath, itemsKeyPath, itemIds, doc){
      groupId = keypath[1];
      _.each(itemIds, (memberId) => {
        keypath[2] = 'users';
        acl.allow(memberId, keypath, [FIND], cb);
        keypath[2] = 'resources';
        acl.allow(memberId, keypath, [FIND], cb);
        acl.addUserRoles(userId, groupId);
      });
    },
    'groups/:id/resources': function(userId, keypath, itemsKeyPath, itemIds, doc){      
        // Get resources, and add permissions accordingly.
        Resource.findById(itemIds){
          allow(keypath[1], resource.resourceId, resource.permissions);
        }
    },
    remove: {
    
    }
  }

}
    */
}

