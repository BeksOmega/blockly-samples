# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 6.0.0 (2022-10-20)


### ⚠ BREAKING CHANGES

* update peer and devDependencies of all plugins to require Blockly v9 (#1314)
* bump the blockly peer dependency in dev-tools and remove version probing (#1191)

### Features

* add JSO serialization to advanced playground ([#858](https://github.com/google/blockly-samples/issues/858)) ([c5b433d](https://github.com/google/blockly-samples/commit/c5b433d095b2730eb00366a8807977904acd9eed))
* add JSON options to serialization test helpers ([#846](https://github.com/google/blockly-samples/issues/846)) ([aba88be](https://github.com/google/blockly-samples/commit/aba88bea60bddf3d31ce630b836e2933836ed287))
* Use new location for genUid on Blockly.utils.idGenerator ([#876](https://github.com/google/blockly-samples/issues/876)) ([68dcd6a](https://github.com/google/blockly-samples/commit/68dcd6abc0c079ed210daa7b7a40364b74c6d4d7))


### Bug Fixes

* add missing removeGenerator function in Playground API type ([#1224](https://github.com/google/blockly-samples/issues/1224)) ([#1274](https://github.com/google/blockly-samples/issues/1274)) ([9e92461](https://github.com/google/blockly-samples/commit/9e9246153d4089aaa1c9ad011cf5812e3c136f13))
* bugs in the new debug renderer ([#1016](https://github.com/google/blockly-samples/issues/1016)) ([e4aaae7](https://github.com/google/blockly-samples/commit/e4aaae7d8cec323d825d95ed0a729bc305298e6b))
* bump the blockly peer dependency in dev-tools and remove version probing ([#1183](https://github.com/google/blockly-samples/issues/1183)) ([79ce104](https://github.com/google/blockly-samples/commit/79ce10444cb59880c620dc7db3768f8655f341d8))
* bump the blockly peer dependency in dev-tools and remove version probing ([#1191](https://github.com/google/blockly-samples/issues/1191)) ([af7b82e](https://github.com/google/blockly-samples/commit/af7b82ee1dd1cb2607f571da85d647db13d3da28))
* Change how dev-tools adds Blockly to the global scope for console debugging ([#881](https://github.com/google/blockly-samples/issues/881)) ([92acfc7](https://github.com/google/blockly-samples/commit/92acfc706e2ad2d7a4d01eb90dafbaf153729c0f))
* change json helper assert.equal to assert.deepEqual ([#971](https://github.com/google/blockly-samples/issues/971)) ([0bf6f16](https://github.com/google/blockly-samples/commit/0bf6f16203ec5ba344982acdb6dc48c4ea9f35cb))
* generator imports for use with blockly v9 ([#1305](https://github.com/google/blockly-samples/issues/1305)) ([51d59e9](https://github.com/google/blockly-samples/commit/51d59e98d172400e45fc74755f577e068df9996b))
* package versions to support patch releases ([#1150](https://github.com/google/blockly-samples/issues/1150)) ([e1ae378](https://github.com/google/blockly-samples/commit/e1ae378d779531621c3d948566257d069002963f))
* references to deprecated functions in v9 ([#1313](https://github.com/google/blockly-samples/issues/1313)) ([cb2e679](https://github.com/google/blockly-samples/commit/cb2e67987e0b62a77c26adc660cc6ade1ba67954))
* remove private use of Blockly.registry.typeMap_ ([#895](https://github.com/google/blockly-samples/issues/895)) ([4f455a5](https://github.com/google/blockly-samples/commit/4f455a513dece5aafe90e176bbd39108ffc44f2a))
* the debug renderer ([#987](https://github.com/google/blockly-samples/issues/987)) ([af73442](https://github.com/google/blockly-samples/commit/af734425d42f4b20b5df398075e167bbebbf05c0))
* the debug renderer to work with dec 2021 release ([#945](https://github.com/google/blockly-samples/issues/945)) ([c8c1507](https://github.com/google/blockly-samples/commit/c8c15078e90dc9c2413d8897a7d3f04083e5f0a7))
* the readme for the debug renderer ([#1009](https://github.com/google/blockly-samples/issues/1009)) ([4553603](https://github.com/google/blockly-samples/commit/4553603fcc995e3bb9b007a81db3e96c04563ba7))
* update major dependency versions and remove lerna forceLocal flag ([#1121](https://github.com/google/blockly-samples/issues/1121)) ([c736aeb](https://github.com/google/blockly-samples/commit/c736aeb938559ca78973ed8200c8697d4f9f8389))
* update the eslint version in root and remove unnecessary suppress annotations ([#985](https://github.com/google/blockly-samples/issues/985)) ([cacc4f7](https://github.com/google/blockly-samples/commit/cacc4f73bf0d10d3cd712e7126ed808cde39db87))


### Reverts

* Revert "chore: fix generator imports in dev tools (#1236)" (#1266) ([4da4fd7](https://github.com/google/blockly-samples/commit/4da4fd71e9d56e78075d9809e75ab058cf0cca0e)), closes [#1236](https://github.com/google/blockly-samples/issues/1236) [#1266](https://github.com/google/blockly-samples/issues/1266)
* Revert "fix: bump the blockly peer dependency in dev-tools and remove version probing (#1183)" (#1190) ([7e1451b](https://github.com/google/blockly-samples/commit/7e1451b2bf86d0a17b3e323938b5271d018eb18c)), closes [#1183](https://github.com/google/blockly-samples/issues/1183) [#1190](https://github.com/google/blockly-samples/issues/1190)
* Revert "Publish" (#981) ([8534a34](https://github.com/google/blockly-samples/commit/8534a34f0f39eeea1633efe6dabc853bbc2fc756)), closes [#981](https://github.com/google/blockly-samples/issues/981)


### Miscellaneous Chores

* update peer and devDependencies of all plugins to require Blockly v9 ([#1314](https://github.com/google/blockly-samples/issues/1314)) ([03d4912](https://github.com/google/blockly-samples/commit/03d4912c42c8de0f30493037ccc28dddaea0f266))



## [5.0.0](https://github.com/google/blockly-samples/compare/@blockly/dev-tools@4.0.3...@blockly/dev-tools@5.0.0) (2022-10-05)


### ⚠ BREAKING CHANGES

* update peer and devDependencies of all plugins to require Blockly v9 (#1314)

### Bug Fixes

* add missing removeGenerator function in Playground API type ([#1224](https://github.com/google/blockly-samples/issues/1224)) ([#1274](https://github.com/google/blockly-samples/issues/1274)) ([9e92461](https://github.com/google/blockly-samples/commit/9e9246153d4089aaa1c9ad011cf5812e3c136f13))
* generator imports for use with blockly v9 ([#1305](https://github.com/google/blockly-samples/issues/1305)) ([51d59e9](https://github.com/google/blockly-samples/commit/51d59e98d172400e45fc74755f577e068df9996b))
* references to deprecated functions in v9 ([#1313](https://github.com/google/blockly-samples/issues/1313)) ([cb2e679](https://github.com/google/blockly-samples/commit/cb2e67987e0b62a77c26adc660cc6ade1ba67954))


### Reverts

* Revert "chore: fix generator imports in dev tools (#1236)" (#1266) ([4da4fd7](https://github.com/google/blockly-samples/commit/4da4fd71e9d56e78075d9809e75ab058cf0cca0e)), closes [#1236](https://github.com/google/blockly-samples/issues/1236) [#1266](https://github.com/google/blockly-samples/issues/1266)


### Miscellaneous Chores

* update peer and devDependencies of all plugins to require Blockly v9 ([#1314](https://github.com/google/blockly-samples/issues/1314)) ([03d4912](https://github.com/google/blockly-samples/commit/03d4912c42c8de0f30493037ccc28dddaea0f266))



## 4.0.3 (2022-08-11)


### Bug Fixes

* Remove the deprecated block-extension-tooltip ([#1215](https://github.com/google/blockly-samples/issues/1215)) ([a044478](https://github.com/google/blockly-samples/commit/a044478c86a73e3065bc866e427f175cbec6fc13))





## 4.0.2 (2022-08-04)


### Bug Fixes

* fix the name of the package of suggested-blocks ([#1214](https://github.com/google/blockly-samples/issues/1214)) ([35aa8ec](https://github.com/google/blockly-samples/commit/35aa8ec73a60a4eb5b1e80cb2fc71dcd83d05e27))





## 3.1.9 (2022-07-21)

**Note:** Version bump only for package @blockly/dev-tools





## 3.1.8 (2022-07-06)


### Bug Fixes

* Update blockly-react to use functional components instead of class components. ([#1178](https://github.com/google/blockly-samples/issues/1178)) ([fa21187](https://github.com/google/blockly-samples/commit/fa21187cdbe4ec3a5c69f185540dd68a98eb69d7))





## 3.1.7 (2022-06-27)


### Bug Fixes

* Update package import for keyboard navigation demo ([#1170](https://github.com/google/blockly-samples/issues/1170)) ([69c1725](https://github.com/google/blockly-samples/commit/69c1725b775279fcc397dc178935208d5f42b08c))





## 3.1.6 (2022-06-21)

**Note:** Version bump only for package @blockly/dev-tools





## 3.1.5 (2022-06-08)


### Bug Fixes

* package versions to support patch releases ([#1150](https://github.com/google/blockly-samples/issues/1150)) ([e1ae378](https://github.com/google/blockly-samples/commit/e1ae378d779531621c3d948566257d069002963f))





## 3.1.4 (2022-06-02)


### Bug Fixes

* add git identity ([#1156](https://github.com/google/blockly-samples/issues/1156)) ([8d80924](https://github.com/google/blockly-samples/commit/8d809243b277375beb2ce75d4e157b5e17f78193))
