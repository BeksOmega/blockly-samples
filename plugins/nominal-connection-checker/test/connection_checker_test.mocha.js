/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Unit tests for NominalConnectionChecker.
 */

const chai = require('chai');
const Blockly = require('blockly/node');

const {pluginInfo, ConnectionCheckError} = require('../src/index.js');
const {
  clearTwoBlockTests, twoBlockTest, runTwoBlockTests,
  clearThreeBlockTests, threeBlockTest, runThreeBlockTests,
  clearSiblingTests, siblingTest, runSiblingTests,
  createBlockDefs, createMainBlockDefs,
} = require('./connection_checker_test_helper.mocha');

suite('NominalConnectionChecker', function() {
  setup(function() {
    const hierarchyDef = {
      // Random is a type disconnected from the rest of the hierarchy.
      'Random': { },
      'Animal': { },
      'FlyingAnimal': {
        'fulfills': ['Animal'],
      },
      'Mammal': {
        'fulfills': ['Animal'],
      },
      'Reptile': {
        'fulfills': ['Animal'],
      },
      'Dog': {
        'fulfills': ['Mammal'],
      },
      'Cat': {
        'fulfills': ['Mammal'],
      },
      'Bat': {
        'fulfills': ['FlyingAnimal', 'Mammal'],
      },
      'GetterList': {
        'params': [
          {
            'name': 'A',
            'variance': 'co',
          },
        ],
      },
      'AdderList': {
        'params': [
          {
            'name': 'A',
            'variance': 'contra',
          },
        ],
      },
      'List': {
        'fulfills': ['GetterList[A]', 'AdderList[A]'],
        'params': [
          {
            'name': 'A',
            'variance': 'inv',
          },
        ],
      },
      'Dict': {
        'params': [
          {
            'name': 'K',
            'variance': 'inv',
          },
          {
            'name': 'V',
            'variance': 'inv',
          },
        ],
      },
    };

    const blockTypes = [
      'random',
      'animal',
      'flyinganimal',
      'mammal',
      'reptile',
      'dog',
      'cat',
      'bat',
      't',
      'getterlist[animal]',
      'getterlist[mammal]',
      'getterlist[flyinganimal]',
      'getterlist[dog]',
      'getterlist[bat]',
      'getterlist[t]',
      'adderlist[animal]',
      'adderlist[mammal]',
      'adderlist[flyinganimal]',
      'adderlist[dog]',
      'adderlist[bat]',
      'adderlist[t]',
      'list[animal]',
      'list[mammal]',
      'list[flyinganimal]',
      'list[dog]',
      'list[bat]',
      'list[t]',
      'list[g]',
      'dict[dog, dog]',
      'dict[k, dog]',
      'dict[dog, v]',
      'dict[k, v]',
    ];
    this.blocks = createBlockDefs(blockTypes);
    Blockly.defineBlocksWithJsonArray(this.blocks);

    const options = {
      plugins: {
        ...pluginInfo,
      },
    };

    this.workspace = new Blockly.Workspace(options);
    this.workspace.connectionChecker.init(hierarchyDef);
    this.checker = this.workspace.connectionChecker;

    this.bindConnection = function(conn, binding, generic = 'T') {
      this.checker.bindType(conn.getSourceBlock(), generic, binding);
    };
    this.bindType = function(block, binding, generic = 'T') {
      this.checker.bindType(block, generic, binding);
    };
    this.unbindConnection = function(conn, generic = 'T') {
      this.checker.unbindType(conn.getSourceBlock(), generic);
    };
  });

  teardown(function() {
    for (const block of this.blocks) {
      delete Blockly.Blocks[block.type];
    }
  });

  suite('doTypeChecks', function() {
    setup(function() {
      this.assertCanConnect = function(conn1, conn2) {
        chai.assert.isTrue(this.checker.doTypeChecks(conn1, conn2),
            'Expected to be able to connect ' + conn2.name + ' to ' +
            conn1.name);
      };
      this.assertCannotConnect = function(conn1, conn2) {
        chai.assert.isFalse(this.checker.doTypeChecks(conn1, conn2),
            'Expected to be unable to connect ' + conn2.name + ' to ' +
             conn1.name);
      };
    });

    suite('Bad types', function() {
      setup(function() {
        this.badBlocks = createBlockDefs(
            ['  dog  ', 'typeA', 'list', 'list[dog, dog]']);
        Blockly.defineBlocksWithJsonArray(this.badBlocks);

        this.assertThrows = (conn1, conn2) => {
          chai.assert.throws(() => {
            this.checker.doTypeChecks(conn1, conn2);
          }, ConnectionCheckError);
        };
      });

      teardown(function() {
        for (const block of this.badBlocks) {
          delete Blockly.Blocks[block.type];
        }
      });

      clearTwoBlockTests();

      twoBlockTest('Padding', function() {
        const dogIn = this.getOuterInput('dog');
        const paddingOut = this.getOuterInput('  dog  ');
        this.assertThrows(dogIn, paddingOut);
      });

      twoBlockTest('Type not defined', function() {
        const aIn = this.getOuterInput('typeA');
        const aOut = this.getInnerOutput('typeA');
        this.assertThrows(aIn, aOut);
      });

      twoBlockTest('Missing params', function() {
        const listIn = this.getOuterInput('list');
        const listOut = this.getInnerOutput('list');
        this.assertThrows(listIn, listOut);
      });

      twoBlockTest('Extra params', function() {
        const listIn = this.getOuterInput('list[dog, dog]');
        const listOut = this.getInnerOutput('list[dog, dog]');
        this.assertThrows(listIn, listOut);
      });

      runTwoBlockTests();
    });

    suite('Simple subtyping', function() {
      clearTwoBlockTests();

      twoBlockTest('Exact types', function() {
        const dogIn = this.getOuterInput('dog');
        const dogOut = this.getInnerOutput('dog');
        this.assertCanConnect(dogIn, dogOut);
      });

      twoBlockTest('Simple super', function() {
        const mammalIn = this.getOuterInput('mammal');
        const dogOut = this.getInnerOutput('dog');
        this.assertCanConnect(mammalIn, dogOut);
      });

      twoBlockTest('Multiple supers', function() {
        const mammalIn = this.getOuterInput('mammal');
        const flyingAnimalIn = this.getOuterInput('flyinganimal');
        const batOut = this.getInnerOutput('bat');
        this.assertCanConnect(mammalIn, batOut);
        this.assertCanConnect(flyingAnimalIn, batOut);
      });

      twoBlockTest('Deep supers', function() {
        const animalIn = this.getOuterInput('animal');
        const dogOut = this.getInnerOutput('dog');
        this.assertCanConnect(animalIn, dogOut);
      });

      twoBlockTest('Unrelated types', function() {
        const dogIn = this.getOuterInput('dog');
        const batOut = this.getInnerOutput('bat');
        this.assertCannotConnect(dogIn, batOut);
      });

      twoBlockTest('Backwards types', function() {
        const dogIn = this.getOuterInput('dog');
        const mammalOut = this.getInnerOutput('mammal');
        this.assertCannotConnect(dogIn, mammalOut);
      });

      runTwoBlockTests();

      clearSiblingTests();

      siblingTest('Exact types multiple inputs', function() {
        const dog = this.getMain('dog');
        const dogOut = this.getInnerOutput('dog');

        this.assertCanConnect(dog.in1, dogOut);
      });

      siblingTest('Sibling types multiple inputs', function() {
        const dog = this.getMain('dog');
        const catOut = this.getInnerOutput('cat');

        this.assertCannotConnect(dog.in1, catOut);
      });

      runSiblingTests();
    });

    suite('Simple generics', function() {
      // Both explicit is the other suite.

      clearTwoBlockTests();

      twoBlockTest('Outer explicit, inner unbound', function() {
        const dogIn = this.getOuterInput('dog');
        const tOut = this.getInnerOutput('t');
        this.assertCanConnect(dogIn, tOut);
      });

      twoBlockTest('Outer explicit, inner bound sub', function() {
        const mammalIn = this.getOuterInput('mammal');
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tOut, 'dog');
        this.assertCanConnect(mammalIn, tOut);
      });

      twoBlockTest('Outer explicit, inner bound super', function() {
        const dogIn = this.getOuterInput('dog');
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tOut, 'mammal');
        this.assertCannotConnect(dogIn, tOut);
      });

      twoBlockTest('Outer explicit, inner bound different case', function() {
        const dogIn = this.getOuterInput('dog');
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tOut, 'DOG');
        this.assertCanConnect(dogIn, tOut);
      });

      twoBlockTest('Outer unbound, inner explicit', function() {
        const tIn = this.getOuterInput('t');
        const dogOut = this.getInnerOutput('dog');
        this.assertCanConnect(tIn, dogOut);
      });

      twoBlockTest('Outer unbound, inner unbound', function() {
        const tIn = this.getOuterInput('t');
        const tOut = this.getInnerOutput('t');
        this.assertCanConnect(tIn, tOut);
      });

      twoBlockTest('Outer unbound, inner bound', function() {
        const tIn = this.getOuterInput('t');
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tOut, 'dog');
        this.assertCanConnect(tIn, tOut);
      });

      twoBlockTest('Outer bound, child explicit sub', function() {
        const tIn = this.getOuterInput('t');
        const dogOut = this.getInnerOutput('dog');
        this.bindConnection(tIn, 'mammal');
        this.assertCanConnect(tIn, dogOut);
      });

      twoBlockTest('Outer bound, child explicit super', function() {
        const tIn = this.getOuterInput('t');
        const dogOut = this.getInnerOutput('mammal');
        this.bindConnection(tIn, 'dog');
        this.assertCannotConnect(tIn, dogOut);
      });

      twoBlockTest('Outer bound, child unbound', function() {
        const tIn = this.getOuterInput('t');
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tIn, 'dog');
        this.assertCanConnect(tIn, tOut);
      });

      twoBlockTest('Outer bound, child bound sub', function() {
        const tIn = this.getOuterInput('t');
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tIn, 'mammal');
        this.bindConnection(tIn, 'dog');
        this.assertCanConnect(tIn, tOut);
      });

      twoBlockTest('Outer bound, child bound super', function() {
        const tIn = this.getOuterInput('t');
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tIn, 'dog');
        this.bindConnection(tIn, 'mammal');
        this.assertCanConnect(tIn, tOut);
      });

      twoBlockTest('Outer bound different case, inner explicit', function() {
        const tIn = this.getOuterInput('t');
        const dogOut = this.getInnerOutput('dog');
        this.bindConnection(tIn, 'DOG');
        this.assertCanConnect(tIn, dogOut);
      });

      runTwoBlockTests();
    });

    suite('Sibling compatibility with generics', function() {
      setup(function() {
        const hierarchy = {
          'typeA': {},
          'typeB': {},
          'typeC': {
            'fulfills': ['typeB', 'typeA'],
          },
          'typeD': {
            'fulfills': ['typeB', 'typeA'],
          },
          'typeE': {},
          'GetterList': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'AdderList': {
            'params': [
              {
                'name': 'A',
                'variance': 'contra',
              },
            ],
          },
          'List': {
            'fulfills': ['GetterList[A]', 'AdderList[A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'inv',
              },
            ],
          },
        };

        const types = [
          'typeA', 'typeB', 'typeC', 'typeD', 'typeE',
          'getterlist[typeA]', 'getterlist[typeB]',
          'getterlist[typeC]', 'getterlist[typeD]',
          'adderlist[typeA]', 'adderlist[typeB]',
          'adderlist[typeC]', 'adderlist[typeD]',
          'list[typeA]', 'list[typeB]',
          'list[typeC]', 'list[typeD]', 'list[typeE]',
        ];
        this.multiTypeBlocks = createBlockDefs(types);
        Blockly.defineBlocksWithJsonArray(this.multiTypeBlocks);

        this.checker.init(hierarchy);
      });

      teardown(function() {
        for (const block of this.multiTypeBlocks) {
          delete Blockly.Blocks[block.type];
        }
      });

      suite('No output', function() {
        suite('Value inputs', function() {
          setup(function() {
            Blockly.defineBlocksWithJsonArray([
              {
                'type': 'static_t_no_outputs_values',
                'message0': '%1 %2 %3',
                'args0': [
                  {
                    'type': 'input_value',
                    'name': 'INPUT1',
                    'check': ['t'],
                  },
                  {
                    'type': 'input_value',
                    'name': 'INPUT2',
                    'check': ['t'],
                  },
                  {
                    'type': 'input_value',
                    'name': 'INPUT3',
                    'check': ['t'],
                  },
                ],
                'mutator': 'bind_type_mutator',
              },
            ]);
          });

          teardown(function() {
            delete Blockly.Blocks['static_t_no_outputs_values'];
          });

          test('Unrelated types', function() {
            const tMain = this.workspace.newBlock(
                'static_t_no_outputs_values');
            const typeAOut = this.workspace.newBlock(
                'static_typeA_inner_out');
            const typeEOut = this.workspace.newBlock(
                'static_typeE_inner_out');

            tMain.getInput('INPUT1').connection
                .connect(typeAOut.outputConnection);
            this.assertCanConnect(
                tMain.getInput('INPUT2').connection, typeEOut.outputConnection);
          });
        });

        suite('Statement inputs', function() {
          setup(function() {
            Blockly.defineBlocksWithJsonArray([
              {
                'type': 'static_t_no_outputs_statements',
                'message0': '%1 %2 %3',
                'args0': [
                  {
                    'type': 'input_statement',
                    'name': 'INPUT1',
                    'check': ['t'],
                  },
                  {
                    'type': 'input_statement',
                    'name': 'INPUT2',
                    'check': ['t'],
                  },
                  {
                    'type': 'input_statement',
                    'name': 'INPUT3',
                    'check': ['t'],
                  },
                ],
                'mutator': 'bind_type_mutator',
              },
            ]);
          });

          teardown(function() {
            delete Blockly.Blocks['static_t_no_outputs_statements'];
          });

          test('Unrelated types', function() {
            const tMain = this.workspace.newBlock(
                'static_t_no_outputs_statements');
            const typeAOut = this.workspace.newBlock(
                'static_typeA_inner_prev');
            const typeEOut = this.workspace.newBlock(
                'static_typeE_inner_prev');

            tMain.getInput('INPUT1').connection
                .connect(typeAOut.previousConnection);
            this.assertCanConnect(
                tMain.getInput('INPUT2').connection,
                typeEOut.previousConnection);
          });
        });
      });

      suite('No outer block', function() {
        clearSiblingTests();

        siblingTest('Compatible, Single block', function() {
          const t = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          t.in1.connect(typeCOut);

          this.assertCanConnect(t.in2, typeDOut);
        });

        siblingTest('Compatible, Nested blocks, Generics first', function() {
          const t1 = this.getMain('t');
          const t2 = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          t1.in1.connect(t2.out);
          t1.in2.connect(typeCOut);

          this.assertCanConnect(t2.in1, typeDOut);
        });

        siblingTest('Compatible, Nested blocks, Explicits first', function() {
          const t1 = this.getMain('t');
          const t2 = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          t1.in2.connect(typeCOut);
          t2.in1.connect(typeDOut);

          this.assertCanConnect(t1.in1, t2.out);
        });

        siblingTest('Compatible, Extremely nested, Generics first', function() {
          const tStart = this.getMain('t');
          const tEnd = this.getMain('t');
          let tPrev = tStart;
          for (let i = 0; i < 5; i++) {
            const t = this.getMain('t');
            tPrev.in1.connect(t.out);
            tPrev = t;
          }
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          tPrev.in1.connect(tEnd.out);
          tStart.in2.connect(typeCOut);

          this.assertCanConnect(tEnd.in1, typeDOut);
        });

        siblingTest('Compatible, Extremely nested, Explicits first',
            function() {
              const tStart = this.getMain('t');
              const tEnd = this.getMain('t');
              let tPrev = tStart;
              for (let i = 0; i < 5; i++) {
                const t = this.getMain('t');
                tPrev.in1.connect(t.out);
                tPrev = t;
              }
              const typeCOut = this.getInnerOutput('typeC');
              const typeDOut = this.getInnerOutput('typeD');

              tStart.in2.connect(typeCOut);
              tEnd.in1.connect(typeDOut);

              this.assertCanConnect(tPrev.in1, tEnd.out);
            });

        siblingTest('Half of nearest common compatible', function() {
          const t = this.getMain('t');
          const t2 = this.getMain('t');
          const typeAOut = this.getInnerOutput('typeA');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          t.in1.connect(typeAOut);
          t2.in1.connect(typeCOut);
          t2.in2.connect(typeDOut);

          this.assertCanConnect(t.in2, t2.out);
        });

        siblingTest('Incompatible, Single block', function() {
          const t = this.getMain('t');
          const typeAOut = this.getInnerOutput('typeA');
          const typeBOut = this.getInnerOutput('typeB');

          t.in1.connect(typeAOut);

          this.assertCannotConnect(t.in2, typeBOut);
        });

        siblingTest('Incompatible, Nested blocks, Generics first', function() {
          const t1 = this.getMain('t');
          const t2 = this.getMain('t');
          const typeAOut = this.getInnerOutput('typeA');
          const typeBOut = this.getInnerOutput('typeB');

          t1.in1.connect(t2.out);
          t1.in2.connect(typeAOut);

          this.assertCannotConnect(t2.in1, typeBOut);
        });

        siblingTest('Incompatible, Nested blocks, Explicits first', function() {
          const t1 = this.getMain('t');
          const t2 = this.getMain('t');
          const typeAOut = this.getInnerOutput('typeA');
          const typeBOut = this.getInnerOutput('typeB');

          t1.in2.connect(typeAOut);
          t2.in1.connect(typeBOut);

          this.assertCannotConnect(t1.in1, t2.out);
        });

        siblingTest('Incompatible, Extremely nested, Generics first',
            function() {
              const tStart = this.getMain('t');
              const tEnd = this.getMain('t');
              let tPrev = tStart;
              for (let i = 0; i < 5; i++) {
                const t = this.getMain('t');
                tPrev.in1.connect(t.out);
                tPrev = t;
              }
              const typeAOut = this.getInnerOutput('typeA');
              const typeBOut = this.getInnerOutput('typeB');

              tPrev.in1.connect(tEnd.out);
              tStart.in2.connect(typeAOut);

              this.assertCannotConnect(tEnd.in1, typeBOut);
            });

        siblingTest('Incompatible, Extremely nested, Explicits first',
            function() {
              const tStart = this.getMain('t');
              const tEnd = this.getMain('t');
              let tPrev = tStart;
              for (let i = 0; i < 5; i++) {
                const t = this.getMain('t');
                tPrev.in1.connect(t.out);
                tPrev = t;
              }
              const typeAOut = this.getInnerOutput('typeA');
              const typeBOut = this.getInnerOutput('typeB');

              tStart.in2.connect(typeAOut);
              tEnd.in1.connect(typeBOut);

              this.assertCannotConnect(tPrev.in1, tEnd.out);
            });

        runSiblingTests();
      });

      suite('Outer block unbound generic', function() {
        clearSiblingTests();

        siblingTest('Compatible, Single block', function() {
          const tIn = this.getOuterInput('t');
          const t = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          tIn.connect(t.out);
          t.in1.connect(typeCOut);

          this.assertCanConnect(t.in2, typeDOut);
        });

        siblingTest('Compatible, Nested blocks, Generics first', function() {
          const tIn = this.getOuterInput('t');
          const t1 = this.getMain('t');
          const t2 = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          tIn.connect(t1.out);
          t1.in1.connect(t2.out);
          t1.in2.connect(typeCOut);

          this.assertCanConnect(t2.in1, typeDOut);
        });

        siblingTest('Compatible, Nested blocks, Explicits first', function() {
          const tIn = this.getOuterInput('t');
          const t1 = this.getMain('t');
          const t2 = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          tIn.connect(t1.out);
          t1.in2.connect(typeCOut);
          t2.in1.connect(typeDOut);

          this.assertCanConnect(t1.in1, t2.out);
        });

        siblingTest('Compatible, Extremely nested, Generics first', function() {
          const tIn = this.getOuterInput('t');
          const tStart = this.getMain('t');
          const tEnd = this.getMain('t');
          let tPrev = tStart;
          for (let i = 0; i < 5; i++) {
            const t = this.getMain('t');
            tPrev.in1.connect(t.out);
            tPrev = t;
          }
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          tIn.connect(tStart.out);
          tPrev.in1.connect(tEnd.out);
          tStart.in2.connect(typeCOut);

          this.assertCanConnect(tEnd.in1, typeDOut);
        });

        siblingTest('Compatible, Extremely nested, Explicits first',
            function() {
              const tIn = this.getOuterInput('t');
              const tStart = this.getMain('t');
              const tEnd = this.getMain('t');
              let tPrev = tStart;
              for (let i = 0; i < 5; i++) {
                const t = this.getMain('t');
                tPrev.in1.connect(t.out);
                tPrev = t;
              }
              const typeCOut = this.getInnerOutput('typeC');
              const typeDOut = this.getInnerOutput('typeD');

              tIn.connect(tStart.out);
              tStart.in2.connect(typeCOut);
              tEnd.in1.connect(typeDOut);

              this.assertCanConnect(tPrev.in1, tEnd.out);
            });

        siblingTest('Half of nearest common compatible', function() {
          const tIn = this.getOuterInput('t');
          const t = this.getMain('t');
          const t2 = this.getMain('t');
          const typeAOut = this.getInnerOutput('typeA');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          tIn.connect(t.out);
          t.in1.connect(typeAOut);
          t2.in1.connect(typeCOut);
          t2.in2.connect(typeDOut);

          console.log('asserting');
          this.assertCanConnect(t.in2, t2.out);
        });

        siblingTest('Incompatible, Single block', function() {
          const tIn = this.getOuterInput('t');
          const t = this.getMain('t');
          const typeAOut = this.getInnerOutput('typeA');
          const typeBOut = this.getInnerOutput('typeB');

          tIn.connect(t.out);
          t.in1.connect(typeAOut);

          this.assertCannotConnect(t.in2, typeBOut);
        });

        siblingTest('Incompatible, Nested blocks, Generics first', function() {
          const tIn = this.getOuterInput('t');
          const t1 = this.getMain('t');
          const t2 = this.getMain('t');
          const typeAOut = this.getInnerOutput('typeA');
          const typeBOut = this.getInnerOutput('typeB');

          tIn.connect(t1.out);
          t1.in1.connect(t2.out);
          t1.in2.connect(typeAOut);

          this.assertCannotConnect(t2.in1, typeBOut);
        });

        siblingTest('Incompatible, Nested blocks, Explicits first', function() {
          const tIn = this.getOuterInput('t');
          const t1 = this.getMain('t');
          const t2 = this.getMain('t');
          const typeAOut = this.getInnerOutput('typeA');
          const typeBOut = this.getInnerOutput('typeB');

          tIn.connect(t1.out);
          t1.in2.connect(typeAOut);
          t2.in1.connect(typeBOut);

          this.assertCannotConnect(t1.in1, t2.out);
        });

        siblingTest('Incompatible, Extremely nested, Generics first',
            function() {
              const tIn = this.getOuterInput('t');
              const tStart = this.getMain('t');
              const tEnd = this.getMain('t');
              let tPrev = tStart;
              for (let i = 0; i < 5; i++) {
                const t = this.getMain('t');
                tPrev.in1.connect(t.out);
                tPrev = t;
              }
              const typeAOut = this.getInnerOutput('typeA');
              const typeBOut = this.getInnerOutput('typeB');

              tIn.connect(tStart.out);
              tPrev.in1.connect(tEnd.out);
              tStart.in2.connect(typeAOut);

              this.assertCannotConnect(tEnd.in1, typeBOut);
            });

        siblingTest('Incompatible, Extremely nested, Explicits first',
            function() {
              const tIn = this.getOuterInput('t');
              const tStart = this.getMain('t');
              const tEnd = this.getMain('t');
              let tPrev = tStart;
              for (let i = 0; i < 5; i++) {
                const t = this.getMain('t');
                tPrev.in1.connect(t.out);
                tPrev = t;
              }
              const typeAOut = this.getInnerOutput('typeA');
              const typeBOut = this.getInnerOutput('typeB');

              tIn.connect(tStart.out);
              tStart.in2.connect(typeAOut);
              tEnd.in1.connect(typeBOut);

              this.assertCannotConnect(tPrev.in1, tEnd.out);
            });

        runSiblingTests();
      });

      suite('Output/binding forcing incompatibility', function() {
        clearSiblingTests();

        siblingTest('Outer bound', function() {
          const tIn = this.getOuterInput('t');
          const t = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          this.bindConnection(tIn, 'typeC');
          tIn.connect(t.out);
          t.in1.connect(typeCOut);

          this.assertCannotConnect(t.in2, typeDOut);
        });

        siblingTest('Outer explicit', function() {
          const typeCIn = this.getOuterInput('typeC');
          const t = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          typeCIn.connect(t.out);
          t.in1.connect(typeCOut);

          this.assertCannotConnect(t.in2, typeDOut);
        });

        siblingTest('Main bound', function() {
          const t = this.getMain('t');
          const typeCOut = this.getInnerOutput('typeC');
          const typeDOut = this.getInnerOutput('typeD');

          this.bindConnection(t.out, 'typeC');
          t.in1.connect(typeCOut);

          this.assertCannotConnect(t.in2, typeDOut);
        });

        runSiblingTests();
      });

      suite('Params', function() {
        suite('Covariant', function() {
          clearSiblingTests();

          siblingTest('Compatible', function() {
            const t = this.getMain('t');
            const getterListTypeCOut = this.getInnerOutput('getterlist[typeC]');
            const getterListTypeDOut = this.getInnerOutput('getterlist[typeD]');

            t.in1.connect(getterListTypeCOut);

            this.assertCanConnect(t.in2, getterListTypeDOut);
          });

          siblingTest('Incompatible', function() {
            const t = this.getMain('t');
            const getterListTypeAOut = this.getInnerOutput('getterlist[typeA]');
            const getterListTypeBOut = this.getInnerOutput('getterlist[typeB]');

            t.in1.connect(getterListTypeAOut);

            this.assertCannotConnect(t.in2, getterListTypeBOut);
          });

          runSiblingTests();
        });

        suite('Contravariant', function() {
          clearSiblingTests();

          siblingTest('Compatible', function() {
            const t = this.getMain('t');
            const adderListTypeAOut = this.getInnerOutput('adderlist[typeA]');
            const adderListTypeBOut = this.getInnerOutput('adderlist[typeB]');

            t.in1.connect(adderListTypeAOut);

            this.assertCanConnect(t.in2, adderListTypeBOut);
          });

          siblingTest('Incompatible', function() {
            const t = this.getMain('t');
            const adderListTypeCOut = this.getInnerOutput('adderlist[typeC]');
            const adderListTypeDOut = this.getInnerOutput('adderlist[typeD]');

            t.in1.connect(adderListTypeCOut);

            this.assertCannotConnect(t.in2, adderListTypeDOut);
          });

          runSiblingTests();
        });

        suite('Invariant', function() {
          clearSiblingTests();

          siblingTest('Compatible, same', function() {
            const t = this.getMain('t');
            const listTypeAOut = this.getInnerOutput('list[typeA]');
            const listTypeBOut = this.getInnerOutput('list[typeB]');

            t.in1.connect(listTypeAOut);

            this.assertCanConnect(t.in2, listTypeBOut);
          });

          siblingTest('Compatible, covariant', function() {
            const t = this.getMain('t');
            const listTypeCOut = this.getInnerOutput('list[typeC]');
            const listTypeDOut = this.getInnerOutput('list[typeD]');

            t.in1.connect(listTypeCOut);

            this.assertCanConnect(t.in2, listTypeDOut);
          });

          siblingTest('Compatible, contravariant', function() {
            const t = this.getMain('t');
            const listTypeAOut = this.getInnerOutput('list[typeA]');
            const listTypeBOut = this.getInnerOutput('list[typeB]');

            t.in1.connect(listTypeAOut);

            this.assertCanConnect(t.in2, listTypeBOut);
          });

          siblingTest('Incompatible', function() {
            const t = this.getMain('t');
            const listTypeAOut = this.getInnerOutput('list[typeA]');
            const listTypeEOut = this.getInnerOutput('list[typeE]');

            t.in1.connect(listTypeAOut);

            this.assertCannotConnect(t.in2, listTypeEOut);
          });

          runSiblingTests();
        });

        suite('Covariant and invariant', function() {
          clearSiblingTests();

          siblingTest('Compatible', function() {
            const t = this.getMain('t');
            const getterListTypeCOut = this.getInnerOutput('getterlist[typeC]');
            const listTypeDOut = this.getInnerOutput('list[typeD]');

            t.in1.connect(getterListTypeCOut);

            this.assertCanConnect(t.in2, listTypeDOut);
          });

          siblingTest('Incompatible', function() {
            const t = this.getMain('t');
            const getterListTypeAOut = this.getInnerOutput('getterlist[typeA]');
            const listTypeBOut = this.getInnerOutput('list[typeB]');

            t.in1.connect(getterListTypeAOut);

            this.assertCannotConnect(t.in2, listTypeBOut);
          });

          runSiblingTests();
        });

        suite('Contravariant and invariant', function() {
          clearSiblingTests();

          siblingTest('Compatible', function() {
            const t = this.getMain('t');
            const adderListTypeAOut = this.getInnerOutput('adderlist[typeA]');
            const listTypeBOut = this.getInnerOutput('list[typeB]');

            t.in1.connect(adderListTypeAOut);

            this.assertCanConnect(t.in2, listTypeBOut);
          });

          siblingTest('Incompatible', function() {
            const t = this.getMain('t');
            const adderListTypeCOut = this.getInnerOutput('adderlist[typeC]');
            const listTypeDOut = this.getInnerOutput('list[typeD]');

            t.in1.connect(adderListTypeCOut);

            this.assertCannotConnect(t.in2, listTypeDOut);
          });

          runSiblingTests();
        });

        suite('Covariant and contravariant', function() {
          clearSiblingTests();

          siblingTest('Incompatible', function() {
            const t = this.getMain('t');
            const adderListTypeAOut = this.getInnerOutput('adderlist[typeA]');
            const getterListTypeAOut = this.getInnerOutput('getterlist[typeA]');

            t.in1.connect(adderListTypeAOut);

            this.assertCannotConnect(t.in2, getterListTypeAOut);
          });

          runSiblingTests();
        });
      });
    });

    suite('Sibling compatibility with generic params', function() {
      setup(function() {
        const hierarchy = {
          'typeA': {},
          'typeB': {},
          'typeC': {
            'fulfills': ['typeB', 'typeA'],
          },
          'typeD': {
            'fulfills': ['typeB', 'typeA'],
          },
          'typeE': {},
          'GetterList': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'AdderList': {
            'params': [
              {
                'name': 'A',
                'variance': 'contra',
              },
            ],
          },
          'List': {
            'fulfills': ['GetterList[A]', 'AdderList[A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'inv',
              },
            ],
          },
          'Dict': {
            'params': [
              {
                'name': 'K',
                'variance': 'inv',
              },
              {
                'name': 'V',
                'variance': 'inv',
              },
            ],
          },
        };

        // List blocks are already defined.
        const types = [
          'typeA', 'typeB', 'typeC', 'typeD', 'typeE',
          'dict[t, t]', 'dict[typeC, typeC]', 'dict[typeC, typeD]',
          'dict[typeC, typeE]',
        ];
        this.multiTypeBlocks = createBlockDefs(types);
        this.multiTypeBlocks.push(
            ...createMainBlockDefs('typetogetterlist', 'getterlist[t]', 't'));
        this.multiTypeBlocks.push(
            ...createMainBlockDefs('typetoadderlist', 'adderlist[t]', 't'));
        this.multiTypeBlocks.push(
            ...createMainBlockDefs('typetolist', 'list[t]', 't'));
        this.multiTypeBlocks.push(
            ...createMainBlockDefs('dicttotype', 't', 'dict[t, t]'));
        this.multiTypeBlocks.push(
            ...createMainBlockDefs('typestodict', 'dict[k, v]', 'k', 'v'));
        Blockly.defineBlocksWithJsonArray(this.multiTypeBlocks);

        this.checker.init(hierarchy);
      });

      teardown(function() {
        for (const block of this.multiTypeBlocks) {
          delete Blockly.Blocks[block.type];
        }
      });

      suite('Covariant', function() {
        suite('Types in typetogetterlist', function() {
          clearSiblingTests();

          siblingTest('Compatible', function() {
            const getter = this.getMain('typetogetterlist');
            const typeCOut = this.getInnerOutput('typeC');
            const typeDOut = this.getInnerOutput('typeD');

            getter.in1.connect(typeCOut);
            this.assertCanConnect(getter.in2, typeDOut);
          });

          siblingTest('Incompatible', function() {
            const getter = this.getMain('typetogetterlist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeBOut = this.getInnerOutput('typeB');

            getter.in1.connect(typeAOut);
            this.assertCannotConnect(getter.in2, typeBOut);
          });

          runSiblingTests();
        });

        suite('Getterlists', function() {
          clearSiblingTests();

          siblingTest('Compatible, generics first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetogetterlist');
            const getter2 = this.getMain('typetogetterlist');
            const typeCOut = this.getInnerOutput('typeC');
            const typeDOut = this.getInnerOutput('typeD');

            t.in1.connect(getter1.out);
            t.in2.connect(getter2.out);

            getter1.in1.connect(typeCOut);
            this.assertCanConnect(getter2.in1, typeDOut);
          });

          siblingTest('Compatible, explicits first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetogetterlist');
            const getter2 = this.getMain('typetogetterlist');
            const typeCOut = this.getInnerOutput('typeC');
            const typeDOut = this.getInnerOutput('typeD');

            getter1.in1.connect(typeCOut);
            getter2.in1.connect(typeDOut);

            t.in1.connect(getter1.out);
            this.assertCanConnect(t.in2, getter2.out);
          });

          siblingTest('Incompatible, generics first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetogetterlist');
            const getter2 = this.getMain('typetogetterlist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeBOut = this.getInnerOutput('typeB');

            t.in1.connect(getter1.out);
            t.in2.connect(getter2.out);

            getter1.in1.connect(typeAOut);
            this.assertCannotConnect(getter2.in1, typeBOut);
          });

          siblingTest('Incompatible, explicits first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetogetterlist');
            const getter2 = this.getMain('typetogetterlist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeBOut = this.getInnerOutput('typeB');

            getter1.in1.connect(typeAOut);
            getter2.in1.connect(typeBOut);

            t.in1.connect(getter1.out);
            this.assertCannotConnect(t.in2, getter2.out);
          });

          runSiblingTests();
        });

        runSiblingTests();
      });

      suite('Contravariant', function() {
        suite('Types in typetoadderlist', function() {
          clearSiblingTests();

          siblingTest('Compatible', function() {
            const getter = this.getMain('typetoadderlist');
            const typeCOut = this.getInnerOutput('typeC');
            const typeDOut = this.getInnerOutput('typeD');

            // Yes they are supposed to unify in this direction even though it
            // is contravariant! We don't make assumptions.
            getter.in1.connect(typeCOut);
            this.assertCanConnect(getter.in2, typeDOut);
          });

          siblingTest('Incompatible', function() {
            const getter = this.getMain('typetoadderlist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeBOut = this.getInnerOutput('typeB');

            // Yes they are not allowed to unify in this direction even though
            // it is contravariant! We don't make assumptions
            getter.in1.connect(typeAOut);
            this.assertCannotConnect(getter.in2, typeBOut);
          });

          runSiblingTests();
        });

        suite('Adderlists', function() {
          clearSiblingTests();

          siblingTest('Compatible, generics first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetoadderlist');
            const getter2 = this.getMain('typetoadderlist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeBOut = this.getInnerOutput('typeB');

            t.in1.connect(getter1.out);
            t.in2.connect(getter2.out);

            getter1.in1.connect(typeAOut);
            this.assertCanConnect(getter2.in1, typeBOut);
          });

          siblingTest('Compatible, explicits first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetoadderlist');
            const getter2 = this.getMain('typetoadderlist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeBOut = this.getInnerOutput('typeB');

            getter1.in1.connect(typeAOut);
            getter2.in1.connect(typeBOut);

            t.in1.connect(getter1.out);
            this.assertCanConnect(t.in2, getter2.out);
          });

          siblingTest('Incompatible, generics first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetoadderlist');
            const getter2 = this.getMain('typetoadderlist');
            const typeCOut = this.getInnerOutput('typeC');
            const typeDOut = this.getInnerOutput('typeD');

            t.in1.connect(getter1.out);
            t.in2.connect(getter2.out);

            getter1.in1.connect(typeCOut);
            this.assertCannotConnect(getter2.in1, typeDOut);
          });

          siblingTest('Incompatible, explicits first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetoadderlist');
            const getter2 = this.getMain('typetoadderlist');
            const typeCOut = this.getInnerOutput('typeC');
            const typeDOut = this.getInnerOutput('typeD');

            getter1.in1.connect(typeCOut);
            getter2.in1.connect(typeDOut);

            t.in1.connect(getter1.out);
            this.assertCannotConnect(t.in2, getter2.out);
          });

          runSiblingTests();
        });
      });

      suite('Invariant', function() {
        suite('Types in typetolist', function() {
          clearSiblingTests();

          siblingTest('Compatible', function() {
            const getter = this.getMain('typetolist');
            const typeCOut = this.getInnerOutput('typeC');
            const typeDOut = this.getInnerOutput('typeD');

            // Yes they are supposed to unify in this direction even though it
            // is invariant! We don't make assumptions.
            getter.in1.connect(typeCOut);
            this.assertCanConnect(getter.in2, typeDOut);
          });

          siblingTest('Incompatible', function() {
            const getter = this.getMain('typetolist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeBOut = this.getInnerOutput('typeB');

            // Yes we still have this behavior even though it is invariant!
            // We don't make assumptions
            getter.in1.connect(typeAOut);
            this.assertCannotConnect(getter.in2, typeBOut);
          });

          runSiblingTests();
        });

        suite('Lists', function() {
          clearSiblingTests();

          siblingTest('Compatible, same, generics first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetolist');
            const getter2 = this.getMain('typetolist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeAOut2 = this.getInnerOutput('typeA');

            t.in1.connect(getter1.out);
            t.in2.connect(getter2.out);

            getter1.in1.connect(typeAOut);
            this.assertCanConnect(getter2.in1, typeAOut2);
          });

          siblingTest('Compatible, same, explicits first', function() {
            const t = this.getMain('t');
            const getter1 = this.getMain('typetolist');
            const getter2 = this.getMain('typetolist');
            const typeAOut = this.getInnerOutput('typeA');
            const typeAOut2 = this.getInnerOutput('typeA');

            getter1.in1.connect(typeAOut);
            getter2.in1.connect(typeAOut2);

            t.in1.connect(getter1.out);
            this.assertCanConnect(t.in2, getter2.out);
          });

          siblingTest('Compatible, covariant, generics first',
              function() {
                const t = this.getMain('t');
                const getter1 = this.getMain('typetolist');
                const getter2 = this.getMain('typetolist');
                const typeCOut = this.getInnerOutput('typeC');
                const typeDOut = this.getInnerOutput('typeD');

                t.in1.connect(getter1.out);
                t.in2.connect(getter2.out);

                getter1.in1.connect(typeCOut);
                this.assertCanConnect(getter2.in1, typeDOut);
              });

          siblingTest('Compatible, covariant, explicits first',
              function() {
                const t = this.getMain('t');
                const getter1 = this.getMain('typetolist');
                const getter2 = this.getMain('typetolist');
                const typeCOut = this.getInnerOutput('typeC');
                const typeDOut = this.getInnerOutput('typeD');

                getter1.in1.connect(typeCOut);
                getter2.in1.connect(typeDOut);

                t.in1.connect(getter1.out);
                this.assertCanConnect(t.in2, getter2.out);
              });

          siblingTest('Compatible, contravariant, generics first',
              function() {
                const t = this.getMain('t');
                const getter1 = this.getMain('typetolist');
                const getter2 = this.getMain('typetolist');
                const typeAOut = this.getInnerOutput('typeA');
                const typeBOut = this.getInnerOutput('typeB');

                t.in1.connect(getter1.out);
                t.in2.connect(getter2.out);

                getter1.in1.connect(typeAOut);
                this.assertCanConnect(getter2.in1, typeBOut);
              });

          siblingTest('Compatible, contravariant, explicits first',
              function() {
                const t = this.getMain('t');
                const getter1 = this.getMain('typetolist');
                const getter2 = this.getMain('typetolist');
                const typeAOut = this.getInnerOutput('typeA');
                const typeBOut = this.getInnerOutput('typeB');

                getter1.in1.connect(typeAOut);
                getter2.in1.connect(typeBOut);

                t.in1.connect(getter1.out);
                this.assertCanConnect(t.in2, getter2.out);
              });

          siblingTest('Incompatible, generics first',
              function() {
                const t = this.getMain('t');
                const getter1 = this.getMain('typetolist');
                const getter2 = this.getMain('typetolist');
                const typeAOut = this.getInnerOutput('typeA');
                const typeEOut = this.getInnerOutput('typeE');

                t.in1.connect(getter1.out);
                t.in2.connect(getter2.out);

                getter1.in1.connect(typeAOut);
                this.assertCannotConnect(getter2.in1, typeEOut);
              });

          siblingTest('Incompatible, explicits first',
              function() {
                const t = this.getMain('t');
                const getter1 = this.getMain('typetolist');
                const getter2 = this.getMain('typetolist');
                const typeAOut = this.getInnerOutput('typeA');
                const typeEOut = this.getInnerOutput('typeE');

                getter1.in1.connect(typeAOut);
                getter2.in1.connect(typeEOut);

                t.in1.connect(getter1.out);
                this.assertCannotConnect(t.in2, getter2.out);
              });

          runSiblingTests();
        });
      });

      suite('Multiple params', function() {
        clearSiblingTests();

        siblingTest('Output param type, all generic params same, compat',
            function() {
              const dictTTMain = this.getMain('dict[t, t]');
              const dictCCOut = this.getInnerOutput('dict[typeC, typeC]');
              const dictCDOut = this.getInnerOutput('dict[typeC, typeD]');

              dictTTMain.in1.connect(dictCCOut);

              this.assertCanConnect(dictTTMain.in2, dictCDOut);
            });

        siblingTest('Output param type, all generic params same, incompat',
            function() {
              const dictTTMain = this.getMain('dict[t, t]');
              const dictCCOut = this.getInnerOutput('dict[typeC, typeC]');
              const dictCEOut = this.getInnerOutput('dict[typeC, typeE]');

              dictTTMain.in1.connect(dictCCOut);

              this.assertCannotConnect(dictTTMain.in2, dictCEOut);
            });

        siblingTest('Output generic type, all generic params same, compat',
            function() {
              const tMain = this.getMain('dicttotype');
              const dictCCOut = this.getInnerOutput('dict[typeC, typeC]');
              const dictCDOut = this.getInnerOutput('dict[typeC, typeD]');

              tMain.in1.connect(dictCCOut);

              this.assertCanConnect(tMain.in2, dictCDOut);
            });

        siblingTest('Output generic type, all generic params same, incompat',
            function() {
              const tMain = this.getMain('dicttotype');
              const dictCCOut = this.getInnerOutput('dict[typeC, typeC]');
              const dictCEOut = this.getInnerOutput('dict[typeC, typeE]');

              tMain.in1.connect(dictCCOut);

              this.assertCannotConnect(tMain.in2, dictCEOut);
            });

        siblingTest('Output param type, generic params different, compat',
            function() {
              const dictKVMain = this.getMain('dict[k, v]');
              const dictCCOut = this.getInnerOutput('dict[typeC, typeC]');
              const dictCDOut = this.getInnerOutput('dict[typeC, typeD]');

              dictKVMain.in1.connect(dictCCOut);

              this.assertCanConnect(dictKVMain.in2, dictCDOut);
            });

        siblingTest('Output param type, generic params different, one incompat',
            function() {
              const dictKVMain = this.getMain('dict[k, v]');
              const dictCCOut = this.getInnerOutput('dict[typeC, typeC]');
              const dictCEOut = this.getInnerOutput('dict[typeC, typeE]');

              dictKVMain.in1.connect(dictCCOut);

              this.assertCannotConnect(dictKVMain.in2, dictCEOut);
            });

        runSiblingTests();

        suite('Multiple common parents', function() {
          setup(function() {
            const hierarchy = {
              'typeA': {},
              'typeB': {},
              'typeC': {
                'fulfills': ['typeA', 'typeB'],
              },
              'typeD': {
                'fulfills': ['typeA', 'typeB'],
              },
              'typeE': {},
              'typeF': {},
              'typeG': {
                'fulfills': ['typeE', 'typeF'],
              },
              'typeH': {
                'fulfills': ['typeE', 'typeF'],
              },
              // Completely separate hierarchy.
              'typeI': {},
              'typeJ': {},
              'typeK': {
                'fulfills': ['typeI'],
              },
              'typeL': {
                'fulfills': ['typeJ', 'typeK'],
              },
              'typeM': {
                'fulfills': ['typeJ', 'typeK'],
              },
              'typeN': {
                'fulfills': ['typeI'],
              },
              'typeO': {},
              'typeP': {
                'fulfills': ['typeM', 'typeN'],
              },
              'typeQ': {
                'fulfills': ['typeM', 'typeN'],
              },
              'Dict': {
                'params': [
                  {
                    'name': 'K',
                    'variance': 'inv',
                  },
                  {
                    'name': 'V',
                    'variance': 'inv',
                  },
                ],
              },
            };

            this.newBlocks = createBlockDefs(['typeF', 'typeG', 'typeH',
              'typeI', 'typeJ', 'typeK', 'typeL', 'typeM', 'typeN', 'typeO',
              'typeP', 'typeQ',
            ]);
            Blockly.defineBlocksWithJsonArray(this.newBlocks);

            this.checker.init(hierarchy);
          });

          teardown(function() {
            for (const block of this.newBlocks) {
              delete Blockly.Blocks[block.type];
            }
          });

          clearSiblingTests();

          siblingTest('Incompatible', function() {
            const dictToType = this.getMain('dicttotype');
            const typesToDict = this.getMain('typestodict');
            const t1 = this.getMain('t');
            const t2 = this.getMain('t');
            const typeCOut = this.getInnerOutput('typeC');
            const typeDOut = this.getInnerOutput('typeD');
            const typeGOut = this.getInnerOutput('typeG');
            const typeHOut = this.getInnerOutput('typeH');

            t1.in1.connect(typeCOut);
            t1.in2.connect(typeDOut);
            t2.in1.connect(typeGOut);
            t2.in2.connect(typeHOut);
            typesToDict.in1.connect(t1.out);
            typesToDict.in2.connect(t2.out);

            this.assertCannotConnect(dictToType.in1, typesToDict.out);
          });

          siblingTest('Compatible', function() {
            const dictToType = this.getMain('dicttotype');
            const typesToDict = this.getMain('typestodict');
            const t1 = this.getMain('t');
            const t2 = this.getMain('t');
            const typeLOut = this.getInnerOutput('typeL');
            const typeMOut = this.getInnerOutput('typeM');
            const typePOut = this.getInnerOutput('typeP');
            const typeQOut = this.getInnerOutput('typeQ');

            t1.in1.connect(typeLOut);
            t1.in2.connect(typeMOut);
            t2.in1.connect(typePOut);
            t2.in2.connect(typeQOut);
            typesToDict.in1.connect(t1.out);
            typesToDict.in2.connect(t2.out);

            this.assertCanConnect(dictToType.in1, typesToDict.out);
          });

          runSiblingTests();
        });
      });
    });

    suite('Multiple common ancestor types with generics', function() {
      setup(function() {
        const hierarchy = {
          'typeA': {},
          'typeB': {},
          'typeC': {
            'fulfills': ['typeB', 'typeA'],
          },
          'typeD': {
            'fulfills': ['typeB', 'typeA'],
          },
          'typeE': {},
          'typeF': {},
          'typeG': {
            'fulfills': ['typeE', 'typeF'],
          },
          'typeH': {
            'fulfills': ['typeE', 'typeF'],
          },
        };

        const types = Object.keys(hierarchy);
        this.multiTypeBlocks = createBlockDefs(types);
        Blockly.defineBlocksWithJsonArray(this.multiTypeBlocks);

        this.checker.init(hierarchy);
      });

      teardown(function() {
        for (const block of this.multiTypeBlocks) {
          delete Blockly.Blocks[block.type];
        }
      });

      clearSiblingTests();

      siblingTest('Multi main, compat inner', function() {
        const t = this.getMain('t');
        const typeCOut = this.getInnerOutput('typeC');
        const typeDOut = this.getInnerOutput('typeD');
        const typeAOut = this.getInnerOutput('typeA');

        this.bindConnection(t.out, 'typeA');
        t.in1.connect(typeCOut);
        t.in2.connect(typeDOut);
        this.unbindConnection(t.out);

        this.assertCanConnect(t.in3, typeAOut);
      });

      siblingTest('Multi main, incompat inner', function() {
        const t = this.getMain('t');
        const typeCOut = this.getInnerOutput('typeC');
        const typeDOut = this.getInnerOutput('typeD');
        const typeEOut = this.getInnerOutput('typeE');

        this.bindConnection(t.out, 'typeA');
        t.in1.connect(typeCOut);
        t.in2.connect(typeDOut);
        this.unbindConnection(t.out);

        this.assertCannotConnect(t.in3, typeEOut);
      });

      siblingTest('Compat outer, multi main', function() {
        const typeAIn = this.getOuterInput('typeA');
        const t = this.getMain('t');
        const typeCOut = this.getInnerOutput('typeC');
        const typeDOut = this.getInnerOutput('typeD');

        t.in1.connect(typeCOut);
        t.in2.connect(typeDOut);

        this.assertCanConnect(typeAIn, t.out);
      });

      siblingTest('Incompat outer, multi main', function() {
        const typeEIn = this.getOuterInput('typeE');
        const t = this.getMain('t');
        const typeCOut = this.getInnerOutput('typeC');
        const typeDOut = this.getInnerOutput('typeD');

        t.in1.connect(typeCOut);
        t.in2.connect(typeDOut);

        this.assertCannotConnect(typeEIn, t.out);
      });

      siblingTest('2 multi mains, compatible', function() {
        const t1 = this.getMain('t', 't1');
        const t2 = this.getMain('t', 't2');
        const typeCOut1 = this.getInnerOutput('typeC');
        const typeDOut1 = this.getInnerOutput('typeD');
        const typeCOut2 = this.getInnerOutput('typeC');
        const typeDOut2 = this.getInnerOutput('typeD');

        t1.in1.connect(typeCOut1);
        t1.in2.connect(typeDOut1);

        t2.in1.connect(typeCOut2);
        t2.in2.connect(typeDOut2);

        this.assertCanConnect(t1.in3, t2.out);
      });

      siblingTest('2 multi mains, incompatible', function() {
        const t1 = this.getMain('t', 't1');
        const t2 = this.getMain('t', 't2');
        const typeCOut = this.getInnerOutput('typeC');
        const typeDOut = this.getInnerOutput('typeD');
        const typeGOut = this.getInnerOutput('typeG');
        const typeHOut = this.getInnerOutput('typeH');

        t1.in1.connect(typeCOut);
        t1.in2.connect(typeDOut);

        t2.in1.connect(typeGOut);
        t2.in2.connect(typeHOut);

        this.assertCannotConnect(t1.in3, t2.out);
      });

      runSiblingTests();
    });

    suite('Generic params', function() {
      setup(function() {
        this.newBlocks = createBlockDefs([
          'dict[t, t]',
          'dict[cat, dog]',
          'dict[cat, random]',
          'list[list[t]]',
        ]);
        this.newBlocks.push(
            ...createMainBlockDefs('typetogetterlist', 'getterlist[t]', 't'));
        Blockly.defineBlocksWithJsonArray(this.newBlocks);
      });

      teardown(function() {
        for (const block of this.newBlocks) {
          delete Blockly.Blocks[block.type];
        }
      });

      clearTwoBlockTests();

      twoBlockTest('Dict[T, T], Dict[Cat, Random] Compatible (b/c no output)',
          function() {
            const dictTTIn = this.getOuterInput('dict[t, t]');
            const dictCatRandomOut = this.getInnerOutput('dict[cat, random]');

            this.assertCanConnect(dictTTIn, dictCatRandomOut);
          });

      twoBlockTest('List[T], T Compatible', function() {
        const listTIn = this.getOuterInput('list[t]');
        const TOut = this.getInnerOutput('t');

        this.assertCanConnect(listTIn, TOut);
      });

      twoBlockTest('List[Dog], T Compatible', function() {
        const listTIn = this.getOuterInput('list[dog]');
        const TOut = this.getInnerOutput('t');

        this.assertCanConnect(listTIn, TOut);
      });

      twoBlockTest('List[List[T]], List[T] Compatible', function() {
        const listListTIn = this.getOuterInput('list[list[t]]');
        const listTOut = this.getInnerOutput('list[t]');

        this.assertCanConnect(listListTIn, listTOut);
      });

      twoBlockTest('List[List[T]], List[Dog] Incompatible', function() {
        const listListTIn = this.getOuterInput('list[list[t]]');
        const listDogOut = this.getInnerOutput('list[dog]');

        this.assertCannotConnect(listListTIn, listDogOut);
      });

      runTwoBlockTests();

      clearThreeBlockTests();

      threeBlockTest('Dict[T, T], Dict[Cat, Dog] Compatible', function() {
        const dictTTMain = this.getMain('dict[t, t]');
        const dictCatDogOut = this.getInnerOutput('dict[cat, dog]');

        this.assertCanConnect(dictTTMain.in, dictCatDogOut);
      });

      threeBlockTest('Dict[T, T], Dict[Cat, Random] Incompatible (b/c output)',
          function() {
            const dictTTMain = this.getMain('dict[t, t]');
            const dictCatRandomOut = this.getInnerOutput('dict[cat, random]');

            this.assertCannotConnect(dictTTMain.in, dictCatRandomOut);
          });

      threeBlockTest('List[List[T]], List[T], List[Dog] Incompatible',
          function() {
            const listListTIn = this.getOuterInput('list[list[t]]');
            const listTMain = this.getMain('list[t]');
            const listDogOut = this.getInnerOutput('list[dog]');

            listListTIn.connect(listTMain.out);

            this.assertCannotConnect(listTMain.in, listDogOut);
          });

      runThreeBlockTests();
    });
  });

  suite('bindType', function() {
    suite('Valid and invalid types', function() {
      setup(function() {
        const block = this.workspace.newBlock('static_t_main_out_value');

        this.assertThrows = function(type) {
          chai.assert.throws(() => {
            this.checker.bindType(block, 't', type);
          }, Error);
        };
        this.assertDoesNotThrow = function(type) {
          chai.assert.doesNotThrow(() => {
            this.checker.bindType(block, 't', type);
          }, Error);
        };
      });

      test('Explicit', function() {
        this.assertDoesNotThrow('typea');
      });

      test('Explicit parameters', function() {
        this.assertDoesNotThrow('typea[typeb, typec[typed]]');
      });

      test('Generic', function() {
        this.assertThrows('g');
      });

      test('Generic parameters', function() {
        this.assertThrows('typea[typeb, typec[g]]');
      });
    });

    suite('Disconnect connections', function() {
      setup(function() {
        this.assertIsConnected = function(conn) {
          chai.assert.isTrue(conn.isConnected(),
              'Expected ' + conn.name + ' to be connected.');
        };
        this.assertIsNotConnected = function(conn) {
          chai.assert.isFalse(conn.isConnected(),
              'Expected ' + conn.name + ' to be unconnected.');
        };
      });

      clearThreeBlockTests();

      threeBlockTest('Outer valid, inner valid', function() {
        const dogIn = this.getOuterInput('dog');
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');

        dogIn.connect(t.out);
        t.in.connect(dogOut);
        this.bindConnection(t.out, 'dog');

        this.assertIsConnected(t.out);
        this.assertIsConnected(t.in);
      });

      threeBlockTest('Outer valid, inner invalid', function() {
        const mammalIn = this.getOuterInput('mammal');
        const t = this.getMain('t');
        const catOut = this.getInnerOutput('cat');

        mammalIn.connect(t.out);
        t.in.connect(catOut);
        this.bindConnection(t.out, 'dog');

        this.assertIsConnected(t.out);
        this.assertIsNotConnected(t.in);
      });

      threeBlockTest('Outer invalid, inner valid', function() {
        const mammalIn = this.getOuterInput('mammal');
        const t = this.getMain('t');
        const batOut = this.getInnerOutput('bat');

        mammalIn.connect(t.out);
        t.in.connect(batOut);
        this.bindConnection(t.out, 'flyinganimal');

        this.assertIsNotConnected(t.out);
        this.assertIsConnected(t.in);
      });

      threeBlockTest('Outer invalid, inner invalid', function() {
        const dogIn = this.getOuterInput('dog');
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');

        dogIn.connect(t.out);
        t.in.connect(dogOut);
        this.bindConnection(t.out, 'cat');

        this.assertIsNotConnected(t.out);
        this.assertIsNotConnected(t.in);
      });

      runThreeBlockTests();

      clearSiblingTests();

      siblingTest('Some inners valid', function() {
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');
        const catOut = this.getInnerOutput('cat');

        this.bindConnection(t.out, 'mammal');
        t.in1.connect(dogOut);
        t.in2.connect(catOut);
        this.unbindConnection(t.out);
        this.bindConnection(t.out, 'dog');

        this.assertIsConnected(t.in1);
        this.assertIsNotConnected(t.in2);
      });

      runSiblingTests();
    });
  });

  suite('getExplicitTypes', function() {
    setup(function() {
      this.assertNoType = function(conn) {
        const explicitTypes = this.checker.getExplicitTypes(
            conn.getSourceBlock(), 'T');
        chai.assert.isArray(explicitTypes,
            'Expected getExplicitTypes to return an array.');
        chai.assert.isEmpty(explicitTypes,
            'Expected ' + conn.name + ' to not have a type.');
      };
      this.assertHasType = function(conn, explicit, generic = 'T') {
        const explicitTypes = this.checker.getExplicitTypes(
            conn.getSourceBlock(), generic);
        if (Array.isArray(explicit)) {
          chai.assert.deepEqual(explicitTypes, explicit,
              'Expected ' + conn.name + ' to have types ' + explicit + '.');
        } else {
          chai.assert.include(explicitTypes, explicit,
              'Expected ' + conn.name + ' to have type ' + explicit + '.');
        }
      };
      this.assertBlockHasType = function(block, generic, explicit) {
        const explicitTypes = this.checker.getExplicitTypes(block, generic);
        chai.assert.include(explicitTypes, explicit,
            'Expected ' + generic + ' to have type ' + explicit + '.');
      };
      this.assertBlockDoesNotHaveType = function(block, generic) {
        const explicitTypes = this.checker.getExplicitTypes(block, generic);
        chai.assert.isArray(explicitTypes,
            'Expected getExplicitTypes to return an array.');
        chai.assert.isEmpty(explicitTypes,
            'Expected ' + generic + ' to not have a type.');
      };
    });

    suite('Single blocks', function() {
      clearTwoBlockTests();

      twoBlockTest('Outer explicit', function() {
        const dogIn = this.getOuterInput('dog');
        this.assertNoType(dogIn);
      });

      twoBlockTest('Inner explicit', function() {
        const dogOut = this.getInnerOutput('dog');
        this.assertNoType(dogOut);
      });

      twoBlockTest('Param explicit', function() {
        const dogListOut = this.getInnerOutput('list[dog]');
        this.assertNoType(dogListOut);
      });

      twoBlockTest('Outer unbound', function() {
        const tIn = this.getOuterInput('t');
        this.assertNoType(tIn);
      });

      twoBlockTest('Inner unbound', function() {
        const tOut = this.getInnerOutput('t');
        this.assertNoType(tOut);
      });

      twoBlockTest('Outer bound programmatically', function() {
        const tIn = this.getOuterInput('t');
        this.bindConnection(tIn, 'dog');
        this.assertHasType(tIn, 'dog');
      });

      twoBlockTest('Inner bound programmatically', function() {
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tOut, 'dog');
        this.assertHasType(tOut, 'dog');
      });

      runTwoBlockTests();
    });

    suite('Parameters', function() {
      setup(function() {
        this.genericParamBlocks = [];
        this.genericParamBlocks.push(
            ...createMainBlockDefs('typetolist', 'list[t]', 't'));
        this.genericParamBlocks.push(
            ...createMainBlockDefs('listtotype', 't', 'list[t]'));
        Blockly.defineBlocksWithJsonArray(this.genericParamBlocks);
      });

      teardown(function() {
        for (const block of this.genericParamBlocks) {
          delete Blockly.Blocks[block.type];
        }
      });

      clearTwoBlockTests();

      twoBlockTest('T = List[Dog], block - child', function() {
        const tIn = this.getOuterInput('t');
        const listDogOut = this.getInnerOutput('list[dog]');
        tIn.connect(listDogOut);
        this.assertHasType(tIn, 'list[dog]');
      });

      twoBlockTest('T = List[Dog], block - parent', function() {
        const listDogIn = this.getOuterInput('list[dog]');
        const tOut = this.getInnerOutput('t');
        listDogIn.connect(tOut);
        this.assertHasType(tOut, 'list[dog]');
      });

      twoBlockTest('T = List[Dog], bound', function() {
        const tIn = this.getOuterInput('t');
        this.bindConnection(tIn, 'list[dog]');
        this.assertHasType(tIn, 'list[dog]');
      });

      twoBlockTest('T = List[T], block - child', function() {
        const tIn = this.getOuterInput('t');
        const listTOut = this.getInnerOutput('list[t]');
        tIn.connect(listTOut);
        this.assertHasType(tIn, 'list[*]');
      });

      twoBlockTest('T = List[T], block - parent', function() {
        const listTIn = this.getOuterInput('list[t]');
        const tOut = this.getInnerOutput('t');
        listTIn.connect(tOut);
        this.assertHasType(tOut, 'list[*]');
      });

      twoBlockTest.skip('T = List[T], bound', function() {
        const tIn = this.getOuterInput('t');
        this.bindConnection(tIn, 'list[t]');
        this.assertHasType(tIn, 'list[*]');
      });

      twoBlockTest('List[T] Unbound', function() {
        const tIn = this.getInnerOutput('list[t]');
        this.assertNoType(tIn);
      });

      twoBlockTest('List[T] = T, block - child', function() {
        const listTIn = this.getOuterInput('list[t]');
        const tOut = this.getInnerOutput('t');
        listTIn.connect(tOut);
        this.assertNoType(listTIn);
      }); // Cannot replicate w/ bind.

      twoBlockTest('List[T] = T, block - parent', function() {
        const tIn = this.getOuterInput('t');
        const listTOut = this.getInnerOutput('list[t]');
        tIn.connect(listTOut);
        this.assertNoType(listTOut);
      }); // Cannot replicate w/ bind.

      twoBlockTest('List[T] = List[G], block - child', function() {
        const listTIn = this.getOuterInput('list[t]');
        const listGOut = this.getInnerOutput('list[g]');
        listTIn.connect(listGOut);
        this.assertNoType(listTIn);
      });

      twoBlockTest('List[T] = List[G], block - parent', function() {
        const listGIn = this.getOuterInput('list[g]');
        const listTOut = this.getInnerOutput('list[t]');
        listGIn.connect(listTOut);
        this.assertNoType(listGIn);
      });

      twoBlockTest.skip('List[T] = List[G], bind', function() {
        const listTIn = this.getOuterInput('list[t]');
        this.bindConnection(listTIn, 'g');
        this.assertNoType(listTIn);
      });

      twoBlockTest('List[T] = List[Dog], block - child', function() {
        const listTIn = this.getOuterInput('list[t]');
        const listDogOut = this.getInnerOutput('list[dog]');
        listTIn.connect(listDogOut);
        this.assertHasType(listTIn, 'dog');
      });

      twoBlockTest('List[T] = List[Dog], block - parent', function() {
        const listDogIn = this.getOuterInput('list[dog]');
        const listTOut = this.getInnerOutput('list[t]');
        listDogIn.connect(listTOut);
        this.assertHasType(listTOut, 'dog');
      });

      runTwoBlockTests();

      clearThreeBlockTests();

      threeBlockTest('List[T], T = Dog, child', function() {
        const t = this.getMain('typetolist');
        const dogOut = this.getInnerOutput('dog');
        t.in.connect(dogOut);
        this.assertHasType(t.in, 'dog');
      });

      threeBlockTest('List[T], T = Dog, parent', function() {
        const t = this.getMain('listtotype');
        const dogIn = this.getOuterInput('dog');
        dogIn.connect(t.out);
        this.assertHasType(t.out, 'dog');
      });

      threeBlockTest('List[T], T = Dog, bound', function() {
        const t = this.getMain('typetolist');
        this.bindConnection(t.in, 'dog');
        this.assertHasType(t.in, 'dog');
      });

      runThreeBlockTests();
    });

    suite('Flow through connections', function() {
      clearTwoBlockTests();

      twoBlockTest('From parent, explicit', function() {
        const dogIn = this.getOuterInput('dog');
        const tOut = this.getInnerOutput('t');

        dogIn.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      twoBlockTest('From parent, bound', function() {
        const tIn = this.getOuterInput('t');
        const tOut = this.getInnerOutput('t');

        this.bindConnection(tIn, 'dog');
        tIn.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      twoBlockTest('From child, explicit', function() {
        const tIn = this.getOuterInput('t');
        const dogOut = this.getInnerOutput('dog');

        tIn.connect(dogOut);

        this.assertHasType(tIn, 'dog');
      });

      twoBlockTest('From child, bound', function() {
        const tIn = this.getOuterInput('t');
        const tOut = this.getInnerOutput('t');

        this.bindConnection(tOut, 'dog');
        tIn.connect(tOut);

        this.assertHasType(tIn, 'dog');
      });

      runTwoBlockTests();

      clearThreeBlockTests();

      threeBlockTest('From grandparent', function() {
        const dogIn = this.getOuterInput('dog');
        const t = this.getMain('t');
        const tOut = this.getInnerOutput('t');

        dogIn.connect(t.out);
        t.in.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      threeBlockTest('From grandchild', function() {
        const tIn = this.getOuterInput('t');
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');

        tIn.connect(t.out);
        t.in.connect(dogOut);

        this.assertHasType(tIn, 'dog');
      });

      runThreeBlockTests();

      clearSiblingTests();

      siblingTest('From ancestor', function() {
        const dogIn = this.getOuterInput('dog');
        const tOut = this.getInnerOutput('t');

        let t = {in1: dogIn};
        for (let i = 0; i < 10; i++) {
          const newT = this.getMain('t');
          t.in1.connect(newT.out);
          t = newT;
        }
        t.in1.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('From descendant', function() {
        const tIn = this.getOuterInput('t');
        const dogOut = this.getInnerOutput('dog');

        let t = {in1: tIn};
        for (let i = 0; i < 10; i++) {
          const newT = this.getMain('t');
          t.in1.connect(newT.out);
          t = newT;
        }
        t.in1.connect(dogOut);

        this.assertHasType(tIn, 'dog');
      });

      siblingTest('From parsib', function() {
        const t1 = this.getMain('t', 't1');
        const t2 = this.getMain('t', 't2');
        const dogOut = this.getInnerOutput('dog');
        const tOut = this.getInnerOutput('t');

        t1.in1.connect(dogOut);
        t1.in2.connect(t2.out);
        t2.in1.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('From ancestor parsib', function() {
        const t1 = this.getMain('t', 't1');
        const dogOut = this.getInnerOutput('dog');
        const tOut = this.getInnerOutput('t');

        let tNext = t1;
        for (let i = 0; i < 10; i++) {
          const tNew = this.getMain('t');
          tNext.in1.connect(tNew.out);
          tNext = tNew;
        }
        tNext.in1.connect(tOut);
        t1.in2.connect(dogOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('From sibling', function() {
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');
        const tOut = this.getInnerOutput('t');

        t.in1.connect(dogOut);
        t.in2.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('From cousin', function() {
        const t1 = this.getMain('t', 't1');
        const t2 = this.getMain('t', 't2');
        const t3 = this.getMain('t', 't3');
        const dogOut = this.getInnerOutput('dog');
        const tOut = this.getInnerOutput('t');

        t1.in1.connect(t2.out);
        t1.in2.connect(t3.out);
        t2.in1.connect(dogOut);
        t3.in1.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('From second cousin', function() {
        const t1 = this.getMain('t', 't1');
        const t2 = this.getMain('t', 't2');
        const t3 = this.getMain('t', 't3');
        const t4 = this.getMain('t', 't4');
        const t5 = this.getMain('t', 't5');
        const dogOut = this.getInnerOutput('dog');
        const tOut = this.getInnerOutput('t');

        t1.in1.connect(t2.out);
        t1.in2.connect(t3.out);
        t2.in1.connect(t4.out);
        t3.in1.connect(t5.out);
        t4.in1.connect(dogOut);
        t5.in1.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('From first cousin once removed', function() {
        const t1 = this.getMain('t', 't1');
        const t2 = this.getMain('t', 't2');
        const t3 = this.getMain('t', 't3');
        const t4 = this.getMain('t', 't4');
        const dogOut = this.getInnerOutput('dog');
        const tOut = this.getInnerOutput('t');

        t1.in1.connect(t2.out);
        t1.in2.connect(t3.out);
        t2.in1.connect(dogOut);
        t3.in1.connect(t4.out);
        t4.in1.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('From nibling', function() {
        const t1 = this.getMain('t', 't1');
        const t2 = this.getMain('t', 't2');
        const dogOut = this.getInnerOutput('dog');
        const tOut = this.getInnerOutput('t');

        t1.in1.connect(t2.out);
        t1.in2.connect(tOut);
        t2.in1.connect(dogOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('From grandnibling', function() {
        const t1 = this.getMain('t', 't1');
        const t2 = this.getMain('t', 't2');
        const t3 = this.getMain('t', 't3');
        const dogOut = this.getInnerOutput('dog');
        const tOut = this.getInnerOutput('t');

        t1.in1.connect(t2.out);
        t1.in2.connect(tOut);
        t2.in1.connect(t3.out);
        t3.in1.connect(dogOut);

        this.assertHasType(tOut, 'dog');
      });

      runSiblingTests();
    });

    suite('Flow through generic parameterized types', function() {
      setup(function() {
        this.genericParamBlocks = [];
        this.genericParamBlocks.push(
            ...createMainBlockDefs('typetolist', 'list[t]', 't'));
        this.genericParamBlocks.push(
            ...createMainBlockDefs('listtotype', 't', 'list[t]'));
        this.genericParamBlocks.push(
            ...createMainBlockDefs('typestodict', 'dict[k, v]', 'k', 'v'));
        this.genericParamBlocks.push(
            ...createMainBlockDefs('dicttokey', 'k', 'dict[k, v]'));
        this.genericParamBlocks.push(
            ...createMainBlockDefs('dicttovalue', 'v', 'dict[k, v]'));
        this.genericParamBlocks.push(
            ...createBlockDefs(['dict[dog, cat]']));
        this.genericParamBlocks.push(...createMainBlockDefs(
            'diffparams', 'list[a]', 'list[a]', 'list[b]'));
        this.genericParamBlocks.push(
            ...createBlockDefs(['list[list[t]]']));
        this.genericParamBlocks.push(
            ...createBlockDefs(['list[list[dog]]']));
        this.genericParamBlocks.push(...createMainBlockDefs(
            'difftypeslist', 'getterlist[a]', 'getterlist[a]', 'dict[a, b]'));
        this.genericParamBlocks.push(...createMainBlockDefs(
            'difftypesdict', 'dict[a, b]', 'getterlist[a]', 'dict[a, b]'));
        Blockly.defineBlocksWithJsonArray(this.genericParamBlocks);
      });

      teardown(function() {
        for (const block of this.genericParamBlocks) {
          delete Blockly.Blocks[block.type];
        }
      });

      clearSiblingTests();

      siblingTest('Different list params not interfering', function() {
        const main = this.getMain('diffparams');
        const listDogOut = this.getInnerOutput('list[dog]');
        main.in1.connect(listDogOut);
        this.assertBlockHasType(main.block, 'a', 'dog');
        this.assertBlockDoesNotHaveType(main.block, 'b');
      });

      siblingTest('Deeply nested params', function() {
        const main = this.getMain('list[list[t]]');
        const listListDogOut = this.getInnerOutput('list[list[dog]]');
        main.in1.connect(listListDogOut);
        this.assertHasType(main.in1, 'dog');
      });

      // TODO: Broken due to unification being broken.
      siblingTest.skip('Removing duplicates', function() {
        const main = this.getMain('dicttovalue');
        const main2 = this.getMain('typestodict');
        const main3 = this.getMain('t');
        // Cat and dog should have two parents for this test, but removed
        // temporarily to not break other tests.
        const dogOut = this.getInnerOutput('dog');
        const catOut = this.getInnerOutput('cat');
        const catOut2 = this.getInnerOutput('cat');
        main.in1.connect(main2.out);
        main2.in1.connect(main3.out);
        main2.in2.connect(catOut);
        main3.in1.connect(dogOut);
        main3.in2.connect(catOut2);

        this.assertBlockHasType(main.block, 'v', 'cat');
      });

      runSiblingTests();

      suite('Parent explicit', function() {
        clearThreeBlockTests();

        threeBlockTest('Dog to List[Dog]', function() {
          const dogIn = this.getOuterInput('dog');
          const main = this.getMain('listtotype');
          const tOut = this.getInnerOutput('t');
          dogIn.connect(main.out);

          this.assertHasType(main.out, 'dog');

          main.in.connect(tOut);
          this.assertHasType(tOut, 'list[dog]');
        });

        threeBlockTest('List[Dog] to Dog', function() {
          const dogListIn = this.getOuterInput('list[dog]');
          const main = this.getMain('typetolist');
          const tOut = this.getInnerOutput('t');
          dogListIn.connect(main.out);

          this.assertHasType(main.out, 'dog');

          main.in.connect(tOut);
          this.assertHasType(tOut, 'dog');
        });

        runThreeBlockTests();

        clearSiblingTests();

        siblingTest('Dog to Dict[Dog, *]', function() {
          const dogIn = this.getOuterInput('dog');
          const main = this.getMain('dicttokey');
          const tOut = this.getInnerOutput('t');
          dogIn.connect(main.out);

          this.assertHasType(main.in1, 'dog', 'k');
          this.assertNoType(main.in2, 'v');

          main.in1.connect(tOut);
          this.assertHasType(tOut, 'dict[dog, *]');
        });

        siblingTest('Cat to Dict[*, Cat]', function() {
          const catIn = this.getOuterInput('cat');
          const main = this.getMain('dicttovalue');
          const tOut = this.getInnerOutput('t');
          catIn.connect(main.out);

          this.assertNoType(main.in1, 'k');
          this.assertHasType(main.in2, 'cat', 'v');

          main.in1.connect(tOut);
          this.assertHasType(tOut, 'dict[*, cat]');
        });

        siblingTest('Dict[Dog, Cat] to Dog', function() {
          const dictIn = this.getOuterInput('dict[dog, cat]');
          const main = this.getMain('typestodict');
          const tOut = this.getInnerOutput('t');
          dictIn.connect(main.out);

          this.assertBlockHasType(main.block, 'k', 'dog');
          this.assertBlockHasType(main.block, 'v', 'cat');

          // 1st connection is important!
          main.in1.connect(tOut);
          this.assertHasType(tOut, 'dog');
        });

        siblingTest('Dict[Dog, Cat] to Cat', function() {
          const dictIn = this.getOuterInput('dict[dog, cat]');
          const main = this.getMain('typestodict');
          const tOut = this.getInnerOutput('t');
          dictIn.connect(main.out);

          this.assertBlockHasType(main.block, 'k', 'dog');
          this.assertBlockHasType(main.block, 'v', 'cat');

          // 2nd connection is important!
          main.in2.connect(tOut);
          this.assertHasType(tOut, 'cat');
        });

        runSiblingTests();
      });

      suite('Child explicit', function() {
        clearThreeBlockTests();

        threeBlockTest('Dog to List[Dog]', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('typetolist');
          const dogOut = this.getInnerOutput('dog');
          main.in.connect(dogOut);

          this.assertHasType(main.in, 'dog');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'list[dog]');
        });

        threeBlockTest('List[Dog] to Dog', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('listtotype');
          const dogListOut = this.getInnerOutput('list[dog]');
          main.in.connect(dogListOut);

          this.assertHasType(main.in, 'dog');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'dog');
        });

        runThreeBlockTests();

        clearSiblingTests();

        siblingTest('Dog and Cat to Dict[Dog, Cat]', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('typestodict');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');
          main.in1.connect(dogOut);
          main.in2.connect(catOut);

          this.assertHasType(main.in1, 'dog', 'k');
          this.assertHasType(main.in2, 'cat', 'v');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'dict[dog, cat]');
        });

        siblingTest('Dict[Dog, Cat] to Dog', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('dicttokey');
          const dictOut = this.getInnerOutput('dict[dog, cat]');
          main.in1.connect(dictOut);

          this.assertBlockHasType(main.block, 'k', 'dog');
          this.assertBlockHasType(main.block, 'v', 'cat');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'dog');
        });

        siblingTest('Dict[Dog, Cat] to Cat', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('dicttovalue');
          const dictOut = this.getInnerOutput('dict[dog, cat]');
          main.in1.connect(dictOut);

          this.assertBlockHasType(main.block, 'k', 'dog');
          this.assertBlockHasType(main.block, 'v', 'cat');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'cat');
        });

        runSiblingTests();
      });

      suite('Child bound', function() {
        clearThreeBlockTests();

        threeBlockTest('Dog to List[Dog]', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('typetolist');
          const tOut = this.getInnerOutput('t');
          this.bindConnection(tOut, 'dog');
          main.in.connect(tOut);

          this.assertHasType(main.in, 'dog');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'list[dog]');
        });

        threeBlockTest('List[Dog] to Dog', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('listtotype');
          const tListOut = this.getInnerOutput('list[t]');
          this.bindConnection(tListOut, 'dog');
          main.in.connect(tListOut);

          this.assertHasType(main.in, 'dog');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'dog');
        });

        runThreeBlockTests();

        clearSiblingTests();

        siblingTest('Dog and Cat to Dict[Dog, Cat]', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('typestodict');
          const tOut1 = this.getInnerOutput('t');
          this.bindConnection(tOut1, 'dog');
          const tOut2 = this.getInnerOutput('t');
          this.bindConnection(tOut2, 'cat');
          main.in1.connect(tOut1);
          main.in2.connect(tOut2);

          this.assertHasType(main.in1, 'dog', 'k');
          this.assertHasType(main.in2, 'cat', 'v');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'dict[dog, cat]');
        });

        siblingTest('Dict[Dog, Cat] to Dog', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('dicttokey');
          const dictOut = this.getInnerOutput('dict[k, v]');
          this.bindType(dictOut.block, 'dog', 'k');
          this.bindType(dictOut.block, 'cat', 'v');
          main.in1.connect(dictOut);

          this.assertBlockHasType(main.block, 'k', 'dog');
          this.assertBlockHasType(main.block, 'v', 'cat');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'dog');
        });

        siblingTest('Dict[Dog, Cat] to Cat', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('dicttovalue');
          const dictOut = this.getInnerOutput('dict[k, v]');
          this.bindType(dictOut.block, 'dog', 'k');
          this.bindType(dictOut.block, 'cat', 'v');
          main.in1.connect(dictOut);

          this.assertBlockHasType(main.block, 'k', 'dog');
          this.assertBlockHasType(main.block, 'v', 'cat');

          tIn.connect(main.out);
          this.assertHasType(tIn, 'cat');
        });

        runSiblingTests();
      });

      suite('Different types sharing params', function() {
        clearSiblingTests();

        siblingTest('List out, list attached', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('difftypeslist');
          const listDogOut = this.getInnerOutput('list[dog]');
          main.in1.connect(listDogOut);
          tIn.connect(main.out);
          this.assertHasType(tIn, 'getterlist[dog]');
        });

        siblingTest('List out, dict attached', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('difftypeslist');
          const dictOut = this.getInnerOutput('dict[dog, cat]');
          main.in2.connect(dictOut);
          tIn.connect(main.out);
          this.assertHasType(tIn, 'getterlist[dog]');
        });

        siblingTest('Dict out, list attached', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('difftypesdict');
          const listDogOut = this.getInnerOutput('list[dog]');
          main.in1.connect(listDogOut);
          tIn.connect(main.out);
          this.assertHasType(tIn, 'dict[dog, *]');
        });

        siblingTest('Dict out, dict attached', function() {
          const tIn = this.getOuterInput('t');
          const main = this.getMain('difftypesdict');
          const dictOut = this.getInnerOutput('dict[dog, cat]');
          main.in2.connect(dictOut);
          tIn.connect(main.out);
          this.assertHasType(tIn, 'dict[dog, cat]');
        });

        runSiblingTests();
      });
    });

    suite('Flow through different generics', function() {
      clearSiblingTests();

      setup(function() {
        const types = ['T', 'a', 'b', '1', '*'];
        this.genericBlocks = createBlockDefs(types);
        Blockly.defineBlocksWithJsonArray(this.genericBlocks);
      });

      teardown(function() {
        for (const block of this.genericBlocks) {
          delete Blockly.Blocks[block.type];
        }
      });

      siblingTest('Differently cased generics - explicit outer', function() {
        const dogIn = this.getOuterInput('dog');

        let t = {in1: dogIn};
        for (let i = 0; i < 3; i++) {
          const TNew = this.getMain('T');
          t.in1.connect(TNew.out);

          const tNew = this.getMain('t');
          TNew.in1.connect(tNew.out);
          t = tNew;
        }

        this.assertHasType(t.out, 'dog');
      });

      siblingTest('Differently cased generic - explicit inner', function() {
        const tIn = this.getOuterInput('t');
        const dogOut = this.getInnerOutput('dog');

        let t = {in1: tIn};
        for (let i = 0; i < 3; i++) {
          const TNew = this.getMain('T');
          t.in1.connect(TNew.out);

          const tNew = this.getMain('t');
          TNew.in1.connect(tNew.out);
          t = tNew;
        }
        t.in1.connect(dogOut);

        this.assertHasType(tIn, 'dog');
      });

      siblingTest('Different generics - explicit outer', function() {
        const dogIn = this.getOuterInput('dog');
        const connT = this.getMain('T', 'connT');
        const conna = this.getMain('a', 'conna');
        const connb = this.getMain('b', 'connb');
        const conn1 = this.getMain('1', 'conn1');
        const connStar = this.getMain('*', 'connStar');
        const tOut = this.getInnerOutput('t');

        dogIn.connect(connT.out);
        connT.in1.connect(conna.out);
        conna.in1.connect(connb.out);
        connb.in1.connect(conn1.out);
        conn1.in1.connect(connStar.out);
        connStar.in1.connect(tOut);

        this.assertHasType(tOut, 'dog');
      });

      siblingTest('Different generics - explicit inner', function() {
        const tIn = this.getOuterInput('t');
        const connT = this.getMain('T', 'connT');
        const conna = this.getMain('a', 'conna');
        const connb = this.getMain('b', 'connb');
        const conn1 = this.getMain('1', 'conn1');
        const connStar = this.getMain('*', 'connStar');
        const dogOut = this.getInnerOutput('dog');

        tIn.connect(connT.out);
        connT.in1.connect(conna.out);
        conna.in1.connect(connb.out);
        connb.in1.connect(conn1.out);
        conn1.in1.connect(connStar.out);
        connStar.in1.connect(dogOut);

        this.assertHasType(tIn, 'dog');
      });

      runSiblingTests();

      test('Differently cased on same block - lowercase input', function() {
        Blockly.defineBlocksWithJsonArray([{
          'type': 'different_cases',
          'message0': '%1',
          'args0': [
            {
              'type': 'input_value',
              'name': 'INPUT1',
              'check': ['t'],
            },
          ],
          'output': ['T'],
        }]);

        const dog = this.workspace.newBlock('static_dog_outer_value');
        const differentCases1 = this.workspace.newBlock('different_cases');
        const differentCases2 = this.workspace.newBlock('different_cases');

        const dogIn = dog.getInput('INPUT1').connection;
        const differentCases1Out = differentCases1.outputConnection;
        const differentCases1In = differentCases1.getInput('INPUT1').connection;
        const differentCases2Out = differentCases2.outputConnection;

        // For logging.
        dogIn.name = 'dogIn';
        differentCases1Out.name = 'differentCases1Out';
        differentCases1In.name = 'differentCases1In';
        differentCases2Out.name = 'differentCases2Out';

        dogIn.connect(differentCases1Out);
        differentCases1In.connect(differentCases2Out);

        this.assertHasType(differentCases2Out, 'dog');

        delete Blockly.Blocks['different_cases'];
      });

      test('Differently cased on same block - lowercase output', function() {
        Blockly.defineBlocksWithJsonArray([{
          'type': 'different_cases',
          'message0': '%1',
          'args0': [
            {
              'type': 'input_value',
              'name': 'INPUT1',
              'check': ['T'],
            },
          ],
          'output': ['t'],
        }]);

        const dog = this.workspace.newBlock('static_dog_outer_value');
        const differentCases1 = this.workspace.newBlock('different_cases');
        const differentCases2 = this.workspace.newBlock('different_cases');

        const dogIn = dog.getInput('INPUT1').connection;
        const differentCases1Out = differentCases1.outputConnection;
        const differentCases1In = differentCases1.getInput('INPUT1').connection;
        const differentCases2Out = differentCases2.outputConnection;

        // For logging.
        dogIn.name = 'dogIn';
        differentCases1Out.name = 'differentCases1Out';
        differentCases1In.name = 'differentCases1In';
        differentCases2Out.name = 'differentCases2Out';

        dogIn.connect(differentCases1Out);
        differentCases1In.connect(differentCases2Out);

        this.assertHasType(differentCases2Out, 'dog');
      });
    });

    suite('Update on connect', function() {
      suite('Single explicit', function() {
        clearThreeBlockTests();

        threeBlockTest('Connect inner explicit last', function() {
          const tIn = this.getOuterInput('t');
          const t = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');

          tIn.connect(t.out);
          t.in.connect(dogOut);

          this.assertHasType(tIn, 'dog');
        });

        threeBlockTest('Connect inner explicit first', function() {
          const tIn = this.getOuterInput('t');
          const t = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');

          t.in.connect(dogOut);
          tIn.connect(t.out);

          this.assertHasType(tIn, 'dog');
        });

        threeBlockTest('Connect outer explicit last', function() {
          const dogIn = this.getOuterInput('dog');
          const t = this.getMain('t');
          const tOut = this.getInnerOutput('t');

          t.in.connect(tOut);
          dogIn.connect(t.out);

          this.assertHasType(tOut, 'dog');
        });

        threeBlockTest('Connect outer explicit first', function() {
          const dogIn = this.getOuterInput('dog');
          const t = this.getMain('t');
          const tOut = this.getInnerOutput('t');

          dogIn.connect(t.out);
          t.in.connect(tOut);

          this.assertHasType(tOut, 'dog');
        });

        runThreeBlockTests();
      });

      suite('Outer and inner explicit', function() {
        clearThreeBlockTests();

        threeBlockTest('Connect inner last', function() {
          const mammalIn = this.getOuterInput('mammal');
          const t = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');

          mammalIn.connect(t.out);
          t.in.connect(dogOut);

          this.assertHasType(t.out, 'mammal');
        });

        threeBlockTest('Connect outer last', function() {
          const mammalIn = this.getOuterInput('mammal');
          const t = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');

          t.in.connect(dogOut);
          mammalIn.connect(t.out);

          this.assertHasType(t.out, 'mammal');
        });

        runThreeBlockTests();
      });
    });

    suite('Update on disconnect', function() {
      suite('Single explicit', function() {
        clearThreeBlockTests();

        threeBlockTest('Inner explicit', function() {
          const tIn = this.getOuterInput('t');
          const t = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');

          tIn.connect(t.out);
          t.in.connect(dogOut);
          t.in.disconnect();

          this.assertNoType(tIn);
        });

        threeBlockTest('Outer explicit', function() {
          const dogIn = this.getOuterInput('dog');
          const t = this.getMain('t');
          const tOut = this.getInnerOutput('t');

          t.in.connect(tOut);
          dogIn.connect(t.out);
          dogIn.disconnect();

          this.assertNoType(tOut);
        });

        runThreeBlockTests();
      });

      suite('Outer and inner explicit', function() {
        clearThreeBlockTests();

        threeBlockTest('Disconnect inner', function() {
          this.mammalIn = this.getOuterInput('mammal');
          this.t = this.getMain('t');
          this.dogOut = this.getInnerOutput('dog');

          this.mammalIn.connect(this.t.out);
          this.t.in.connect(this.dogOut);

          this.mammalIn.disconnect();

          this.assertHasType(this.t.out, 'dog');
        });

        threeBlockTest('Disconnect outer', function() {
          this.mammalIn = this.getOuterInput('mammal');
          this.t = this.getMain('t');
          this.dogOut = this.getInnerOutput('dog');

          this.mammalIn.connect(this.t.out);
          this.t.in.connect(this.dogOut);

          this.dogOut.disconnect();

          this.assertHasType(this.t.out, 'mammal');
        });

        runThreeBlockTests();
      });
    });

    suite('Update on bind', function() {
      clearThreeBlockTests();

      threeBlockTest('Override outer', function() {
        const mammalIn = this.getOuterInput('mammal');
        const t = this.getMain('t');

        mammalIn.connect(t.out);
        this.bindConnection(t.out, 'dog');

        this.assertHasType(t.out, 'dog');
      });

      threeBlockTest('Override outer w/ inner', function() {
        const mammalIn = this.getOuterInput('mammal');
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');

        mammalIn.connect(t.out);
        t.in.connect(dogOut);
        this.bindConnection(t.out, 'dog');

        this.assertHasType(t.out, 'dog');
      });

      threeBlockTest('Override inner', function() {
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');

        t.in.connect(dogOut);
        this.bindConnection(t.out, 'mammal');

        this.assertHasType(t.out, 'mammal');
      });

      runThreeBlockTests();
    });

    suite('Update on unbind', function() {
      clearThreeBlockTests();

      threeBlockTest('Stop overriding outer', function() {
        const mammalIn = this.getOuterInput('mammal');
        const t = this.getMain('t');

        mammalIn.connect(t.out);
        this.bindConnection(t.out, 'dog');
        this.unbindConnection(t.out);

        this.assertHasType(t.out, 'mammal');
      });

      threeBlockTest('Stop overriding outer w/ inner', function() {
        const mammalIn = this.getOuterInput('mammal');
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');

        mammalIn.connect(t.out);
        t.in.connect(dogOut);
        this.bindConnection(t.out, 'dog');
        this.unbindConnection(t.out);

        this.assertHasType(t.out, 'mammal');
      });

      threeBlockTest('Stop overriding inner', function() {
        const t = this.getMain('t');
        const dogOut = this.getInnerOutput('dog');

        t.in.connect(dogOut);
        this.bindConnection(t.out, 'mammal');
        this.unbindConnection(t.out);

        this.assertHasType(t.out, 'dog');
      });

      runThreeBlockTests();
    });

    suite('Unification', function() {
      suite('Inputs', function() {
        clearSiblingTests();

        siblingTest('Direct children', function() {
          const t = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');

          this.bindConnection(t.out, 'mammal');
          t.in1.connect(dogOut);
          t.in2.connect(catOut);
          this.unbindConnection(t.out);

          this.assertHasType(t.out, 'mammal');
        });

        siblingTest('Grandchildren', function() {
          const t1 = this.getMain('t', 't1');
          const t2 = this.getMain('t', 't2');
          const t3 = this.getMain('t', 't3');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');

          this.bindConnection(t1.out, 'mammal');
          t1.in1.connect(t2.out);
          t1.in2.connect(t3.out);
          t2.in1.connect(dogOut);
          t3.in1.connect(catOut);
          this.unbindConnection(t1.out);

          this.assertHasType(t1.out, 'mammal');
        });

        siblingTest('Children and grandchildren', function() {
          const t1 = this.getMain('t', 't1');
          const t2 = this.getMain('t', 't2');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');

          this.bindConnection(t1.out, 'mammal');
          t1.in1.connect(t2.out);
          t1.in2.connect(catOut);
          t2.in1.connect(dogOut);
          this.unbindConnection(t1.out);

          this.assertHasType(t1.out, 'mammal');
        });

        siblingTest('Multiple have common parent', function() {
          const hierarchy = {
            'typeA': {},
            'typeB': {
              'fulfills': ['typeA'],
            },
            'typeC': {
              'fulfills': ['typeA'],
            },
            'typeD': {
              'fulfills': ['typeB', 'typeC'],
            },
            'typeE': {
              'fulfills': ['typeB', 'typeC'],
            },
          };
          const types = ['typeA', 'typeB', 'typeC', 'typeD', 'typeE'];
          const multiTypeBlocks = createBlockDefs(types);
          Blockly.defineBlocksWithJsonArray(multiTypeBlocks);
          this.checker.init(hierarchy);

          const t1 = this.getMain('t', 't1');
          const t2 = this.getMain('t', 't2');
          const typeAOut = this.getInnerOutput('typeA');
          const typeDOut = this.getInnerOutput('typeD');
          const typeEOut = this.getInnerOutput('typeE');

          t2.in1.connect(typeDOut);
          t2.in2.connect(typeEOut);
          t1.in1.connect(t2.out);
          t1.in2.connect(typeAOut);

          // Cleanup before asserting.
          for (const block of multiTypeBlocks) {
            delete Blockly.Blocks[block.type];
          }

          // Without proper filtering this could be ['typea', 'typea'].
          this.assertHasType(t1.out, ['typea']);
        });

        siblingTest('Multiple have different related common parents',
            function() {
              const hierarchy = {
                'typeA': {},
                'typeB': {
                  'fulfills': ['typeA'],
                },
                'typeC': {
                  'fulfills': ['typeA'],
                },
                'typeD': {
                  'fulfills': ['typeB'],
                },
                'typeE': {
                  'fulfills': ['typeD', 'typeC'],
                },
                'typeF': {
                  'fulfills': ['typeD', 'typeC'],
                },
              };
              const types =
                  ['typeA', 'typeB', 'typeC', 'typeD', 'typeE', 'typeF'];
              const multiTypeBlocks = createBlockDefs(types);
              Blockly.defineBlocksWithJsonArray(multiTypeBlocks);
              this.checker.init(hierarchy);

              const t1 = this.getMain('t', 't1');
              const t2 = this.getMain('t', 't2');
              const typeBOut = this.getInnerOutput('typeB');
              const typeEOut = this.getInnerOutput('typeE');
              const typeFOut = this.getInnerOutput('typeF');

              t2.in1.connect(typeEOut);
              t2.in2.connect(typeFOut);
              t1.in1.connect(t2.out);
              t1.in2.connect(typeBOut);

              // Cleanup before asserting.
              for (const block of multiTypeBlocks) {
                delete Blockly.Blocks[block.type];
              }

              // Without proper filtering this could be ['typeb', 'typea'].
              console.log('asserting');
              this.assertHasType(t1.out, ['typeb']);
            });

        siblingTest('Multiple have different related common parents 2',
            function() {
              const hierarchy = {
                'typeA': {},
                'typeB': {
                  'fulfills': ['typeA'],
                },
                'typeC': {
                  'fulfills': ['typeA'],
                },
                'typeD': {
                  'fulfills': ['typeB'],
                },
                // These fulfills are switched around, which makes this test
                // different!
                'typeE': {
                  'fulfills': ['typeC', 'typeD'],
                },
                'typeF': {
                  'fulfills': ['typeC', 'typeD'],
                },
              };
              const types =
                  ['typeA', 'typeB', 'typeC', 'typeD', 'typeE', 'typeF'];
              const multiTypeBlocks = createBlockDefs(types);
              Blockly.defineBlocksWithJsonArray(multiTypeBlocks);
              this.checker.init(hierarchy);

              const t1 = this.getMain('t', 't1');
              const t2 = this.getMain('t', 't2');
              const typeBOut = this.getInnerOutput('typeB');
              const typeEOut = this.getInnerOutput('typeE');
              const typeFOut = this.getInnerOutput('typeF');

              t2.in1.connect(typeEOut);
              t2.in2.connect(typeFOut);
              t1.in1.connect(t2.out);
              t1.in2.connect(typeBOut);

              // Cleanup before asserting.
              for (const block of multiTypeBlocks) {
                delete Blockly.Blocks[block.type];
              }

              // Without proper filtering this could be ['typea', 'typeb'].
              this.assertHasType(t1.out, ['typeb']);
            });

        runSiblingTests();
      });

      suite('Outputs', function() {
        clearSiblingTests();

        siblingTest('Siblings', function() {
          const t = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');
          const tOut = this.getInnerOutput('t');

          this.bindConnection(t.out, 'mammal');
          t.in1.connect(dogOut);
          t.in2.connect(catOut);
          t.in3.connect(tOut);
          this.unbindConnection(t.out);

          this.assertHasType(tOut, 'mammal');
        });

        siblingTest('Parsibs', function() {
          const t1 = this.getMain('t', 't1');
          const t2 = this.getMain('t', 't2');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');
          const tOut = this.getInnerOutput('t');

          this.bindConnection(t1.out, 'mammal');
          t1.in1.connect(dogOut);
          t1.in2.connect(catOut);
          t1.in3.connect(t2.out);
          t2.in1.connect(tOut);
          this.unbindConnection(t1.out);

          this.assertHasType(tOut, 'mammal');
        });

        siblingTest('Siblings and parsibs', function() {
          const t1 = this.getMain('t', 't1');
          const t2 = this.getMain('t', 't2');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');
          const tOut = this.getInnerOutput('t');

          this.bindConnection(t1.out, 'mammal');
          t1.in1.connect(dogOut);
          t1.in2.connect(t2.out);
          t2.in1.connect(catOut);
          t2.in2.connect(tOut);
          this.unbindConnection(t1.out);

          this.assertHasType(tOut, 'mammal');
        });

        siblingTest('Multiple have common parent', function() {
          const hierarchy = {
            'typeA': {},
            'typeB': {
              'fulfills': ['typeA'],
            },
            'typeC': {
              'fulfills': ['typeA'],
            },
            'typeD': {
              'fulfills': ['typeB', 'typeC'],
            },
            'typeE': {
              'fulfills': ['typeB', 'typeC'],
            },
          };
          const types = ['typeA', 'typeB', 'typeC', 'typeD', 'typeE'];
          const multiTypeBlocks = createBlockDefs(types);
          Blockly.defineBlocksWithJsonArray(multiTypeBlocks);
          this.checker.init(hierarchy);

          const t1 = this.getMain('t', 't1');
          const t2 = this.getMain('t', 't2');
          const typeAOut = this.getInnerOutput('typeA');
          const typeDOut = this.getInnerOutput('typeD');
          const typeEOut = this.getInnerOutput('typeE');
          const tOut = this.getInnerOutput('t');

          t2.in1.connect(typeDOut);
          t2.in2.connect(typeEOut);
          t1.in1.connect(t2.out);
          t1.in2.connect(typeAOut);
          t1.in3.connect(tOut);

          // Cleanup before asserting.
          for (const block of multiTypeBlocks) {
            delete Blockly.Blocks[block.type];
          }

          // Without proper filtering this could be ['typea', 'typea'].
          this.assertHasType(tOut, ['typea']);
        });

        siblingTest('Multiple have different related common parents',
            function() {
              const hierarchy = {
                'typeA': {},
                'typeB': {
                  'fulfills': ['typeA'],
                },
                'typeC': {
                  'fulfills': ['typeA'],
                },
                'typeD': {
                  'fulfills': ['typeB'],
                },
                'typeE': {
                  'fulfills': ['typeD', 'typeC'],
                },
                'typeF': {
                  'fulfills': ['typeD', 'typeC'],
                },
              };
              const types =
                  ['typeA', 'typeB', 'typeC', 'typeD', 'typeE', 'typeF'];
              const multiTypeBlocks = createBlockDefs(types);
              Blockly.defineBlocksWithJsonArray(multiTypeBlocks);
              this.checker.init(hierarchy);

              const t1 = this.getMain('t', 't1');
              const t2 = this.getMain('t', 't2');
              const typeBOut = this.getInnerOutput('typeB');
              const typeEOut = this.getInnerOutput('typeE');
              const typeFOut = this.getInnerOutput('typeF');
              const tOut = this.getInnerOutput('t');

              t2.in1.connect(typeEOut);
              t2.in2.connect(typeFOut);
              t1.in1.connect(t2.out);
              t1.in2.connect(typeBOut);
              t1.in3.connect(tOut);

              // Cleanup before asserting.
              for (const block of multiTypeBlocks) {
                delete Blockly.Blocks[block.type];
              }

              // Without proper filtering this could be ['typeb', 'typea'].
              this.assertHasType(tOut, ['typeb']);
            });

        siblingTest('Multiple have different related common parents 2',
            function() {
              const hierarchy = {
                'typeA': {},
                'typeB': {
                  'fulfills': ['typeA'],
                },
                'typeC': {
                  'fulfills': ['typeA'],
                },
                'typeD': {
                  'fulfills': ['typeB'],
                },
                // These fulfills are switched around, which makes this test
                // different!
                'typeE': {
                  'fulfills': ['typeC', 'typeD'],
                },
                'typeF': {
                  'fulfills': ['typeC', 'typeD'],
                },
              };
              const types =
                  ['typeA', 'typeB', 'typeC', 'typeD', 'typeE', 'typeF'];
              const multiTypeBlocks = createBlockDefs(types);
              Blockly.defineBlocksWithJsonArray(multiTypeBlocks);
              this.checker.init(hierarchy);

              const t1 = this.getMain('t', 't1');
              const t2 = this.getMain('t', 't2');
              const typeBOut = this.getInnerOutput('typeB');
              const typeEOut = this.getInnerOutput('typeE');
              const typeFOut = this.getInnerOutput('typeF');
              const tOut = this.getInnerOutput('t');

              t2.in1.connect(typeEOut);
              t2.in2.connect(typeFOut);
              t1.in1.connect(t2.out);
              t1.in2.connect(typeBOut);
              t1.in3.connect(tOut);

              // Cleanup before asserting.
              for (const block of multiTypeBlocks) {
                delete Blockly.Blocks[block.type];
              }

              // Without proper filtering this could be ['typea', 'typeb'].
              this.assertHasType(tOut, ['typeb']);
            });

        runSiblingTests();
      });
    });
  });

  suite('getExplicitTypesOfConnection', function() {
    setup(function() {
      this.assertNoType = function(conn) {
        const explicitTypes = this.checker.getExplicitTypesOfConnection(conn);
        chai.assert.deepEqual(explicitTypes, ['*'],
            'Expected the check of ' + conn.name + ' to evaluate to the ' +
            'TRUE_GENERIC_TYPE');
      };
      this.assertHasType = function(conn, type) {
        chai.assert.include(
            this.checker.getExplicitTypesOfConnection(conn), type,
            'Expected ' + conn.name + ' to have type ' + type + '.');
      };
    });

    clearTwoBlockTests();

    twoBlockTest('Explicit input', function() {
      const dogIn = this.getOuterInput('dog');
      this.assertHasType(dogIn, 'dog');
    });

    twoBlockTest('Explicit output', function() {
      const dogOut = this.getInnerOutput('dog');
      this.assertHasType(dogOut, 'dog');
    });

    twoBlockTest('Unbound generic input', function() {
      const tIn = this.getOuterInput('t');
      this.assertNoType(tIn);
    });

    twoBlockTest('Unbound generic output', function() {
      const tOut = this.getInnerOutput('t');
      this.assertNoType(tOut);
    });

    twoBlockTest('Programmatically bound input', function() {
      const tIn = this.getOuterInput('t');
      this.bindConnection(tIn, 'dog');
      this.assertHasType(tIn, 'dog');
    });

    twoBlockTest('Programmatically bound output', function() {
      const tOut = this.getInnerOutput('t');
      this.bindConnection(tOut, 'dog');
      this.assertHasType(tOut, 'dog');
    });

    twoBlockTest('Explicit inner', function() {
      const tIn = this.getOuterInput('t');
      const dogOut = this.getInnerOutput('dog');

      tIn.connect(dogOut);

      this.assertHasType(tIn, 'dog');
    });

    twoBlockTest('Explicit outer', function() {
      const dogIn = this.getOuterInput('dog');
      const tOut = this.getInnerOutput('t');

      dogIn.connect(tOut);

      this.assertHasType(tOut, 'dog');
    });

    runTwoBlockTests();

    suite('Parameters', function() {
      clearTwoBlockTests();

      twoBlockTest('T = List[Dog], child', function() {
        const tIn = this.getOuterInput('t');
        const listDogOut = this.getInnerOutput('list[dog]');
        tIn.connect(listDogOut);
        this.assertHasType(tIn, 'list[dog]');
      });

      twoBlockTest('T = List[Dog], parent', function() {
        const listDogIn = this.getOuterInput('list[dog]');
        const tOut = this.getInnerOutput('t');
        listDogIn.connect(tOut);
        this.assertHasType(tOut, 'list[dog]');
      });

      twoBlockTest('T = List[Dog], bind', function() {
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tOut, 'list[dog]');
        this.assertHasType(tOut, 'list[dog]');
      });

      twoBlockTest('T = List[T], child', function() {
        const tIn = this.getOuterInput('t');
        const listTOut = this.getInnerOutput('list[t]');
        tIn.connect(listTOut);
        this.assertHasType(tIn, 'list[*]');
      });

      runTwoBlockTests();
    });

    suite('Parameters', function() {
      clearTwoBlockTests();

      twoBlockTest('T = List[Dog], block - child', function() {
        const tIn = this.getOuterInput('t');
        const listDogOut = this.getInnerOutput('list[dog]');
        tIn.connect(listDogOut);
        this.assertHasType(tIn, 'list[dog]');
      });

      twoBlockTest('T = List[Dog], block - parent', function() {
        const listDogIn = this.getOuterInput('list[dog]');
        const tOut = this.getInnerOutput('t');
        listDogIn.connect(tOut);
        this.assertHasType(tOut, 'list[dog]');
      });

      twoBlockTest('T = List[T], parent', function() {
        const listTIn = this.getOuterInput('list[t]');
        const tOut = this.getInnerOutput('t');
        listTIn.connect(tOut);
        this.assertHasType(tOut, 'list[*]');
      });

      twoBlockTest('T = List[Dog], bound', function() {
        const tIn = this.getInnerOutput('t');
        this.bindConnection(tIn, 'list[dog]');
        this.assertHasType(tIn, 'list[dog]');
      });

      twoBlockTest('T = List[T], block - child', function() {
        const tIn = this.getOuterInput('t');
        const listTOut = this.getInnerOutput('list[t]');
        tIn.connect(listTOut);
        this.assertHasType(tIn, 'list[*]');
      });

      twoBlockTest('T = List[T], block - parent', function() {
        const listTIn = this.getOuterInput('list[t]');
        const tOut = this.getInnerOutput('t');
        listTIn.connect(tOut);
        this.assertHasType(tOut, 'list[*]');
      });

      // TODO: Evaluate generics in bound types.
      //   Also add more tests.
      twoBlockTest.skip('T = List[t], bind', function() {
        const tOut = this.getInnerOutput('t');
        this.bindConnection(tOut, 'list[t]');
        this.assertHasType(tOut, 'list[*]');
      });

      twoBlockTest('List[T] Unbound', function() {
        const tIn = this.getInnerOutput('list[t]');
        this.assertHasType(tIn, 'list[*]');
      });

      twoBlockTest('List[T] = T, block - child', function() {
        const listTIn = this.getOuterInput('list[t]');
        const tOut = this.getInnerOutput('t');
        listTIn.connect(tOut);
        this.assertHasType(listTIn, 'list[*]');
      }); // Cannot replicate w/ bind.

      twoBlockTest('List[T] = T, block - parent', function() {
        const tIn = this.getOuterInput('t');
        const listTOut = this.getInnerOutput('list[t]');
        tIn.connect(listTOut);
        this.assertHasType(listTOut, 'list[*]');
      }); // Cannot replicate w/ bind.

      twoBlockTest('List[T] = List[G], block - child', function() {
        const listTIn = this.getOuterInput('list[t]');
        const listGOut = this.getInnerOutput('list[g]');
        listTIn.connect(listGOut);
        this.assertHasType(listTIn, 'list[*]');
      });

      twoBlockTest('List[T] = List[G], block - parent', function() {
        const listGIn = this.getOuterInput('list[g]');
        const listTOut = this.getInnerOutput('list[t]');
        listGIn.connect(listTOut);
        this.assertHasType(listGIn, 'list[*]');
      });

      twoBlockTest.skip('List[T] = List[G], bind', function() {
        const listTIn = this.getOuterInput('list[t]');
        this.bindConnection(listTIn, 'g');
        this.assertHasType(listTIn, 'list[*]');
      });

      twoBlockTest('List[T] Unbound', function() {
        const tOut = this.getInnerOutput('list[t]');
        this.assertHasType(tOut, 'list[*]');
      });

      twoBlockTest('List[T], T = Dog, bind', function() {
        const tOut = this.getInnerOutput('list[t]');
        this.bindConnection(tOut, 'dog');
        this.assertHasType(tOut, 'list[dog]');
      });

      twoBlockTest('List[T], T = List[Dog], bind', function() {
        const tOut = this.getInnerOutput('list[t]');
        this.bindConnection(tOut, 'list[dog]');
        this.assertHasType(tOut, 'list[list[dog]]');
      });

      twoBlockTest('Dict[K, V], Unbound', function() {
        const tOut = this.getInnerOutput('dict[k, v]');
        this.assertHasType(tOut, 'dict[*, *]');
      });

      twoBlockTest('Dict[K, V], K = Dog, bind', function() {
        const tOut = this.getInnerOutput('dict[k, v]');
        this.bindType(tOut.block, 'dog', 'k');
        this.assertHasType(tOut, 'dict[dog, *]');
      });

      twoBlockTest('Dict[K, V], V = Dog, bind', function() {
        const tOut = this.getInnerOutput('dict[k, v]');
        this.bindType(tOut.block, 'dog', 'v');
        this.assertHasType(tOut, 'dict[*, dog]');
      });

      twoBlockTest('Dict[K, V], K = Dog, V = Dog, bind', function() {
        const tOut = this.getInnerOutput('dict[k, v]');
        this.bindType(tOut.block, 'dog', 'k');
        this.bindType(tOut.block, 'dog', 'v');
        this.assertHasType(tOut, 'dict[dog, dog]');
      });

      runTwoBlockTests();
    });
  });
});
