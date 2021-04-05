/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


import {TypeStructure} from './type_structure';

/**
 * @fileoverview A file defining helper functions/constants useful in multiple
 * modules.
 */

/**
 * A standard representation of a generic type.
 * In this implementation generic types are replaced with this type when no
 * binding can be found. This is to make that case clear when debugging.
 * @type {string}
 */
export const STANDARD_GENERIC_TYPE = '*';

/**
 * A standard representation of a generic type structure.
 * In this implementation generic types are replaced with this type when no
 * binding can be found. This is to make that case clear when debugging.
 * @type {!TypeStructure}
 */
export const STANDARD_GENERIC = new TypeStructure(STANDARD_GENERIC_TYPE);

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
  return type.length > 1;
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
export function isGenericConnection(connection) {
  return isGeneric(getCheck(connection));
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
  return isExplicit(getCheck(connection));
}

/**

 * Creates all combinations of elements in the subarrays as arrays. If any
 * subarray is an empty array, this evaluates to an empty array.
 * @param {!Array<!Array<*>>} firstArray The first array to add the items
 *     of the second array onto. Should be an array of arrays for proper
 *     combinating.
 * @param {!Array<*>} secondArray An array of elements used to create
 *     combinations.
 * @param {!Array<!Array<*>>} rest The rest of the arrays of elements.
 * @return {!Array<!Array<*>>} All combinations of elements in all of the
 *     subarrays.
 * @private
 */
export function combine([firstArray, ...[secondArray, ...rest]]) {
  if (!secondArray) {
    return firstArray;
  }
  const combined = firstArray
      .map((a) => secondArray.map((b) => [].concat(a, b)))
      .reduce((flat, toFlatten) => [...flat, ...toFlatten], []);
  return combine([combined, ...rest]);
}
