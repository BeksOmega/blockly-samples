/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A Blockly plugin that allows you to create more advanced
 * connection checks.
 */

import * as Blockly from 'blockly/core';
import {TypeHierarchy} from './type_hierarchy';
import {GenericMap} from './generic_map';

// TODO: Fix the version of Blockly being required in package.json.

/**
 * A connection checker that is targeted at helping Blockly model languages with
 * complex nominal typing systems, like C++, Java, or Rust.
 * @implements {Blockly.IConnectionChecker}
 */
export class NominalConnectionChecker extends Blockly.ConnectionChecker {
  /**
   * Constructs the connection checker.
   * @param {!Blockly.Workspace} workspace The workspace this connection checker
   *     belongs to.
   */
  constructor(workspace) {
    super();

    /**
     * The workspace this connection checker belongs to.
     * @type {!Blockly.Workspace}
     * @private
     */
    this.workspace_ = workspace;

    /**
     * The type hierarchy used by this connection checker. Defines which types
     * are subtypes of which other types.
     * @type {?TypeHierarchy}
     * @private
     */
    this.typeHierarchy_ = null;

    /**
     * The generic map used by this connection checker. Used to bind generic
     * types to explicit types within the context of blocks.
     * @type {!GenericMap}
     * @private
     */
    this.genericMap_ = new GenericMap(workspace);
  }

  /**
   * Initializes the connection checker with the given hierarchy def.
   * @param {!Object} hierarchyDef The definition of our type hierarchy.
   * TODO: Add some sort of JSON schema for the hierarchy.
   */
  init(hierarchyDef) {
    this.typeHierarchy_ = new TypeHierarchy(hierarchyDef);
    this.genericMap_.init();
  }

  /**
   * @override
   */
  doTypeChecks(a, b) {
    const {parent, child} = this.getParentAndChildConnections_(a, b);
    const parentType = this.getExplicitType_(parent);
    const childType = this.getExplicitType_(child);
    const typeHierarchy = this.getTypeHierarchy_();

    if (!parentType || !childType) {
      // At least one is an unbound generic.
      return true;
    }
    return typeHierarchy.typeFulfillsType(childType, parentType);
  }

  /**
   * Returns the GenericMap of this connection checker.
   * @return {!GenericMap} The GenericMap of this connection checker.
   */
  getGenericMap() {
    return this.genericMap_;
  }

  /**
   * Returns the type hierarchy if this connection checker has been initialized.
   * Otherwise throws an error.
   * @return {!TypeHierarchy} The type hierarchy of this connection checker.
   * @throws {Error}
   * @private
   */
  getTypeHierarchy_() {
    if (!this.typeHierarchy_) {
      throw Error('The connection checker has not been initialized.');
    }
    return /** @type{!TypeHierarchy} */ (this.typeHierarchy_);
  }

  /**
   * Returns an object which has the two given connections correctly assigned
   * to either 'parent' or 'child' depending on which is the parent connection
   * and which is the child connection.
   * @param {!Blockly.Connection} a The first connection.
   * @param {!Blockly.Connection} b The second connection.
   * @return {{parent: !Blockly.Connection, child: !Blockly.Connection}} An
   *     object containing the connections, which are now correctly assigned to
   *     either 'parent' or 'child'.
   * @private
   */
  getParentAndChildConnections_(a, b) {
    if (a.isSuperior()) {
      return {
        parent: a,
        child: b,
      };
    } else {
      return {
        parent: b,
        child: a,
      };
    }
  }

  /**
   * Returns the type name (which could be generic) associated with the
   * connection.
   * @param {!Blockly.Connection} connection The connection to find the check
   *     of.
   * @return {string} The type name associated with the connection.
   * @private
   */
  getCheck_(connection) {
    return connection.getCheck()[0];
  }

  /**
   * Returns the explicit type of the connection. If the connection's check is
   * explicit, this just returns that. If the connection's check is generic it
   * returns the type bound to its generic check, if it exists. If it does not
   * exist this returns undefined.
   * @param {!Blockly.Connection} connection The connection to get the explicit
   *     type of.
   * @return {undefined|string} The explicit type, if one exists.
   * @private
   */
  getExplicitType_(connection) {
    const genericMap = this.getGenericMap();
    return genericMap.isExplicit(connection) ? this.getCheck_(connection) :
        genericMap.getExplicitTypeOfConnection(connection);
  }
}

export const registrationType = Blockly.registry.Type.CONNECTION_CHECKER;
export const registrationName = 'NominalConnectionChecker';

// Register the checker so that it can be used by name.
Blockly.registry.register(
    registrationType, registrationName, NominalConnectionChecker);

export const pluginInfo = {
  [registrationType]: registrationName,
};
