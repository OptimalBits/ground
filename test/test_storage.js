define(function(){

return function(storage, storageType){
  describe(storageType, function(){
    var zooId;
    var key1;
    it('create a simple document', function(done){
      storage.create(['documents'], {foo:'bar'}, function(err, key){
        expect(err).to.not.be.ok();
        expect(err).to.not.be.a('string');
        storage.fetch(['documents', key], function(err, doc){
          expect(err).to.not.be.ok();
          expect(doc.foo).to.be.equal('bar');
          key1 = key;
          done();
        });
      });
    });
    
    it('modifies a simple document', function(done){
      storage.put(['documents', key1], {baz:'qux'}, function(err, key){
        expect(err).to.not.be.ok();
        storage.fetch(['documents', key1], function(err, doc){
          expect(err).to.not.be.ok();
          expect(doc.foo).to.be.equal('bar');
          expect(doc.baz).to.be.equal('qux');
          done();
        });
      });
    });
    
    it('links a simple document', function(done){
      if(storage.link){
        storage.link(['linked_document'], ['documents', key1], function(err){
          expect(err).to.not.be.ok();
          storage.fetch(['linked_document'], function(err, doc){
            expect(err).to.not.be.ok();
            expect(doc.foo).to.be.equal('bar');
            expect(doc.baz).to.be.equal('qux');
            done();
          });
        });
      }else{
        done();
      }
    });

    it('deletes a simple document', function(done){
      storage.del(['documents', key1], function(err){
        expect(err).to.not.be.ok();
        storage.fetch(['documents', key1], function(err, doc){
          expect(err).to.be.ok();
          expect(doc).to.not.be.ok();
          done();
        });
      });
    });
    
    describe('Set / Collections', function(){
      var id2, id4;
      
      it('add a few items to a set', function(done){
        storage.create(['zoo'], {}, function(err, id){
          zooId = id;
          storage.create(['animals'], {legs:3}, function(err, id1){
            expect(err).to.not.be.ok();
            expect(id1).to.be.ok();
            storage.create(['animals'], {legs:5}, function(err, id){
              id2 = id;
              expect(err).to.not.be.ok();
              expect(id2).to.be.ok();
              storage.create(['animals'], {legs:2}, function(err, id3){
                expect(err).to.not.be.ok();
                expect(id3).to.be.ok();
                storage.create(['animals'], {legs:7}, function(err, id){
                  id4 = id;
                  expect(err).to.not.be.ok();
                  expect(id4).to.be.ok();
                  storage.add(['zoo', zooId, 'animals'], ['animals'], [id1, id2, id3, id4], {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.find(['zoo', zooId, 'animals'], {}, {}, function(err, items){
                      expect(err).to.not.be.ok();
                      expect(items).to.be.an(Array);
                      expect(items).to.have.length(4);
                      // FIX THIS since order is not guaranteed!
                      expect(items[0]).to.have.property('legs', 3);
                      expect(items[1]).to.have.property('legs', 5);
                      expect(items[2]).to.have.property('legs', 2);
                      expect(items[3]).to.have.property('legs', 7);
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
      
      it('remove and add a few items to a set', function(done){
        storage.remove(['zoo', zooId, 'animals'], ['animals'], [id2, id4], {}, function(err){
          storage.create(['animals'], {legs:1}, function(err, id){
            expect(err).to.not.be.ok();
            storage.add(['zoo', zooId, 'animals'], ['animals'], [id], {}, function(err){
              storage.find(['zoo', zooId, 'animals'], {}, {}, function(err, items){
                expect(err).to.not.be.ok();
                expect(items).to.be.an(Array);
                var filtered = _.filter(items, function(item){ return item.__op !== 'rm';});
                expect(filtered).to.have.length(3);
                // FIX THIS since order is not guaranteed!
                expect(filtered[0]).to.have.property('legs', 3);
                expect(filtered[1]).to.have.property('legs', 2);
                expect(filtered[2]).to.have.property('legs', 1);
                done();
              });
            });
          });
        });
      });
    });
    
    describe('Sequences', function(){
      describe('insertBefore', function(){
        it('to the left', function(done){
          storage.create(['parade'], {}, function(err, paradeId){
            storage.create(['animals'], {name:'tiger'}, function(err, id1){
              expect(err).to.not.be.ok();
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id1], {}, function(err){
                expect(err).to.not.be.ok();
                storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
                  expect(err).to.not.be.ok();
                  expect(item).to.be.an(Object);
                  expect(item.doc).to.have.property('name', 'tiger');
                  storage.create(['animals'], {name:'dog'}, function(err, id2){
                    expect(err).to.not.be.ok();
                    expect(id2).to.be.ok();
                    storage.insertBefore(['parade', paradeId, 'animals'], item.keyPath, ['animals', id2], {}, function(err){
                      expect(err).to.not.be.ok();
                      storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
                        expect(err).to.not.be.ok();
                        expect(item).to.be.an(Object);
                        expect(item.doc).to.have.property('name', 'dog');
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
        it('push one item', function(done){
          storage.create(['parade'], {}, function(err, paradeId){
            storage.create(['animals'], {name:'tiger'}, function(err, id1){
              expect(err).to.not.be.ok();
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id1], {}, function(err){
                expect(err).to.not.be.ok();
                storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
                  expect(err).to.not.be.ok();
                  expect(item.doc).to.have.property('name', 'tiger');
                  done();
                });
              });
            });
          });
        });
        it('push many items', function(done){
          storage.create(['parade'], {}, function(err, paradeId){
            storage.create(['animals'], {name:'cat'}, function(err, id1){
              expect(err).to.not.be.ok();
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id1], {}, function(err){
                expect(err).to.not.be.ok();
                storage.create(['animals'], {name:'fox'}, function(err, id2){
                  expect(err).to.not.be.ok();
                  expect(id2).to.be.ok();
                  storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id2], {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.create(['animals'], {name:'eagle'}, function(err, id3){
                      expect(err).to.not.be.ok();
                      expect(id3).to.be.ok();
                      storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id3], {}, function(err){
                        expect(err).to.not.be.ok();
                        storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
                          expect(err).to.not.be.ok();
                          expect(item).to.be.an(Object);
                          expect(item.doc).to.have.property('name', 'eagle');
                          storage.create(['animals'], {name:'shark'}, function(err, id4){
                            expect(err).to.not.be.ok();
                            expect(id4).to.be.ok();
                            storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id4], {}, function(err){
                              expect(err).to.not.be.ok();
                              storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
                                expect(err).to.not.be.ok();
                                expect(item.doc).to.have.property('name', 'shark');
                                storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
                                  expect(err).to.not.be.ok();
                                  expect(item.doc).to.have.property('name', 'cat');
                                  done();
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
        it('invalid reference keypath', function(done){
          storage.create(['parade'], {}, function(err, paradeId){
            storage.create(['animals'], {name:'tiger'}, function(err, id1){
              expect(err).to.not.be.ok();
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], ['dummy'], ['animals', id1], {}, function(err){
                expect(err).to.be.ok();
                storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
                  expect(err).to.be.ok();
                  done();
                });
              });
            });
          });
        });
      });
      describe('all', function(){
        it('one item', function(done){
          storage.create(['parade'], {}, function(err, paradeId){
            storage.create(['animals'], {name:'cat'}, function(err, id1){
              expect(err).to.not.be.ok();
              expect(id1).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id1], {}, function(err){
                expect(err).to.not.be.ok();
                storage.all(['parade', paradeId, 'animals'], {}, {}, function(err, items){
                  expect(err).to.not.be.ok();
                  expect(items).to.have.property('length', 1);
                  done();
                });
              });
            });
          });
        });
        it('many items', function(done){
          storage.create(['parade'], {}, function(err, paradeId){
            storage.create(['animals'], {name:'cat'}, function(err, id){
              expect(err).to.not.be.ok();
              expect(id).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                expect(err).to.not.be.ok();
                storage.create(['animals'], {name:'frog'}, function(err, id){
                  expect(err).to.not.be.ok();
                  expect(id).to.be.ok();
                  storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.create(['animals'], {name:'dog'}, function(err, id){
                      expect(err).to.not.be.ok();
                      expect(id).to.be.ok();
                      storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                        expect(err).to.not.be.ok();
                        storage.all(['parade', paradeId, 'animals'], {}, {}, function(err, items){
                          expect(err).to.not.be.ok();
                          expect(items).to.have.property('length', 3);
                          done();
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
        it('empty sequence', function(done){
          storage.create(['parade'], {}, function(err, paradeId){
            storage.create(['animals'], {name:'cat'}, function(err, id1){
              expect(err).to.not.be.ok();
              expect(id1).to.be.ok();
              storage.all(['parade', paradeId, 'animals'], {}, {}, function(err, items){
                expect(err).to.not.be.ok();
                expect(items).to.have.property('length', 0);
                done();
              });
            });
          });
        });
      });
      // describe('push', function(){
      //   it('one item', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'tiger'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.push(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
      //             expect(err).to.not.be.ok();
      //             expect(item).to.be.an(Array);
      //             storage.fetch(item, function(err, doc){
      //               expect(doc).to.have.property('name', 'tiger');
      //               done();
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      //   it('many items', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'cat'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.push(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'fox'}, function(err, id2){
      //             expect(err).to.not.be.ok();
      //             expect(id2).to.be.ok();
      //             storage.push(['parade', paradeId, 'animals'], ['animals', id2], {}, function(err){
      //               expect(err).to.not.be.ok();
      //               storage.create(['animals'], {name:'eagle'}, function(err, id3){
      //                 expect(err).to.not.be.ok();
      //                 expect(id3).to.be.ok();
      //                 storage.push(['parade', paradeId, 'animals'], ['animals', id3], {}, function(err){
      //                   expect(err).to.not.be.ok();
      //                   storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
      //                     expect(err).to.not.be.ok();
      //                     expect(item).to.be.an(Object);
      //                     expect(item).to.have.property('name', 'eagle');
      //                     storage.create(['animals'], {name:'shark'}, function(err, id4){
      //                       expect(err).to.not.be.ok();
      //                       expect(id4).to.be.ok();
      //                       storage.push(['parade', paradeId, 'animals'], ['animals', id4], {}, function(err){
      //                         expect(err).to.not.be.ok();
      //                         storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
      //                           expect(err).to.not.be.ok();
      //                           expect(item).to.be.an(Object);
      //                           expect(item).to.have.property('name', 'shark');
      //                           storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
      //                             expect(err).to.not.be.ok();
      //                             expect(item).to.be.an(Object);
      //                             expect(item).to.have.property('name', 'cat');
      //                             done();
      //                           });
      //                         });
      //                       });
      //                     });
      //                   });
      //                 });
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      // });

      // describe('unshift', function(){
      //   it('one item', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'tiger'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.unshift(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
      //             expect(err).to.not.be.ok();
      //             expect(item).to.be.an(Object);
      //             expect(item).to.have.property('name', 'tiger');
      //             done();
      //           });
      //         });
      //       });
      //     });
      //   });
      //   it('many items', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'cat'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.unshift(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'fox'}, function(err, id2){
      //             expect(err).to.not.be.ok();
      //             expect(id2).to.be.ok();
      //             storage.unshift(['parade', paradeId, 'animals'], ['animals', id2], {}, function(err){
      //               expect(err).to.not.be.ok();
      //               storage.create(['animals'], {name:'eagle'}, function(err, id3){
      //                 expect(err).to.not.be.ok();
      //                 expect(id3).to.be.ok();
      //                 storage.unshift(['parade', paradeId, 'animals'], ['animals', id3], {}, function(err){
      //                   expect(err).to.not.be.ok();
      //                   storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
      //                     expect(err).to.not.be.ok();
      //                     expect(item).to.be.an(Object);
      //                     expect(item).to.have.property('name', 'eagle');
      //                     storage.create(['animals'], {name:'shark'}, function(err, id4){
      //                       expect(err).to.not.be.ok();
      //                       expect(id4).to.be.ok();
      //                       storage.unshift(['parade', paradeId, 'animals'], ['animals', id4], {}, function(err){
      //                         expect(err).to.not.be.ok();
      //                         storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
      //                           expect(err).to.not.be.ok();
      //                           expect(item).to.be.an(Object);
      //                           expect(item).to.have.property('name', 'shark');
      //                           storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
      //                             expect(err).to.not.be.ok();
      //                             expect(item).to.be.an(Object);
      //                             expect(item).to.have.property('name', 'cat');
      //                             done();
      //                           });
      //                         });
      //                       });
      //                     });
      //                   });
      //                 });
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      // });

      // describe('insertBefore', function(){
      //   it('one item', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'tiger'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.push(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'shark'}, function(err, id2){
      //             expect(err).to.not.be.ok();
      //             expect(id2).to.be.ok();
      //             storage.insertBefore(['parade', paradeId, 'animals'], ['animals', id1], ['animals', id2], {}, function(err){
      //               expect(err).to.not.be.ok();
      //               storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
      //                 expect(err).to.not.be.ok();
      //                 expect(item).to.be.an(Object);
      //                 expect(item).to.have.property('name', 'shark');
      //                 done();
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      //   it('many items', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'tiger'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.push(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'shark'}, function(err, id2){
      //             expect(err).to.not.be.ok();
      //             expect(id2).to.be.ok();
      //             storage.insertBefore(['parade', paradeId, 'animals'], ['animals', id1], ['animals', id2], {}, function(err){
      //               expect(err).to.not.be.ok();
      //               storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
      //                 expect(err).to.not.be.ok();
      //                 expect(item).to.be.an(Object);
      //                 expect(item).to.have.property('name', 'shark');
      //                 storage.create(['animals'], {name:'prawn'}, function(err, id3){
      //                   expect(err).to.not.be.ok();
      //                   expect(id3).to.be.ok();
      //                   storage.insertBefore(['parade', paradeId, 'animals'], ['animals', id1], ['animals', id3], {}, function(err){
      //                     expect(err).to.not.be.ok();
      //                     storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
      //                       expect(err).to.not.be.ok();
      //                       expect(item).to.be.an(Object);
      //                       expect(item).to.have.property('name', 'shark');
      //                       storage.create(['animals'], {name:'eagle'}, function(err, id4){
      //                         expect(err).to.not.be.ok();
      //                         expect(id4).to.be.ok();
      //                         storage.insertBefore(['parade', paradeId, 'animals'], ['animals', id2], ['animals', id4], {}, function(err){
      //                           expect(err).to.not.be.ok();
      //                           storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
      //                             expect(err).to.not.be.ok();
      //                             expect(item).to.be.an(Object);
      //                             expect(item).to.have.property('name', 'eagle');
      //                             done();
      //                           });
      //                         });
      //                       });
      //                     });
      //                   });
      //                 });
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      //   it('nonexistent reference item', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'tiger'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.push(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'shark'}, function(err, id2){
      //             expect(err).to.not.be.ok();
      //             expect(id2).to.be.ok();
      //             storage.insertBefore(['parade', paradeId, 'animals'], ['animals', '---noexist---'], ['animals', id2], {}, function(err){
      //               expect(err).to.be.ok();
      //               done();
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      // });

      // describe('insertAfter', function(){
      //   it('one item', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'tiger'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.unshift(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'shark'}, function(err, id2){
      //             expect(err).to.not.be.ok();
      //             expect(id2).to.be.ok();
      //             storage.insertAfter(['parade', paradeId, 'animals'], ['animals', id1], ['animals', id2], {}, function(err){
      //               expect(err).to.not.be.ok();
      //               storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
      //                 expect(err).to.not.be.ok();
      //                 expect(item).to.be.an(Object);
      //                 expect(item).to.have.property('name', 'shark');
      //                 done();
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      //   it('many items', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'tiger'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.unshift(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'shark'}, function(err, id2){
      //             expect(err).to.not.be.ok();
      //             expect(id2).to.be.ok();
      //             storage.insertAfter(['parade', paradeId, 'animals'], ['animals', id1], ['animals', id2], {}, function(err){
      //               expect(err).to.not.be.ok();
      //               storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
      //                 expect(err).to.not.be.ok();
      //                 expect(item).to.be.an(Object);
      //                 expect(item).to.have.property('name', 'shark');
      //                 storage.create(['animals'], {name:'prawn'}, function(err, id3){
      //                   expect(err).to.not.be.ok();
      //                   expect(id3).to.be.ok();
      //                   storage.insertAfter(['parade', paradeId, 'animals'], ['animals', id1], ['animals', id3], {}, function(err){
      //                     expect(err).to.not.be.ok();
      //                     storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
      //                       expect(err).to.not.be.ok();
      //                       expect(item).to.be.an(Object);
      //                       expect(item).to.have.property('name', 'shark');
      //                       storage.create(['animals'], {name:'eagle'}, function(err, id4){
      //                         expect(err).to.not.be.ok();
      //                         expect(id4).to.be.ok();
      //                         storage.insertAfter(['parade', paradeId, 'animals'], ['animals', id2], ['animals', id4], {}, function(err){
      //                           expect(err).to.not.be.ok();
      //                           storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
      //                             expect(err).to.not.be.ok();
      //                             expect(item).to.be.an(Object);
      //                             expect(item).to.have.property('name', 'eagle');
      //                             done();
      //                           });
      //                         });
      //                       });
      //                     });
      //                   });
      //                 });
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      //   it('nonexistent reference item', function(done){
      //     storage.create(['parade'], {}, function(err, paradeId){
      //       storage.create(['animals'], {name:'tiger'}, function(err, id1){
      //         expect(err).to.not.be.ok();
      //         expect(id1).to.be.ok();
      //         storage.push(['parade', paradeId, 'animals'], ['animals', id1], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'shark'}, function(err, id2){
      //             expect(err).to.not.be.ok();
      //             expect(id2).to.be.ok();
      //             storage.insertAfter(['parade', paradeId, 'animals'], ['animals', '---noexist---'], ['animals', id2], {}, function(err){
      //               expect(err).to.be.ok();
      //               done();
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      // });
      describe('traversal', function(){
        var paradeId;
        before(function(done){
          storage.create(['parade'], {}, function(err, id){
            expect(err).to.not.be.ok();
            expect(id).to.be.ok();
            paradeId = id;
            storage.create(['animals'], {name:'tiger'}, function(err, id){
              expect(err).to.not.be.ok();
              expect(id).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                expect(err).to.not.be.ok();
                storage.create(['animals'], {name:'monkey'}, function(err, id){
                  expect(err).to.not.be.ok();
                  expect(id).to.be.ok();
                  storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.create(['animals'], {name:'prawn'}, function(err, id){
                      expect(err).to.not.be.ok();
                      expect(id).to.be.ok();
                      storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                        expect(err).to.not.be.ok();
                        storage.create(['animals'], {name:'shark'}, function(err, id){
                          expect(err).to.not.be.ok();
                          expect(id).to.be.ok();
                          storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                            expect(err).to.not.be.ok();
                            storage.create(['animals'], {name:'dog'}, function(err, id){
                              expect(err).to.not.be.ok();
                              expect(id).to.be.ok();
                              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                                expect(err).to.not.be.ok();
                                done();
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
        it('next', function(done){
          storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
            expect(err).to.not.be.ok();
            expect(item).to.be.an(Object);
            expect(err).to.not.be.ok();
            expect(item.doc).to.have.property('name', 'tiger');
            storage.next(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, item){
              expect(err).to.not.be.ok();
              expect(item).to.be.an(Object);
              expect(err).to.not.be.ok();
              expect(item.doc).to.have.property('name', 'monkey');
              storage.next(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, item){
                expect(err).to.not.be.ok();
                expect(item).to.be.an(Object);
                expect(err).to.not.be.ok();
                expect(item.doc).to.have.property('name', 'prawn');
                storage.next(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, item){
                  expect(err).to.not.be.ok();
                  expect(item).to.be.an(Object);
                  expect(err).to.not.be.ok();
                  expect(item.doc).to.have.property('name', 'shark');
                  storage.next(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, item){
                    expect(err).to.not.be.ok();
                    expect(item).to.be.an(Object);
                    expect(err).to.not.be.ok();
                    expect(item.doc).to.have.property('name', 'dog');
                    done();
                  });
                });
              });
            });
          });
        });
        it('prev', function(done){
          storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
            expect(err).to.not.be.ok();
            expect(err).to.not.be.ok();
            expect(item.doc).to.have.property('name', 'dog');
            storage.prev(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, item){
              expect(err).to.not.be.ok();
              expect(err).to.not.be.ok();
              expect(item.doc).to.have.property('name', 'shark');
              storage.prev(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, item){
                expect(err).to.not.be.ok();
                expect(err).to.not.be.ok();
                expect(item.doc).to.have.property('name', 'prawn');
                storage.prev(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, item){
                  expect(err).to.not.be.ok();
                  expect(err).to.not.be.ok();
                  expect(item.doc).to.have.property('name', 'monkey');
                  storage.prev(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, item){
                    expect(err).to.not.be.ok();
                    expect(err).to.not.be.ok();
                    expect(item.doc).to.have.property('name', 'tiger');
                    done();
                  });
                });
              });
            });
          });
        });
      });
      describe('delete', function(){
        var paradeId;
        beforeEach(function(done){
          storage.create(['parade'], {}, function(err, id){
            expect(err).to.not.be.ok();
            expect(id).to.be.ok();
            paradeId = id;
            storage.create(['animals'], {name:'tiger'}, function(err, id){
              expect(err).to.not.be.ok();
              expect(id).to.be.ok();
              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                expect(err).to.not.be.ok();
                storage.create(['animals'], {name:'monkey'}, function(err, id){
                  expect(err).to.not.be.ok();
                  expect(id).to.be.ok();
                  storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.create(['animals'], {name:'prawn'}, function(err, id){
                      expect(err).to.not.be.ok();
                      expect(id).to.be.ok();
                      storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                        expect(err).to.not.be.ok();
                        storage.create(['animals'], {name:'shark'}, function(err, id){
                          expect(err).to.not.be.ok();
                          expect(id).to.be.ok();
                          storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                            expect(err).to.not.be.ok();
                            storage.create(['animals'], {name:'dog'}, function(err, id){
                              expect(err).to.not.be.ok();
                              expect(id).to.be.ok();
                              storage.insertBefore(['parade', paradeId, 'animals'], null, ['animals', id], {}, function(err){
                                expect(err).to.not.be.ok();
                                done();
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
        it('delete first', function(done){
          storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
            expect(err).to.not.be.ok();
            expect(item).to.be.an(Object);
            expect(err).to.not.be.ok();
            expect(item.doc).to.have.property('name', 'tiger');
            storage.deleteItem(['parade', paradeId, 'animals'], item.keyPath, {}, function(err){
              expect(err).to.not.be.ok();
              storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
                expect(err).to.not.be.ok();
                expect(item).to.be.an(Object);
                expect(err).to.not.be.ok();
                expect(item.doc).to.have.property('name', 'monkey');
                done();
              });
            });
          });
        });
        it('delete last', function(done){
          storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
            expect(err).to.not.be.ok();
            expect(item).to.be.an(Object);
            expect(err).to.not.be.ok();
            expect(item.doc).to.have.property('name', 'dog');
            storage.deleteItem(['parade', paradeId, 'animals'], item.keyPath, {}, function(err){
              expect(err).to.not.be.ok();
              storage.last(['parade', paradeId, 'animals'], {}, function(err, item){
                expect(err).to.not.be.ok();
                expect(item).to.be.an(Object);
                expect(err).to.not.be.ok();
                expect(item.doc).to.have.property('name', 'shark');
                done();
              });
            });
          });
        });
        it('delete middle', function(done){
          storage.first(['parade', paradeId, 'animals'], {}, function(err, item){
            expect(err).to.not.be.ok();
            expect(err).to.not.be.ok();
            expect(item.doc).to.have.property('name', 'tiger');
            storage.next(['parade', paradeId, 'animals'], item.keyPath, {}, function(err, itemPrev){
              expect(err).to.not.be.ok();
              expect(err).to.not.be.ok();
              expect(itemPrev.doc).to.have.property('name', 'monkey');
              storage.next(['parade', paradeId, 'animals'], itemPrev.keyPath, {}, function(err, itemDel){
                expect(err).to.not.be.ok();
                expect(err).to.not.be.ok();
                expect(itemDel.doc).to.have.property('name', 'prawn');
                storage.next(['parade', paradeId, 'animals'], itemDel.keyPath, {}, function(err, itemNext){
                  expect(err).to.not.be.ok();
                  expect(err).to.not.be.ok();
                  expect(itemNext.doc).to.have.property('name', 'shark');
                  storage.deleteItem(['parade', paradeId, 'animals'], itemDel.keyPath, {}, function(err){
                    expect(err).to.not.be.ok();
                    storage.next(['parade', paradeId, 'animals'], itemPrev.keyPath, {}, function(err, item){
                      expect(err).to.not.be.ok();
                      expect(err).to.not.be.ok();
                      expect(item.doc).to.eql(itemNext.doc);
                      storage.prev(['parade', paradeId, 'animals'], itemNext.keyPath, {}, function(err, item){
                        expect(err).to.not.be.ok();
                        expect(err).to.not.be.ok();
                        expect(item.doc).to.eql(itemPrev.doc);
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
      // describe('pop n shift', function(){
      //   var paradeId;
      //   beforeEach(function(done){
      //     storage.create(['parade'], {}, function(err, id){
      //       expect(err).to.not.be.ok();
      //       expect(id).to.be.ok();
      //       paradeId = id;
      //       storage.create(['animals'], {name:'tiger'}, function(err, id){
      //         expect(err).to.not.be.ok();
      //         expect(id).to.be.ok();
      //         storage.push(['parade', paradeId, 'animals'], ['animals', id], {}, function(err){
      //           expect(err).to.not.be.ok();
      //           storage.create(['animals'], {name:'monkey'}, function(err, id){
      //             expect(err).to.not.be.ok();
      //             expect(id).to.be.ok();
      //             storage.push(['parade', paradeId, 'animals'], ['animals', id], {}, function(err){
      //               expect(err).to.not.be.ok();
      //               storage.create(['animals'], {name:'prawn'}, function(err, id){
      //                 expect(err).to.not.be.ok();
      //                 expect(id).to.be.ok();
      //                 storage.push(['parade', paradeId, 'animals'], ['animals', id], {}, function(err){
      //                   expect(err).to.not.be.ok();
      //                   storage.create(['animals'], {name:'shark'}, function(err, id){
      //                     expect(err).to.not.be.ok();
      //                     expect(id).to.be.ok();
      //                     storage.push(['parade', paradeId, 'animals'], ['animals', id], {}, function(err){
      //                       expect(err).to.not.be.ok();
      //                       storage.create(['animals'], {name:'dog'}, function(err, id){
      //                         expect(err).to.not.be.ok();
      //                         expect(id).to.be.ok();
      //                         storage.push(['parade', paradeId, 'animals'], ['animals', id], {}, function(err){
      //                           expect(err).to.not.be.ok();
      //                           done();
      //                         });
      //                       });
      //                     });
      //                   });
      //                 });
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      //   it('pop many', function(done){
      //     storage.pop(['parade', paradeId, 'animals'], {}, function(err, item){
      //       expect(err).to.not.be.ok();
      //       expect(item).to.be.an(Object);
      //       expect(item).to.have.property('name', 'dog');
      //       storage.pop(['parade', paradeId, 'animals'], {}, function(err, item){
      //         expect(err).to.not.be.ok();
      //         expect(item).to.be.an(Object);
      //         expect(item).to.have.property('name', 'shark');
      //         storage.pop(['parade', paradeId, 'animals'], {}, function(err, item){
      //           expect(err).to.not.be.ok();
      //           expect(item).to.be.an(Object);
      //           expect(item).to.have.property('name', 'prawn');
      //           storage.pop(['parade', paradeId, 'animals'], {}, function(err, item){
      //             expect(err).to.not.be.ok();
      //             expect(item).to.be.an(Object);
      //             expect(item).to.have.property('name', 'monkey');
      //             storage.pop(['parade', paradeId, 'animals'], {}, function(err, item){
      //               expect(err).to.not.be.ok();
      //               expect(item).to.be.an(Object);
      //               expect(item).to.have.property('name', 'tiger');
      //               storage.pop(['parade', paradeId, 'animals'], {}, function(err, item){
      //                 expect(err).to.be.ok();
      //                 done();
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      //   it('shift many', function(done){
      //     storage.shift(['parade', paradeId, 'animals'], {}, function(err, item){
      //       expect(err).to.not.be.ok();
      //       expect(item).to.be.an(Object);
      //       expect(item).to.have.property('name', 'tiger');
      //       storage.shift(['parade', paradeId, 'animals'], {}, function(err, item){
      //         expect(err).to.not.be.ok();
      //         expect(item).to.be.an(Object);
      //         expect(item).to.have.property('name', 'monkey');
      //         storage.shift(['parade', paradeId, 'animals'], {}, function(err, item){
      //           expect(err).to.not.be.ok();
      //           expect(item).to.be.an(Object);
      //           expect(item).to.have.property('name', 'prawn');
      //           storage.shift(['parade', paradeId, 'animals'], {}, function(err, item){
      //             expect(err).to.not.be.ok();
      //             expect(item).to.be.an(Object);
      //             expect(item).to.have.property('name', 'shark');
      //             storage.shift(['parade', paradeId, 'animals'], {}, function(err, item){
      //               expect(err).to.not.be.ok();
      //               expect(item).to.be.an(Object);
      //               expect(item).to.have.property('name', 'dog');
      //               storage.shift(['parade', paradeId, 'animals'], {}, function(err, item){
      //                 expect(err).to.be.ok();
      //                 done();
      //               });
      //             });
      //           });
      //         });
      //       });
      //     });
      //   });
      // });
    });
  });
};
});
