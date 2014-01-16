/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  The right manager takes a RightsRules object as input and keeps updated 
  all the rights over models, collections and sequences.
*/

/// <reference path="../promise.ts" />


module Gnd {

export enum Rights {
  CREATE,
  GET,
  PUT,
  DEL
}

export interface Acl
{
  isAllowed(userId: string, resource: string, permissions: string): Promise<Boolean>;
}

export interface CreateRule {
  (userId: string, keypath: string[], doc: any): Promise<void>;
}

export interface DeleteRule {
  (userId: string, keypath: string[]): Promise<void>;
}

export interface PutRule {
  (userId: string, keypath: string[], doc: any): Promise<void>;
}

export interface AddRule {
  (userId: string, 
   keyPath: string[],
   itemsKeyPath: string[],
   itemIds:string[]): Promise<void>;
}

export interface RemoveRule {
  (userId: string,
   keyPath: string[], 
   itemsKeyPath: string[], 
   itemIds:string[]): Promise<void>;
}

/**
  Policies interface.
  
  A policies object containes policies for operations that imply the creation or
  destruction of resources.
  
  A policies object must be defined for every application, with the specific
  rights relationships for that application.

  Note: Documentation incomplete needs to be much more detailed and provide 
  examples.

  @class Policies
*/
export interface Policies
{
  create?: {[index: string]: CreateRule;};
  put?: {[index: string]: PutRule;};
  del?: {[index: string]: DeleteRule;};
  add?: {[index: string]: AddRule;};
  remove?: {[index: string]: RemoveRule;};
}

class PolicyManager 
{
  private policies: Policies;
  private acl: Acl;
  
  constructor(acl: Acl, policies: Policies){
    this.policies = policies;
    this.acl = acl;
  }
  
  applyPolicy(userId: string, policyType: string, keyPath: string[], ...args: any[]): Promise<void>
  {
    var policy = this.matchPolicy(policyType, keyPath);
    if(policy){
      return policy.apply(this.acl, [keyPath].concat(args));
    }
    return Promise.resolved();
  }
  
  applyCreate(userId: string, keyPath: string[], doc: any): Promise<void>
  {
    return this.applyPolicy(userId, 'create', keyPath, doc);
  }

  applyPut(userId: string, keyPath: string[], doc: any): Promise<void>
  {
    return this.applyPolicy(userId, 'put', keyPath, doc);
  }
  
  applyDel(userId: string, keyPath: string[]): Promise<void>
  {
    return this.applyPolicy(userId, 'del', keyPath);
  }
  
  applyAdd(userId: string, 
           keyPath: string[],
           itemsKeyPath: string[],
           itemIds:string[]): Promise<void>
  {
    return this.applyPolicy(userId, 'add', keyPath, itemsKeyPath, itemIds);
  }
  
  applyRemove(userId: string,
              keyPath: string[],
              itemsKeyPath: string[],
              itemIds:string[]): Promise<void>
  {
    return this.applyPolicy(userId, 'remove', keyPath, itemsKeyPath, itemIds);
  }

  private matchPolicy(policyType: string, keyPath: string[])
  {
    var policies = this.policies[policyType];
    
    if(policies){
      var patterns = Object.keys(policies);
    
      for(var i=0; i<patterns.length; i++){
        var pattern = patterns[i].split('/');
        if (pattern.length == keyPath.length){
          for(var j=0; j<keyPath.length; j++){
            if(keyPath[j] == pattern[j]){
              return policies[patterns[i]];
            }
          }
        }
      }
      // Rerturn the default policy if any
      return policies['*'];
    }
  }
}

/**
  This class is used internally by the framework to provide rights for the users.

  @class RightsManager
  @constructor
  @param acl {Acl} an instance of the Acl module.
  @param policies {Policies} policies to be used by this rights manager.
*/
export class RightsManager 
{
  private acl: Acl;
  private policyManager: PolicyManager;
  
  constructor(acl?: Acl, rules?: Policies){
    this.acl = acl;
    
    if(rules){
      this.policyManager = new PolicyManager(acl, rules);
    }
  }
  
  checkRights(userId: string, keyPath: string[], rights: Rights): Promise<boolean>;
  checkRights(userId: string, keyPath: string[], rights: Rights, doc: any): Promise<boolean>;  
  checkRights(userId: string, keyPath: string[], rights: Rights[]): Promise<boolean>;
  checkRights(userId: string, keyPath: string[], rights: Rights[], doc: any): Promise<boolean>;
  checkRights(userId: string, keyPath: string[], rights: any, doc?:any): Promise<boolean>
  {
    if(this.acl){
      return this.acl.isAllowed(userId, keyPath.join('/'), rights);
    }else{
      return Promise.resolved(true);
    }
  }
  
  create(userId: string, keyPath: string[], doc: any): Promise<string>
  {
    if(this.policyManager){
      this.policyManager.applyCreate(userId, keyPath, doc);
    }else{
      return Promise.resolved();
    }
  }
  
  put(userId: string, keyPath: string[], doc: any): Promise<void>
  {
    if(this.policyManager){
      this.policyManager.applyPut(userId, keyPath, doc);
    }else{
      return Promise.resolved();
    }
  }
  
  del(userId: string, keyPath: string[]): Promise<void>
  {
    if(this.policyManager){
      this.policyManager.applyDel(userId, keyPath);
    }else{
      return Promise.resolved();
    }
  }
  
  add(userId: string, 
      keyPath: string[],
      itemsKeyPath: string[],
      itemIds:string[]): Promise<void>
  {
    if(this.policyManager){
      return this.policyManager.applyAdd(userId, keyPath, itemsKeyPath, itemIds);
    }else{
      return Promise.resolved<void>();
    }
  }
  
  remove(userId: string, 
         keyPath: string[], 
         itemsKeyPath: string[], 
         itemIds:string[]): Promise<void>
  {
    if(this.policyManager){
      return this.policyManager.applyRemove(userId, keyPath, itemsKeyPath, itemIds);
    }else{
      return Promise.resolved();
    }    
  }
}

// acl.addUserRoles(userId, userId)
/*
function(acl){
  
  function addCreateRights(userId, keypath, doc){
    return acl.allow(userId, keypath.join('/'), [GET, PUT, DEL]);
  }
  
  function removeRights(userId, keypath, cb){
    return acl.removeAllow(userId, keypath.join('/'), [GET, PUT, DEL], cb);
  }
  
return
{
  create: {
    '*': defaultCreateRights, 
    'medias/:id': addCreateRights,
    'displays/:id': addCreateRights,
    'playlists/:id': () => {
      addCreateRights();
      return acl.allow(userId, keypath.concat('entries').join('/'), [ADD, REMOVE, FIND]);
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

