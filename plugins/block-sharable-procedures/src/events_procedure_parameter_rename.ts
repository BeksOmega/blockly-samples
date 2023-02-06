/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {ProcedureParameterBase, ProcedureParameterBaseJson} from './events_procedure_parameter_base';


const TYPE = 'procedure_parameter_rename';

// TODO: Maybe delete this event since I don't think we're firing it.

/**
 * Notifies listeners that a procedure parameter was renamed.
 */
export class ProcedureParameterRename extends ProcedureParameterBase {
  /** A string used to check the type of the event. */
  type = TYPE;

  /** The new name of the procedure parameter. */
  private readonly newName: string;

  /**
   * Constructs the procedure parameter rename event.
   * @param workspace The workpace this event is associated with.
   * @param procedure The procedure model this event is associated with.
   * @param parameter The parameter model this event is associated with.
   * @param oldName The old name of the procedure parameter.
   */
  constructor(
      workspace: Blockly.Workspace,
      procedure: Blockly.procedures.IProcedureModel,
      parameter: Blockly.procedures.IParameterModel,
      readonly oldName: string,
      newName?: string) {
    super(workspace, procedure, parameter);

    this.newName = newName ?? parameter.getName();
  }

  /**
   * Replays the event in the workspace.
   * @param forward if true, play the event forward (redo), otherwise play it
   *     backward (undo).
   */
  run(forward: boolean) {
    const parameterModel = findMatchingParameter(
        this.getEventWorkspace_(),
        this.procedure.getId(),
        this.parameter.getId());
    if (!parameterModel) {
      throw new Error(
          'Cannot rename a parameter that does not exist ' +
          'in the procedure map');
    }
    if (forward) {
      parameterModel.setName(this.newName);
    } else {
      parameterModel.setName(this.oldName);
    }
  }

  /**
   * Encode the event as JSON.
   * @returns JSON representation.
   */
  toJson(): ProcedureParameterRenameJson {
    const json = super.toJson() as ProcedureParameterRenameJson;
    json['newName'] = this.newName;
    json['oldName'] = this.oldName;
    return json;
  }

  /**
   * Deserializes the JSON event.
   * @param json The JSON representation of a procedure parameter rename event.
   * @param workspace The workspace to deserialize the event into.
   * @returns The new procedure parameter rename event.
   * @internal
   */
  static fromJson(
      json: ProcedureParameterRenameJson,
      workspace: Blockly.Workspace
  ): ProcedureParameterRename {
    const model = workspace.getProcedureMap().get(json['procedureId']);
    if (!model) {
      throw new Error(
          'Cannot deserialize procedure delete event because the ' +
          'target procedure does not exist');
    }
    const param = findMatchingParameter(
        workspace, json['procedureId'], json['parameterId']);
    if (!param) {
      throw new Error(
          'Cannot deserialize parameter rename event because the ' +
          'target parameter does not exist');
    }
    return new ProcedureParameterRename(
        workspace, model, param, json['oldName'], json['newName']);
  }
}

/**
 * Finds the parameter with the given ID in the procedure model with the given
 * ID, if both things exist.
 * @param workspace The workspace to search for the parameter.
 * @param modelId The ID of the model to search for the parameter.
 * @param paramId The ID of the parameter to search for.
 * @returns The parameter model that was found.
 */
function findMatchingParameter(
    workspace: Blockly.Workspace,
    modelId: string,
    paramId: string
): Blockly.procedures.IParameterModel|undefined {
  const procedureModel = workspace.getProcedureMap().get(modelId);
  if (!procedureModel) {
    throw new Error(
        'Cannot rename the parameter of a procedure that does not exist ' +
        'in the procedure map');
  }
  return procedureModel.getParameters().find((p) => p.getId() === paramId);
}

export interface ProcedureParameterRenameJson extends
    ProcedureParameterBaseJson {
  oldName: string;
}

Blockly.registry.register(
    Blockly.registry.Type.EVENT, TYPE, ProcedureParameterRename);
