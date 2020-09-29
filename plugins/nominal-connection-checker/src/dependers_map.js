/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Defines the DependersMap and its helper prototypes.
 */
'use strict';

/**
 * A map of blockIds to maps of generic types to arrays of Connections.
 */
export class DependersMap {
  /**
   * Constructs the DependersMap.
   */
  constructor() {
    /**
     *
     * @type {!Map<string, !Map<string, !Array<!Blockly.Connection>>>}
     * @private
     */
    this.map_ = new Map();
  }

  /**
   * Adds the given dependentConnection as a depender on the given
   * dependencyType on the block with the given dependencyId.
   * @param {string} dependencyId The id of the block to depend on.
   * @param {string} dependencyType The generic type to depend on.
   * @param {!Blockly.Connection} dependentConnection The connection that is
   *     depending.
   */
  addDepender(dependencyId, dependencyType, dependentConnection) {
    let types = this.map_.get(dependencyId);
    if (!types) {
      types = new Map();
      this.map_.set(dependencyId, types);
    }
    let dependers = types.get(dependencyType);
    if (!dependers) {
      dependers = [];
      types.set(dependencyType, dependers);
    }
    dependers.push(dependentConnection);
  }

  /**
   * Removes the given dependentConnection as a depender on the given
   * dependencyType on the block with the given dependencyId, if it is currently
   * a depender.
   * @param {string} dependencyId The id of the block to stop depending on.
   * @param {string} dependencyType The generic type to stop depending on.
   * @param {!Blockly.Connection} dependentConnection The connection that should
   *     stop depending.
   * @return {boolean} True if the dependentConnection was actually dependent.
   *     False otherwise.
   */
  removeDepender(dependencyId, dependencyType, dependentConnection) {
    const types = this.map_.get(dependencyId);
    if (!types) {
      return false;
    }
    const dependers = types.get(dependencyType);
    if (!dependers) {
      return false;
    }
    const index = dependers.indexOf(dependentConnection);
    if (index != -1) {
      dependers.splice(index, 1);
    }
    return index != -1;
  }

  /**
   * Removes all dependent connections from the given block id / generic type
   * pair.
   * @param {string} dependencyId The id of the block to remove dependents from.
   * @param {string} dependencyType The generic type to remove dependents from.
   * @return {boolean} True if the dependencyId dependencyType pair had any
   *     dependents. False otherwise.
   */
  removeAll(dependencyId, dependencyType) {
    const types = this.map_.get(dependencyId);
    if (!types) {
      return false;
    }
    const dependers = types.get(dependencyType);
    if (!dependers) {
      return false;
    }
    const hadDependers = !!dependers.length;
    dependers.length = 0;
    return hadDependers;
  }

  /**
   * Executes the provided function for each block id, generic type, and
   * dependent Connection in the dependers map.
   * @param {function(string, string, !Blockly.Connection)} callback The
   *     callback to call on each block id, generic type, and dependent
   *     Connection.
   * @param {!Object=} thisArg Value to use as `this` when executing callback.
   */
  forEach(callback, thisArg = undefined) {
    this.map_.forEach((types, id) => {
      types.forEach((dependersArray, type) => {
        dependersArray.forEach((connection) => {
          callback.call(thisArg, id, type, connection);
        });
      });
    });
  }

  /**
   * Executes the provided function for each generic type and dependent
   * Connection associated with the given block id.
   * @param {string} blockId The block id to find the types and dependents of.
   * @param {function(string, !Blockly.Connection)} callback The callback to
   *     call on each generic type and dependent Connection associated with the
   *     given block id.
   * @param {!Object=} thisArg Value to use as `this` when executing callback.
   */
  forEachType(blockId, callback, thisArg = undefined) {
    const types = this.map_.get(blockId);
    if (!types) {
      return;
    }
    types.forEach((dependersArray, type) => {
      dependersArray.forEach((connection) => {
        callback.call(thisArg, type, connection);
      });
    });
  }

  /**
   * Executes the provided function for each dependent Connection associated
   * with the block id generic type pair.
   * @param {string} blockId The block id to find the dependents of.
   * @param {string} genericType The generic type to find the depedents of.
   * @param {function(!Blockly.Connection)} callback The callback to call on
   *     every dependent Connection associated with the block id generic type
   *     pair.
   * @param {!Object=} thisArg Value to use as `this` when executing callback.
   */
  forEachDependent(blockId, genericType, callback, thisArg = undefined) {
    this.getDependents(blockId, genericType).forEach(callback, thisArg);
  }

  /**
   * Returns an array of all of the dependent Connections of the given block id
   * generic type pair.
   * @param {string} blockId The block id to return the dependents of.
   * @param {string} genericType The generic type to return the dependents of.
   * @return {!Array<!Blockly.Connection>} The dependent connections of the
   *     given block id generic type pair.
   */
  getDependents(blockId, genericType) {
    const types = this.map_.get(blockId);
    if (!types) {
      return [];
    }
    const dependers = types.get(genericType);
    if (!dependers) {
      return [];
    }
    return dependers;
  }

  /**
   * Returns all the dependent connections associated with the block id generic
   * type pair that also pass the test implemented by the matcher.
   * @param {string} blockId The block id to return the dependents of.
   * @param {string} genericType The generic type to return the dependents of.
   * @param {function(!Blockly.Connection):boolean} matcher The callback
   *      function used to test each element.
   * @param {!Object=} thisArg Value to use as `this` when executing callback.
   */
  filter(blockId, genericType, matcher, thisArg = undefined) {
    this.getDependents(blockId, genericType).filter(matcher, thisArg);
  }

  /**
   * Returns the first dependent connection associated with the block id generic
   * type pair that also passes the test implemented by the matcher.
   * @param {string} blockId The block id to search the dependents of.
   * @param {string} genericType The generic type to search the dependents of.
   * @param {function(!Blockly.Connection):boolean} matcher The callback
   *     function used to test each element.
   * @param {!Object=} thisArg Value to use as `this` when executing callback.
   * @return {undefined|!Blockly.Connection} The first dependent connection
   *     associated with the block id generic type pair that also passes the
   *     test implemented by the matcher, or undefined.
   */
  find(blockId, genericType, matcher, thisArg = undefined) {
    return this.getDependents(blockId, genericType).find(matcher, thisArg);
  }

  /**
   * Returns true if the given block id generic type pair has any dependents.
   * False otherwise.
   * @param {string} blockId The block id to check for dependents.
   * @param {string} genericType The generic type to check for dependents.
   * @return {boolean} True if the given block id generic type pair has any
   *     dependents. False otherwise.
   */
  hasDependents(blockId, genericType) {
    return !!this.getDependents(blockId, genericType).length;
  }

  /**
   * Returns true if the given dependentConnection is dependent on the given
   * dependencyId dependencyType pair.
   * @param {string} dependencyId The block id to check for dependence on.
   * @param {string} dependencyType The generic type to check for dependence on.
   * @param {!Blockly.Connection} dependentConnection The connection to check
   *     for dependence.
   * @return {boolean} True if the given dependentConnection is dependent on the
   *     given dependencyId dependencyType pair.
   */
  isDependent(dependencyId, dependencyType, dependentConnection) {
    return this.getDependents(dependencyId, dependencyType)
        .includes(dependentConnection);
  }
}
