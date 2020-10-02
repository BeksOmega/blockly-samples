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
     * @type {!Map<string, !PriorityQueueMap<string, ExplicitBinding>>}
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
      // Binding the child to the parent may change the explicit type of the
      // child to match the parent, and then the parent will get bound to its
      // own type. If we bind the child to the parent first, we avoid this.
      if (childIsBound) {
        genericFn(parentCon, childCon);
      }
      if (parentIsBound) {
        genericFn(childCon, parentCon);
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
    const bindings = priorityMap.getValues(genericType);
    if (!bindings) {
      return undefined;
    }
    // In the future we might add logic to figure out what the super type of all
    // of the types is. But for now there should only be one type bound anyway.
    return bindings[0].type;
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
    this.bindConnectionToExplicit_(
        dependentConnection, explicitType, dependencyConnection);
  }

  /**
   * Binds the generic type associated with the genericConnection to the
   * explicitType in the context of the genericConnection's source block.
   * @param {!Blockly.Connection} genericConnection The generic connection to
   *     bind the type of.
   * @param {string} explicitType The name of the explicit type we want to bind
   *     the generic type to.
   * @param {!Blockly.Connection=} sourceConnection The generic connection that
   *     the explicit binding is coming from (if any).
   * @private
   */
  bindConnectionToExplicit_(
      genericConnection, explicitType, sourceConnection = undefined) {
    const blockId = getBlockId(genericConnection);
    const type = getType(genericConnection);
    const priority = this.getPriority_(genericConnection);

    const oldExplicit = this.getExplicitTypeOfConnection(genericConnection);
    this.addBinding_(blockId, type, explicitType, priority, sourceConnection);
    const newExplicit = this.getExplicitTypeOfConnection(genericConnection);

    const dependencies = this.dependenciesMap_.get(blockId).getAllValues(type);

    console.log(dependencies.length);
    if (dependencies.length == 1) {
      console.log('newly bound');
      // The block type pair just became bound, so it can now be depended on.
      // Inform all connected blocks.
      const block = genericConnection.getSourceBlock();
      const connections = block.getChildren()
          .map((block) => block.outputConnection);
      connections.push(
          block.outputConnection && block.outputConnection.targetConnection);
      for (const connection of connections) {
        if (connection &&
            connection != sourceConnection &&
            this.isGeneric(connection)) {
          console.log('adding depender');
          this.bindConnectionToGeneric_(connection, genericConnection);
        }
      }
      return;
    }

    if (oldExplicit != newExplicit) {
      console.log(
          'explicit type changed. old: ', oldExplicit, ', new: ', newExplicit);
      // The genericConnection's explicit type has changed.
      // Inform all dependent blocks.
      const dependers = this.dependersMap_.getDependents(blockId, type);
      for (const connection of dependers) {
        console.log('updating depender w/ type', newExplicit);
        this.updateDepender_(
            connection, oldExplicit, newExplicit, genericConnection);
      }
    }

    if (dependencies.length == 2) {
      console.log('newly multiply bound');
      // The block type pair just became multiply bound, so its previous
      // dependency can now depend on it. Inform that block type pair.
      const dependency = dependencies.find((explicitBinding) => {
        return explicitBinding.sourceConnection &&
            explicitBinding.sourceConnection != sourceConnection;
      });
      if (dependency) {
        const connection = dependency.sourceConnection;
        this.dependersMap_.addDepender(blockId, type, connection);
        // We must pass the newly bound explicit type, which is not necessarily
        // the "display" explicit type of the 'genericConnection'. If the
        // 'connection' is the superior, and has a more general type than the
        // newly bound explicit type, that would be the "display" explicit type
        // of the 'genericConnection'. But we want to bind the 'connection' to
        // the type the 'genericConnection' would have if it were not bound to
        // the type of the 'connection', which is the explicitType that was just
        // passed.
        this.addBinding_(
            getBlockId(connection),
            getType(connection),
            explicitType,
            this.getPriority_(connection),
            genericConnection);
      }
    }
  }

  /**
   * Updates the dependent connection, removing the binding to the old explicit
   * type and adding a binding to the new explicit type.
   *
   * If the explicit type of the block id generic type pair represented by the
   * connection has changed all pairs that are dependent on that pair are
   * updated recursively.
   * @param {!Blockly.Connection} dependentConnection The connection to update.
   * @param {string} oldExplicit The old explicit type we want to unbind.
   * @param {string} newExplicit The new explicit type we want to bind.
   * @private
   */
  updateDepender_(
      dependentConnection, oldExplicit, newExplicit, sourceConnection) {
    const blockId = getBlockId(dependentConnection);
    const type = getType(dependentConnection);
    const priority = this.getPriority_(dependentConnection);

    const dependentOldExplicit = this.getExplicitTypeOfConnection(
        dependentConnection);
    this.removeBinding_(blockId, type, oldExplicit, priority, sourceConnection);
    this.addBinding_(blockId, type, newExplicit, priority, sourceConnection);
    const dependentNewExplicit = this.getExplicitTypeOfConnection(
        dependentConnection);

    if (dependentOldExplicit != dependentNewExplicit) {
      const dependers = this.dependersMap_.getDependents(blockId, type);
      for (const connection of dependers) {
        this.updateDepender_(
            connection, dependentOldExplicit, dependentNewExplicit);
      }
    }
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
    this.unbindConnectionFromExplicit_(
        dependentConnection, explicitType, dependencyConnection);
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
  unbindConnectionFromExplicit_(
      genericConnection, explicitType, sourceConnection) {
    const blockId = getBlockId(genericConnection);
    const type = getType(genericConnection);
    const priority = this.getPriority_(genericConnection);

    const oldExplicit = this.getExplicitTypeOfConnection(genericConnection);
    console.log('removing', explicitType);
    this.removeBinding_(
        blockId, type, explicitType, priority, sourceConnection);
    const newExplicit = this.getExplicitTypeOfConnection(genericConnection);

    const dependencies = this.dependenciesMap_.get(blockId)
        .getAllBindings(type);

    console.log(dependencies && dependencies.length);
    if (!dependencies) {
      console.log('no more dependencies');
      // The block type pair just became unbound, so it can no longer be
      // depended on. Inform all dependers.
      const dependers = this.dependersMap_.getDependents(blockId, type);
      for (const connection of dependers) {
        this.dependersMap_.removeDepender(blockId, type, connection);
        this.unbindConnectionFromExplicit_(connection, explicitType);
      }
      return;
    }

    if (dependencies.length == 1) {
      console.log('single dependency');
      // The block type pair is now dependent on a single other pair, so that
      // pair should not be allowed to be dependent on this pair. Remove it
      // as a depender (if it is one).
    }

    if (oldExplicit != newExplicit) {
      console.log('type changed. old: ', oldExplicit, ', new: ', newExplicit);
      // The genericConnection's explicit type has changed.
      // Inform all dependent blocks.
      const dependers = this.dependersMap_.getDependents(blockId, type);
      console.log(dependers);
      for (const connection of dependers) {
        this.updateDepender_(connection, oldExplicit, newExplicit);
      }
    }
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
   * @param {!Blockly.Connection=} sourceConnection The generic connection that
   *     is the source of this binding, if any.
   * @private
   */
  addBinding_(
      blockId,
      genericType,
      explicitType,
      priority,
      sourceConnection = undefined
  ) {
    let queueMap = this.dependenciesMap_.get(blockId);
    if (!queueMap) {
      queueMap = new PriorityQueueMap();
      this.dependenciesMap_.set(blockId, queueMap);
    }
    const binding = new ExplicitBinding(explicitType, sourceConnection);
    console.log('adding binding', binding);
    queueMap.bind(genericType, binding, priority);
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
   * @param {!Blockly.Connection=} sourceConnection The generic connection that
   *     is the source of this binding, if any.
   * @return {boolean} True if the binding existed, false if it did not.
   * @private
   */
  removeBinding_(
      blockId,
      genericType,
      explicitType,
      priority,
      sourceConnection = undefined
  ) {
    const priorityMap = this.dependenciesMap_.get(blockId);
    if (!priorityMap) {
      return false;
    }
    if (sourceConnection) {
      console.log('got source connection');
      return priorityMap.unbindMatching(genericType, (explicitBinding) => {
        if (explicitBinding.sourceConnection == sourceConnection) {
          console.log(explicitBinding);
        }
        return explicitBinding.sourceConnection == sourceConnection;
      });
    }
    return priorityMap.unbindMatching(genericType,
        (explicitBinding, priority) => {
          return explicitBinding.type == explicitType &&
              !explicitBinding.sourceConnection &&
              priority == priority;
        });
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

/**
 * Class representing an explicit type binding.
 */
class ExplicitBinding {
  /**
   * Constructs the ExplicitBinding.
   * @param {string} explicitType The explicit type that the thing is being
   *     bound to.
   * @param {!Blockly.Connection=} sourceConnection The generic connection that
   *     is the source of this binding, if any.
   */
  constructor(explicitType, sourceConnection = undefined) {
    this.type = explicitType;
    this.sourceConnection = sourceConnection;
  }
}

