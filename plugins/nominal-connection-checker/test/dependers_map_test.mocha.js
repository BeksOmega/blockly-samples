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

const {DependersMap} = require('../src/dependers_map');

suite('DependersMap', function() {
  setup(function() {
    this.dependersMap = new DependersMap();

    this.assertDependents = function(blockId, genericType, ...dependents) {
      chai.assert.deepEqual(
          this.dependersMap.getDependents(blockId, genericType), dependents);
    };
    this.assertNoDependents = function(blockId, genericType) {
      chai.assert.isEmpty(
          this.dependersMap.getDependents(blockId, genericType));
    };
  });

  suite('addDepender', function() {
    test('Simple', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.assertDependents('testId', 'testType', mockConnection);
    });
  });

  suite('removeDepender', function() {
    test('Simple', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isTrue(this.dependersMap.removeDepender(
          'testId', 'testType', mockConnection));
      this.assertNoDependents('testId', 'testType');
    });

    test('Bad connection', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection1);
      chai.assert.isFalse(this.dependersMap.removeDepender(
          'testId', 'testType', mockConnection2));
      this.assertDependents('testId', 'testType', mockConnection1);
    });

    test('Bad type', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isFalse(this.dependersMap.removeDepender(
          'testId', 'badType', mockConnection));
      this.assertDependents('testId', 'testType', mockConnection);
    });

    test('Bad blockId', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isFalse(this.dependersMap.removeDepender(
          'badId', 'testType', mockConnection));
      this.assertDependents('testId', 'testType', mockConnection);
    });

    test('No dependers', function() {
      const mockConnection = {};
      chai.assert.isFalse(this.dependersMap.removeDepender(
          'testId', 'testType', mockConnection));
    });
  });

  suite('removeAll', function() {
    test('Single', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isTrue(this.dependersMap.removeAll('testId', 'testType'));
      this.assertNoDependents('testId', 'testType');
    });

    test('Multiple', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection1);
      this.dependersMap.addDepender('testId', 'testType', mockConnection2);
      chai.assert.isTrue(this.dependersMap.removeAll('testId', 'testType'));
      this.assertNoDependents('testId', 'testType');
    });

    test('Only that type', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      this.dependersMap.addDepender('testId', 'testType1', mockConnection1);
      this.dependersMap.addDepender('testId', 'testType2', mockConnection2);
      chai.assert.isTrue(this.dependersMap.removeAll('testId', 'testType1'));
      this.assertNoDependents('testId', 'testType1');
      this.assertDependents('testId', 'testType2', mockConnection2);
    });

    test('Only that block', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      this.dependersMap.addDepender('testId1', 'testType', mockConnection1);
      this.dependersMap.addDepender('testId2', 'testType', mockConnection2);
      chai.assert.isTrue(this.dependersMap.removeAll('testId1', 'testType'));
      this.assertNoDependents('testId1', 'testType');
      this.assertDependents('testId2', 'testType', mockConnection2);
    });

    test('Bad block id', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isFalse(this.dependersMap.removeAll('badId', 'testType'));
      this.assertDependents('testId', 'testType', mockConnection);
    });

    test('Bad type', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isFalse(this.dependersMap.removeAll('testId', 'badType'));
      this.assertDependents('testId', 'testType', mockConnection);
    });

    test('No dependers', function() {
      chai.assert.isFalse(this.dependersMap.removeAll('testId', 'badType'));
    });
  });

  suite('forEach', function() {
    test('Simple', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      const mockConnection3 = {};
      this.dependersMap.addDepender('testId1', 'testType1', mockConnection1);
      this.dependersMap.addDepender('testId2', 'testType2', mockConnection2);
      this.dependersMap.addDepender('testId3', 'testType3', mockConnection3);
      const spy = sinon.spy();
      this.dependersMap.forEach(spy);

      chai.assert.isTrue(spy.calledThrice);
      chai.assert.isTrue(
          spy.calledWith('testId1', 'testType1', mockConnection1),
          'Expected callback to be called with testId1, testType1 and con1');
      chai.assert.isTrue(
          spy.calledWith('testId2', 'testType2', mockConnection1),
          'Expected callback to be called with testId2, testType2 and con2');
      chai.assert.isTrue(
          spy.calledWith('testId1', 'testType1', mockConnection1),
          'Expected callback to be called with testId3, testType3 and con3');
    });

    test('No blocks', function() {
      const spy = sinon.spy();
      this.dependersMap.forEach(spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('No dependents', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.dependersMap.removeDepender('testId', 'testType', mockConnection);
      const spy = sinon.spy();
      this.dependersMap.forEach(spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('this', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      const thisArg = {};
      this.dependersMap.forEach(function(blockId, type, connection) {
        chai.assert.equal(this, thisArg);
      }, thisArg);
    });
  });

  suite('forEachType', function() {
    test('Simple', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      const mockConnection3 = {};
      this.dependersMap.addDepender('testId', 'testType1', mockConnection1);
      this.dependersMap.addDepender('testId', 'testType2', mockConnection2);
      this.dependersMap.addDepender('testId', 'testType3', mockConnection3);
      const spy = sinon.spy();
      this.dependersMap.forEachType('testId', spy);

      chai.assert.isTrue(spy.calledThrice);
      chai.assert.isTrue(
          spy.calledWith('testType1', mockConnection1),
          'Expected callback to be called with testType1 and con1');
      chai.assert.isTrue(
          spy.calledWith('testType2', mockConnection1),
          'Expected callback to be called with testType2 and con2');
      chai.assert.isTrue(
          spy.calledWith('testType1', mockConnection1),
          'Expected callback to be called with testType3 and con3');
    });

    test('No blocks', function() {
      const spy = sinon.spy();
      this.dependersMap.forEachType('testId', spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('No dependents', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.dependersMap.removeDepender('testId', 'testType', mockConnection);
      const spy = sinon.spy();
      this.dependersMap.forEachType('testId', spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('this', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      const thisArg = {};
      this.dependersMap.forEachType('testId', function(type, connection) {
        chai.assert.equal(this, thisArg);
      }, thisArg);
    });
  });

  suite('forEachDependent', function() {
    test('Simple', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      const mockConnection3 = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection1);
      this.dependersMap.addDepender('testId', 'testType', mockConnection2);
      this.dependersMap.addDepender('testId', 'testType', mockConnection3);
      const spy = sinon.spy();
      this.dependersMap.forEachDependent('testId', 'testType', spy);

      chai.assert.isTrue(spy.calledThrice);
      chai.assert.isTrue(
          spy.calledWith(mockConnection1),
          'Expected callback to be called with con1');
      chai.assert.isTrue(
          spy.calledWith(mockConnection1),
          'Expected callback to be called with con2');
      chai.assert.isTrue(
          spy.calledWith(mockConnection1),
          'Expected callback to be called with con3');
    });

    test('No blocks', function() {
      const spy = sinon.spy();
      this.dependersMap.forEachDependent('testId', 'testType', spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('No dependents', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.dependersMap.removeDepender('testId', 'testType', mockConnection);
      const spy = sinon.spy();
      this.dependersMap.forEachDependent('testId', 'testType', spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('this', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      const thisArg = {};
      this.dependersMap.forEachDependent('testId', 'testType',
          function(type, connection) {
            chai.assert.equal(this, thisArg);
          }, thisArg);
    });
  });

  suite('getDependents', function() {
    test('Single dependent', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.assertDependents('testId', 'testType', mockConnection);
    });

    test('Multiple dependents', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection1);
      this.dependersMap.addDepender('testId', 'testType', mockConnection2);
      this.assertDependents(
          'testId', 'testType', mockConnection1, mockConnection2);
    });

    test('Bad block id', function() {
      this.assertNoDependents('badId', 'testType');
    });

    test('Bad type', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.assertNoDependents('testId', 'badType');
    });
  });

  suite('filter', function() {
    setup(function() {
      this.assertFilter = function(blockId, type, filterFn, ...values) {
        chai.assert.deepEqual(
            this.dependersMap.filter(blockId, type, filterFn), values);
      };
    });

    test('Simple', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.assertFilter('testId', 'testType', () => true, mockConnection);
    });

    test('hasCheck', function() {
      const mockConnection1 = {
        getCheck: function() {
          return ['T'];
        },
      };
      const mockConnection2 = {
        getCheck: function() {
          return ['G'];
        },
      };
      this.dependersMap.addDepender('testId', 'testType', mockConnection1);
      this.dependersMap.addDepender('testId', 'testType', mockConnection2);
      this.assertFilter('testId', 'testType', (connection) => {
        return connection.getCheck()[0] == 'T';
      }, mockConnection1);
    });

    test('No blocks', function() {
      const spy = sinon.spy();
      this.dependersMap.filter('testId', 'testType', spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('No dependers', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.dependersMap.removeDepender('testId', 'testType', mockConnection);
      const spy = sinon.spy();
      this.dependersMap.filter('testId', 'testType', spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('this', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      const thisArg = {};
      this.dependersMap.filter('testId', 'testType', function() {
        chai.assert.equal(this, thisArg);
      }, thisArg);
    });
  });

  suite('find', function() {
    test('Simple', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.equal(
          this.dependersMap.find('testId', 'testType', () => true),
          mockConnection);
    });

    test('hasCheck', function() {
      const mockConnection1 = {
        getCheck: function() {
          return ['G'];
        },
      };
      const mockConnection2 = {
        getCheck: function() {
          return ['T'];
        },
      };
      this.dependersMap.addDepender('testId', 'testType', mockConnection1);
      this.dependersMap.addDepender('testId', 'testType', mockConnection2);
      chai.assert.equal(
          this.dependersMap.find('testId', 'testType', (connection) => {
            return connection.getCheck()[0] == 'T';
          }),
          mockConnection2);
    });

    test('No blocks', function() {
      const spy = sinon.spy();
      this.dependersMap.find('testId', 'testType', spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('No dependers', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.dependersMap.removeDepender('testId', 'testType', mockConnection);
      const spy = sinon.spy();
      this.dependersMap.find('testId', 'testType', spy);
      chai.assert.isTrue(spy.notCalled);
    });

    test('this', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      const thisArg = {};
      this.dependersMap.find('testId', 'testType', function() {
        chai.assert.equal(this, thisArg);
      }, thisArg);
    });
  });

  suite('hasDependents', function() {
    test('Single', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isTrue(this.dependersMap.hasDependents('testId', 'testType'));
    });

    test('Multiple', function() {
      const mockConnection1 = {};
      const mockConnection2 = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection1);
      this.dependersMap.addDepender('testId', 'testType', mockConnection2);
      chai.assert.isTrue(this.dependersMap.hasDependents('testId', 'testType'));
    });

    test('No blocks', function() {
      chai.assert.isFalse(
          this.dependersMap.hasDependents('testId', 'testType'));
    });

    test('No dependers', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      this.dependersMap.removeDepender('testId', 'testType', mockConnection);
      chai.assert.isFalse(
          this.dependersMap.hasDependents('testId', 'testType'));
    });

    test('Bad block id', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isFalse(
          this.dependersMap.hasDependents('badId', 'testType'));
    });

    test('Bad type', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'badtype', mockConnection);
      chai.assert.isFalse(
          this.dependersMap.hasDependents('testId', 'badType'));
    });
  });

  suite('isDependent', function() {
    test('Simple', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isTrue(
          this.dependersMap.isDependent('testId', 'testType', mockConnection));
    });

    test('Bad block id', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isFalse(
          this.dependersMap.isDependent('badId', 'testType', mockConnection));
    });

    test('Bad type', function() {
      const mockConnection = {};
      this.dependersMap.addDepender('testId', 'testType', mockConnection);
      chai.assert.isFalse(
          this.dependersMap.isDependent('testId', 'badType', mockConnection));
    });
  });
});
