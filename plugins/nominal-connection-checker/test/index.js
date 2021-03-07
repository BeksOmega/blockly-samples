/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Test playground for the nominal connection checker.
 */

import * as Blockly from 'blockly';
import {addCodeEditor} from '@blockly/dev-tools/src/playground/monaco';
import {LocalStorageState} from '@blockly/dev-tools/src/playground/state';
import {renderPlayground, renderCodeTab} from
  '@blockly/dev-tools/src/playground/ui.js';
import {pluginInfo as NominalConnectionCheckerPluginInfo} from '../src/index';
import {validateHierarchy} from '../src/hierarchy_validation';

/**
 * @typedef {{
 *     state: !Object,
 *     tabElement: !HTMLElement,
 * }}
 */
let PlaygroundTab;


const helpTabName = 'Help';
const typesTabName = 'Type Hierarchy';
const blocksTabName = 'Blocks';

const defaultTypeHierarchy = {
  'Mammal': { },
  'Flier': { },
  'Dog': {
    'fulfills': ['Mammal'],
  },
  'Bat': {
    'fulfills': ['Mammal', 'Flier'],
  },
  'GetterList': {
    '_comment': `A list you can only get from`,
    'params': [
      {
        'name': 'A',
        'variance': 'co',
      },
    ],
  },
  'AdderList': {
    '_comment': `A list you can only add to`,
    'params': [
      {
        'name': 'A',
        'variance': 'contra',
      },
    ],
  },
  'List': {
    'fulfills': ['GetterList[A]', 'AdderList[A]'],
    'params': [
      {
        'name': 'A',
        'variance': 'inv',
      },
    ],
  },
};

const defaultBlocks = [
  {
    'type': 'mammal',
    'message0': 'Mammal',
    'output': ['Mammal'],
    'style': 'math_blocks',
  },
  {
    'type': 'flier',
    'message0': 'Flier',
    'output': ['Flier'],
    'style': 'math_blocks',
  },
  {
    'type': 'dog',
    'message0': 'Dog',
    'output': ['Dog'],
    'style': 'math_blocks',
  },
  {
    'type': 'bat',
    'message0': 'Bat',
    'output': ['Bat'],
    'style': 'math_blocks',
  },
  {
    'type': 'static_identity',
    'message0': 'Identity %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'T',
      },
    ],
    'output': ['T'],
    'style': 'text_blocks',
  },
  {
    'type': 'static_select_random',
    'message0': 'Select Random %1 %2 %3',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT1',
        'check': 'T',
      },
      {
        'type': 'input_value',
        'name': 'INPUT2',
        'check': 'T',
      },
      {
        'type': 'input_value',
        'name': 'INPUT3',
        'check': 'T',
      },
    ],
    'output': ['T'],
    'style': 'text_blocks',
  },
  {
    'type': 'use_mammal',
    'message0': 'Use Mammal %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'Mammal',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'use_flier',
    'message0': 'Use Flier %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'Flier',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'use_dog',
    'message0': 'Use Dog %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'Dog',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'use_bat',
    'message0': 'Use Bat %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'Bat',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'getterlist_mammal',
    'message0': 'GetterList of Mammal',
    'output': ['GetterList[Mammal]'],
    'style': 'list_blocks',
  },
  {
    'type': 'getterlist_flier',
    'message0': 'GetterList of Flier',
    'output': ['GetterList[Flier]'],
    'style': 'list_blocks',
  },
  {
    'type': 'getterlist_dog',
    'message0': 'GetterList of Dog',
    'output': ['GetterList[Dog]'],
    'style': 'list_blocks',
  },
  {
    'type': 'getterlist_bat',
    'message0': 'GetterList of Bat',
    'output': ['GetterList[Bat]'],
    'style': 'list_blocks',
  },
  {
    'type': 'adderlist_mammal',
    'message0': 'AdderList of Mammal',
    'output': ['AdderList[Mammal]'],
    'style': 'list_blocks',
  },
  {
    'type': 'adderlist_flier',
    'message0': 'AdderList of Flier',
    'output': ['AdderList[Flier]'],
    'style': 'list_blocks',
  },
  {
    'type': 'adderlist_dog',
    'message0': 'AdderList of Dog',
    'output': ['AdderList[Dog]'],
    'style': 'list_blocks',
  },
  {
    'type': 'adderlist_bat',
    'message0': 'AdderList of Bat',
    'output': ['AdderList[Bat]'],
    'style': 'list_blocks',
  },
  {
    'type': 'list_mammal',
    'message0': 'List of Mammal',
    'output': ['List[Mammal]'],
    'style': 'list_blocks',
  },
  {
    'type': 'list_flier',
    'message0': 'List of Flier',
    'output': ['List[Flier]'],
    'style': 'list_blocks',
  },
  {
    'type': 'list_dog',
    'message0': 'List of Dog',
    'output': ['List[Dog]'],
    'style': 'list_blocks',
  },
  {
    'type': 'list_bat',
    'message0': 'List of Bat',
    'output': ['List[Bat]'],
    'style': 'list_blocks',
  },
  {
    'type': 'usegetterlist_mammal',
    'message0': 'Use GetterList of Mammal %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'GetterList[Mammal]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'usegetterlist_flier',
    'message0': 'Use GetterList of Flier %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'GetterList[Flier]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'usegetterlist_dog',
    'message0': 'Use GetterList of Dog %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'GetterList[Dog]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'usegetterlist_bat',
    'message0': 'Use GetterList of Bat %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'GetterList[Bat]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'useadderlist_mammal',
    'message0': 'Use AdderList of Mammal %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'AdderList[Mammal]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'useadderlist_flier',
    'message0': 'Use AdderList of Flier %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'AdderList[Flier]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'useadderlist_dog',
    'message0': 'Use AdderList of Dog %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'AdderList[Dog]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'useadderlist_bat',
    'message0': 'Use AdderList of Bat %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'AdderList[Bat]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'uselist_mammal',
    'message0': 'Use List of Mammal %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'List[Mammal]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'uselist_flier',
    'message0': 'Use List of Flier %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'List[Flier]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'uselist_dog',
    'message0': 'Use List of Dog %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'List[Dog]',
      },
    ],
    'style': 'loop_blocks',
  },
  {
    'type': 'uselist_bat',
    'message0': 'Use List of Bat %1',
    'args0': [
      {
        'type': 'input_value',
        'name': 'INPUT',
        'check': 'List[Bat]',
      },
    ],
    'style': 'loop_blocks',
  },
];

const helpText = `This is a demo page for a new nominal connection checker \
plugin for Blockly. The plugin will eventually support subtyping, generics, \
parameterized types, and bounded generics, but it is not yet fully featured. \
For more information see the design document:
https://bit.ly/3edfxKt

Currently this plugin supports:
  * subtyping
  * generic connect checks
  * parameterized types (with variance!)
  
This page has several features which allow you to test the plugin. On the \
right are two code tabs, "Type Hierarchy" and "Blocks".

The "Type Hierarchy" tab allows you to define the type hierarchy you want the \
connection checker to use. This JSON is validated to make sure it is in a form \
that the connection checker can understand. If the validation encounters any \
problems, it will log an error. Depending on your browser this could create a \
pop-up, or it may show up in the console.

The "Blocks" tab allows you to create block definitions that will show up in \
the workspace's flyout. These can then be used to test different kinds of \
connection checks.

Note that you have to *refresh* the page for your changes to take effect. All \
of the blocks on the workspace will be saved. If anything goes wrong with \
loading the saved xml you will have the opportunity to fix it, or you can \
clear the workspace.

If you have any thoughts on the project feel free to comment on the design \
document (link above) or email me at bekawestberg@gmail.com If you find any \
bugs you can submit those to the blockly-samples repo:
https://github.com/google/blockly-samples/issues/new/choose

Thank you for taking the time to try this plugin out!`;

const confirmReset = `This action will clear all of the blocks from your \
workspace and reset any changes you have made to the "Type Hierarchy" tab \
or the "Blocks" tab. Do you want to continue?`;

/**
 * Creates a workspace.
 * @param {HTMLElement} blocklyDiv The blockly container div.
 * @param {!Object} typeHierarchy The type hierarchy.
 * @param {!Array<!Object>} blocks The array of json block definitions.
 * @return {!Blockly.WorkspaceSvg} The created workspace.
 */
function createWorkspace(blocklyDiv, typeHierarchy, blocks, tabs) {
  Blockly.defineBlocksWithJsonArray(blocks);
  const toolboxContents = [];
  blocks.forEach((def) => {
    toolboxContents.push({
      kind: 'BLOCK',
      type: def.type,
    });
  });
  const options = {
    plugins: {
      ...NominalConnectionCheckerPluginInfo,
    },
    toolbox: {
      'kind': Blockly.utils.toolbox.FLYOUT_TOOLBOX_KIND,
      'contents': toolboxContents,
    },
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
    zoom: {
      wheel: true,
    },
  };

  const workspace = Blockly.inject(blocklyDiv, options);
  validateHierarchy(typeHierarchy);
  workspace.connectionChecker.init(typeHierarchy);

  const resetOption = {
    displayText: 'Reset to Default',
    preconditionFn: function(scope) {
      return 'enabled';
    },
    callback: function(scope) {
      if (confirm(confirmReset)) {
        tabs[typesTabName].state.model.setValue(
            JSON.stringify(defaultTypeHierarchy, undefined, 2));
        tabs[blocksTabName].state.model.setValue(
            JSON.stringify(defaultBlocks, undefined, 2));
        workspace.clear();
        location.reload();
      }
    },
    scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
    id: 'reset',
    weight: 100,
  };
  Blockly.ContextMenuRegistry.registry.register(resetOption);

  return workspace;
}

document.addEventListener('DOMContentLoaded', function() {
  window.Blockly = Blockly;
  const container = document.getElementById('root');
  const components = renderPlayground(container);
  const blocklyDiv = components.blocklyDiv;
  const monacoDiv = components.monacoDiv;
  const tabsDiv = components.tabsDiv;
  const guiContainer = components.guiContainer;

  // Hide the guiContainer since we don't need it for now.
  guiContainer.style.flex = '0';
  monacoDiv.parentElement.style.maxHeight = '100%';

  return addCodeEditor(monacoDiv, {
    minimap: {
      enabled: false,
    },
    theme: 'vs-dark',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
  }).then((editor) => {
    /**
     * Adds a new tab with the given name and language to the monaco editor.
     * @param {!string} name The display name for the tab.
     * @param {!string} language The language for the tab.
     * @return {!PlaygroundTab} The newly added tab.
     */
    function addCodeTab(name, language) {
      const tabElement = renderCodeTab(name);
      tabElement.setAttribute('data-tab', name);
      tabsDiv.appendChild(tabElement);

      const model = window.monaco.editor.createModel('', language);
      model.updateOptions({tabSize: 2});
      editor.setModel(model);

      const state = {
        name,
        model,
        language,
        viewState: undefined,
      };

      return {
        state,
        tabElement,
      };
    }

    /**
     * Sets the currently selected/active tab.
     * @param {!string} tab The name of the tab to select.
     */
    function setActiveTab(tab) {
      currentTab = tab;
      editor.setModel(currentTab.state.model);

      // Update tab UI.
      Object.values(tabs).forEach((t) =>
        t.tabElement.style.background =
              (t.tabElement == tab.tabElement) ? '#1E1E1E' : '#2D2D2D');
      // Update editor state.
      playgroundState.set('activeTab', tab.state.name);
      playgroundState.save();
    }

    // Selects the given tab when it is clicked.
    tabsDiv.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const tabName = target.getAttribute('data-tab');
      if (!tabName) {
        // Not a tab.
        return;
      }
      const tab = tabs[tabName];

      // Save current tab state (eg: scroll position).
      currentTab.state.viewState = editor.saveViewState();

      setActiveTab(tab);

      // Restore tab state (eg: scroll position).
      editor.restoreViewState(currentTab.state.viewState);
      editor.focus();
    });

    /**
     * Loads the saved data for the given tab and adds a change listener to it
     * that saves its state.
     * @param {!string} name The name of the tab to load.
     */
    function loadTab(name) {
      const model = tabs[name].state.model;
      model.setValue(playgroundState.get(name));
      model.onDidChangeContent(() => {
        playgroundState.set(name, model.getValue());
        playgroundState.save();
      });
    }

    /**
     * Loads the saved xml into the workspace.
     *
     * If the deserialization fails, it gives the user the option to clear the
     * saved xml. If the user chooses not to clear it then the user gets a
     * chance to fix whatever they messed up, and the next time they load the
     * page the same xml will be loaded again.
     *
     * @param {!Blockly.Workspace} workspace The workspace to load the xml into.
     */
    function loadXml(workspace) {
      let addListener = true;
      const xml = playgroundState.get('workspaceXml');
      if (xml) {
        try {
          // Try to deserialize the saved xml.
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xml), workspace);
        } catch (e) {
          // Xml load failed, ask if they want to clear the workspace.
          console.error(e);
          const msg = `Xml load failed with error: ${e}
            Clear workspace and continue?`;
          if (confirm(msg)) {
            workspace.clear();
          } else {
            addListener = false;
          }
        }
      }
      // Add the change listener to save the workspace state.
      if (addListener) {
        workspace.addChangeListener(() => {
          const xml = Blockly.Xml.domToPrettyText(
              Blockly.Xml.workspaceToDom(workspace));
          playgroundState.set('workspaceXml', xml);
          playgroundState.save();
        });
      }
    }

    const playgroundState = new LocalStorageState('playgroundState', {
      workspaceXml: '',
      activeTab: helpTabName,
      [typesTabName]: JSON.stringify(defaultTypeHierarchy, undefined, 2),
      [blocksTabName]: JSON.stringify(defaultBlocks, undefined, 2),
    });
    playgroundState.load();

    const tabs = {
      [helpTabName]: addCodeTab(helpTabName),
      [typesTabName]: addCodeTab(typesTabName, 'json'),
      [blocksTabName]: addCodeTab(blocksTabName, 'json'),
    };

    loadTab(typesTabName);
    loadTab(blocksTabName);
    tabs[helpTabName].state.model.setValue(helpText);

    let currentTab = tabs[playgroundState.get('activeTab')];
    setActiveTab(currentTab);

    try {
      // Create the workspace.
      const workspace = createWorkspace(
          blocklyDiv,
          JSON.parse(tabs[typesTabName].state.model.getValue()),
          JSON.parse(tabs[blocksTabName].state.model.getValue()),
          tabs);
      loadXml(workspace);
    } catch (e) {
      // JSON parse failed, send an alert.
      alert(e);
    }
  });
});
