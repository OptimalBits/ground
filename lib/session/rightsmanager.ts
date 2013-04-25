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

export interface Callback {
  (err?: Error) : void;
}

export interface CreateRule {
  (userId: string, keypath: string[], doc: any, cb: Callback): void;
}

export interface DeleteRule {
  (userId: string, keypath: string[], cb: Callback): void;
}

export interface PutRule {
  (userId: string, keypath: string[], doc: any, cb: Callback): void;
}

export interface AddRule {
  (userId: string, 
   keyPath: string[],
   itemsKeyPath: string[],
   itemIds:string[],
   cb: Callback): void;
}

export interface RemoveRule {
  (userId: string,
   keyPath: string[], 
   itemsKeyPath: string[], 
   itemIds:string[],
   cb: Callback): void;
}

export interface Rules
{
  create?: {[index: string]: CreateRule;};
  put?: {[index: string]: PutRule;};
  del?: {[index: string]: DeleteRule;};
  add?: {[index: string]: AddRule;};
  remove?: {[index: string]: RemoveRule;};
}

export class RulesManager 
{
  private rules: Rules;
  private acl: Acl;
  
  constructor(acl: Acl, rules: Rules){
    this.rules = rules;
    this.acl = acl;
  }
  
  applyCreate(userId: string, keyPath: string[], doc: any, cb:(err?: Error) => void)
  {
    var rule = <CreateRule>this.matchRule(this.rules.create, keyPath);
    if(rule){
      return rule.call(this.acl, arguments);
    }
    cb();
  }

  applyPut(userId: string, keyPath: string[], doc: any, cb:(err?: Error) => void)
  {
    var rule = <PutRule>this.matchRule(this.rules.put, keyPath);
    if(rule){
      return rule.call(this.acl, arguments);
    }
    cb();
  }
  
  applyDel(userId: string, keyPath: string[], cb:(err?: Error) => void)
  {
    var rule = <DeleteRule>this.matchRule(this.rules.del, keyPath);
    if(rule){
      return rule.apply(this.acl, arguments);
    }
    cb();
  }
  
  applyAdd(userId: string, 
           keyPath: string[],
           itemsKeyPath: string[],
           itemIds:string[], 
           cb:(err?: Error) => void)
  {
    var rule = <AddRule>this.matchRule(this.rules.add, keyPath);
    if(rule){
      return rule.apply(this.acl, arguments);
    }
    cb();
  }
  
  applyRemove(userId: string,
              keyPath: string[],
              itemsKeyPath: string[],
              itemIds:string[],
              cb:(err?: Error) => void)
  {
    var rule = <RemoveRule>this.matchRule(this.rules.remove, keyPath);
    if(rule){
      return rule(userId, keyPath, itemsKeyPath, itemIds, cb);
    }
    cb();
  }

  private matchRule(rules: {}, keyPath: string[])
  {
    if(rules){
      var patterns = Object.keys(rules);
    
      for(var i=0; i<patterns.length; i++){
        var pattern = patterns[i].split('/');
        if (pattern.length == keyPath.length){
          for(var j=0; j<keyPath.length; j++){
            if(keyPath[j] == pattern[j]){
              return rules[patterns[i]];
            }
          }
        }
      }
      return rules['*'];
    }
  }
}

export class RightsManager 
{
  private acl: Acl;
  private rulesManager: RulesManager;
  
  constructor(acl?: Acl, rules?: Rules){
    this.acl = acl;
    
    if(rules){
      this.rulesManager = new RulesManager(acl, rules);
    }
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
    if(this.rulesManager){
      this.rulesManager.applyCreate(userId, keyPath, doc, cb);
    }else{
      cb();
    }
  }
  
  put(userId: string, keyPath: string[], doc: any, cb: (err?: Error) => void)
  {
    if(this.rulesManager){
      this.rulesManager.applyPut(userId, keyPath, doc, cb);
    }else{
      cb();
    }
  }
  
  del(userId: string, keyPath: string[], cb: (err?: Error) => void)
  {
    if(this.rulesManager){
      this.rulesManager.applyDel(userId, keyPath, cb);
    }else{
      cb();
    }
  }
  
  add(userId: string, 
      keyPath: string[],
      itemsKeyPath: string[],
      itemIds:string[],
      cb: (err?: Error) => void)
  {
    if(this.rulesManager){
      this.rulesManager.applyAdd(userId, keyPath, itemsKeyPath, itemIds, cb);
    }else{
      cb();
    }
  }
  
  remove(userId: string, 
         keyPath: string[], 
         itemsKeyPath: string[], 
         itemIds:string[], 
         cb: (err?: Error) => void)
  {
    if(this.rulesManager){
      this.rulesManager.applyRemove(userId, keyPath, itemsKeyPath, itemIds, cb);
    }else{
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

