/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Helpers for tests of the NominalConnectionChecker.
 */

const twoBlockTests = [];

export function twoBlockTest(name, fn) {
  twoBlockTests.push({name: name, fn: fn});
}

export function runTwoBlockTests() {
  suite('Outer value, inner value', function() {
    setup(function() {
      this.getOuterInput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_outer_value');
        return block.getInput('INPUT1').connection;
      };
      this.getInnerOutput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_inner_out');
        return block.outputConnection;
      };
    });

    for (const {name, fn} of twoBlockTests) {
      test(name, fn);
    }
  });

  suite('Outer statement, inner prev', function() {
    setup(function() {
      this.getOuterInput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_outer_statement');
        return block.getInput('INPUT1').connection;
      };
      this.getInnerOutput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_inner_prev');
        return block.previousConnection;
      };
    });

    for (const {name, fn} of twoBlockTests) {
      test(name, fn);
    }
  });

  suite('Outer next, inner prev', function() {
    setup(function() {
      this.getOuterInput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_outer_next');
        return block.nextConnection;
      };
      this.getInnerOutput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_inner_prev');
        return block.previousConnection;
      };
    });

    for (const {name, fn} of twoBlockTests) {
      test(name, fn);
    }
  });
}
