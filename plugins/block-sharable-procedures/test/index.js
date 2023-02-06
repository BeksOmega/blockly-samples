/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Block test.
 */

import * as Blockly from 'blockly';
import {toolboxCategories} from '@blockly/dev-tools';
import {blocks, unregisterProcedureBlocks} from '../src/index';
import {ProcedureBase} from '../src/events_procedure_base';


unregisterProcedureBlocks();
Blockly.common.defineBlocks(blocks);

document.addEventListener('DOMContentLoaded', function() {
  const options = {
    toolbox: toolboxCategories,
  };
  const workspace1 = Blockly.inject('blockly1', options);
  const workspace2 = Blockly.inject('blockly2', options);
  workspace1.addChangeListener(createChangeListener(workspace2));
  workspace2.addChangeListener(createChangeListener(workspace1));
});

function createChangeListener(otherWorkspace) {
  return (e) => {
    if (!(e instanceof ProcedureBase)) return;
    let event;
    try {
      event = Blockly.Events.fromJson(e.toJson(), otherWorkspace);
    } catch (e) {
      console.log(
          'Could not deserialize event. This is expected to happen, e.g. ' +
          'when round-tripping parameter deletes, the delete in the ' +
          'secondary workspace cannot be deserialized into the original ' +
          ' workspace.');
      return;
    }
    event.run(true);
  };
}
