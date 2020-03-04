/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A field for a plus button used for mutation.
 */
'use strict';


/**
 * Class for a plus button used for mutation.
 * @param opt_args Arguements to pass to the 'plus' function when the button
 *    is clicked.
 * @constructor
 */
plusMinus.FieldUp = function(opt_args) {
  this.args_ = opt_args;
  return plusMinus.FieldUp.superClass_.constructor.call(
      this, 'media/arrow-up.svg', 20, 20, '');
};
Blockly.utils.object.inherits(plusMinus.FieldUp, Blockly.FieldImage);

plusMinus.FieldUp.fromJson = function(options) {
  return new plusMinus.FieldUp(options['args']);
};

plusMinus.FieldUp.prototype.showEditor_ = function() {
  // TODO: This is a dupe of the mutator code, anyway to unify?
  var block = this.getSourceBlock();

  Blockly.Events.setGroup(true);

  var oldMutationDom = block.mutationToDom();
  var oldMutation = oldMutationDom && Blockly.Xml.domToText(oldMutationDom);

  // TODO: Should probably temp disable rendering. Not sure best way to do that.
  block.up(this.args_);

  var newMutationDom = block.mutationToDom();
  var newMutation = newMutationDom && Blockly.Xml.domToText(newMutationDom);

  if (oldMutation != newMutation) {
    Blockly.Events.fire(new Blockly.Events.BlockChange(
        block, 'mutation', null, oldMutation, newMutation));
    // Ensure that any bump is part of this mutation's event group.
    var group = Blockly.Events.getGroup();
    setTimeout(function() {
      Blockly.Events.setGroup(group);
      block.bumpNeighbours();
      Blockly.Events.setGroup(false);
    }, Blockly.BUMP_DELAY);
  }
};

Blockly.fieldRegistry.register('field_up', plusMinus.FieldUp);
