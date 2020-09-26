/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Unit tests for GenericMap
 */

const chai = require('chai');
const sinon = require('sinon');
const Blockly = require('blockly/node');

const {pluginInfo} = require('../src/index.js');
const {GenericMap, INPUT_PRIORITY, OUTPUT_PRIORITY} =
    require('../src/generic_map.js');

suite('GenericMap', function() {
  setup(function() {
    Blockly.defineBlocksWithJsonArray([
      {
        'type': 'static_animal',
        'message0': 'Animal',
        'output': ['Animal'],
        'style': 'math_blocks',
      },
      {
        'type': 'static_mammal',
        'message0': 'Mammal',
        'output': ['Mammal'],
        'style': 'math_blocks',
      },
      {
        'type': 'static_reptile',
        'message0': 'Reptile',
        'output': ['Reptile'],
        'style': 'math_blocks',
      },
      {
        'type': 'static_dog',
        'message0': 'Dog',
        'output': ['Dog'],
        'style': 'math_blocks',
      },
      {
        'type': 'static_bat',
        'message0': 'Bat',
        'output': ['Bat'],
        'style': 'math_blocks',
      },
      {
        'type': 'static_weigh_animal',
        'message0': 'Weigh Animal %1',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT',
            'check': 'Animal',
          },
        ],
        'style': 'math_blocks',
      },
      {
        'type': 'static_milk_mammal',
        'message0': 'Milk Mammal %1',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT',
            'check': 'Mammal',
          },
        ],
        'style': 'math_blocks',
      },
      {
        'type': 'static_train_dog',
        'message0': 'Train Dog %1',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT',
            'check': 'Dog',
          },
        ],
        'style': 'math_blocks',
      },
      {
        'type': 'static_launch_flying',
        'message0': 'Launch Flying Animal %1',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT',
            'check': 'FlyingAnimal',
          },
        ],
        'style': 'math_blocks',
      },
      {
        'type': 'static_identity',
        'message0': 'Identity %1',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT',
            'check': 'T',
          },
        ],
        'output': ['T'],
        'style': 'text_blocks',
      },
      {
        'type': 'static_select_random',
        'message0': 'Select Random %1 %2 %3',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT',
            'check': 'T',
          },
          {
            'type': 'input_value',
            'name': 'INPUT2',
            'check': 'T',
          },
          {
            'type': 'input_value',
            'name': 'INPUT3',
            'check': 'T',
          },
        ],
        'output': ['T'],
        'style': 'text_blocks',
      },
    ]);

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
      'Bat': {
        'fulfills': ['FlyingAnimal', 'Mammal'],
      },
    };

    const options = {
      plugins: {
        ...pluginInfo,
      },
    };

    this.workspace = new Blockly.Workspace(options);
    this.workspace.connectionChecker.init(hierarchyDef);
    this.genericMap = this.workspace.connectionChecker.getGenericMap();
  });

  teardown(function() {
    delete Blockly.Blocks['static_animal'];
    delete Blockly.Blocks['static_mammal'];
    delete Blockly.Blocks['static_reptile'];
    delete Blockly.Blocks['static_dog'];
    delete Blockly.Blocks['static_bat'];
    delete Blockly.Blocks['static_weigh_animal'];
    delete Blockly.Blocks['static_milk_mammal'];
    delete Blockly.Blocks['static_train_dog'];
    delete Blockly.Blocks['static_launch_flying'];
    delete Blockly.Blocks['static_identity'];
    delete Blockly.Blocks['static_select_random'];
  });

  suite('isGeneric_', function() {
    setup(function() {
      this.assertGeneric = function(check, boolVal) {
        const mockConn = {
          getCheck: function() {
            return [check];
          },
        };
        chai.assert.equal(this.genericMap.isGeneric(mockConn), boolVal);
      };
    });

    test('"a"', function() {
      this.assertGeneric('a', true);
    });

    test('"A"', function() {
      this.assertGeneric('A', true);
    });

    test('"*"', function() {
      this.assertGeneric('*', true);
    });

    test('"1"', function() {
      this.assertGeneric('1', true);
    });

    test('1', function() {
      this.assertGeneric(1, false);
    });

    test('"LongCheck"', function() {
      this.assertGeneric('LongCheck', false);
    });

    test('"\uD83D\uDE00" (emoji)', function() {
      this.assertGeneric('\uD83D\uDE00', false);
    });
  });

  suite('Priority', function() {
    setup(function() {
      this.block = this.workspace.newBlock('static_identity');

      this.assertHasType = function(type) {
        chai.assert.equal(
            this.genericMap.getExplicitType(this.block.id, 'T'),
            type);
      };

      this.bindType = function(type, priority) {
        this.genericMap.bindType(
            this.block.id, 'T', type, priority);
      };

      this.unbindType = function(type, priority) {
        this.genericMap.unbindType(
            this.block.id, 'T', type, priority);
      };
    });

    test('Input then output', function() {
      this.bindType('test', INPUT_PRIORITY);
      this.assertHasType('test');
      this.bindType('test2', OUTPUT_PRIORITY);
      this.assertHasType('test2');

      this.unbindType('test2', OUTPUT_PRIORITY);
      this.assertHasType('test');
    });

    test('Output then input', function() {
      this.bindType('test', OUTPUT_PRIORITY);
      this.assertHasType('test');
      this.bindType('test2', INPUT_PRIORITY);
      this.assertHasType('test');

      this.unbindType('test2', INPUT_PRIORITY);
      this.assertHasType('test');
    });

    test('Less than input', function() {
      this.bindType('test', 99);
      this.assertHasType('test');
      this.bindType('test2', INPUT_PRIORITY);
      this.assertHasType('test2');

      this.unbindType('test2', INPUT_PRIORITY);
      this.assertHasType('test');
    });

    test('Between input and output', function() {
      this.bindType('test', INPUT_PRIORITY);
      this.assertHasType('test');
      this.bindType('test2', 150);
      this.assertHasType('test2');
      this.bindType('test3', OUTPUT_PRIORITY);
      this.assertHasType('test3');

      this.unbindType('test3', OUTPUT_PRIORITY);
      this.assertHasType('test2');
      this.unbindType('test2', 150);
      this.assertHasType('test');
    });

    test('More than output', function() {
      this.bindType('test', OUTPUT_PRIORITY);
      this.assertHasType('test');
      this.bindType('test2', 201);
      this.assertHasType('test2');

      this.unbindType('test2', 201);
      this.assertHasType('test');
    });
  });

  // This suite checks that bindings get updated correctly. It doesn't have
  // anything to do with compatibility.
  suite('Binding: connect and disconnect', function() {
    setup(function() {
      this.clock = sinon.useFakeTimers();

      this.assertNoBinding = function(conn) {
        chai.assert.isUndefined(
            this.genericMap.getExplicitType(
                conn.getSourceBlock().id, conn.getCheck()[0]));
      };
      this.assertHasBinding = function(conn, binding) {
        chai.assert.equal(
            this.genericMap.getExplicitType(
                conn.getSourceBlock().id, conn.getCheck()[0]),
            binding);
      };

      this.getBlockOutput = function(blockType) {
        const block = this.workspace.newBlock(blockType);
        return [
          block.outputConnection,
          block.id,
          block,
        ];
      };
      this.getBlockInput = function(blockType) {
        const block = this.workspace.newBlock(blockType);
        return [
          block.getInput('INPUT').connection,
          block.id,
          block,
        ];
      };
    });

    teardown(function() {
      this.clock.restore();
    });

    suite('Simple, Two blocks', function() {

      test('Parent explicit, child explicit', function() {
        const [trainDogIn] = this.getBlockInput('static_train_dog');
        const [dogOut] = this.getBlockOutput('static_dog');

        trainDogIn.connect(dogOut);
        this.clock.tick(1);
        this.assertNoBinding(trainDogIn);
        this.assertNoBinding(dogOut);

        /*trainDogIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(trainDogIn);
        this.assertNoBinding(dogOut);*/
      });

      test('Parent explicit, child unbound', function() {
        const [trainDogIn] = this.getBlockInput('static_train_dog');
        const [identityOut] = this.getBlockOutput('static_identity');

        trainDogIn.connect(identityOut);
        this.clock.tick(1);
        this.assertNoBinding(trainDogIn);
        this.assertHasBinding(identityOut, 'Dog');

        /*trainDogIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(trainDogIn);
        this.assertNoBinding(identityOut);*/
      });

      test('Parent explicit, child bound', function() {
        const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
        const [identityOut, id] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);

        milkMammalIn.connect(identityOut);
        this.clock.tick(1);
        this.assertNoBinding(milkMammalIn);
        this.assertHasBinding(identityOut, 'Mammal');

        /*milkMammalIn.disconnect();
        this.clock.tick();
        this.assertNoBinding(milkMammalIn);
        this.assertHasBinding(identityOut, 'Dog');*/
      });

      test('Parent unbound, child explicit', function() {
        const [identityIn] = this.getBlockInput('static_identity');
        const [dogOut] = this.getBlockOutput('static_dog');

        identityIn.connect(dogOut);
        this.clock.tick(1);
        this.assertHasBinding(identityIn, 'Dog');
        this.assertNoBinding(dogOut);

        /*identityIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(identityIn);
        this.assertNoBinding(dogOut);*/
      });

      test('Parent unbound, child unbound', function() {
        const [identityIn] = this.getBlockInput('static_identity');
        const [identityOut] = this.getBlockOutput('static_identity');

        identityIn.connect(identityOut);
        this.clock.tick(1);
        this.assertNoBinding(identityIn);
        this.assertNoBinding(identityOut);

        /*identityIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(identityIn);
        this.assertNoBinding(identityOut);*/
      });

      test('Parent unbound, child bound', function() {
        const [identityIn] = this.getBlockInput('static_identity');
        const [identityOut, id] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);

        identityIn.connect(identityOut);
        this.clock.tick(1);
        this.assertHasBinding(identityIn, 'Dog');
        this.assertHasBinding(identityOut, 'Dog');

        /*identityIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(identityIn);
        this.assertHasBinding(identityOut, 'Dog');*/
      });

      test('Parent bound, child explicit', function() {
        const [identityIn, id] = this.getBlockInput('static_identity');
        const [dogOut] = this.getBlockOutput('static_dog');
        this.genericMap.bindType(id, 'T', 'Mammal', OUTPUT_PRIORITY);

        identityIn.connect(dogOut);
        this.clock.tick(1);
        this.assertHasBinding(identityIn, 'Mammal');
        this.assertNoBinding(dogOut);

        /*identityIn.disconnect();
        this.clock.tick(1);
        this.assertHasBinding(identityIn, 'Mammal');
        this.assertNoBinding(dogOut);*/
      });

      test('Parent bound, child unbound', function() {
        const [identityIn, id] = this.getBlockInput('static_identity');
        const [identityOut] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', OUTPUT_PRIORITY);

        identityIn.connect(identityOut);
        this.clock.tick(1);
        this.assertHasBinding(identityIn, 'Dog');
        this.assertHasBinding(identityOut, 'Dog');

        /*identityIn.disconnect();
        this.clock.tick(1);
        this.assertHasBinding(identityIn, 'Dog');
        this.assertNoBinding(identityOut);*/
      });

      test('Parent bound, child bound', function() {
        const [identityIn, inId] = this.getBlockInput('static_identity');
        const [identityOut, outId] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(inId, 'T', 'Mammal', OUTPUT_PRIORITY);
        this.genericMap.bindType(outId, 'T', 'Dog', INPUT_PRIORITY);

        identityIn.connect(identityOut);
        this.clock.tick(1);
        this.assertHasBinding(identityIn, 'Mammal');
        this.assertHasBinding(identityOut, 'Mammal');

        /*identityIn.disconnect();
        this.clock.tick(1);
        this.assertHasBinding(identityIn, 'Mammal');
        this.assertHasBinding(identityOut, 'Dog');*/
      });

      test('Parent explicit, child bound -> disconnect child\'s child',
          function() {
            const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
            const [identityOut, , identity] =
                this.getBlockOutput('static_identity');
            const identityIn = identity.getInput('INPUT').connection;
            const [dogOut] = this.getBlockOutput('static_dog');

            identityIn.connect(dogOut);
            this.clock.tick(1);
            this.assertHasBinding(identityIn, 'Dog');
            this.assertNoBinding(dogOut);

            milkMammalIn.connect(identityOut);
            this.clock.tick(1);
            this.assertNoBinding(milkMammalIn);
            this.assertHasBinding(identityIn, 'Mammal');
            this.assertNoBinding(dogOut);

            /*identityIn.disconnect();
            this.clock.tick();
            this.assertNoBinding(milkMammalIn);
            this.assertHasBinding(identityIn, 'Mammal');
            this.assertNoBinding(dogOut);*/
          });

      test('Parent bound, child explicit -> disconnect parent\'s parent',
          function() {
            const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
            const [identityIn, , identity] =
                this.getBlockInput('static_identity');
            const identityOut = identity.outputConnection;
            const [dogOut] = this.getBlockOutput('static_dog');

            milkMammalIn.connect(identityOut);
            this.clock.tick(1);
            this.assertNoBinding(milkMammalIn);
            this.assertHasBinding(identityIn, 'Mammal');

            identityIn.connect(dogOut);
            this.clock.tick(1);
            this.assertNoBinding(milkMammalIn);
            this.assertHasBinding(identityIn, 'Mammal');
            this.assertNoBinding(dogOut);

            /*milkMammalIn.disconnect();
            this.clock.tick(1);
            this.assertNoBinding(milkMammalIn);
            this.assertHasBinding(identityIn, 'Dog');
            this.assertNoBinding(dogOut);*/
          });
    });

    suite('Flow through connections', function() {
      test('A unbound, B unbound, C explicit', function() {
        const [aIn] = this.getBlockInput('static_identity');
        const [bIn, , b] = this.getBlockInput('static_identity');
        const bOut = b.outputConnection;
        const [cOut] = this.getBlockOutput('static_dog');

        aIn.connect(bOut);
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertNoBinding(bOut);

        bIn.connect(cOut);
        this.clock.tick(1);
        this.assertNoBinding(cOut);
        this.assertHasBinding(bIn, 'Dog');
        this.assertHasBinding(aIn, 'Dog');

        /*bIn.disconnect(cOut);
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertNoBinding(bIn);
        this.assertNoBinding(cOut);*/
      });

      test('A unbound, B unbound, C bound', function() {
        const [aIn] = this.getBlockInput('static_identity');
        const [bIn, , b] = this.getBlockInput('static_identity');
        const bOut = b.outputConnection;
        const [cOut, id] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);

        aIn.connect(bOut);
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertNoBinding(bIn);

        bIn.connect(cOut);
        this.clock.tick(1);
        this.assertHasBinding(bIn, 'Dog');
        this.assertHasBinding(aIn, 'Dog');

        /*bIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertNoBinding(bIn);*/
      });

      test('A explicit, B unbound, C unbound', function() {
        const [aIn] = this.getBlockInput('static_train_dog');
        const [bIn, , b] = this.getBlockInput('static_identity');
        const bOut = b.outputConnection;
        const [cOut] = this.getBlockOutput('static_identity');

        aIn.connect(bOut);
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertHasBinding(bOut, 'Dog');

        bIn.connect(cOut);
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertHasBinding(bIn, 'Dog');
        this.assertHasBinding(cOut, 'Dog');

        /*bIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertHasBinding(bIn, 'Dog');
        this.assertNoBinding(cOut);

        aIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertNoBinding(bOut);
        this.assertNoBinding(cOut);*/
      });

      test('A bound, B unbound, C unbound', function() {
        const [aIn, id] = this.getBlockInput('static_identity');
        const [bIn, , b] = this.getBlockInput('static_identity');
        const bOut = b.outputConnection;
        const [cOut] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);

        aIn.connect(bOut);
        this.clock.tick(1);
        this.assertHasBinding(bOut, 'Dog');

        bIn.connect(cOut);
        this.clock.tick(1);
        this.assertHasBinding(bOut, 'Dog');
        this.assertHasBinding(cOut, 'Dog');

        /*bIn.disconnect();
        this.clock.tick(1);
        this.assertHasBinding(bOut, 'Dog');
        this.assertNoBinding(cOut);

        aIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(bOut);
        this.assertNoBinding(cOut);*/
      });

      test('C explicit, B unbound, A unbound', function() {
        const [aIn] = this.getBlockInput('static_identity');
        const [bIn, , b] = this.getBlockInput('static_identity');
        const bOut = b.outputConnection;
        const [cOut] = this.getBlockOutput('static_dog');

        cOut.connect(bIn);
        this.clock.tick(1);
        this.assertNoBinding(cOut);
        this.assertHasBinding(bIn, 'Dog');

        bOut.connect(aIn);
        this.clock.tick(1);
        this.assertNoBinding(cOut);
        this.assertHasBinding(bOut, 'Dog');
        this.assertHasBinding(aIn, 'Dog');

        /*bOut.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(cOut);
        this.assertHasBinding(bOut, 'Dog');
        this.assertNoBinding(aIn);

        cOut.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(cOut);
        this.assertNoBinding(bIn);
        this.assertNoBinding(aIn);*/
      });

      test('C bound, B unbound, A unbound', function() {
        const [aIn] = this.getBlockInput('static_identity');
        const [bIn, , b] = this.getBlockInput('static_identity');
        const bOut = b.outputConnection;
        const [cOut, id] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);

        cOut.connect(bIn);
        this.clock.tick(1);
        this.assertHasBinding(bIn, 'Dog');

        bOut.connect(aIn);
        this.clock.tick(1);
        this.assertHasBinding(bOut, 'Dog');
        this.assertHasBinding(aIn, 'Dog');

        /*bOut.disconnect();
        this.clock.tick(1);
        this.assertHasBinding(bOut, 'Dog');
        this.assertNoBinding(aIn);

        cOut.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(bIn);
        this.assertNoBinding(aIn);*/
      });

      test('C unbound, B unbound, A explicit', function() {
        const [aIn] = this.getBlockInput('static_train_dog');
        const [bIn, , b] = this.getBlockInput('static_identity');
        const bOut = b.outputConnection;
        const [cOut] = this.getBlockOutput('static_identity');

        cOut.connect(bIn);
        this.clock.tick(1);
        this.assertNoBinding(cOut);
        this.assertNoBinding(bIn);

        bOut.connect(aIn);
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertHasBinding(bOut, 'Dog');
        this.assertHasBinding(cOut, 'Dog');

        /*bOut.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(aIn);
        this.assertNoBinding(cOut);
        this.assertNoBinding(bIn);*/
      });

      test('C unbound, B unbound, A bound', function() {
        const [aIn, id] = this.getBlockInput('static_identity');
        const [bIn, , b] = this.getBlockInput('static_identity');
        const bOut = b.outputConnection;
        const [cOut] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', OUTPUT_PRIORITY);

        cOut.connect(bIn);
        this.clock.tick(1);
        this.assertNoBinding(cOut);
        this.assertNoBinding(bIn);

        bOut.connect(aIn);
        this.clock.tick(1);
        this.assertHasBinding(bOut, 'Dog');
        this.assertHasBinding(cOut, 'Dog');

        /*bOut.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(cOut);
        this.assertNoBinding(bIn);*/
      });

      test('Flow to sibling, explicit', function() {
        const [selectRandomIn1, , selectRandom] =
            this.getBlockInput('static_select_random');
        const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
        const [identityOut] = this.getBlockOutput('static_identity');
        const [dogOut] = this.getBlockOutput('static_dog');

        selectRandomIn1.connect(identityOut);
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut);

        selectRandomIn2.connect(dogOut);
        this.clock.tick(1);
        this.assertHasBinding(selectRandomIn1, 'Dog');
        this.assertHasBinding(identityOut, 'Dog');

        /*selectRandomIn2.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut);*/
      });

      test('Flow to sibling, bound', function() {
        const [selectRandomIn1, , selectRandom] =
            this.getBlockInput('static_select_random');
        const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
        const [identityOut1] = this.getBlockOutput('static_identity');
        const [identityOut2, id] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);

        selectRandomIn1.connect(identityOut1);
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut1);

        selectRandomIn2.connect(identityOut2);
        this.clock.tick(1);
        this.assertHasBinding(selectRandomIn1, 'Dog');
        this.assertHasBinding(identityOut1, 'Dog');

        /*selectRandomIn2.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut1);*/
      });

      test('Flow to parsib, explicit', function() {
        const [selectRandomIn1, , selectRandom] =
            this.getBlockInput('static_select_random');
        const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
        const [identityOut1] = this.getBlockOutput('static_identity');
        const [identityIn, , identity] = this.getBlockInput('static_identity');
        const identityOut2 = identity.outputConnection;
        const [dogOut] = this.getBlockOutput('static_dog');

        selectRandomIn1.connect(identityOut1);
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut1);

        selectRandomIn2.connect(identityOut2);
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut1);
        this.assertNoBinding(identityOut2);

        identityIn.connect(dogOut);
        this.clock.tick(1);
        this.assertHasBinding(selectRandomIn1, 'Dog');
        this.assertHasBinding(identityOut1, 'Dog');
        this.assertHasBinding(identityOut2, 'Dog');

        /*identityIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut1);
        this.assertNoBinding(identityOut2);*/
      });

      test('Flow to parsib, bound', function() {
        const [selectRandomIn1, , selectRandom] =
            this.getBlockInput('static_select_random');
        const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
        const [identityOut1] = this.getBlockOutput('static_identity');
        const [identityIn, , identity] = this.getBlockInput('static_identity');
        const identityOut2 = identity.outputConnection;
        const [identityOut3, id] = this.getBlockOutput('static_identity');
        this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);

        selectRandomIn1.connect(identityOut1);
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut1);

        selectRandomIn2.connect(identityOut2);
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut1);
        this.assertNoBinding(identityOut2);

        identityIn.connect(identityOut3);
        this.clock.tick(1);
        this.assertHasBinding(selectRandomIn1, 'Dog');
        this.assertHasBinding(identityOut1, 'Dog');
        this.assertHasBinding(identityOut2, 'Dog');

        /*identityIn.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(selectRandomIn1);
        this.assertNoBinding(identityOut1);
        this.assertNoBinding(identityOut2);*/
      });
    });

    suite('Multiple direct children', function() {
      test('Parent unbound, multiple child explicit sub same', function() {
        const [selectRandomIn1, , selectRandom] =
            this.getBlockInput('static_select_random');
        const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
        const [dogOut1] = this.getBlockOutput('static_dog');
        const [dogOut2] = this.getBlockOutput('static_dog');

        selectRandomIn1.connect(dogOut1);
        this.clock.tick(1);
        this.assertNoBinding(dogOut1);
        this.assertHasBinding(selectRandomIn1, 'Dog');

        selectRandomIn2.connect(dogOut2);
        this.clock.tick(1);
        this.assertNoBinding(dogOut1);
        this.assertNoBinding(dogOut2);
        this.assertHasBinding(selectRandomIn1, 'Dog');

        /*selectRandomIn1.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(dogOut2);
        this.assertHasBinding(selectRandomIn1, 'Dog');

        selectRandomIn2.disconnect();
        this.clock.tick(1);
        this.assertNoBinding(dogOut2);
        this.assertNoBinding(selectRandomIn2);*/
      });

      // The following tests are for if we decide to implement Proposal 2.
      // https://docs.google.com/document/d/1QKYkmWjkle1JWCi3O8jXr8-7Toazh1pW_4EaVVgB_OI/edit#heading=h.z2m9hs1ghrwp
      test.skip('Parent unbound, multiple child explicit sub different',
          function() {
            const [selectRandomIn1, , selectRandom] =
                this.getBlockInput('static_select_random');
            const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
            const [dogOut] = this.getBlockOutput('static_dog');
            const [batOut] = this.getBlockOutput('static_bat');

            selectRandomIn1.connect(dogOut);
            this.clock.tick(1);
            this.assertNoBinding(dogOut);
            this.assertHasBinding(selectRandomIn1, 'Dog');

            selectRandomIn2.connect(batOut);
            this.clock.tick(1);
            this.assertNoBinding(dogOut);
            this.assertNoBinding(batOut);
            this.assertHasBinding(selectRandomIn1, 'Mammal');

            selectRandomIn1.disconnect();
            this.clock.tick(1);
            this.assertNoBinding(batOut);
            this.assertHasBinding(selectRandomIn1, 'Bat');

            selectRandomIn2.disconnect();
            this.clock.tick(1);
            this.assertNoBinding(batOut);
            this.assertNoBinding(selectRandomIn2);
          });

      test.skip('Parent unbound, multiple child explicit sub mixed levels',
          function() {
            const [selectRandomIn1, , selectRandom] =
                this.getBlockInput('static_select_random');
            const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
            const [dogOut] = this.getBlockOutput('static_dog');
            const [mammalOut] = this.getBlockOutput('static_mammal');

            selectRandomIn1.connect(dogOut);
            this.clock.tick(1);
            this.assertNoBinding(dogOut);
            this.assertHasBinding(selectRandomIn1, 'Dog');

            selectRandomIn2.connect(mammalOut);
            this.clock.tick(1);
            this.assertNoBinding(dogOut);
            this.assertNoBinding(mammalOut);
            this.assertHasBinding(selectRandomIn1, 'Mammal');

            selectRandomIn1.disconnect();
            this.clock.tick(1);
            this.assertNoBinding(mammalOut);
            this.assertHasBinding(selectRandomIn1, 'Mammal');

            selectRandomIn2.disconnect();
            this.clock.tick(1);
            this.assertNoBinding(mammalOut);
            this.assertNoBinding(selectRandomIn2);
          });

      test.skip('Parent unbound, multiple child explicit sub mixed levels 2',
          function() {
            const [selectRandomIn1, , selectRandom] =
                this.getBlockInput('static_select_random');
            const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
            const [dogOut] = this.getBlockOutput('static_dog');
            const [reptileOut] = this.getBlockOutput('static_reptile');

            selectRandomIn1.connect(dogOut);
            this.clock.tick(1);
            this.assertNoBinding(dogOut);
            this.assertHasBinding(selectRandomIn1, 'Dog');

            selectRandomIn2.connect(reptileOut);
            this.clock.tick(1);
            this.assertNoBinding(dogOut);
            this.assertNoBinding(reptileOut);
            this.assertHasBinding(selectRandomIn1, 'Animal');

            selectRandomIn1.disconnect();
            this.clock.tick(1);
            this.assertNoBinding(reptileOut);
            this.assertHasBinding(selectRandomIn1, 'Reptile');

            selectRandomIn2.disconnect();
            this.clock.tick(1);
            this.assertNoBinding(reptileOut);
            this.assertNoBinding(selectRandomIn2);
          });
    });
  });
});

