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
import {
  parseType,
  structureToString,
  TypeStructure,
} from './type_structure';
import {
  getCheck,
  isGeneric,
  combine, STANDARD_GENERIC,
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
     * @type {WeakMap<!Blockly.Block, Map<string, !TypeStructure>>}
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
    this.typeHierarchy_ = new TypeHierarchy(
        hierarchyDef, parseType, isGeneric, STANDARD_GENERIC);
  }

  /**
   * @override
   */
  doTypeChecks(a, b) {
    try {
      const {parent, child} = this.getParentAndChildConnections_(a, b);
      const childTypes = this.getExplicitTypesOfConnectionInternal_(child);
      return this.doTypeChecksInternal_(childTypes, parent);
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
   * @param {!Array<!TypeStructure>} childTypes All of the valid types for the
   *     child connection.
   * @param {!Blockly.Connection} parent The parent connection.
   * @return {boolean} True if the connections are compatible, false otherwise.
   * @private
   */
  doTypeChecksInternal_(childTypes, parent) {
    const parentSource = parent.getSourceBlock();
    const parentCheck = parseType(getCheck(parent));
    // Programmatic bindings are treated like explicit types.
    const parentDereferencedType =
        this.dereferenceExternalBindings_(parentSource, parentCheck);
    const typeHierarchy = this.getTypeHierarchy_();

    // At least one child type must fulfill all of the explicit type
    // requirements of the parent type.
    const compatible = childTypes.some((childType) =>
      typeHierarchy.typeFulfillsType(childType, parentDereferencedType));
    if (!compatible) {
      return false;
    }

    const parentOutput = parentSource.outputConnection ||
        parentSource.previousConnection;
    if (!parentOutput) {
      // If there is no output, we have no reason to constrain the types further
      // (eg no reason for them to need to share a common parent).
      return true;
    }

    // Make sure that a type for the output can be "found", and it is still
    // compatible with the input it is currently connected to (if one exists).
    const parentOutputCheck = parseType(getCheck(parentOutput));
    const typeMap = new Map().set(parent, childTypes);
    const parentOutputTypes = this.getExplicitVersionsOfType_(
        parentSource, parentOutputCheck, undefined, false, typeMap);
    if (parentOutput.targetConnection) {
      // Check that it is still compatible.
      return this.doTypeChecksInternal_(
          parentOutputTypes, parentOutput.targetConnection);
    }
    // Ensure that a type could be "found" at least.
    return !!parentOutputTypes.length;
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
      if (types[0].equals(STANDARD_GENERIC)) {
        return [];
      }
      return types.map((type) => structureToString(type));
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
   * generic connection cannot be found, the generic type is replaced with the
   * STANDARD_GENERIC.
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
    const explicitStructure = parseType(explicitType);
    if (this.containsAnyGeneric_(explicitStructure)) {
      throw Error('Programmatically binding generic types to other generic ' +
          'types, or types which contain generic parameters, is not currently' +
          'supported. Please file an issue if you have a good usecase: ' +
          'https://github.com/google/blockly-samples/issues/new/choose');
    }

    /** @type{!Map<string, !TypeStructure>} */
    let map = this.explicitBindings_.get(block);
    if (!map) {
      map = new Map();
      this.explicitBindings_.set(block, map);
    }
    map.set(genericType, explicitStructure);

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
   * Returns true if the given connection is a parent connection, false
   * otherwise.
   * @param {!Blockly.Connection} connection The connection to get the
   *     parent-ness of.
   * @return {boolean} True if the given connection is a parent connection,
   *     false otherwise.
   * @private
   */
  isParent_(connection) {
    return connection.isSuperior();
  }

  /**
   * Returns an array of the given type structure with its generic params
   * replaced with all valid combinations of bindings. If a generic is unbound
   * then it replaced with the STANDARD_GENERIC.
   * @param {!Blockly.Block} block The block that gives context to the generic
   *     bindings.
   * @param {!TypeStructure} struct The struct to replace the generics of.
   * @param {!Blockly.Connection=} connectionToSkip The connection to skip. If
   *     the connection matches this connection, it will be ignored.
   * @param {boolean=} checkOutputs If true, this will check block outputs when
   *     attempting to find the explicit type. If false, it will not.
   * @param {!Map<Blockly.Connection, !Array<!TypeStructure>>=} typesMap A map
   *     mapping connections to the valid types of their target connection.
   *     This is used to simulate two connections being connected to see if that
   *     would cause the stack of blocks to be badly typed.
   * @return {!Array<!TypeStructure>} An array of the given type structure with
   *     its generic params replaced with all valid combinations of bindings.
   * @private
   */
  getExplicitVersionsOfType_(
      block,
      struct,
      connectionToSkip = undefined,
      checkOutputs = true,
      typesMap = undefined,
  ) {
    if (isGeneric(struct.name)) {
      return this.getBoundTypes_(
          block, struct.name, connectionToSkip, checkOutputs, typesMap);
    }
    if (!struct.params.length) {
      return [struct];
    }

    const paramsLists = struct.params.map((param) =>
      this.getExplicitVersionsOfType_(
          block, param, connectionToSkip, checkOutputs, typesMap));
    paramsLists[0] = paramsLists[0].map((val) => [val]);
    const combos = combine(paramsLists);
    return combos.map((combo) => {
      const newStruct = new TypeStructure(struct.name);
      newStruct.params = combo;
      return newStruct;
    });
  }

  /**
   * Returns the explicit type(s) bound to the block generic type pair if one
   * exists. If no explicit type is found, this returns an array containing only
   * the STANDARD_GENERIC. If the types associated with the generic were
   * not compatible (we couldn't find a nearest common parent) this returns an
   * empty array.
   *
   * Note that we only get multiple types via type unification of types that
   * are externally bound, or associated with input connections.
   * @param {!Blockly.Block} block The block that provides the context for the
   *     explicit binding.
   * @param {string} genericType The generic type we want to get the bound
   *     explicit type of.
   * @param {!Blockly.Connection=} connectionToSkip The connection to skip. If
   *     the connection matches this connection, it will be ignored.
   * @param {boolean=} checkOutputs If true, this will check block outputs when
   *     attempting to find the explicit type. If false, it will not.
   * @param {!Map<Blockly.Connection, !Array<!TypeStructure>>=} typesMap A map
   *     mapping connections to the valid types of their target connection.
   *     This is used to simulate two connections being connected to see if that
   *     would cause the stack of blocks to be badly typed.
   * @return {!Array<!TypeStructure>} The explicit type(s) bound to the generic,
   *     if a compatible binding could be found. If no explicit type could be
   *     found, this returns an array containing only the STANDARD_GENERIC. If
   *     the types associated with the generic were not compatible this returns
   *     an empty array.
   * @private
   */
  getBoundTypes_(
      block,
      genericType,
      connectionToSkip = undefined,
      checkOutputs = true,
      typesMap = undefined,
  ) {
    genericType = genericType.toLowerCase();

    const type = this.getExternalBinding_(block, genericType);
    if (type) {
      return [type];
    }

    const params = [genericType, connectionToSkip, checkOutputs, typesMap];
    // The structure of go this is like:
    //  [  [  [a, b], [] ], [ [], [c, d, e] ], [ ] ]
    //  ^  ^  ^-unifications of types associated with the given generic
    //  |  \all sets of unifications for a given connection
    //  \outer collection of all connections' unifications
    //
    // We use type arrays instead of just concatenating all of the types into
    // a 1D array so that we can unify the types, and then if only some of the
    // unifications unify with other unifications, we still get a valid bound
    // type.
    /* @type{!Array<!Array<!Array<!TypeStructure>>>>} */
    let typeArrays = [];
    if (checkOutputs) {
      typeArrays.push(this.getConnectionTypes_(
          block.outputConnection, ...params));
      typeArrays.push(this.getConnectionTypes_(
          block.previousConnection, ...params));
    }
    for (const input of block.inputList) {
      typeArrays.push(
          this.getConnectionTypes_(input.connection, ...params));
    }
    typeArrays.push(
        this.getConnectionTypes_(block.nextConnection, ...params));
    typeArrays = typeArrays.filter((typeArray) => typeArray.length);

    if (!typeArrays.length) {
      // None of the connections had any bindings for the type.
      return [STANDARD_GENERIC];
    }

    const hierarchy = this.getTypeHierarchy_();
    // Flatten all of the unifications together.
    /* @type{!Array<!Array<!TypeStructure} */
    const reducedTypeArrays = typeArrays.map((connectionArray) =>
      connectionArray
          .reduce((flat, toFlatten) => [...flat, ...toFlatten], []));

    if (reducedTypeArrays.some((connectionArray) => !connectionArray.length)) {
      // One of the connections had no valid unification for any combination of
      // types associated with the generic, so we won't be able to "find" a type
      // for the generic. Fail out of this function.
      return [];
    }

    return reducedTypeArrays
        // Get the nearest common types of all the connection types.
        .reduce((acc, typeArray) =>
          acc.map((accType) =>
            typeArray.map((type) =>
              hierarchy.getNearestCommonParents(accType, type)
            ).reduce((flat, toFlatten) => [...flat, ...toFlatten], [])
          ).reduce((flat, toFlatten) => [...flat, ...toFlatten], []))
        // Remove duplicates
        .filter((type1, i, types) =>
          types.findIndex((type2) => type1.equals(type2)) == i)
        // Remove not-nearest common types.
        .filter((type1, i, types) =>
          types.every((type2, j) =>
            i == j || !hierarchy.typeFulfillsType(type2, type1)));
  }

  /**
   * Returns the externally bound explicit type associated with the given
   * genericType in the context of the given block, if one exists. Otherwise,
   * null.
   * @param {!Blockly.Block} block The block that provides context for the
   *     explicit binding.
   * @param {string} genericType The generic type we want to get the externally
   *     bound explicit type of.
   * @return {TypeStructure} The externally bound explicit type, if one exists.
   *     Otherwise, null.
   * @private
   */
  getExternalBinding_(block, genericType) {
    if (this.explicitBindings_.has(block)) {
      return this.explicitBindings_.get(block).get(genericType);
    }
    return null;
  }

  /**
   * Returns arrays of bound type(s) associated with the passed connection (if
   * the connection is valid and bound types could be found). Each array
   * contains the nearest common parents of the set of bound types for one of
   * the types on the connection. If all of the bound types are generic, this is
   * an array of the STANDARD_GENERIC. If the connection is invalid, this
   * returns an empty array.
   * @param {!Blockly.Connection} connection The connection to get the bound
   *     type of.
   * @param {string} genericType The generic type to find the bound type of.
   * @param {!Blockly.Connection=} connectionToSkip The connection to skip. If
   *     the connection matches this connection, it will be ignored.
   * @param {boolean=} checkOutputs If true, this will check block outputs when
   *     attempting to find the explicit type. If false, it will not.
   * @param {!Map<Blockly.Connection, !Array<!TypeStructure>>=} typesMap A map
   *     mapping connections to the valid types of their target connection.
   *     This is used to simulate two connections being connected to see if that
   *     would cause the stack of blocks to be badly typed.
   * @return {!Array<!Array<!TypeStructure>>} Arrays of bound type(s) associated
   *     with the passed connection (if the connection is valid and bound types
   *     could be found). Each array contains the nearest common parents of the
   *     set of bound types for one of the types on the connection. If all of
   *     the bound types are generic, this is an array of the STANDARD_GENERIC.
   *     If the connection is invalid, this returns an empty array.
   * @private
   */
  getConnectionTypes_(
      connection,
      genericType,
      connectionToSkip = undefined,
      checkOutputs = true,
      typesMap = undefined,
  ) {
    if (!connection || connection == connectionToSkip) {
      return [];
    }
    if (!connection.targetConnection &&
        (!typesMap || !typesMap.has(connection))) {
      return [];
    }

    const sourceType = parseType(getCheck(connection));
    if (!this.containsGenericType_(sourceType, genericType)) {
      return [];
    }

    // Get the types of the connection connected to this connection.
    let targetTypes;
    if (typesMap && typesMap.has(connection)) {
      targetTypes = typesMap.get(connection);
    } else {
      const target = connection.targetConnection;
      targetTypes = this.getExplicitVersionsOfType_(
          target.getSourceBlock(),
          parseType(getCheck(target)),
          target,
          checkOutputs);
    }

    if (isGeneric(sourceType.name)) {
      return [targetTypes];
    }

    const hierarchy = this.getTypeHierarchy_();
    const genericStruct = new TypeStructure(genericType);
    const getMatches = this.isParent_(connection) ?
        hierarchy.getMatchingTypesInDescendant.bind(hierarchy):
        hierarchy.getMatchingTypesInAncestor.bind(hierarchy);
    return targetTypes
        // Get all of the types associated with the given generic.
        .map((targetType) => getMatches(genericStruct, sourceType, targetType))
        // If all of the types are generic, map to the standard generic,
        // otherwise map to the nearest common parent of all of the types.
        .map((typeCombo) => {
          if (typeCombo.every((type) => isGeneric(type.name))) {
            return [STANDARD_GENERIC];
          }
          return hierarchy.getNearestCommonParents(...typeCombo);
        });
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
    return sourceType.someName((name) => name == generic);
  }

  /**
   * Returns true if the sourceType is a generic type, or contains any generic
   * parameters.
   * @param {!TypeStructure} sourceType The type to check for generics.
   * @return {boolean} True if the sourceType is a generic type, or contains
   *     any generic parameters.
   * @private
   */
  containsAnyGeneric_(sourceType) {
    return sourceType.someName(isGeneric);
  }

  /**
   * Replaces any generics that are bound to explicit types via bindType() with
   * their explicit types. Does not replace generics that are bound via
   * connections between blocks.
   * @param {!Blockly.Block} block The block that provides context for the
   *     explicit binding.
   * @param {!TypeStructure} structure The block to dereference the explicit
   *     bindings for.
   * @return {!TypeStructure} The type structure with the explicit bindings
   *     dereferenced.
   * @private
   */
  dereferenceExternalBindings_(block, structure) {
    let newStruct;
    if (isGeneric(structure.name)) {
      newStruct = this.getExternalBinding_(block, structure.name) ||
          new TypeStructure(structure.name);
    } else {
      newStruct = new TypeStructure(structure.name);
      newStruct.params = structure.params.map((param) =>
        this.dereferenceExternalBindings_(block, param));
    }
    return newStruct;
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
