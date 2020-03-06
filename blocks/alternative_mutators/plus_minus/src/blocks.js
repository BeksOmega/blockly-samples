/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Blocks for demonstrating using +/- icons for manipulating
 *    the shape of a block.
 */

Blockly.defineBlocksWithJsonArray([
  // TODO: It's annoying that we have to redefine the whole controls_ifelse
  //  block. It would be nice if the default block had an empty mutator
  //  we could override.
  {
    "type": "controls_ifelse",
    "message0": "%{BKY_CONTROLS_IF_MSG_IF} %1" +
        "%{BKY_CONTROLS_IF_MSG_THEN} %2" +
        "%{BKY_CONTROLS_IF_MSG_ELSE} %3",
    "args0": [
      {
        "type": "input_value",
        "name": "IF0",
        "check": "Boolean"
      },
      {
        "type": "input_statement",
        "name": "DO0"
      },
      {
        "type": "input_statement",
        "name": "ELSE"
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "style": "logic_blocks",
    "tooltip": "%{BKYCONTROLS_IF_TOOLTIP_2}",
    "helpUrl": "%{BKY_CONTROLS_IF_HELPURL}",
    "mutator": "controls_if_mutator",
    "extensions": [
      "controls_if_tooltip",
    ]
  },
  {
    "type": "lists_create_with",
    "message0": "%1 %{BKY_LISTS_CREATE_EMPTY_TITLE} %2",
    "args0": [
      {
        "type": "field_plus",
        "name": "PLUS"
      },
      {
        "type": "input_dummy",
        "name": "EMPTY"
      },
    ],
    "output": "Array",
    "style": "list_blocks",
    "helpUrl": "%{BKY_LISTS_CREATE_WITH_HELPURL}",
    "tooltip": "%{BKY_LISTS_CREATE_WITH_TOOLTIP}",
    "mutator": "new_list_create_with_mutator"
  },
  {
    "type": "procedures_defnoreturn",
    "message0": "%1 %{BKY_PROCEDURES_DEFNORETURN_TITLE} %2 %3",
    "message1": "%{BKY_PROCEDURES_DEFNORETURN_DO} %1",
    "args0": [
      {
        "type": "field_plus",
        "name": "PLUS"
      },
      {
        "type": "field_input",
        "name": "NAME",
        "text": ""
      },
      {
        "type": "input_dummy",
        "name": "TOP"
      },
    ],
    "args1": [
      {
        "type": "input_statement",
        "name": "STACK"
      }
    ],
    "style": "procedure_blocks",
    "helpUrl": "%{BKY_PROCEDURES_DEFNORETURN_HELPURL}",
    "tooltip": "%{BKY_PROCEDURES_DEFNORETURN_TOOLTIP}",
    "extensions": [
      "get_procedure_def_no_return",
      "procedure_context_menu",
      "procedure_rename",
      "procedure_vars",
    ],
    "mutator": "procedure_def_mutator"
  },
  {
    "type": "procedures_defreturn",
    "message0": "%1 %{BKY_PROCEDURES_DEFRETURN_TITLE} %2 %3",
    "message1": "%{BKY_PROCEDURES_DEFRETURN_DO} %1",
    "message2": "%{BKY_PROCEDURES_DEFRETURN_RETURN} %1",
    "args0": [
      {
        "type": "field_plus",
        "name": "PLUS"
      },
      {
        "type": "field_input",
        "name": "NAME",
        "text": ""
      },
      {
        "type": "input_dummy",
        "name": "TOP"
      },
    ],
    "args1": [
      {
        "type": "input_statement",
        "name": "STACK"
      }
    ],
    "args2": [
      {
        "type": "input_value",
        "align": "right",
        "name": "RETURN"
      }
    ],
    "style": "procedure_blocks",
    "helpUrl": "%{BKY_PROCEDURES_DEFRETURN_HELPURL}",
    "tooltip": "%{BKY_PROCEDURES_DEFRETURN_TOOLTIP}",
    "extensions": [
      "get_procedure_def_return",
      "procedure_context_menu",
      "procedure_rename",
      "procedure_vars",
    ],
    "mutator": "procedure_def_mutator"
  }
]);

controlsIfMutator =  {
  // TODO: This should be its own extension. But that requires core changes.
  suppressPrefixSuffix: true,

  elseIfCount_: 0,

  /**
   * Create XML to represent the number of else-if and else inputs.
   * @return {Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function() {
    if (!this.elseIfCount_) {
      return null;
    }
    var container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('elseif', this.elseIfCount_);
    return container;
  },

  /**
   * Parse XML to restore the else-if and else inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    var targetCount = parseInt(xmlElement.getAttribute('elseif'), 10) || 0;
    this.updateShape_(targetCount);
  },

  updateShape_: function(targetCount) {
    while (this.elseIfCount_ < targetCount) {
      this.addPart_();
    }
    while(this.elseIfCount_ > targetCount) {
      this.removePart_();
    }
    this.updateMinus_();
  },

  plus: function() {
    this.addPart_();
    this.updateMinus_();
  },

  minus: function() {
    this.removePart_();
    this.updateMinus_();
  },

  // To properly keep track of indices we have to increment before/after adding
  // the inputs, and decrement the opposite.
  // Because we want our first elseif to be IF1 (not IF0) we increment first.
  addPart_: function() {
    this.elseIfCount_++;
    this.appendValueInput('IF' + this.elseIfCount_)
        .setCheck('Boolean')
        .appendField(Blockly.Msg['CONTROLS_IF_MSG_ELSEIF']);
    this.appendStatementInput('DO' + this.elseIfCount_)
        .appendField(Blockly.Msg['CONTROLS_IF_MSG_THEN']);

    // Handle if-elseif-else block.
    if (this.getInput('ELSE')) {
      this.moveInputBefore('ELSE', /* put at end */ null);
    }
  },

  removePart_: function() {
    this.removeInput('IF' + this.elseIfCount_);
    this.removeInput('DO' + this.elseIfCount_);
    this.elseIfCount_--;
  },

  updateMinus_: function() {
    var minusField = this.getField('MINUS');
    if (!minusField) {
      this.topInput_.insertFieldAt(1, new plusMinus.FieldMinus(), 'MINUS');
    } else if (!this.elseIfCount_) {
      this.topInput_.removeField('MINUS');
    }
  }
};

/**
 * @this {Blockly.Block}
 * @constructor
 */
controlsIfHelper = function() {
  this.topInput_ = this.getInput('IF0');
  this.topInput_.insertFieldAt(0, new plusMinus.FieldPlus(), 'PLUS');
};

Blockly.Extensions.unregister('controls_if_mutator');
Blockly.Extensions.registerMutator('controls_if_mutator',
    controlsIfMutator, controlsIfHelper);

textJoinMutator = {
  itemCount_: 0,

  /**
   * Create XML to represent number of text inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the text inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    var targetCount = parseInt(xmlElement.getAttribute('items'), 10);
    this.updateShape_(targetCount);
  },

  updateShape_: function(targetCount) {
    while (this.itemCount_ < targetCount) {
      this.addPart_();
    }
    while(this.itemCount_ > targetCount) {
      this.removePart_();
    }
    this.updateMinus_();
  },

  plus: function() {
    this.addPart_();
    this.updateMinus_();
  },

  minus: function() {
    this.removePart_();
    this.updateMinus_();
  },

  // To properly keep track of indices we have to increment before/after adding
  // the inputs, and decrement the opposite.
  // Because we want our first item to be ADD0 (not ADD1) we increment after.
  addPart_: function() {
    if (this.itemCount_ == 0) {
      if (this.getInput('EMPTY')) {
        // TODO: I don't think this should throw errors. It would be nice if
        //   It returned a boolean instead.
        this.removeInput('EMPTY');
      }
      this.topInput_ = this.appendValueInput('ADD' + this.itemCount_)
          .appendField(new plusMinus.FieldPlus(), 'PLUS')
          .appendField(Blockly.Msg['TEXT_JOIN_TITLE_CREATEWITH']);
    } else {
      this.appendValueInput('ADD' + this.itemCount_);
    }
    this.itemCount_++;
  },

  removePart_: function() {
    this.itemCount_--;
    this.removeInput('ADD' + this.itemCount_);
    if (this.itemCount_ == 0) {
      this.topInput_ = this.appendDummyInput('EMPTY')
          .appendField(new plusMinus.FieldPlus(), 'PLUS')
          .appendField(this.newQuote_(true))
          .appendField(this.newQuote_(false));
    }
  },

  updateMinus_: function() {
    var minusField = this.getField('MINUS');
    if (!minusField && this.itemCount_ > 0) {
      this.topInput_.insertFieldAt(1, new plusMinus.FieldMinus(), 'MINUS');
    } else if (minusField && this.itemCount_ < 1) {
      this.topInput_.removeField('MINUS');
    }
  },
};

/**
 * @this {Blockly.Block}
 * @constructor
 */
textJoinHelper = function() {
  this.mixin(Blockly.Constants.Text.QUOTE_IMAGE_MIXIN);
  this.updateShape_(2);
};

Blockly.Extensions.unregister('text_join_mutator');
Blockly.Extensions.registerMutator('text_join_mutator',
    textJoinMutator, textJoinHelper);

listCreateMutator = {
  itemCount_: 0,

  /**
   * Create XML to represent number of text inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the text inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    var targetCount = parseInt(xmlElement.getAttribute('items'), 10);
    this.updateShape_(targetCount);
  },

  updateShape_: function(targetCount) {
    while (this.itemCount_ < targetCount) {
      this.addPart_();
    }
    while(this.itemCount_ > targetCount) {
      this.removePart_();
    }
    this.updateMinus_();
  },

  plus: function() {
    this.addPart_();
    this.updateMinus_();
  },

  minus: function() {
    this.removePart_();
    this.updateMinus_();
  },

  // To properly keep track of indices we have to increment before/after adding
  // the inputs, and decrement the opposite.
  // Because we want our first input to be ADD0 (not ADD1) we increment after.
  addPart_: function() {
    if (this.itemCount_ == 0) {
      this.removeInput('EMPTY');
      this.topInput_ = this.appendValueInput('ADD' + this.itemCount_)
          .appendField(new plusMinus.FieldPlus(), 'PLUS')
          .appendField(Blockly.Msg['LISTS_CREATE_WITH_INPUT_WITH']);
    } else {
      this.appendValueInput('ADD' + this.itemCount_);
    }
    this.itemCount_++;
  },

  removePart_: function() {
    this.itemCount_--;
    this.removeInput('ADD' + this.itemCount_);
    if (this.itemCount_ == 0) {
      this.topInput_ = this.appendDummyInput('EMPTY')
          .appendField(new plusMinus.FieldPlus(), 'PLUS')
          .appendField(Blockly.Msg['LISTS_CREATE_EMPTY_TITLE']);
    }
  },

  updateMinus_: function() {
    var minusField = this.getField('MINUS');
    if (!minusField && this.itemCount_ > 0) {
      this.topInput_.insertFieldAt(1, new plusMinus.FieldMinus(), 'MINUS');
    } else if (minusField && this.itemCount_ < 1) {
      this.topInput_.removeField('MINUS');
    }
  }
};

/**
 * @this {Blockly.Block}
 * @constructor
 */
listCreateHelper = function() {
  this.updateShape_(3);
};

Blockly.Extensions.registerMutator('new_list_create_with_mutator',
    listCreateMutator, listCreateHelper);

getDefNoReturn = {
  getProcedureDef: function() {
    return [this.getFieldValue('NAME'), this.arguments_, false];
  },
  callType_: 'procedures_callnoreturn'
};

Blockly.Extensions.registerMixin('get_procedure_def_no_return', getDefNoReturn);

getDefReturn = {
  getProcedureDef: function() {
    return [this.getFieldValue('NAME'), this.arguments_, false];
  },
  callType_: 'procedures_callreturn'
};

Blockly.Extensions.registerMixin('get_procedure_def_return', getDefReturn);

procedureContextMenu = {
  customContextMenu: function(options) {
    if (this.isInFlyout) {
      return;
    }

    // Add option to create caller.
    var name = this.getFieldValue('NAME');
    var text = Blockly.Msg['PROCEDURES_CREATE_DO'].replace('%1', name);

    var xml = Blockly.utils.xml.createElement('block');
    xml.setAttribute('type', this.callType_);
    xml.appendChild(this.mutationToDom());
    var callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);

    options.push({
      enabled: true,
      text: text,
      callback: callback
    });

    if (this.isCollapsed) {
      return;
    }

    // Add options to create getters for each parameter.
    for (var i = 0, model; (model = this.argumentVarModels_[i]); i++) {
      var text = Blockly.Msg['VARIABLES_SET_CREATE_GET']
          .replace('%1', model.name);

      var xml = Blockly.utils.xml.createElement('block');
      xml.setAttribute('type', 'variables_get');
      xml.appendChild(Blockly.Variables.generateVariableFieldDom(model));
      var callback = Blockly.ContextMenu.callbackFactory(this, xml);

      options.push({
        enabled: true,
        text: text,
        callback: callback
      });
    }
  }
};

Blockly.Extensions.registerMixin('procedure_context_menu', procedureContextMenu);

procedureDefMutator = {
  // Parallel arrays.
  arguments_: [],
  paramIds_: [],
  argumentVarModels_: [],

  mutationToDom: function() {
    var container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('name', this.getFieldValue('NAME'));
    for (var i = 0; i < this.argumentVarModels_.length; i++) {
      var parameter = Blockly.utils.xml.createElement('arg');
      var argModel = this.argumentVarModels_[i];
      parameter.setAttribute('name', argModel.name);
      parameter.setAttribute('varid', argModel.getId());
      parameter.setAttribute('paramId', this.paramIds_[i]);
      container.appendChild(parameter);
    }
    return container;
  },

  domToMutation: function(xmlElement) {
    var names = [];
    var ids = [];
    for (var i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() != 'arg') {
        continue;
      }
      names[i] = childNode.getAttribute('name');
      ids[i] = childNode.getAttribute('varid') ||
          childNode.getAttribute('varId');
    }
    this.updateShape_(names, ids);
  },

  updateShape_: function(names, ids) {
    // In this case it is easiest to just reset and build from scratch.
    for (var i = 0, id; (id = this.paramIds_[i]); i++) {
      this.removeParam_(id);
    }

    this.paramIds_ = [];
    this.arguments_ = [];
    this.argumentVarModels_ = [];

    var length = ids.length;
    for (i = 0; i < length; i++) {
      this.addParam_(names[i], ids[i]);
    }

    Blockly.Procedures.mutateCallers(this);
  },

  plus: function() {
    this.addParam_();
    Blockly.Procedures.mutateCallers(this);
  },

  minus: function(id) {
    this.removeParam_(id);
    Blockly.Procedures.mutateCallers(this);
  },

  down: function(id) {
    var index = this.paramIds_.indexOf(id);
    if (index == this.paramIds_.length - 1) {
      return;
    }

    var followingId = this.paramIds_[index + 1];
    this.moveInputBefore(followingId, id);

    this.paramIds_[index + 1] = id;
    this.paramIds_[index] = followingId;

    var temp = this.arguments_[index + 1];
    this.arguments_[index + 1] = this.arguments_[index];
    this.arguments_[index] = temp;

    temp = this.argumentVarModels_[index + 1];
    this.argumentVarModels_[index + 1] = this.argumentVarModels_[index];
    this.argumentVarModels_[index] = temp;
    Blockly.Procedures.mutateCallers(this);
  },

  up: function(id) {
    var index = this.paramIds_.indexOf(id);
    if (index == 0) {
      return;
    }

    var prevId = this.paramIds_[index - 1];
    this.moveInputBefore(id, prevId);

    this.paramIds_[index - 1] = id;
    this.paramIds_[index] = prevId;

    var temp = this.arguments_[index - 1];
    this.arguments_[index - 1] = this.arguments_[index];
    this.arguments_[index] = temp;

    temp = this.argumentVarModels_[index - 1];
    this.argumentVarModels_[index - 1] = this.argumentVarModels_[index];
    this.argumentVarModels_[index] = temp;
    Blockly.Procedures.mutateCallers(this);
  },

  addParam_: function(opt_name, opt_id) {
    if (!this.arguments_.length) {
      var withField = new Blockly.FieldLabel(
          Blockly.Msg['PROCEDURES_BEFORE_PARAMS']);
      this.getInput('TOP')
          .appendField(withField, 'WITH');
    }

    var name = opt_name || Blockly.Variables.generateUniqueNameFromOptions(
        Blockly.Procedures.DEFAULT_ARG, this.arguments_);
    var id = opt_id || Blockly.utils.genUid();

    this.addVarInput_(name, id);
    this.moveInputBefore(id, 'STACK');

    this.arguments_.push(name);
    this.paramIds_.push(id);
    this.argumentVarModels_.push(Blockly.Variables.getOrCreateVariablePackage(
        this.workspace, id, name, ''));
  },

  removeParam_: function(id) {
    this.removeInput(id);
    if (this.arguments_.length == 1) {  // Becoming parameterless.
      this.getInput('TOP').removeField('WITH');
    }

    var index = this.paramIds_.indexOf(id);
    this.arguments_.splice(index, 1);
    this.paramIds_.splice(index, 1);
    this.argumentVarModels_.splice(index, 1);
  },

  addVarInput_: function(name, id) {
    var nameField = new Blockly.FieldTextInput(name, this.validator_);
    this.appendDummyInput(id)
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new plusMinus.FieldMinus(id))
        .appendField(new plusMinus.FieldUp(id))
        .appendField(new plusMinus.FieldDown(id))
        .appendField('variable:')  // Untranslated!
        .appendField(nameField,  id);  // The name of the field is the var id.
  },

  /**
   * @this {Blockly.FieldTextInput}
   */
  validator_: function(newName) {
    var sourceBlock = this.getSourceBlock();
    newName = newName.replace(/[\s\xa0]+/g, ' ').replace(/^ | $/g, '');
    if (!newName) {
      return null;
    }

    for (var i = 0, name; (name = sourceBlock.arguments_[i]); i++) {
      if (newName == name) {
        return null;  // It matches, so it is invalid.
      }
    }

    // The field name (aka id) is always equal to the var id.
    var index = sourceBlock.paramIds_.indexOf(this.name);
    sourceBlock.arguments_[index] = newName;

    // These may already match if this gets triggered by the variable being
    // renamed somewhere else.
    var variable = sourceBlock.workspace.getVariableById(this.name);
    if (variable.name != newName) {
      sourceBlock.workspace.renameVariableById(this.name, newName);
      Blockly.Procedures.mutateCallers(sourceBlock);
    }
  },
};

Blockly.Extensions.registerMutator('procedure_def_mutator', procedureDefMutator);

procedureRename = function() {
  this.getField('NAME').setValidator(Blockly.Procedures.rename);
};

Blockly.Extensions.register('procedure_rename', procedureRename);

procedureVars = function() {
  // This is a hack to get around the don't-override-builtins check.
  var mixin = {
    getVars: function() {
      return this.arguments_;
    },

    getVarModels: function() {
      return this.argumentVarModels_;
    },

    /**
     * Notification that a variable was renamed to the same name as an existing
     * variable. These variables are coalescing into a single variable with the
     * ID of the variable that was already using the name.
     * @param {string} oldId The ID of the variable that was renamed.
     * @param {string} newId The ID of the variable that was already using
     *     the name.
     */
    renameVarById: function(oldId, newId) {
      var index = this.paramIds_.indexOf(oldId);
      if (index == -1) {
        return;  // Not on this block.
      }

      var newVar = this.workspace.getVariableById(newId);
      var newName = newVar.name;
      this.addVarInput_(newName, newId);
      this.moveInputBefore(newId, oldId);
      this.removeInput(oldId);

      this.paramIds_[index] = newId;
      this.arguments_[index] = newName;
      this.argumentVarModels_[index] = newVar;

      Blockly.Procedures.mutateCallers(this);
    },

    updateVarName: function(variable) {
      var id = variable.getId();
      var index = this.paramIds_.indexOf(id);
      if (index == -1) {
        return;  // Not on this block.
      }
      var name = variable.name;
      if (name == this.arguments_[index]) {
        return;  // No change. Occurs when field is being edited.
      }

      this.setFieldValue(name, id);
      this.arguments_[index] = name;
    },
  };

  this.mixin(mixin, true);
};

Blockly.Extensions.register('procedure_vars', procedureVars);

/*Blockly.Blocks['procedures_callnoreturn'] = {
  /!**
   * Block for calling a procedure with no return value.
   * @this {Blockly.Block}
   *!/
  init: function() {
    this.appendDummyInput('TOPROW')
        .appendField(this.id, 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setStyle('procedure_blocks');
    // Tooltip is set in renameProcedure.
    this.setHelpUrl(Blockly.Msg['PROCEDURES_CALLNORETURN_HELPURL']);

    // Parallel arrays.
    this.arguments_ = [];
    this.varIds_ = [];
    this.argumentVarModels_ = [];
    // Map of var ids to connections associated with those inputs.
    // IDs are purposefully never removed while the block is alive. The are not
    // round-tripped through XML.
    this.idsToConnections_ = Object.create(null);
    this.previousEnabledState_ = true;
  },

  /!**
   * Returns the name of the procedure this block calls.
   * @return {string} Procedure name.
   * @this {Blockly.Block}
   *!/
  getProcedureCall: function() {
    // The NAME field is guaranteed to exist, null will never be returned.
    return /!** @type {string} *!/ (this.getFieldValue('NAME'));
  },
  /!**
   * Notification that a procedure is renaming.
   * If the name matches this block's procedure, rename it.
   * @param {string} oldName Previous name of procedure.
   * @param {string} newName Renamed procedure.
   * @this {Blockly.Block}
   *!/
  renameProcedure: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getProcedureCall())) {
      this.setFieldValue(newName, 'NAME');
      var baseMsg = this.outputConnection ?
          Blockly.Msg['PROCEDURES_CALLRETURN_TOOLTIP'] :
          Blockly.Msg['PROCEDURES_CALLNORETURN_TOOLTIP'];
      this.setTooltip(baseMsg.replace('%1', newName));
    }
  },

  /!**
   * Notification that the procedure's parameters have changed.
   * @param {!Array.<string>} paramNames New param names, e.g. ['x', 'y', 'z'].
   * @param {!Array.<string>} paramIds IDs of params (consistent for each
   *     parameter through the life of a mutator, regardless of param renaming),
   *     e.g. ['piua', 'f8b_', 'oi.o'].
   * @private
   * @this {Blockly.Block}
   *!/
  setProcedureParameters_: function(paramNames, paramIds) {
    if (paramNames.length != paramIds.length) {
      throw Error('Call block received parallel arrays of different lengths' +
          this.toDevString());
    }

    // Save the current state of connections.
    for (var i = 0, id; (id = this.varIds_[i]); i++) {
      var input = this.getInput('ARG' + i);
      this.idsToConnections_[id] = input.connection.targetConnection;
    }
    console.log(this.idsToConnections_);

    // Update state to match definition.
    this.arguments_ = paramNames;
    this.varIds_ = paramIds;
    this.argumentVarModels_ = [];
    for (var i = 0, id; (id = paramIds[i]); i++) {
      var varModel = this.workspace.getVariableById(id);
      if (!varModel) {
        throw Error('Call block received invalid var ID: ' + id + ' ' +
            this.toDevString());
      }
      this.argumentVarModels_[i] = varModel;
    }

    this.updateShape_();

    // Reconnect blocks.
    for (var i = 0, id; (id = paramIds[i]); i++) {
      var input = this.getInput('ARG' + i);
      var connection = this.idsToConnections_[id];
      if (!connection) {
        continue;
      }
      if (!Blockly.Mutator.reconnect(connection, this, 'ARG' + i)) {
        // Block no longer exists or has been attached elsewhere.
        delete this.idsToConnections_[id];
      }
    }
  },

  /!**
   * Modify this block to have the correct number of arguments.
   * @private
   * @this {Blockly.Block}
   *!/
  updateShape_: function() {
    for (var i = 0; i < this.arguments_.length; i++) {
      var field = this.getField('ARGNAME' + i);
      if (field) {
        // Ensure argument name is up to date.
        // The argument name field is deterministic based on the mutation,
        // no need to fire a change event.
        Blockly.Events.disable();
        try {
          field.setValue(this.arguments_[i]);
        } finally {
          Blockly.Events.enable();
        }
      } else {
        // Add new input.
        field = new Blockly.FieldLabel(this.arguments_[i]);
        var input = this.appendValueInput('ARG' + i)
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField(field, 'ARGNAME' + i);
        input.init();
      }
    }
    // Remove deleted inputs.
    while (this.getInput('ARG' + i)) {
      this.removeInput('ARG' + i);
      i++;
    }
    // Add 'with:' if there are parameters, remove otherwise.
    var topRow = this.getInput('TOPROW');
    if (topRow) {
      if (this.arguments_.length) {
        if (!this.getField('WITH')) {
          topRow.appendField(Blockly.Msg['PROCEDURES_CALL_BEFORE_PARAMS'], 'WITH');
          topRow.init();
        }
      } else {
        if (this.getField('WITH')) {
          topRow.removeField('WITH');
        }
      }
    }
  },
  /!**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this {Blockly.Block}
   *!/
  mutationToDom: function() {
    var container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('name', this.getProcedureCall());
    for (var i = 0; i < this.arguments_.length; i++) {
      var parameter = Blockly.utils.xml.createElement('arg');
      parameter.setAttribute('name', this.arguments_[i]);
      container.appendChild(parameter);
    }
    return container;
  },
  /!**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this {Blockly.Block}
   *!/
  domToMutation: function(xmlElement) {
    var name = xmlElement.getAttribute('name');
    this.renameProcedure(this.getProcedureCall(), name);
    var args = [];
    var paramIds = [];
    for (var i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() == 'arg') {
        args.push(childNode.getAttribute('name'));
        paramIds.push(childNode.getAttribute('varid'));
      }
    }
    this.setProcedureParameters_(args, paramIds);
  },
  /!**
   * Return all variables referenced by this block.
   * @return {!Array.<!Blockly.VariableModel>} List of variable models.
   * @this {Blockly.Block}
   *!/
  getVarModels: function() {
    return this.argumentVarModels_;
  },

  /!**
   * Notification that a variable was renamed to the same name as an existing
   * variable. These variables are coalescing into a single variable with the
   * ID of the variable that was already using the name.
   * @param {string} oldId The ID of the variable that was renamed.
   * @param {string} newId The ID of the variable that was already using
   *     the name.
   *!/
  renameVarById: function(oldId, newId) {
    var index = this.varIds_.indexOf(oldId);
    if (index == -1) {
      return;  // Not on this block.
    }

    var newVar = this.workspace.getVariableById(newId);
    var newName = newVar.name;
    this.setFieldValue(newName, 'ARGNAME' + index);

    this.varIds_[index] = newId;
    this.arguments_[index] = newName;
    this.argumentVarModels_[index] = newVar;
  },

  updateVarName: function(variable) {
    var id = variable.getId();
    var index = this.varIds_.indexOf(id);
    if (index == -1) {
      return;  // Not on this block.
    }
    var name = variable.name;
    this.setFieldValue(name, 'ARGNAME' + index);
    this.arguments_[index] = name;
  },

  /!**
   * Procedure calls cannot exist without the corresponding procedure
   * definition.  Enforce this link whenever an event is fired.
   * @param {!Blockly.Events.Abstract} event Change event.
   * @this {Blockly.Block}
   *!/
  onchange: function(event) {
    if (!this.workspace || this.workspace.isFlyout) {
      // Block is deleted or is in a flyout.
      return;
    }
    if (!event.recordUndo) {
      // Events not generated by user. Skip handling.
      return;
    }
    if (event.type == Blockly.Events.BLOCK_CREATE &&
        event.ids.indexOf(this.id) != -1) {
      // Look for the case where a procedure call was created (usually through
      // paste) and there is no matching definition.  In this case, create
      // an empty definition block with the correct signature.
      var name = this.getProcedureCall();
      var def = Blockly.Procedures.getDefinition(name, this.workspace);
      if (def && (def.type != this.defType_ ||
          JSON.stringify(def.arguments_) != JSON.stringify(this.arguments_))) {
        // The signatures don't match.
        def = null;
      }
      if (!def) {
        Blockly.Events.setGroup(event.group);
        /!**
         * Create matching definition block.
         * <xml xmlns="https://developers.google.com/blockly/xml">
         *   <block type="procedures_defreturn" x="10" y="20">
         *     <mutation name="test">
         *       <arg name="x"></arg>
         *     </mutation>
         *     <field name="NAME">test</field>
         *   </block>
         * </xml>
         *!/
        var xml = Blockly.utils.xml.createElement('xml');
        var block = Blockly.utils.xml.createElement('block');
        block.setAttribute('type', this.defType_);
        var xy = this.getRelativeToSurfaceXY();
        var x = xy.x + Blockly.SNAP_RADIUS * (this.RTL ? -1 : 1);
        var y = xy.y + Blockly.SNAP_RADIUS * 2;
        block.setAttribute('x', x);
        block.setAttribute('y', y);
        var mutation = this.mutationToDom();
        block.appendChild(mutation);
        var field = Blockly.utils.xml.createElement('field');
        field.setAttribute('name', 'NAME');
        field.appendChild(Blockly.utils.xml.createTextNode(
            this.getProcedureCall()));
        block.appendChild(field);
        xml.appendChild(block);
        Blockly.Xml.domToWorkspace(xml, this.workspace);
        Blockly.Events.setGroup(false);
      }
    } else if (event.type == Blockly.Events.BLOCK_DELETE) {
      // Look for the case where a procedure definition has been deleted,
      // leaving this block (a procedure call) orphaned.  In this case, delete
      // the orphan.
      var name = this.getProcedureCall();
      var def = Blockly.Procedures.getDefinition(name, this.workspace);
      if (!def) {
        Blockly.Events.setGroup(event.group);
        this.dispose(true);
        Blockly.Events.setGroup(false);
      }
    } else if (event.type == Blockly.Events.CHANGE && event.element == 'disabled') {
      var name = this.getProcedureCall();
      var def = Blockly.Procedures.getDefinition(name, this.workspace);
      if (def && def.id == event.blockId) {
        // in most cases the old group should be ''
        var oldGroup = Blockly.Events.getGroup();
        if (oldGroup) {
          // This should only be possible programmatically and may indicate a problem
          // with event grouping. If you see this message please investigate. If the
          // use ends up being valid we may need to reorder events in the undo stack.
          console.log('Saw an existing group while responding to a definition change');
        }
        Blockly.Events.setGroup(event.group);
        if (event.newValue) {
          this.previousEnabledState_ = this.isEnabled();
          this.setEnabled(false);
        } else {
          this.setEnabled(this.previousEnabledState_);
        }
        Blockly.Events.setGroup(oldGroup);
      }
    }
  },
  /!**
   * Add menu option to find the definition block for this call.
   * @param {!Array} options List of menu options to add to.
   * @this {Blockly.Block}
   *!/
  customContextMenu: function(options) {
    if (!this.workspace.isMovable()) {
      // If we center on the block and the workspace isn't movable we could
      // loose blocks at the edges of the workspace.
      return;
    }

    var option = {enabled: true};
    option.text = Blockly.Msg['PROCEDURES_HIGHLIGHT_DEF'];
    var name = this.getProcedureCall();
    var workspace = this.workspace;
    option.callback = function() {
      var def = Blockly.Procedures.getDefinition(name, workspace);
      if (def) {
        workspace.centerOnBlock(def.id);
        def.select();
      }
    };
    options.push(option);
  },
  defType_: 'procedures_defnoreturn'
};*/
