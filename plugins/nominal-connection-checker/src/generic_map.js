/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Defines the GenericMap.
 */
'use strict';

import * as Blockly from 'blockly/core';
import {PriorityQueueMap} from './priority_queue_map';
import {DependersMap} from './dependers_map';
import {getType, getBlockId} from './utils';

/**
 * The priority for binding an explicit type to a generic type based on an input
 * of the block with the generic type.
 * @type {number}
 */
export const INPUT_PRIORITY = 100;

/**
 * The priority for binding an explicit type to a generic type based on the
 * output of the block with the generic type.
 * @type {number}
 */
export const OUTPUT_PRIORITY = 200;

/**
 * Defines a map where generic types can be bound to explicit types in
 * a given environment.
 */
export class GenericMap {
  /**
   * Constructs the GenericMap.
   * @param {!Blockly.Workspace} workspace The workspace this GenericMap belongs
   *     to.
   */
  constructor(workspace) {
    /**
     * The workspace this GenericMap belongs to.
     * @type {!Blockly.Workspace}
     * @private
     */
    this.workspace_ = workspace;

    /**
     * Map of block ids to PriorityQueMaps that define what the generic types
     * of the block are bound to.
     * @type {!Map<string, !PriorityQueueMap>}
     * @private
     */
    this.dependenciesMap_ = new Map();

    /**
     * Map of block ids to objects that map generic type names to arrays of
     * Connections that depend on those block id generic type pairs.
     * @type {!DependersMap}
     * @private
     */
    this.dependersMap_ = new DependersMap();
  }

  /**
   * Initializes the generic map.
   */
  init() {
    this.workspace_.addChangeListener(this.onChangeListener_.bind(this));
  }

  /**
   * Listens to changes on the workspace, and handles things like binding and
   * unbinding generic types to explicit types.
   * @param {!Blockly.Event} e The current event.
   * @private
   */
  onChangeListener_(e) {
    if (e.type != Blockly.Events.BLOCK_MOVE) {
      return;
    }

    const childCon = this.workspace_.getBlockById(e.blockId).outputConnection;
    if (!childCon) {
      // Ignore statement blocks for now.
      return;
    }

    let parentCon;
    let explicitFn;
    let genericFn;
    if (e.newParentId) {
      parentCon = this.workspace_.getBlockById(e.newParentId)
          .getInput(e.newInputName).connection;
      explicitFn = this.bindConnectionToExplicit_.bind(this);
      genericFn = this.bindConnectionToGeneric_.bind(this);
    } else if (e.oldParentId) {
      parentCon = this.workspace_.getBlockById(e.oldParentId)
          .getInput(e.oldInputName).connection;
      explicitFn = this.unbindConnectionFromExplicit_.bind(this);
      genericFn = this.unbindConnectionFromGeneric_.bind(this);
    } else {
      return;
    }

    if (this.isExplicit(parentCon)) {
      if (this.isGeneric(childCon)) {
        explicitFn(childCon, getType(parentCon));
      }
    } else if (this.isExplicit(childCon)) {
      explicitFn(parentCon, getType(childCon));
    } else {
      const parentIsBound = !!this.getExplicitTypeOfConnection(parentCon);
      const childIsBound = !!this.getExplicitTypeOfConnection(childCon);
      if (parentIsBound) {
        genericFn(childCon, parentCon);
      }
      if (childIsBound) {
        genericFn(parentCon, childCon);
      }
    }
  }

  /**
   * Returns the name of the explicit type bound to the generic type in the
   * context of the given block, or undefined if the type is not bound.
   * @param {string} blockId The block id that the generic type is
   *     possibly bound in.
   * @param {string} genericType The generic type to find the explicit binding
   *     of.
   * @return {undefined|string} The name of the explicit type bound to the
   *     generic type in the context of the given block, or undefined if the
   *     type is not bound.
   */
  getExplicitType(blockId, genericType) {
    const priorityMap = this.dependenciesMap_.get(blockId);
    if (!priorityMap) {
      return undefined;
    }
    const types = priorityMap.getValues(genericType);
    if (!types) {
      return undefined;
    }
    // In the future we might add logic to figure out what the super type of all
    // of the types is. But for now there should only be one type bound anyway.
    return types[0];
  }

  /**
   * Returns the explicit type bound to the generic type of the connection
   * within the context of its source block, or undefined if the type is not
   * bound.
   * @param {!Blockly.Connection} connection The connection get the explicit
   *     type of.
   * @return {string} The explicit type bound to the generic type of the
   *     connection within the context of its source block, or undefined if the
   *     type is not bound.
   */
  getExplicitTypeOfConnection(connection) {
    return this.getExplicitType(getBlockId(connection), getType(connection));
  }

  /**
   * Returns true if the connection has a generic connection check. False
   * otherwise.
   * @param {!Blockly.Connection} connection The connection to check for
   *     generic-ness.
   * @return {boolean} True if the connection has a generic connection check.
   *     False otherwise.
   * @private
   */
  isGeneric(connection) {
    const type = getType(connection);
    return typeof type == 'string' && type.length == 1;
  }

  /**
   * Returns true if the connection has an explicit connection check. False
   * otherwise.
   * @param {!Blockly.Connection} connection The connection check to check for
   *     explicit-ness.
   * @return {boolean} True if the connection has an explicit connection check.
   *     False otherwise.
   * @private
   */
  isExplicit(connection) {
    return !this.isGeneric(connection);
  }

  bindType(blockId, genericType, explicitType, priority) {
    this.addBinding_(blockId, genericType, explicitType, priority);
    // TODO: Test each connected block to make sure the connection is still
    //   valid.
  }

  unbindType(blockId, genericType, explicitType, priority) {
    this.removeBinding_(blockId, genericType, explicitType, priority);
    // TODO: Test each connected block to make sure the connection is still
    //   valid.
  }

  /**
   * Binds the generic type associated with the given dependentConnection to the
   * generic type associated with the given dependencyConnection, within the
   * context of the dependent connection's source block.
   * Also associates info about the depender with the dependency so that
   * dependers can be easily removed if the dependency block ever looses its
   * explicit type.
   * @param {!Blockly.Connection} dependentConnection The connection to make
   *     dependent on the type of the other connection.
   * @param {!Blockly.Connection} dependencyConnection The connection to depend
   *     on.
   * @private
   */
  bindConnectionToGeneric_(dependentConnection, dependencyConnection) {
    const dependencyId = getBlockId(dependencyConnection);
    const dependencyType = getType(dependencyConnection);
    const explicitType = this.getExplicitType(dependencyId, dependencyType);
    this.dependersMap_.addDepender(
        dependencyId, dependencyType, dependentConnection);
    this.bindConnectionToExplicit_(dependentConnection, explicitType);
  }

  /**
   * Binds the generic type associated with the genericConnection to the
   * explicitType in the context of the genericConnection's source block.
   * @param {!Blockly.Connection} genericConnection The generic connection to
   *     bind the type of.
   * @param {string} explicitType The name of the explicit type we want to bind
   *     the generic type to.
   * @private
   */
  bindConnectionToExplicit_(genericConnection, explicitType) {
    this.addBinding_(
        getBlockId(genericConnection),
        getType(genericConnection),
        explicitType,
        this.getPriority_(genericConnection));
    // TODO: Flow through all other connections if necessary.
    //   Make sure to update them if we get a higher priority binding.
  }

  /**
   * Unbinds the generic type associated with the given dependentConnection from
   * the generic type associated with the given dependencyConnection.
   * @param {!Blockly.Connection} dependentConnection The connection to make
   *     not dependent on the type of the other connection.
   * @param {!Blockly.Connection} dependencyConnection The connection to stop
   *     being dependent on.
   * @private
   */
  unbindConnectionFromGeneric_(dependentConnection, dependencyConnection) {
    const dependencyId = getBlockId(dependencyConnection);
    const dependencyType = getType(dependencyConnection);
    this.dependersMap_.removeDepender(
        dependencyId, dependencyType, dependentConnection);
    const explicitType = this.getExplicitType(dependencyId, dependencyType);
    this.unbindConnectionFromExplicit_(dependentConnection, explicitType);
  }

  /**
   * Unbinds the generic type associated with the genericConnection from the
   * explicitType in the context of the genericConnection's source block.
   * @param {!Blockly.Connection} genericConnection The generic connection to
   *     unbind the type of.
   * @param {string} explicitType The name of the explicit type we want to
   *     unbind the generic type from.
   * @private
   */
  unbindConnectionFromExplicit_(genericConnection, explicitType) {
    this.removeBinding_(
        getBlockId(genericConnection),
        getType(genericConnection),
        explicitType,
        this.getPriority_(genericConnection));
    // TODO: Flow through all other connections.
  }

  /**
   * Binds the given genericType name to the explicitType name in the context
   * of the blockId.
   * @param {string} blockId The id of the block to bind the genericType within.
   * @param {string} genericType The name of the generic type that we want to
   *     bind to the explicit type.
   * @param {string} explicitType The name of the explicit type we want to bind
   *     the generic type to.
   * @param {number} priority The priority of the binding. Higher priority
   *     bindings override lower priority bindings.
   * @private
   */
  addBinding_(blockId, genericType, explicitType, priority) {
    let queueMap = this.dependenciesMap_.get(blockId);
    if (!queueMap) {
      queueMap = new PriorityQueueMap();
      this.dependenciesMap_.set(blockId, queueMap);
    }
    queueMap.bind(genericType, explicitType, priority);
  }

  /**
   * Unbinds the given generic type name from the explicit type name in the
   * context of the blockId.
   * @param {string} blockId The the block to unbind the types in.
   * @param {string} genericType The name of the generic type to unbind from the
   *     explicit type.
   * @param {string} explicitType The name of the explicit type to unbind from
   *     the generic type.
   * @param {number} priority The priority of the binding to remove.
   * @return {boolean} True if the binding existed, false if it did not.
   * @private
   */
  removeBinding_(blockId, genericType, explicitType, priority) {
    if (this.dependenciesMap_.has(blockId)) {
      return this.dependenciesMap_.get(blockId).unbind(
          genericType, explicitType, priority);
    }
    return false;
  }

  /**
   * Returns the priority of a binding for the connection based on whether it
   * is an input or output connection.
   * @param {!Blockly.Connection} connection The connection to get the priority
   *     of.
   * @return {number} The priority of a binding for the connection.
   * @private
   */
  getPriority_(connection) {
    return connection.type == Blockly.INPUT_VALUE ?
        INPUT_PRIORITY : OUTPUT_PRIORITY;
  }
}

