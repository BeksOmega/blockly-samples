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
const {
  clearTwoBlockTests, twoBlockTest, runTwoBlockTests,
  clearThreeBlockTests, threeBlockTest, runThreeBlockTests,
  clearSiblingTests, siblingTest, runSiblingTests,
} = require('./connection_checker_test_helper.mocha');

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
        'type': 'static_cat',
        'message0': 'Cat',
        'output': ['Cat'],
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
      'Cat': {
        'fulfills': ['Mammal'],
      },
      'Bat': {
        'fulfills': ['FlyingAnimal', 'Mammal'],
      },
    };

    const types = Object.keys(hierarchyDef);
    types.push('T');
    this.blocks = [];
    for (let type of types) {
      type = type.toLowerCase();
      this.blocks.push({
        'type': 'static_' + type + '_outer_value',
        'message0': '%1',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT1',
            'check': [type],
          },
        ],
      });
      this.blocks.push({
        'type': 'static_' + type + '_outer_statement',
        'message0': '%1',
        'args0': [
          {
            'type': 'input_statement',
            'name': 'INPUT1',
            'check': [type],
          },
        ],
      });
      this.blocks.push({
        'type': 'static_' + type + '_outer_next',
        'message0': '',
        'nextStatement': [type],
      });

      this.blocks.push({
        'type': 'static_' + type + '_inner_out',
        'message0': '',
        'output': [type],
      });
      this.blocks.push({
        'type': 'static_' + type + '_inner_prev',
        'message0': '',
        'previousStatement': [type],
      });

      this.blocks.push({
        'type': 'static_' + type + '_main_out_value',
        'message0': '%1 %2 %3',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT1',
            'check': [type],
          },
          {
            'type': 'input_value',
            'name': 'INPUT2',
            'check': [type],
          },
          {
            'type': 'input_value',
            'name': 'INPUT3',
            'check': [type],
          },
        ],
        'output': [type],
      });
      this.blocks.push({
        'type': 'static_' + type + '_main_out_statement',
        'message0': '%1 %2 %3',
        'args0': [
          {
            'type': 'input_statement',
            'name': 'INPUT1',
            'check': [type],
          },
          {
            'type': 'input_statement',
            'name': 'INPUT2',
            'check': [type],
          },
          {
            'type': 'input_statement',
            'name': 'INPUT3',
            'check': [type],
          },
        ],
        'output': [type],
      });
      this.blocks.push({
        'type': 'static_' + type + '_main_out_next',
        'message0': '',
        'output': [type],
        'nextStatement': [type],
      });
      this.blocks.push({
        'type': 'static_' + type + '_main_prev_value',
        'message0': '%1 %2 %3',
        'args0': [
          {
            'type': 'input_value',
            'name': 'INPUT1',
            'check': [type],
          },
          {
            'type': 'input_value',
            'name': 'INPUT2',
            'check': [type],
          },
          {
            'type': 'input_value',
            'name': 'INPUT3',
            'check': [type],
          },
        ],
        'previousStatement': [type],
      });
      this.blocks.push({
        'type': 'static_' + type + '_main_prev_statement',
        'message0': '%1 %2 %3',
        'args0': [
          {
            'type': 'input_statement',
            'name': 'INPUT1',
            'check': [type],
          },
          {
            'type': 'input_statement',
            'name': 'INPUT2',
            'check': [type],
          },
          {
            'type': 'input_statement',
            'name': 'INPUT3',
            'check': [type],
          },
        ],
        'previousStatement': [type],
      });
      this.blocks.push({
        'type': 'static_' + type + '_main_prev_next',
        'message0': '',
        'previousStatement': [type],
        'nextStatement': [type],
      });
    }

    Blockly.defineBlocksWithJsonArray(this.blocks);

    const options = {
      plugins: {
        ...pluginInfo,
      },
    };

    this.workspace = new Blockly.Workspace(options);
    this.workspace.connectionChecker.init(hierarchyDef);
    this.checker = this.workspace.connectionChecker;

    this.getBlockOutput = function(blockType) {
      const block = this.workspace.newBlock(blockType);
      return [
        block.outputConnection,
        block,
      ];
    };
    this.getBlockInput = function(blockType) {
      const block = this.workspace.newBlock(blockType);
      return [
        block.getInput('INPUT').connection,
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
    delete Blockly.Blocks['static_cat'];
    delete Blockly.Blocks['static_bat'];
    delete Blockly.Blocks['static_weigh_animal'];
    delete Blockly.Blocks['static_milk_mammal'];
    delete Blockly.Blocks['static_train_dog'];
    delete Blockly.Blocks['static_launch_flying'];
    delete Blockly.Blocks['static_identity'];
    delete Blockly.Blocks['static_select_random'];

    for (const block of this.blocks) {
      delete Blockly.Blocks[block.type];
    }
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

    test('Simple super - statement input', function() {

    });

    test('Simple super - next and prev connections', function() {

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
      dogOut.setCheck(['Random', 'dog']);
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      this.assertCannotConnect(dogOut, trainDogIn);
    });

    test('Multiple input checks', function() {
      const [dogOut] = this.getBlockOutput('static_dog');
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      trainDogIn.setCheck(['Random', 'dog']);
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
      const [identityOut, block] = this.getBlockOutput('static_identity');
      this.checker.bindType(block, 'T', 'dog');
      this.assertCanConnect(milkMammalIn, identityOut);
    });

    test('Parent explicit, child bound super', function() {
      const [trainDogIn] = this.getBlockInput('static_train_dog');
      const [identityOut, block] = this.getBlockOutput('static_identity');
      this.checker.bindType(block, 'T', 'mammal');
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
      const [identityOut, block] = this.getBlockOutput('static_identity');
      this.checker.bindType(block, 'T', 'dog');
      this.assertCanConnect(identityIn, identityOut);
    });

    test('Parent bound, child explicit sub', function() {
      const [identityIn, block] = this.getBlockInput('static_identity');
      const [dogOut] = this.getBlockOutput('static_dog');
      this.checker.bindType(block, 'T', 'mammal');
      this.assertCanConnect(identityIn, dogOut);
    });

    test('Parent bound, child explicit super', function() {
      const [identityIn, block] = this.getBlockInput('static_identity');
      const [mammalOut] = this.getBlockOutput('static_mammal');
      this.checker.bindType(block, 'T', 'dog');
      this.assertCannotConnect(identityIn, mammalOut);
    });

    test('Parent bound, child unbound', function() {
      const [identityIn, block] = this.getBlockInput('static_identity');
      const [identityOut] = this.getBlockOutput('static_identity');
      this.checker.bindType(block, 'T', 'dog');
      this.assertCanConnect(identityIn, identityOut);
    });

    test('Parent bound, child bound sub', function() {
      const [identityIn, inBlock] = this.getBlockInput('static_identity');
      const [identityOut, outBlock] = this.getBlockOutput('static_identity');
      this.checker.bindType(inBlock, 'T', 'mammal');
      this.checker.bindType(outBlock, 'T', 'dog');
      this.assertCanConnect(identityIn, identityOut);
    });

    test('Parent bound, child bound super', function() {
      const [identityIn, inBlock] = this.getBlockInput('static_identity');
      const [identityOut, outBlock] = this.getBlockOutput('static_identity');
      this.checker.bindType(inBlock, 'T', 'dog');
      this.checker.bindType(outBlock, 'T', 'mammal');
      this.assertCannotConnect(identityIn, identityOut);
    });
  });

  suite('Multiple explicit types on generics', function() {
    setup(function() {
      this.checker.init({
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
      });
    });

    test('Multi parent - compat child', function() {
      const [selectRandomIn1, selectRandom] =
          this.getBlockInput('static_select_random');
      const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
      const selectRandomIn3 = selectRandom.getInput('INPUT3').connection;

      const [identity1Out, identity1] = this.getBlockOutput('static_identity');
      const [identity2Out, identity2] = this.getBlockOutput('static_identity');
      const [identity3Out, identity3] = this.getBlockOutput('static_identity');

      this.checker.bindType(identity1, 'T', 'typeC');
      this.checker.bindType(identity2, 'T', 'typeD');
      this.checker.bindType(identity3, 'T', 'typeA');

      this.checker.bindType(selectRandom, 'T', 'typeA');
      selectRandomIn1.connect(identity1Out);
      selectRandomIn2.connect(identity2Out);
      this.checker.unbindType(selectRandom, 'T');

      this.assertCanConnect(selectRandomIn3, identity3Out);
    });

    test('Multi parent - incompat child', function() {
      const [selectRandomIn1, selectRandom] =
          this.getBlockInput('static_select_random');
      const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
      const selectRandomIn3 = selectRandom.getInput('INPUT3').connection;

      const [identity1Out, identity1] = this.getBlockOutput('static_identity');
      const [identity2Out, identity2] = this.getBlockOutput('static_identity');
      const [identity3Out, identity3] = this.getBlockOutput('static_identity');

      this.checker.bindType(identity1, 'T', 'typeC');
      this.checker.bindType(identity2, 'T', 'typeD');
      this.checker.bindType(identity3, 'T', 'typeE');

      this.checker.bindType(selectRandom, 'T', 'typeA');
      selectRandomIn1.connect(identity1Out);
      selectRandomIn2.connect(identity2Out);
      this.checker.unbindType(selectRandom, 'T');

      this.assertCannotConnect(selectRandomIn3, identity3Out);
    });

    test('Multi child - compat parent', function() {
      const [identityIn, identity1] = this.getBlockInput('static_identity');
      const [selectRandomIn1, selectRandom] =
          this.getBlockInput('static_select_random');
      const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
      const selectRandomOut = selectRandom.outputConnection;

      const [identity2Out, identity2] = this.getBlockOutput('static_identity');
      const [identity3Out, identity3] = this.getBlockOutput('static_identity');

      this.checker.bindType(identity1, 'T', 'typeA');
      this.checker.bindType(identity2, 'T', 'typeC');
      this.checker.bindType(identity3, 'T', 'typeD');

      this.checker.bindType(selectRandom, 'T', 'typeA');
      selectRandomIn1.connect(identity2Out);
      selectRandomIn2.connect(identity3Out);
      this.checker.unbindType(selectRandom, 'T');

      this.assertCanConnect(identityIn, selectRandomOut);
    });

    test('Multi child - incompat parent', function() {
      const [identityIn, identity1] = this.getBlockInput('static_identity');
      const [selectRandomIn1, selectRandom] =
          this.getBlockInput('static_select_random');
      const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
      const selectRandomOut = selectRandom.outputConnection;

      const [identity2Out, identity2] = this.getBlockOutput('static_identity');
      const [identity3Out, identity3] = this.getBlockOutput('static_identity');

      this.checker.bindType(identity1, 'T', 'typeE');
      this.checker.bindType(identity2, 'T', 'typeC');
      this.checker.bindType(identity3, 'T', 'typeD');

      this.checker.bindType(selectRandom, 'T', 'typeA');
      selectRandomIn1.connect(identity2Out);
      selectRandomIn2.connect(identity3Out);
      this.checker.unbindType(selectRandom, 'T');

      this.assertCannotConnect(identityIn, selectRandomOut);
    });

    test('Multi parent and child - compatible', function() {
      const [selectRandom1In1, selectRandom1] =
          this.getBlockInput('static_select_random');
      const selectRandom1In2 = selectRandom1.getInput('INPUT2').connection;
      const selectRandom1In3 = selectRandom1.getInput('INPUT3').connection;
      const [selectRandom2In1, selectRandom2] =
          this.getBlockInput('static_select_random');
      const selectRandom2In2 = selectRandom2.getInput('INPUT2').connection;
      const selectRandom2Out = selectRandom2.outputConnection;

      const [identityOut1, identity1] = this.getBlockOutput('static_identity');
      const [identityOut2, identity2] = this.getBlockOutput('static_identity');
      const [identityOut3, identity3] = this.getBlockOutput('static_identity');
      const [identityOut4, identity4] = this.getBlockOutput('static_identity');

      this.checker.bindType(identity1, 'T', 'typeC');
      this.checker.bindType(identity2, 'T', 'typeD');
      this.checker.bindType(identity3, 'T', 'typeC');
      this.checker.bindType(identity4, 'T', 'typeD');

      this.checker.bindType(selectRandom1, 'T', 'typeA');
      this.checker.bindType(selectRandom2, 'T', 'typeA');
      selectRandom1In1.connect(identityOut1);
      selectRandom1In2.connect(identityOut2);
      selectRandom2In1.connect(identityOut3);
      selectRandom2In2.connect(identityOut4);
      this.checker.unbindType(selectRandom1, 'T');
      this.checker.unbindType(selectRandom2, 'T');

      this.assertCanConnect(selectRandom1In3, selectRandom2Out);
    });

    test('Multi parent and child - incompatible', function() {
      const [selectRandom1In1, selectRandom1] =
          this.getBlockInput('static_select_random');
      const selectRandom1In2 = selectRandom1.getInput('INPUT2').connection;
      const selectRandom1In3 = selectRandom1.getInput('INPUT3').connection;
      const [selectRandom2In1, selectRandom2] =
          this.getBlockInput('static_select_random');
      const selectRandom2In2 = selectRandom2.getInput('INPUT2').connection;
      const selectRandom2Out = selectRandom2.outputConnection;

      const [identityOut1, identity1] = this.getBlockOutput('static_identity');
      const [identityOut2, identity2] = this.getBlockOutput('static_identity');
      const [identityOut3, identity3] = this.getBlockOutput('static_identity');
      const [identityOut4, identity4] = this.getBlockOutput('static_identity');

      this.checker.bindType(identity1, 'T', 'typeC');
      this.checker.bindType(identity2, 'T', 'typeD');
      this.checker.bindType(identity3, 'T', 'typeG');
      this.checker.bindType(identity4, 'T', 'typeH');

      this.checker.bindType(selectRandom1, 'T', 'typeA');
      this.checker.bindType(selectRandom2, 'T', 'typeE');
      selectRandom1In1.connect(identityOut1);
      selectRandom1In2.connect(identityOut2);
      selectRandom2In1.connect(identityOut3);
      selectRandom2In2.connect(identityOut4);
      this.checker.unbindType(selectRandom1, 'T');
      this.checker.unbindType(selectRandom2, 'T');

      this.assertCannotConnect(selectRandom1In3, selectRandom2Out);
    });
  });

  suite('Kicking children on programmatic bind', function() {
    setup(function() {
      Blockly.defineBlocksWithJsonArray([
        {
          'type': 'static_statement',
          'message0': 'Statement %1',
          'args0': [
            {
              'type': 'input_statement',
              'name': 'INPUT',
              'check': 'T',
            },
          ],
          'style': 'math_blocks',
        },
        {
          'type': 'static_generic_stack',
          'message0': 'Stack',
          'previousStatement': 'T',
          'nextStatement': 'T',
        },
        {
          'type': 'static_dog_stack',
          'message0': 'Dog Stack',
          'previousStatement': 'Dog',
          'nextStatement': 'Dog',
        },
      ]);
    });

    teardown(function() {
      delete Blockly.Blocks['static_statement'];
      delete Blockly.Blocks['static_generic_stack'];
      delete Blockly.Blocks['static_dog_stack'];
    });

    test('Output parent valid', function() {
      const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
      const [identityOut, identity] = this.getBlockOutput('static_identity');
      milkMammalIn.connect(identityOut);
      this.checker.bindType(identity, 'T', 'Mammal');
      chai.assert.isTrue(milkMammalIn.isConnected());
    });

    test('Prev parent valid', function() {

    });

    test('Value child valid', function() {
      const [identityIn, identity] = this.getBlockInput('static_identity');
      const [mammalOut] = this.getBlockOutput('static_mammal');
      identityIn.connect(mammalOut);
      this.checker.bindType(identity, 'T', 'Mammal');
      chai.assert.isTrue(identityIn.isConnected());
    });

    test('Statement child valid', function() {

    });

    test('Next child valid', function() {

    });

    test('Prev and next valid', function() {

    });

    test('Some value children valid', function() {
      const [selectRandomIn1, selectRandom] =
          this.getBlockInput('static_select_random');
      const selectRandomIn2 = selectRandom.getInput('INPUT2').connection;
      const [dogOut] = this.getBlockOutput('static_dog');
      const [catOut] = this.getBlockOutput('static_cat');

      this.checker.bindType(selectRandom, 'T', 'Mammal');
      selectRandomIn1.connect(dogOut);
      selectRandomIn2.connect(catOut);
      this.checker.unbindType(selectRandom, 'T');
      this.checker.bindType(selectRandom, 'T', 'Dog');

      chai.assert.isTrue(selectRandomIn1.isConnected());
      chai.assert.isFalse(selectRandomIn2.isConnected());
    });

    test('Some statement children valid', function() {

    });

    test('Output parent invalid', function() {
      const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
      const [identityOut, identity] = this.getBlockOutput('static_identity');
      milkMammalIn.connect(identityOut);
      this.checker.bindType(identity, 'T', 'reptile');
      chai.assert.isFalse(milkMammalIn.isConnected());
    });

    test('Prev parent invalid', function() {

    });

    test('Value child invalid', function() {
      const [identityIn, identity] = this.getBlockInput('static_identity');
      const [mammalOut] = this.getBlockOutput('static_mammal');
      identityIn.connect(mammalOut);
      this.checker.bindType(identity, 'T', 'reptile');
      chai.assert.isFalse(identityIn.isConnected());
    });

    test('Statement child invalid', function() {

    });

    test('Next child invalid', function() {

    });
  });

  // This suite checks that bindings get updated correctly. It doesn't have
  // anything to do with compatibility.
  suite('getExplicitTypes', function() {
    setup(function() {
      this.assertNoType = function(conn) {
        const explicitTypes = this.checker.getExplicitTypes(
            conn.getSourceBlock(), 'T');
        chai.assert.isArray(explicitTypes);
        chai.assert.isEmpty(explicitTypes);
      };
      this.assertHasType = function(conn, binding) {
        const explicitTypes = this.checker.getExplicitTypes(
            conn.getSourceBlock(), 'T');
        chai.assert.include(explicitTypes, binding);
      };
      this.bindConnection = function(conn, binding) {
        this.checker.bindType(conn.getSourceBlock(), 'T', binding);
      };
      this.unbindConnection = function(conn) {
        this.checker.unbindType(conn.getSourceBlock(), 'T');
      };
    });

    suite('Flow through connections', function() {
      suite('Two blocks', function() {
        clearTwoBlockTests();

        twoBlockTest('Outer explicit, inner explicit', function() {
          const dogIn = this.getOuterInput('dog');
          const dogOut = this.getInnerOutput('dog');

          dogIn.connect(dogOut);
          this.assertNoType(dogIn);
          this.assertNoType(dogOut);

          dogIn.disconnect();
          this.assertNoType(dogIn);
          this.assertNoType(dogOut);
        });

        twoBlockTest('Outer explicit, inner unbound', function() {
          const dogIn = this.getOuterInput('dog');
          const identityOut = this.getInnerOutput('t');

          dogIn.connect(identityOut);
          this.assertNoType(dogIn);
          this.assertHasType(identityOut, 'dog');

          dogIn.disconnect();
          this.assertNoType(dogIn);
          this.assertNoType(identityOut);
        });

        twoBlockTest('Outer explicit, inner bound', function() {
          const mammalIn = this.getOuterInput('mammal');
          const identityOut = this.getInnerOutput('t');
          this.bindConnection(identityOut, 'dog');

          mammalIn.connect(identityOut);
          this.assertNoType(mammalIn);
          this.assertHasType(identityOut, 'mammal');

          mammalIn.disconnect();
          this.assertNoType(mammalIn);
          this.assertHasType(identityOut, 'dog');
        });

        twoBlockTest('Outer unbound, inner explicit', function() {
          const identityIn = this.getOuterInput('t');
          const dogOut = this.getInnerOutput('dog');

          identityIn.connect(dogOut);
          this.assertHasType(identityIn, 'dog');
          this.assertNoType(dogOut);

          identityIn.disconnect();
          this.assertNoType(identityIn);
          this.assertNoType(dogOut);
        });

        twoBlockTest('Outer unbound, inner unbound', function() {
          const identityIn = this.getOuterInput('t');
          const identityOut = this.getInnerOutput('t');

          identityIn.connect(identityOut);
          this.assertNoType(identityIn);
          this.assertNoType(identityOut);

          identityIn.disconnect();
          this.assertNoType(identityIn);
          this.assertNoType(identityOut);
        });

        twoBlockTest('Outer unbound, inner bound', function() {
          const identityIn = this.getOuterInput('t');
          const identityOut = this.getInnerOutput('t');
          this.bindConnection(identityOut, 'dog');

          identityIn.connect(identityOut);
          this.assertHasType(identityIn, 'dog');
          this.assertHasType(identityOut, 'dog');

          identityIn.disconnect();
          this.assertNoType(identityIn);
          this.assertHasType(identityOut, 'dog');
        });

        twoBlockTest('Outer bound, inner explicit', function() {
          const identityIn = this.getOuterInput('t');
          const dogOut = this.getInnerOutput('dog');
          this.bindConnection(identityIn, 'mammal');

          identityIn.connect(dogOut);
          this.assertHasType(identityIn, 'mammal');
          this.assertNoType(dogOut);

          identityIn.disconnect();
          this.assertHasType(identityIn, 'mammal');
          this.assertNoType(dogOut);
        });

        twoBlockTest('Outer bound, inner unbound', function() {
          const identityIn = this.getOuterInput('t');
          const identityOut = this.getInnerOutput('t');
          this.bindConnection(identityIn, 'dog');

          identityIn.connect(identityOut);
          this.assertHasType(identityIn, 'dog');
          this.assertHasType(identityOut, 'dog');

          identityIn.disconnect();
          this.assertHasType(identityIn, 'dog');
          this.assertNoType(identityOut);
        });

        twoBlockTest('Outer bound, inner bound', function() {
          const identityIn = this.getOuterInput('t');
          const identityOut = this.getInnerOutput('t');
          this.bindConnection(identityIn, 'mammal');
          this.bindConnection(identityOut, 'dog');

          identityIn.connect(identityOut);
          this.assertHasType(identityIn, 'mammal');
          this.assertHasType(identityOut, 'mammal');

          identityIn.disconnect();
          this.assertHasType(identityIn, 'mammal');
          this.assertHasType(identityOut, 'dog');
        });

        runTwoBlockTests();

        /* test('Parent explicit, child bound -> disconnect child\'s child',
            function() {
              const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
              const [identityOut, identity] =
                  this.getBlockOutput('static_identity');
              const identityIn = identity.getInput('INPUT').connection;
              const [dogOut] = this.getBlockOutput('static_dog');

              identityIn.connect(dogOut);
              this.assertHasType(identityIn, 'dog');
              this.assertNoType(dogOut);

              milkMammalIn.connect(identityOut);
              this.assertNoType(milkMammalIn);
              this.assertHasType(identityIn, 'mammal');
              this.assertNoType(dogOut);

              identityIn.disconnect();
              this.assertNoType(milkMammalIn);
              this.assertHasType(identityIn, 'mammal');
              this.assertNoType(dogOut);
            });

        test('Parent bound, child explicit -> disconnect parent\'s parent',
            function() {
              const [milkMammalIn] = this.getBlockInput('static_milk_mammal');
              const [identityIn, identity] =
                  this.getBlockInput('static_identity');
              const identityOut = identity.outputConnection;
              const [dogOut] = this.getBlockOutput('static_dog');

              milkMammalIn.connect(identityOut);
              this.assertNoType(milkMammalIn);
              this.assertHasType(identityIn, 'mammal');

              identityIn.connect(dogOut);
              this.assertNoType(milkMammalIn);
              this.assertHasType(identityIn, 'mammal');
              this.assertNoType(dogOut);


              milkMammalIn.disconnect();
              this.assertNoType(milkMammalIn);
              this.assertHasType(identityIn, 'dog');
              this.assertNoType(dogOut);
            }); */
      });

      suite('Three blocks', function() {
        clearThreeBlockTests();

        threeBlockTest('Outer unbound, main unbound, inner explicit',
            function() {
              const outerIn = this.getOuterInput('t');
              const main = this.getMain('t');
              const innerOut = this.getInnerOutput('dog');

              outerIn.connect(main.out);
              this.assertNoType(outerIn);
              this.assertNoType(main.out);

              main.in.connect(innerOut);
              this.assertNoType(innerOut);
              this.assertHasType(main.in, 'dog');
              this.assertHasType(outerIn, 'dog');

              main.in.disconnect(innerOut);
              this.assertNoType(outerIn);
              this.assertNoType(main.in);
              this.assertNoType(innerOut);
            });

        threeBlockTest('Outer unbound, main unbound, inner bound', function() {
          const outerIn = this.getOuterInput('t');
          const main = this.getMain('t');
          const innerOut = this.getInnerOutput('t');
          this.bindConnection(innerOut, 'dog');

          outerIn.connect(main.out);
          this.assertNoType(outerIn);
          this.assertNoType(main.in);

          main.in.connect(innerOut);
          this.assertHasType(main.in, 'dog');
          this.assertHasType(outerIn, 'dog');

          main.in.disconnect();
          this.assertNoType(outerIn);
          this.assertNoType(main.in);
        });

        threeBlockTest('Outer explicit, main unbound, inner unbound',
            function() {
              const outerIn = this.getOuterInput('dog');
              const main = this.getMain('t');
              const innerOut = this.getInnerOutput('t');

              outerIn.connect(main.out);
              this.assertNoType(outerIn);
              this.assertHasType(main.out, 'dog');

              main.in.connect(innerOut);
              this.assertNoType(outerIn);
              this.assertHasType(main.in, 'dog');
              this.assertHasType(innerOut, 'dog');

              main.in.disconnect();
              this.assertNoType(outerIn);
              this.assertHasType(main.in, 'dog');
              this.assertNoType(innerOut);

              outerIn.disconnect();
              this.assertNoType(outerIn);
              this.assertNoType(main.out);
              this.assertNoType(innerOut);
            });

        threeBlockTest('Outer bound, main unbound, inner unbound', function() {
          const outerIn = this.getOuterInput('t');
          const main = this.getMain('t');
          const innerOut = this.getInnerOutput('t');
          this.bindConnection(outerIn, 'dog');

          outerIn.connect(main.out);
          this.assertHasType(main.out, 'dog');

          main.in.connect(innerOut);
          this.assertHasType(main.out, 'dog');
          this.assertHasType(innerOut, 'dog');

          main.in.disconnect();
          this.assertHasType(main.out, 'dog');
          this.assertNoType(innerOut);
          outerIn.disconnect();
          this.assertNoType(main.out);
          this.assertNoType(innerOut);
        });

        threeBlockTest('Inner explicit, main unbound, outer unbound',
            function() {
              const outerIn = this.getOuterInput('t');
              const main = this.getMain('t');
              const innerOut = this.getInnerOutput('dog');

              innerOut.connect(main.in);
              this.assertNoType(innerOut);
              this.assertHasType(main.in, 'dog');

              main.out.connect(outerIn);
              this.assertNoType(innerOut);
              this.assertHasType(main.out, 'dog');
              this.assertHasType(outerIn, 'dog');

              main.out.disconnect();
              this.assertNoType(innerOut);
              this.assertHasType(main.out, 'dog');
              this.assertNoType(outerIn);

              innerOut.disconnect();
              this.assertNoType(innerOut);
              this.assertNoType(main.in);
              this.assertNoType(outerIn);
            });

        threeBlockTest('Inner bound, main unbound, outer unbound', function() {
          const outerIn = this.getOuterInput('t');
          const main = this.getMain('t');
          const innerOut = this.getInnerOutput('t');
          this.bindConnection(innerOut, 'dog');

          innerOut.connect(main.in);
          this.assertHasType(main.in, 'dog');

          main.out.connect(outerIn);
          this.assertHasType(main.out, 'dog');
          this.assertHasType(outerIn, 'dog');

          main.out.disconnect();
          this.assertHasType(main.out, 'dog');
          this.assertNoType(outerIn);
          innerOut.disconnect();
          this.assertNoType(main.in);
          this.assertNoType(outerIn);
        });

        threeBlockTest('Inner unbound, main unbound, outer explicit',
            function() {
              const outerIn = this.getOuterInput('dog');
              const main = this.getMain('t');
              const innerOut = this.getInnerOutput('t');

              innerOut.connect(main.in);
              this.assertNoType(innerOut);
              this.assertNoType(main.in);

              main.out.connect(outerIn);
              this.assertNoType(outerIn);
              this.assertHasType(main.out, 'dog');
              this.assertHasType(innerOut, 'dog');

              main.out.disconnect();
              this.assertNoType(outerIn);
              this.assertNoType(innerOut);
              this.assertNoType(main.in);
            });

        threeBlockTest('Inner unbound, main unbound, outer bound', function() {
          const outerIn = this.getOuterInput('t');
          const main = this.getMain('t');
          const innerOut = this.getInnerOutput('t');
          this.bindConnection(outerIn, 'dog');

          innerOut.connect(main.in);
          this.assertNoType(innerOut);
          this.assertNoType(main.in);

          main.out.connect(outerIn);
          this.assertHasType(main.out, 'dog');
          this.assertHasType(innerOut, 'dog');

          main.out.disconnect();
          this.assertNoType(innerOut);
          this.assertNoType(main.in);
        });

        runThreeBlockTests();
      });

      suite('Siblings and parsibs', function() {
        clearSiblingTests();

        siblingTest('Flow to sibling, explicit', function() {
          const main = this.getMain('t');
          const genericOut = this.getInnerOutput('t');
          const dogOut = this.getInnerOutput('dog');

          main.in1.connect(genericOut);
          this.assertNoType(main.in1);
          this.assertNoType(genericOut);

          main.in2.connect(dogOut);
          this.assertHasType(main.in2, 'dog');
          this.assertHasType(genericOut, 'dog');

          main.in2.disconnect();
          this.assertNoType(main.in2);
          this.assertNoType(genericOut);
        });

        siblingTest('Flow to sibling, bound', function() {
          const main = this.getMain('t');
          const genericOut1 = this.getInnerOutput('t');
          const genericOut2 = this.getInnerOutput('t');
          this.bindConnection(genericOut2, 'dog');

          main.in1.connect(genericOut1);
          this.assertNoType(main.in1);
          this.assertNoType(genericOut1);

          main.in2.connect(genericOut2);
          this.assertHasType(main.in2, 'dog');
          this.assertHasType(genericOut1, 'dog');

          main.in2.disconnect();
          this.assertNoType(main.in1);
          this.assertNoType(genericOut1);
        });

        siblingTest('Flow to parsib, explicit', function() {
          const main1 = this.getMain('t');
          const main2 = this.getMain('t');
          const genericOut = this.getInnerOutput('t');
          const dogOut = this.getInnerOutput('dog');

          main1.in1.connect(genericOut);
          this.assertNoType(main1.in1);
          this.assertNoType(genericOut);

          main1.in2.connect(main2.out);
          this.assertNoType(main1.in1);
          this.assertNoType(main2.out);
          this.assertNoType(genericOut);

          main2.in1.connect(dogOut);
          this.assertHasType(main1.in1, 'dog', 'main1.in1');
          this.assertHasType(main2.in1, 'dog', 'main2.in2');
          this.assertHasType(genericOut, 'dog', 'genericOut');

          main2.in1.disconnect();
          this.assertNoType(main1.in1);
          this.assertNoType(main2.in1);
          this.assertNoType(genericOut);
        });

        siblingTest('Flow to parsib, bound', function() {
          const main1 = this.getMain('t');
          const main2 = this.getMain('t');
          const genericOut1 = this.getInnerOutput('t');
          const genericOut2 = this.getInnerOutput('t');
          this.bindConnection(genericOut2, 'dog');

          main1.in1.connect(genericOut1);
          this.assertNoType(main1.in1);
          this.assertNoType(genericOut1);

          main1.in2.connect(main2.out);
          this.assertNoType(main1.in1);
          this.assertNoType(main2.out);
          this.assertNoType(genericOut1);

          main2.in1.connect(genericOut2);
          this.assertHasType(main1.in1, 'dog');
          this.assertHasType(main2.in1, 'dog');
          this.assertHasType(genericOut1, 'dog');

          main2.in1.disconnect();
          this.assertNoType(main1.in1);
          this.assertNoType(main2.in1);
          this.assertNoType(genericOut1);
        });

        runSiblingTests();
      });
    });

    suite('Unification', function() {
      suite('Inputs', function() {
        clearSiblingTests();

        siblingTest('Direct children', function() {
          const main = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');

          this.bindConnection(main.out, 'mammal');
          main.in1.connect(dogOut);
          main.in2.connect(catOut);
          this.unbindConnection(main.out);

          this.assertHasType(main.out, 'mammal');
        });

        siblingTest('Grandchildren', function() {
          const main1 = this.getMain('t');
          const main2 = this.getMain('t');
          const main3 = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');

          this.bindConnection(main1.out, 'mammal');
          main1.in1.connect(main2.out);
          main1.in2.connect(main3.out);
          main2.in1.connect(dogOut);
          main3.in1.connect(catOut);
          this.unbindConnection(main1.out);

          this.assertHasType(main1.out, 'mammal');
        });

        siblingTest('Children and grandchildren', function() {
          const main1 = this.getMain('t');
          const main2 = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');

          this.bindConnection(main1.out, 'mammal');
          main1.in1.connect(main2.out);
          main1.in2.connect(catOut);
          main2.in1.connect(dogOut);
          this.unbindConnection(main1.out);

          this.assertHasType(main1.out, 'mammal');
        });

        runSiblingTests();
      });

      suite('Outputs', function() {
        clearSiblingTests();

        siblingTest('Siblings', function() {
          const main = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');
          const genericOut = this.getInnerOutput('t');

          this.bindConnection(main.out, 'mammal');
          main.in1.connect(dogOut);
          main.in2.connect(catOut);
          main.in3.connect(genericOut);
          this.unbindConnection(main.out);

          this.assertHasType(genericOut, 'mammal');
        });

        siblingTest('Parsibs', function() {
          const main1 = this.getMain('t');
          const main2 = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');
          const genericOut = this.getInnerOutput('t');

          this.bindConnection(main1.out, 'mammal');
          main1.in1.connect(dogOut);
          main1.in2.connect(catOut);
          main1.in3.connect(main2.out);
          main2.in1.connect(genericOut);
          this.unbindConnection(main1.out);

          this.assertHasType(genericOut, 'mammal');
        });

        siblingTest('Siblings and parsibs', function() {
          const main1 = this.getMain('t');
          const main2 = this.getMain('t');
          const dogOut = this.getInnerOutput('dog');
          const catOut = this.getInnerOutput('cat');
          const genericOut = this.getInnerOutput('t');

          this.bindConnection(main1.out, 'mammal');
          main1.in1.connect(dogOut);
          main1.in2.connect(main2.out);
          main2.in1.connect(catOut);
          main2.in2.connect(genericOut);
          this.unbindConnection(main1.out);

          this.assertHasType(genericOut, 'mammal');
        });

        runSiblingTests();
      });
    });
  });

  suite('getExplicitTypesOfConnection', function() {
    setup(function() {
      this.assertHasType = function(connection, type) {
        chai.assert.include(
            this.checker.getExplicitTypesOfConnection(connection), type);
      };
    });

    test('Explicit connection', function() {
      const [dogOut] = this.getBlockOutput('static_dog');
      this.assertHasType(dogOut, 'dog');
    });

    test('Unbound generic', function() {
      const [identityOut] = this.getBlockOutput('static_identity');
      const explicitTypes =
          this.checker.getExplicitTypesOfConnection(identityOut);
      chai.assert.isArray(explicitTypes);
      chai.assert.isEmpty(explicitTypes);
    });

    test('Externally bound', function() {
      const [identityOut, identity] = this.getBlockOutput('static_identity');
      this.checker.bindType(identity, 'T', 'dog', 201);
      this.assertHasType(identityOut, 'dog');
    });

    test('Explicit child', function() {
      const [identityIn] = this.getBlockInput('static_identity');
      const [dogOut] = this.getBlockOutput('static_dog');
      identityIn.connect(dogOut);
      this.assertHasType(identityIn, 'dog');
    });

    test('Explicit parent', function() {
      const [identityOut] = this.getBlockOutput('static_identity');
      const [dogIn] = this.getBlockInput('static_train_dog');
      identityOut.connect(dogIn);
      this.assertHasType(identityOut, 'dog');
    });
  });
});
