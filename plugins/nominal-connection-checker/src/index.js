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
import {parseType, structureToString, TypeStructure} from './type_structure';
import {
  getCheck,
  isGeneric,
  isGenericConnection,
  combine,
} from './utils';


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
     * A map of blocks to maps that associated generic types with explicit
     * types.
     * @type {WeakMap<!Blockly.Block, Map<string, string>>}
     * @private
     */
    this.explicitBindings_ = new WeakMap();
  }

  /**
   * Initializes the connection checker with the given hierarchy def.
   * @param {!Object} hierarchyDef The definition of our type hierarchy.
   * TODO: Add some sort of JSON schema for the hierarchy.
   */
  init(hierarchyDef) {
    this.typeHierarchy_ = new TypeHierarchy(hierarchyDef);
  }

  /**
   * @override
   */
  doTypeChecks(a, b) {
    try {
      return this.doTypeChecksInternal_(a, b);
    } catch (e) {
      throw new ConnectionCheckError(
          'Checking the compatibility of the ' + this.getInputName_(a) +
          ' and ' + this.getInputName_(b) + ' connections on blocks ' +
          a.getSourceBlock().toDevString() + ' and ' +
          b.getSourceBlock().toDevString() + ' threw an error. ' +
          'Error: ' + e.message, e);
    }
  }

  /**
   * Checks the compatibility of the two connections. This function is called
   * from doTypeChecks, and its purpose is to separate business logic from
   * error handling logic.
   * @param {!Blockly.Connection} a The first connection.
   * @param {!Blockly.Connection} b The second connection.
   * @return {boolean} True if the connections are compatible, false otherwise.
   * @private
   */
  doTypeChecksInternal_(a, b) {
    const {parent, child} = this.getParentAndChildConnections_(a, b);
    const parentTypes = this.getExplicitTypesOfConnectionInternal_(parent);
    const childTypes = this.getExplicitTypesOfConnectionInternal_(child);
    const typeHierarchy = this.getTypeHierarchy_();

    if (parentTypes[0].name == '*' || childTypes[0].name == '*') {
      // At least one is an unbound generic.
      return true;
    }

    // If the parent is only bound by parameters, allow the child block to
    // connect if any of its types share a common ancestor with any of the
    // parent types.
    const parentSource = parent.getSourceBlock();
    const parentCheck = getCheck(parent);
    if (isGenericConnection(parent) &&
        this.typeIsOnlyBoundByParams_(parentSource, parentCheck)) {
      return childTypes.some((childType) => {
        return parentTypes.some((parentType) => {
          return typeHierarchy.getNearestCommonParents(
              childType, parentType).length;
        });
      });
    }

    return childTypes.some((childType) => {
      return parentTypes.some((parentType) => {
        return typeHierarchy.typeFulfillsType(
            childType, parentType);
      });
    });
  }

  /**
   * Returns the explicit type(s) of the block generic type pair, if any can be
   * found.
   *
   * Note that we only get multiple types via type unification of types that
   * are externally bound, or associated with input connections.
   * @param {!Blockly.Block} block The block that provides the context for the
   *     genericType.
   * @param {string} genericType The generic type we want to get the explicit
   *     type of.
   * @return {!Array<string>} The array of explicit types bound to the generic
   *     type, if any can be found. Otherwise, an empty array.
   */
  getExplicitTypes(block, genericType) {
    try {
      const types = this.getBoundTypes_(block, genericType.toLowerCase());
      if (types[0] == '*') {
        return [];
      }
      return types;
    } catch (e) {
      throw new ConnectionCheckError(
          'Trying to find the explicit types of ' + genericType + ' on block ' +
          block.toDevString() + ' threw an error. ' + 'Error: ' + e.message, e);
    }
  }

  /**
   * Returns the explicit type(s) of the given connection. If the connection is
   * itself explicit, this just returns that type. If the connection is generic
   * it attempts to find the explicit type(s) bound to it. If a binding for a
   * generic connection cannot be found, the generic type is replaced with '*'.
   *
   * Note that we only get multiple types via type unification of types that
   * are externally bound to generic types, or associated with generic
   * input connections.
   * @param {!Blockly.Connection} connection The connection to find the explicit
   *     type of.
   * @return {!Array<string>} The explicit type(s) of the connection.
   */
  getExplicitTypesOfConnection(connection) {
    try {
      return this.getExplicitTypesOfConnectionInternal_(connection)
          .map((struct) => structureToString(struct));
    } catch (e) {
      throw new ConnectionCheckError(
          'Trying to find the explicit types of the ' +
          this.getInputName_(connection) + ' on block ' +
          connection.getSourceBlock().toDevString() + 'threw an error. ' +
          'Error: ' + e.message, e);
    }
  }

  /**
   * Returns the explicit type(s) of the given connection. This function is
   * called from getExplicitTypesOfConnection, and its purpose is to separate
   * business logic from error handling logic. See getExplicitTypeOfConnection
   * for more information.
   * @param {!Blockly.Connection} connection The connection to find the explicit
   *     type of.
   * @return {!Array<!TypeStructure>} The explicit type(s) of the connection.
   * @private
   */
  getExplicitTypesOfConnectionInternal_(connection) {
    const struct = parseType(getCheck(connection));
    return this.getExplicitVersionsOfType_(connection.getSourceBlock(), struct);
    // return isExplicitConnection(connection) ? [check]:
    //     this.getBoundTypes_(connection.getSourceBlock(), check);
  }

  /**
   * Binds the genericType to the explicitType in the context of the given
   * block.
   * @param {!Blockly.Block} block The block that provides context for the
   *     generic type binding.
   * @param {string} genericType The generic type that we want to bind.
   * @param {string} explicitType The explicit type we want to bind the generic
   *     type to.
   */
  bindType(block, genericType, explicitType) {
    genericType = genericType.toLowerCase();
    explicitType = explicitType.toLowerCase();
    let map = this.explicitBindings_.get(block);
    if (!map) {
      map = new Map();
      this.explicitBindings_.set(block, map);
    }
    map.set(genericType, explicitType);

    const connectionMap = [];
    /**
     * If the given connection exists and it has a target connection, saves
     * the connection and its target connection to the connectionMap and then
     * disconnects the connections.
     * @param {!Blockly.Connection} conn The connection to save and disconnect.
     */
    function saveAndDisconnect(conn) {
      if (conn && conn.targetConnection) {
        connectionMap.push([conn, conn.targetConnection]);
        conn.disconnect();
      }
    }

    saveAndDisconnect(block.outputConnection);
    saveAndDisconnect(block.previousConnection);
    for (const input of block.inputList) {
      saveAndDisconnect(input.connection);
    }
    saveAndDisconnect(block.nextConnection);

    for (const [parent, child] of connectionMap) {
      parent.connect(child);
    }

    // Note: Using .rendered may cause issues. See blockly/#1676.
    if (block.rendered) {
      block.bumpNeighbours();
    }
  }

  /**
   * Unbinds the genericType from its explicit type in the context of the given
   * block.
   * @param {!Blockly.Block} block The block that provides context for the
   *     generic type binding.
   * @param {string} genericType The generic type that we want to unbind.
   * @return {boolean} True if the binding existed previously, false if it did
   *     not.
   */
  unbindType(block, genericType) {
    genericType = genericType.toLowerCase();
    if (this.explicitBindings_.has(block)) {
      return this.explicitBindings_.get(block).delete(genericType);
    }
    return false;
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
   * Returns an array of the given type structure with its generic params
   * replaced with all valid combinations of bindings. If a generic is unbound
   * then it replaced with '*'.
   * @param {!Blockly.Block} block The block that gives context to the generic
   *     bindings.
   * @param {!TypeStructure} struct The struct to replace the generics of.
   * @param {!Blockly.Connection=} connectionToSkip The connection to skip. If
   *     the connection matches this connection, it will be ignored.
   * @return {!Array<!TypeStructure>} An array of the given type structure with
   *     its generic params replaced with all valid combinations of bindings.
   * @private
   */
  getExplicitVersionsOfType_(
      block, struct, connectionToSkip = undefined) {
    const names = isGeneric(struct.name) ?
        this.getBoundTypes_(block, struct.name, connectionToSkip):
        [struct.name];
    return names
        .map((name) => {
          if (!struct.params.length) {
            return [new TypeStructure(name)];
          }
          const paramsLists = struct.params.map((param) =>
            this.getExplicitVersionsOfType_(block, param, connectionToSkip));
          paramsLists[0] = paramsLists[0].map((val) => [val]);
          const combos = combine(paramsLists);
          return combos.map((combo) => {
            const struct = new TypeStructure(name);
            struct.params = combo;
            return struct;
          });
        })
        .reduce((flat, toFlatten) => {
          return [...flat, ...toFlatten];
        }, []);
  }

  /**
   * Returns the explicit type(s) bound to the block generic type pair if one
   * exists. If no explicit type is found, this returns an array of ['*'].
   *
   * Note that we only get multiple types via type unification of types that
   * are externally bound, or associated with input connections.
   * @param {!Blockly.Block} block The block that provides the context for the
   *     explicit binding.
   * @param {string} genericType The generic type we want to get the bound
   *     explicit type of.
   * @param {!Blockly.Connection=} connectionToSkip The connection to skip. If
   *     the connection matches this connection, it will be ignored.
   * @return {!Array<string>} The explicit type(s) bound to the generic type,
   *     if one exists.
   * @private
   */
  getBoundTypes_(block, genericType, connectionToSkip = undefined) {
    genericType = genericType.toLowerCase();
    const types = [];

    const type = this.getExternalBinding_(block, genericType);
    if (type) {
      // TODO: Evaluate generics in bound types.
      return [type];
    }

    types.push(...this.getConnectionTypes_(
        block.outputConnection, genericType, connectionToSkip));
    types.push(...this.getConnectionTypes_(
        block.previousConnection, genericType, connectionToSkip));
    for (const input of block.inputList) {
      types.push(...this.getConnectionTypes_(
          input.connection, genericType, connectionToSkip));
    }
    types.push(...this.getConnectionTypes_(
        block.nextConnection, genericType, connectionToSkip));

    if (types.length) {
      return this.getTypeHierarchy_()
          .getNearestCommonParents(...types)
          .map((typeStruct) => structureToString(typeStruct));
    }
    return ['*'];
  }

  /**
   * Returns the externally bound explicit type associated with the given
   * genericType in the context of the given block, if one exists. Otherwise,
   * the empty string.
   * @param {!Blockly.Block} block The block that provides context for the
   *     explicit binding.
   * @param {string} genericType The generic type we want to get the externally
   *     bound explicit type of.
   * @return {string} The externally bound explicit type, if one exists.
   *     Otherwise, the empty string.
   * @private
   */
  getExternalBinding_(block, genericType) {
    if (this.explicitBindings_.has(block)) {
      return this.explicitBindings_.get(block).get(genericType);
    }
    return '';
  }

  /**
   * Acts as a helper for the getBoundTypes_ function *and should only be used
   * as such*. Only operates on the connection if its check matches the passed
   * genericType, and it is not the connectionToSkip. Returns the bound type(s)
   * associated with this connection. If the connection is invalid, returns an
   * empty array. If no binding could be found for the generic type, returns
   * ['*'].
   * @param {!Blockly.Connection} connection The connection to get the bound
   *     type of.
   * @param {string} genericType The generic type to find the bound type of.
   * @param {!Blockly.Connection=} connectionToSkip The connection to skip. If
   *     the connection matches this connection, it will be ignored.
   * @return {!Array<!TypeStructure>} The bound type(s) associated with the
   *     passed connection, if the connection is valid and bound types could
   *     be found. If the connect is invalid, returns an empty array. If no
   *     binding could be found for the generic type, returns ['*'].
   * @private
   */
  getConnectionTypes_(connection, genericType, connectionToSkip) {
    if (!connection ||
        connection == connectionToSkip ||
        !connection.targetConnection) {
      return [];
    }

    const sourceType = parseType(getCheck(connection));
    if (!this.containsGenericType_(sourceType, genericType)) {
      return [];
    }

    const target = connection.targetConnection;
    const targetType = parseType(getCheck(target));

    if (isGeneric(sourceType.name)) {
      return this.getExplicitVersionsOfType_(
          target.getSourceBlock(), targetType, target);
    }

    const hierarchy = this.getTypeHierarchy_();
    const {parent} = this.getParentAndChildConnections_(connection, target);
    const reorgedType = connection == parent ?
        hierarchy.reorganizeTypeForAncestor(sourceType, targetType) :
        hierarchy.reorganizeTypeForAncestor(targetType, sourceType);
    return this.getMatchingTypes(genericType, sourceType, reorgedType)
        .map((match) => {
          return this.getExplicitVersionsOfType_(
              target.getSourceBlock(), match, target);
        })
        .reduce((flat, toFlatten) => {
          return [...flat, ...toFlatten];
        }, []);
  }

  /**
   * Returns true if the sourceType matches the generic type, or contains any
   * parameters matching the generic type.
   * @param {!TypeStructure} sourceType The type to check for the generic.
   * @param {string} generic The generic to check for.
   * @return {boolean} True if the sourceType matches the generic type, or
   *     contains any parameters matching the generic type.
   * @private
   */
  containsGenericType_(sourceType, generic) {
    if (sourceType.name == generic) {
      return true;
    }
    return sourceType.params.some(
        (param) => this.containsGenericType_(param, generic));
  }

  /**
   * Returns an array of types in the target type matching places where the
   * genericType appears in the source type.
   * @param {string} genericType The generic type to find matches for.
   * @param {!TypeStructure} source The source type which gives us locations
   *     for the genericType.
   * @param {!TypeStructure} target The target type, which we are trying to
   *     find matches in. The target type should have the same structure as the
   *     source type.
   * @return {!Array<!TypeStructure>} An array of types in the target type
   *     matching places where the genericType appears in the source type.
   */
  getMatchingTypes(genericType, source, target) {
    if (source.name == genericType) {
      return [target];
    }
    return source.params
        .map((param, i) => {
          return this.getMatchingTypes(genericType, param, target.params[i]);
        })
        .reduce((flat, toFlatten) => {
          return [...flat, ...toFlatten];
        }, []);
  }

  /**
   * Returns true if the given block generic type pair is only bound by input or
   * next connections. Returns false if it is bound by an explicit binding, or
   * connections to the output or previous connections.
   * @param {!Blockly.Block} block The block that provides the context for the
   *     generic type.
   * @param {string} genericType The generic type that we want to check the
   *     state of.
   * @return {boolean} True if the type is only bound by inputs, false
   *     otherwise.
   * @private
   */
  typeIsOnlyBoundByParams_(block, genericType) {
    if (this.getExternalBinding_(block, genericType)) {
      return false;
    }
    const outputBinding = this.getConnectionTypes_(
        block.outputConnection, genericType);
    if (outputBinding.length &&
        outputBinding[0].name != '*') {
      return false;
    }
    const previousBinding = this.getConnectionTypes_(
        block.previousConnection, genericType);
    if (previousBinding.length &&
        previousBinding[0].name != '*') {
      return false;
    }
    return true;
  }

  /**
   * Returns the input name or location (output, prev, next) of the given
   * connection. Used for informing developers of errors.
   * @param {!Blockly.Connection} connection The connection to get the input
   *     name of.
   * @return {string} The input name or location of the connection.
   * @private
   */
  getInputName_(connection) {
    if (connection.getParentInput()) {
      return connection.getParentInput().name;
    } else {
      switch (connection.type) {
        case Blockly.OUTPUT_VALUE:
          return 'output';
        case Blockly.PREVIOUS_STATEMENT:
          return 'previous';
        case Blockly.NEXT_STATEMENT:
          return 'next';
      }
    }
  }
}

/**
 * An error representing something going wrong with a connection check, or
 * another public connection-check-y function.
 */
export class ConnectionCheckError extends Error {
  /**
   * Constructs a ConnectionCheckError.
   * @param {string} msg The error message.
   * @param {Error=} error The optional error being wrapped.
   */
  constructor(msg, error = undefined) {
    super(msg);

    /**
     * The error this error is wrapping, or undefined.
     * @type {Error}
     */
    this.wrappedError = error;
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
