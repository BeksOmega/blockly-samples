/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Defines utility functions used by multiple classes in the
 *     nominal-connection-checker package.
 */
'use strict';

/**
 * Returns the type of the connection. If the type is generic it returns the
 * generic type, eg 'T'.
 * @param {!Blockly.Connection} connection The connection to get the type of.
 * @return {string} The type of the connection.
 */
export function getType(connection) {
  return connection.getCheck()[0];
}

/**
 * Returns the id of the connection's source block.
 * @param {!Blockly.Connection} connection The connection to get the source
 *     block id of.
 * @return {string} The id of the connection's source block.
 */
export function getBlockId(connection) {
  return connection.getSourceBlock().id;
}

