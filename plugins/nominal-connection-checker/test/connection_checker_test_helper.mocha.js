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
  suite('Outer value, inner out', function() {
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

    runTests(twoBlockTests);
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

    runTests(twoBlockTests);
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

    runTests(twoBlockTests);
  });
}


const threeBlockTests = [];

export function threeBlockTest(name, fn) {
  threeBlockTests.push({name: name, fn: fn});
}

export function runThreeBlockTests() {
  suite('Outer value, main value, inner out', function() {
    setup(function() {
      this.getOuterInput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_outer_value');
        return block.getInput('INPUT1').connection;
      };

      this.getMain = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_main_out_value');
        return {
          out: block.outputConnection,
          in: block.getInput('INPUT1').connection,
        };
      };

      this.getInnerOutput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_inner_out');
        return block.outputConnection;
      };
    });

    runTests(threeBlockTests);
  });

  suite('Outer value, main statement, inner prev', function() {
    setup(function() {
      this.getOuterInput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_outer_value');
        return block.getInput('INPUT1').connection;
      };

      this.getMain = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_main_out_statement');
        return {
          out: block.outputConnection,
          in: block.getInput('INPUT1').connection,
        };
      };

      this.getInnerOutput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_inner_prev');
        return block.outputConnection;
      };
    });

    runTests(threeBlockTests);
  });

  suite('Outer value, main next, inner prev', function() {
    setup(function() {
      this.getOuterInput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_outer_value');
        return block.getInput('INPUT1').connection;
      };

      this.getMain = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_main_out_next');
        return {
          out: block.outputConnection,
          in: block.getInput('INPUT1').connection,
        };
      };

      this.getInnerOutput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_inner_prev');
        return block.outputConnection;
      };
    });

    runTests(threeBlockTests);
  });

  suite('Outer statement, main input, inner out', function() {
    setup(function() {
      this.getOuterInput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_outer_statement');
        return block.getInput('INPUT1').connection;
      };

      this.getMain = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_main_prev_value');
        return {
          out: block.outputConnection,
          in: block.getInput('INPUT1').connection,
        };
      };

      this.getInnerOutput = function(name) {
        name = name.toLowerCase();
        const block = this.workspace.newBlock(
            'static_' + name + '_inner_out');
        return block.outputConnection;
      };
    });

    runTests(threeBlockTests);
  });
}

function runTests(tests) {
  for (const {name, fn} of tests) {
    test(name, fn);
  }
}
