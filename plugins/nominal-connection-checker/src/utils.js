/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A file defining helper functions useful in multiple modules.
 */


import {parseType} from './type_structure';


/**
 * Returns the type name (which could be generic) associated with the
 * connection.
 * @param {!Blockly.Connection} connection The connection to find the check of.
 * @return {string} The caseless type name associated with the connection, or
 *     the null string if the connection has no type.
 */
export function getCheck(connection) {
  const check = connection.getCheck()[0];
  if (!check || typeof check != 'string') {
    return '';
  }
  return check.toLowerCase();
}


/**
 * Returns true if type is generic. False otherwise.
 * @param {string} type The type to check for generic-ness.
 * @return {boolean} True if the type is generic. False otherwise.
 * @private
 */
export function isGeneric(type) {
  return type.length == 1;
}

/**
 * Returns true if type is explicit. False otherwise.
 * @param {string} type The type to check for explicit-ness.
 * @return {boolean} True if the type is explicit. False otherwise.
 * @private
 */
export function isExplicit(type) {
  return !isGeneric(type);
}

// TODO: Update these descriptions to be more accurate.
/**
 * Returns true if the connection has a generic connection check. False
 * otherwise.
 * @param {!Blockly.Connection} connection The connection to check for
 *     generic-ness.
 * @return {boolean} True if the connection has a generic connection check.
 *     False otherwise.
 * @private
 */
export function isGenericConnection(connection) {
  function isGenericRec(typeStruct) {
    if (isGeneric(typeStruct.name)) {
      return true;
    }
    return typeStruct.params.some((param) => isGenericRec(param));
  }
  return isGenericRec(parseType(getCheck(connection)));
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
export function isExplicitConnection(connection) {
  return !isGenericConnection(connection);
}
