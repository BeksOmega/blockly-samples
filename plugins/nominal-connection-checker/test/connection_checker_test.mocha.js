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

const {pluginInfo} = require('../src/index.js');
const {INPUT_PRIORITY, OUTPUT_PRIORITY} = require('../src/generic_map.js');

suite('NominalConnectionChecker', function() {
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
    this.checker = this.workspace.connectionChecker;
    this.genericMap = this.checker.getGenericMap();

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

    this.assertCanConnect = function(conn1, conn2) {
      chai.assert.isTrue(this.checker.doTypeChecks(conn1, conn2));
    };
    this.assertCannotConnect = function(conn1, conn2) {
      chai.assert.isFalse(this.checker.doTypeChecks(conn1, conn2));
    };
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

  suite('Simple subtyping', function() {
    test('Exact types', function() {
      const [dogOut] = this.getBlockOutput('static_dog');
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      this.assertCanConnect(dogOut, trainDogIn);
    });

    test('Simple super', function() {
      const [dogOut] = this.getBlockOutput('static_dog');
      const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
      this.assertCanConnect(dogOut, milkMammalIn);
    });

    test('Multiple supers', function() {
      const [batOut] = this.getBlockOutput('static_bat');
      const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
      const [launchFlyingIn] = this.getBlockInput('static_launch_flying');
      this.assertCanConnect(batOut, milkMammalIn);
      this.assertCanConnect(batOut, launchFlyingIn);
    });

    test('Deep supers', function() {
      const [dogOut] = this.getBlockOutput('static_dog');
      const [weighAnimalIn] = this.getBlockInput('static_weigh_animal');
      this.assertCanConnect(dogOut, weighAnimalIn);
    });

    test('Multiple output checks', function() {
      const [dogOut] = this.getBlockOutput('static_dog');
      dogOut.setCheck(['Random', 'Dog']);
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      this.assertCannotConnect(dogOut, trainDogIn);
    });

    test('Multiple input checks', function() {
      const [dogOut] = this.getBlockOutput('static_dog');
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      trainDogIn.setCheck(['Random', 'Dog']);
      this.assertCannotConnect(dogOut, trainDogIn);
    });

    test('Unrelated types', function() {
      const [batOut] = this.getBlockOutput('static_bat');
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      this.assertCannotConnect(batOut, trainDogIn);
    });

    test('Backwards types', function() {
      const [mammalOut] = this.getBlockOutput('static_mammal');
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      this.assertCannotConnect(mammalOut, trainDogIn);
    });
  });

  suite('Simple generics', function() {
    // Both explicit is the other suite.

    test('Parent explicit, child unbound', function() {
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      const [identityOut] = this.getBlockOutput('static_identity');
      this.assertCanConnect(trainDogIn, identityOut);
    });

    test('Parent explicit, child bound sub', function() {
      const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
      const [identityOut, id] = this.getBlockOutput('static_identity');
      this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);
      this.assertCanConnect(milkMammalIn, identityOut);
    });

    test('Parent explicit, child bound super', function() {
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      const [identityOut, id] = this.getBlockOutput('static_identity');
      this.genericMap.bindType(id, 'T', 'Mammal', INPUT_PRIORITY);
      this.assertCannotConnect(trainDogIn, identityOut);
    });

    test('Parent unbound, child explicit', function() {
      const [identityIn] = this.getBlockInput('static_identity');
      const [dogOut] = this.getBlockOutput('static_dog');
      this.assertCanConnect(identityIn, dogOut);
    });

    test('Parent unbound, child unbound', function() {
      const [identityIn] = this.getBlockInput('static_identity');
      const [identityOut] = this.getBlockOutput('static_identity');
      this.assertCanConnect(identityIn, identityOut);
    });

    test('Parent unbound, child bound', function() {
      const [identityIn] = this.getBlockInput('static_identity');
      const [identityOut, id] = this.getBlockOutput('static_identity');
      this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);
      this.assertCanConnect(identityIn, identityOut);
    });

    test('Parent bound, child explicit sub', function() {
      const [identityIn, id] = this.getBlockInput('static_identity');
      const [dogOut] = this.getBlockOutput('static_dog');
      this.genericMap.bindType(id, 'T', 'Mammal', OUTPUT_PRIORITY);
      this.assertCanConnect(identityIn, dogOut);
    });

    test('Parent bound, child explicit super', function() {
      const [identityIn, id] = this.getBlockInput('static_identity');
      const [mammalOut] = this.getBlockOutput('static_mammal');
      this.genericMap.bindType(id, 'T', 'Dog', OUTPUT_PRIORITY);
      this.assertCannotConnect(identityIn, mammalOut);
    });

    test('Parent bound, child unbound', function() {
      const [identityIn, id] = this.getBlockInput('static_identity');
      const [identityOut] = this.getBlockOutput('static_identity');
      this.genericMap.bindType(id, 'T', 'Dog', OUTPUT_PRIORITY);
      this.assertCanConnect(identityIn, identityOut);
    });

    test('Parent bound, child bound sub', function() {
      const [identityIn, inId] = this.getBlockInput('static_identity');
      const [identityOut, outId] = this.getBlockOutput('static_identity');
      this.genericMap.bindType(inId, 'T', 'Mammal', OUTPUT_PRIORITY);
      this.genericMap.bindType(outId, 'T', 'Dog', INPUT_PRIORITY);
      this.assertCanConnect(identityIn, identityOut);
    });

    test('Parent bound, child bound super', function() {
      const [identityIn, inId] = this.getBlockInput('static_identity');
      const [identityOut, outId] = this.getBlockOutput('static_identity');
      this.genericMap.bindType(inId, 'T', 'Dog', OUTPUT_PRIORITY);
      this.genericMap.bindType(outId, 'T', 'Mammal', INPUT_PRIORITY);
      this.assertCannotConnect(identityIn, identityOut);
    });

    test('Parent bound, multiple child explicit sub', function() {
      const [selectRandomIn, id] = this.getBlockInput('static_select_random');
      const [dogOut] = this.getBlockOutput('static_dog');
      const [batOut] = this.getBlockOutput('static_bat');
      this.genericMap.bindType(id, 'T', 'Mammal', OUTPUT_PRIORITY);
      this.assertCanConnect(selectRandomIn, dogOut);
      this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);
      // Expect the output binding to get priority.
      this.assertCanConnect(selectRandomIn, batOut);
    });

    test.skip('Parent unbound, multiple child explicit sub', function() {
      const [selectRandomIn, id] = this.getBlockInput('static_select_random');
      const [dogOut] = this.getBlockOutput('static_dog');
      const [batOut] = this.getBlockOutput('static_bat');
      this.assertCanConnect(selectRandomIn, dogOut);
      this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);

      // TODO: Pick functionality.
      this.assertCanConnect(selectRandomIn, batOut);
      this.assertCannotConnect(selectRandomIn, batOut);
    });

    test('Parent explicit, child bound multiple explicit sub', function() {
      const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
      const [selectRandomOut, id] = this.getBlockOutput('static_select_random');
      this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);
      this.genericMap.bindType(id, 'T', 'Bat', INPUT_PRIORITY);
      this.assertCanConnect(milkMammalIn, selectRandomOut);
    });

    test('Parent explicit, child bound multiple explicit some sub', function() {
      const [launchFlyingIn] = this.getBlockInput('static_launch_flying');
      const [selectRandomOut, id] = this.getBlockOutput('static_select_random');
      this.genericMap.bindType(id, 'T', 'Dog', INPUT_PRIORITY);
      this.genericMap.bindType(id, 'T', 'Bat', INPUT_PRIORITY);
      this.assertCannotConnect(launchFlyingIn, selectRandomOut);
    });
  });
});
