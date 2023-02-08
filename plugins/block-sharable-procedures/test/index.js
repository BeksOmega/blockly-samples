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
import {blocks, ObservableParameterModel, ObservableProcedureModel, unregisterProcedureBlocks} from '../src/index';
import {ProcedureBase} from '../src/events_procedure_base';


unregisterProcedureBlocks();
Blockly.common.defineBlocks(blocks);

export let workspace1;
export let listener1;
export let workspace2;
export let listener2;

document.addEventListener('DOMContentLoaded', function() {
  const options = {
    toolbox: toolboxCategories,
  };
  workspace1 = Blockly.inject('blockly1', options);
  workspace2 = Blockly.inject('blockly2', options);
  listener1 = workspace1.addChangeListener(createChangeListener(workspace2));
  listener2 = workspace2.addChangeListener(createChangeListener(workspace1));
});

function createChangeListener(otherWorkspace) {
  return (e) => {
    if (!(e instanceof ProcedureBase) &&
        !(e instanceof Blockly.Events.VarBase)) {
      return;
    }
    let event;
    try {
      event = Blockly.Events.fromJson(e.toJson(), otherWorkspace);
    } catch (e) {
      console.log(
          'Could not deserialize event. This is expected to happen, e.g. ' +
          'when round-tripping parameter deletes, the delete in the ' +
          'secondary workspace cannot be deserialized into the original ' +
          'workspace.');
      return;
    }
    console.log('running', event);
    event.run(true);
  };
}

export function testSerialization() {
  Blockly.serialization.registry.unregister('procedures');
  Blockly.serialization.registry.register(
      'procedures',
      new Blockly.serialization.procedures.ProcedureSerializer(
          ObservableProcedureModel, ObservableParameterModel));

  workspace1.removeChangeListener(listener1);
  workspace2.removeChangeListener(listener2);

  const save1 = Blockly.serialization.workspaces.save(workspace1);
  const save2 = Blockly.serialization.workspaces.save(workspace2);
  console.log(JSON.stringify(save1, undefined, 2));
  console.log(JSON.stringify(save2, undefined, 2));
  Blockly.serialization.workspaces.load(save1, workspace1);
  Blockly.serialization.workspaces.load(save2, workspace2);

  const loadListener1 = workspace1.addChangeListener((e) => {
    if (e instanceof Blockly.Events.FinishedLoading) {
      workspace1.removeChangeListener(loadListener1);
      listener1 = workspace1.addChangeListener(
          createChangeListener(workspace2));
    }
  });
  const loadListener2 = workspace1.addChangeListener((e) => {
    if (e instanceof Blockly.Events.FinishedLoading) {
      workspace2.removeChangeListener(loadListener2);
      listener2 = workspace2.addChangeListener(
          createChangeListener(workspace1));
    }
  });
}
