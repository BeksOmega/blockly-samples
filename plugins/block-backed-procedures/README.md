# blockly-block-backed-procedures [![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

A set of [Blockly](https://www.npmjs.com/package/blockly) blocks that allow
end-users to define procedures (i.e. functions). These blocks reference explicit
backing data models, which allows them to be more easily manipulated, and shared
between workspaces.

## Installation

### Yarn
```
yarn add blockly-block-backed-procedures
```

### npm
```
npm install blockly-block-backed-procedures --save
```

## Usage

### Import
```js
import * as Blockly from 'blockly';
import {blocks} from 'blockly-block-backed-procedures';

Blockly.common.defineBlocks(blocks);
```

## License
Apache 2.0