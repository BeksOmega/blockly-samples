/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Unit tests for TypeHierarchy.
 */

const chai = require('chai');

const {TypeHierarchy, ActualParamsCountError} =
    require('../src/type_hierarchy');
const {parseType, structureToString} = require('../src/type_structure');

suite('TypeHierarchy', function() {
  test('Super not defined', function() {
    chai.assert.throws(
        function() {
          new TypeHierarchy({
            'typeA': {
              'fulfills': ['typeB'],
            },
          });
        },
        'The type typea says it fulfills the type typeb, but that type is not' +
        ' defined');
  });

  suite('getParamsForAncestor', function() {
    suite('No substitution', function() {
      setup(function() {
        this.assertParams = function(hierarchy, sub, sup, structure) {
          const type = hierarchy.types_.get(sub);
          const params = type.getParamsForAncestor(sup);
          chai.assert.deepEqual(params, structure);
        };
      });

      test('Self params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typea', [
          {
            'name': 'a',
            'params': [],
          },
        ]);
      });

      test('Single param', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea', [
          {
            'name': 'b',
            'params': [],
          },
        ]);
      });

      test('Swapped params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[D, C]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
              {
                'name': 'D',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea', [
          {
            'name': 'd',
            'params': [],
          },
          {
            'name': 'c',
            'params': [],
          },
        ]);
      });

      test('Deep subtype', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[E, D]'],
            'params': [
              {
                'name': 'D',
                'variance': 'co',
              },
              {
                'name': 'E',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea', [
          {
            'name': 'e',
            'params': [],
          },
        ]);
      });

      test('No params super', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': { },
          'typeB': {
            'fulfills': ['typeA'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        const type = hierarchy.types_.get('typeb');
        const params = type.getParamsForAncestor('typea');
        chai.assert.isArray(params);
        chai.assert.isEmpty(params);
      });

      test('More params sub', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea', [
          {
            'name': 'b',
            'params': [],
          },
        ]);
      });

      test('Deep more params sub', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[C, B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
              {
                'name': 'c',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea', [
          {
            'name': 'b',
            'params': [],
          },
        ]);
      });

      test('Explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB]'],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea', [
          {
            'name': 'typeb',
            'params': [],
          },
        ]);
      });

      test('Some explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea', [
          {
            'name': 'typeb',
            'params': [],
          },
          {
            'name': 'a',
            'params': [],
          },
        ]);
      });

      test('Deep some explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB, A, B]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeD': {
            'fulfills': ['typeC[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typed', 'typea', [
          {
            'name': 'typeb',
            'params': [],
          },
          {
            'name': 'typeb',
            'params': [],
          },
          {
            'name': 'a',
            'params': [],
          },
        ]);
      });

      test('Explicit nested params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeA[typeB[C]]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea', [
          {
            'name': 'typeb',
            'params': [
              {
                'name': 'c',
                'params': [],
              },
            ],
          },
        ]);
      });

      test('Deep subtype explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[A, B]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeD': {
            'fulfills': ['typeC[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeE': {
            'fulfills': ['typeD[typeB]'],
          },
        });
        this.assertParams(hierarchy, 'typee', 'typea', [
          {
            'name': 'typeb',
            'params': [],
          },
          {
            'name': 'typeb',
            'params': [],
          },
        ]);
      });
    });

    suite('With substitution', function() {
      setup(function() {
        this.assertParams = function(hierarchy, sub, sup, explicit, structure) {
          const type = hierarchy.types_.get(sub);
          const params = type.getParamsForAncestor(sup, explicit);
          chai.assert.deepEqual(structure, params);
        };
      });

      test('Self params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typea',
            [
              {
                'name': 'typea',
                'params': [],
              },
            ],
            [
              {
                'name': 'typea',
                'params': [],
              },
            ]);
      });

      test('Self params with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typea',
            [
              {
                'name': 'b',
                'params': [],
              },
            ],
            [
              {
                'name': 'b',
                'params': [],
              },
            ]);
      });

      test('Self params with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typea',
            [
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ],
            [
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('Single param', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea',
            [
              {
                'name': 'typeb',
                'params': [],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [],
              },
            ]);
      });

      test('Single param with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea',
            [
              {
                'name': 'c',
                'params': [],
              },
            ],
            [
              {
                'name': 'c',
                'params': [],
              },
            ]);
      });

      test('Single param with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea',
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'c',
                    'params': [],
                  },
                ],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'c',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('Swapped params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[D, C]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
              {
                'name': 'D',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea',
            [
              {
                'name': 'typea',
                'params': [],
              },
              {
                'name': 'typeb',
                'params': [],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [],
              },
              {
                'name': 'typea',
                'params': [],
              },
            ]);
      });

      test('Swapped params with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[D, C]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
              {
                'name': 'D',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea',
            [
              {
                'name': 'a',
                'params': [],
              },
              {
                'name': 'b',
                'params': [],
              },
            ],
            [
              {
                'name': 'b',
                'params': [],
              },
              {
                'name': 'a',
                'params': [],
              },
            ]);
      });

      test('Swapped params with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[D, C]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
              {
                'name': 'D',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typeb', 'typea',
            [
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'b',
                    'params': [],
                  },
                ],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'b',
                    'params': [],
                  },
                ],
              },
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('Deep subtype', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[E, D]'],
            'params': [
              {
                'name': 'D',
                'variance': 'co',
              },
              {
                'name': 'E',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea',
            [
              {
                'name': 'typea',
                'params': [],
              },
              {
                'name': 'typeb',
                'params': [],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [],
              },
            ]);
      });

      test('Deep subtype with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[E, D]'],
            'params': [
              {
                'name': 'D',
                'variance': 'co',
              },
              {
                'name': 'E',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea',
            [
              {
                'name': 'a',
                'params': [],
              },
              {
                'name': 'b',
                'params': [],
              },
            ],
            [
              {
                'name': 'b',
                'params': [],
              },
            ]);
      });

      test('Deep subtype with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[E, D]'],
            'params': [
              {
                'name': 'D',
                'variance': 'co',
              },
              {
                'name': 'E',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea',
            [
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                  {
                    'name': 'b',
                    'params': [],
                  },
                ],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                  {
                    'name': 'b',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('Explicit nested params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeA[typeB[C]]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea',
            [
              {
                'name': 'typeb',
                'params': [],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'typeb',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('Explicit nested params with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeA[typeB[C]]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea',
            [
              {
                'name': 'b',
                'params': [],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'b',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('Explicit nested params with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeA[typeB[C]]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typec', 'typea',
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'typeb',
                    'params': [
                      {
                        'name': 'a',
                        'params': [],
                      },
                    ],
                  },
                ],
              },
            ]);
      });
    });
  });

  suite('getParamsForDescendant', function() {
    suite('No substitution', function() {
      setup(function() {
        this.assertParams = function(hierarchy, sup, sub, structure) {
          const type = hierarchy.types_.get(sup);
          const params = type.getParamsForDescendant(sub);
          chai.assert.deepEqual(structure, params);
        };
      });

      test('Self params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typea', [
          {
            'name': 'a',
            'params': [],
          },
        ]);
      });

      test('Single param', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb', [
          {
            'name': 'a',
            'params': [],
          },
        ]);
      });

      test('Swapped params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[D, C]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
              {
                'name': 'D',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb', [
          {
            'name': 'b',
            'params': [],
          },
          {
            'name': 'a',
            'params': [],
          },
        ]);
      });

      test('Deep subtype', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[E, D]'],
            'params': [
              {
                'name': 'D',
                'variance': 'co',
              },
              {
                'name': 'E',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typec', [
          null,
          {
            'name': 'a',
            'params': [],
          },
        ]);
      });

      test('No params super', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': { },
          'typeB': {
            'fulfills': ['typeA'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb', [null]);
      });

      test('More params sub', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb', [
          null,
          {
            'name': 'a',
            'params': [],
          },
        ]);
      });

      test('Deep more params sub', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[C, B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
              {
                'name': 'c',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typec', [
          null,
          {
            'name': 'a',
            'params': [],
          },
          null,
        ]);
      });

      test('Explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB]'],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typec', []);
      });

      test('Some explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typec', [
          {
            'name': 'b',
            'params': [],
          },
        ]);
      });

      test('Deep some explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB, A, B]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeD': {
            'fulfills': ['typeC[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typed', [
          {
            'name': 'c',
            'params': [],
          },
        ]);
      });

      // TODO: Figure out what we want it to do in this case.
      test.skip('Explicit nested params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeA[typeB[C]]'],
            'params': [
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typec', [
          {
            'name': 'typeb',
            'params': [
              {
                'name': 'c',
                'params': [],
              },
            ],
          },
        ]);
      });

      // TODO: Figure out what we want it to do in this case.
      test.skip('Deep subtype explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[A, B]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeD': {
            'fulfills': ['typeC[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeE': {
            'fulfills': ['typeD[typeB]'],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typee', []);
      });
    });

    suite('With substitution', function() {
      setup(function() {
        this.assertParams = function(hierarchy, sup, sub, explicit, structure) {
          const type = hierarchy.types_.get(sup);
          const params = type.getParamsForDescendant(sub, explicit);
          chai.assert.deepEqual(structure, params);
        };
      });

      test('Self params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typea',
            [
              {
                'name': 'typea',
                'params': [],
              },
            ],
            [
              {
                'name': 'typea',
                'params': [],
              },
            ]);
      });

      test('Self params with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typea',
            [
              {
                'name': 'b',
                'params': [],
              },
            ],
            [
              {
                'name': 'b',
                'params': [],
              },
            ]);
      });

      test('Self params with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typea',
            [
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ],
            [
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('Single param', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb',
            [
              {
                'name': 'typeb',
                'params': [],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [],
              },
            ]);
      });

      test('Single param with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb',
            [
              {
                'name': 'c',
                'params': [],
              },
            ],
            [
              {
                'name': 'c',
                'params': [],
              },
            ]);
      });

      test('Single param with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb',
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('Deep subtype', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[E, D]'],
            'params': [
              {
                'name': 'D',
                'variance': 'co',
              },
              {
                'name': 'E',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typec',
            [
              {
                'name': 'typea',
                'params': [],
              },
            ],
            [
              null,
              {
                'name': 'typea',
                'params': [],
              },
            ]);
      });

      test('Deep subtype with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[E, D]'],
            'params': [
              {
                'name': 'D',
                'variance': 'co',
              },
              {
                'name': 'E',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typec',
            [
              {
                'name': 'a',
                'params': [],
              },
            ],
            [
              null,
              {
                'name': 'a',
                'params': [],
              },
            ]);
      });

      test('Deep subtype with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'B',
                'variance': 'co',
              },
              {
                'name': 'C',
                'variance': 'co',
              },
            ],
          },
          'typeC': {
            'fulfills': ['typeB[E, D]'],
            'params': [
              {
                'name': 'D',
                'variance': 'co',
              },
              {
                'name': 'E',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typec',
            [
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ],
            [
              null,
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ]);
      });

      test('More params sub', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb',
            [
              {
                'name': 'typea',
                'params': [],
              },
            ],
            [
              null,
              {
                'name': 'typea',
                'params': [],
              },
            ]
        );
      });

      test('More params sub with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb',
            [
              {
                'name': 'b',
                'params': [],
              },
            ],
            [
              null,
              {
                'name': 'b',
                'params': [],
              },
            ]
        );
      });

      test('More params sub with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
            ],
          },
          'typeB': {
            'fulfills': ['typeA[B]'],
            'params': [
              {
                'name': 'a',
                'variance': 'co',
              },
              {
                'name': 'b',
                'variance': 'co',
              },
            ],
          },
        });
        this.assertParams(hierarchy, 'typea', 'typeb',
            [
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ],
            [
              null,
              {
                'name': 'typea',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ]
        );
      });

      test('Some explicit params', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeE': { },
        });
        this.assertParams(hierarchy, 'typea', 'typec',
            [
              {
                'name': 'typee',
                'params': [],
              },
              {
                'name': 'typeb',
                'params': [],
              },
            ],
            [
              {
                'name': 'typeb',
                'params': [],
              },
            ],
        );
      });

      test('Some explicit params with generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeE': { },
        });
        this.assertParams(hierarchy, 'typea', 'typec',
            [
              {
                'name': 'typee',
                'params': [],
              },
              {
                'name': 'c',
                'params': [],
              },
            ],
            [
              {
                'name': 'c',
                'params': [],
              },
            ],
        );
      });

      test('Some explicit params with nested generic', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
              {
                'name': 'B',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
          'typeC': {
            'fulfills': ['typeA[typeB, A]'],
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeE': { },
        });
        this.assertParams(hierarchy, 'typea', 'typec',
            [
              {
                'name': 'typee',
                'params': [],
              },
              {
                'name': 'typec',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ],
            [
              {
                'name': 'typec',
                'params': [
                  {
                    'name': 'a',
                    'params': [],
                  },
                ],
              },
            ],
        );
      });
    });
  });

  suite('typeExists', function() {
    test('Simple', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': { },
      });
      chai.assert.isTrue(hierarchy.typeExists('typeA'));
    });

    test('Case', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': { },
      });
      chai.assert.isTrue(hierarchy.typeExists('typea'),
          'Expected TypeHierarchy to be case-insensitive.');
    });

    test('Padding', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': { },
      });
      chai.assert.isFalse(hierarchy.typeExists(' typeA '),
          'Expected TypeHierarchy to respect padding.');
    });
  });

  suite('typeIsExactlyType', function() {
    setup(function() {
      this.assertMatch = function(hierarchy, sub, sup, msg) {
        chai.assert.isTrue(
            hierarchy.typeIsExactlyType(parseType(sub), parseType(sup)), msg);
      };
      this.assertNoMatch = function(hierarchy, sub, sup, msg) {
        chai.assert.isFalse(
            hierarchy.typeIsExactlyType(parseType(sub), parseType(sup)), msg);
      };
    });

    test('Simple', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': { },
      });
      this.assertMatch(hierarchy, 'typeA', 'typeA');
    });

    test('Case', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': { },
      });
      this.assertMatch(hierarchy, 'typeA', 'typea',
          'Expected TypeHierarchy to be case-insensitive.');
      this.assertMatch(hierarchy, 'typea', 'typeA',
          'Expected TypeHierarchy to be case-insensitive.');
    });

    // TODO: Fix and unskip this after we add an error for undefined types.
    test.skip('Padding', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': { },
      });
      this.assertNoMatch(hierarchy, 'typeA', ' typeA ',
          'Expected TypeHierarchy to respect padding.');
    });

    test('Parent and Child', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'fulfills': ['typeB'],
        },
        'typeB': { },
      });
      this.assertNoMatch(hierarchy, 'typeA', 'typeB');
      this.assertNoMatch(hierarchy, 'typeB', 'typeA');
    });

    test('Simple params', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'params': [
            {
              'name': 'A',
              'variance': 'co',
            },
          ],
        },
        'typeB': { },
      });
      this.assertMatch(hierarchy, 'typeA[typeB]', 'typeA[typeB]');
    });

    test('Case params', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'params': [
            {
              'name': 'A',
              'variance': 'co',
            },
          ],
        },
        'typeB': { },
      });
      this.assertMatch(hierarchy, 'typeA[typeB]', 'typea[typeB]');
      this.assertMatch(hierarchy, 'typea[typeB]', 'typeA[typeB]');
      this.assertMatch(hierarchy, 'typeA[typeB]', 'typeA[typeb]');
      this.assertMatch(hierarchy, 'typeA[typeb]', 'typeA[typeB]');
    });

    test('Parent and child params', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'params': [
            {
              'name': 'A',
              'variance': 'co',
            },
          ],
        },
        'typeB': {
          'fulfills': ['typeC'],
        },
        'typeC': { },
      });
      this.assertNoMatch(hierarchy, 'typeA[typeC]', 'typeA[typeB]');
      this.assertNoMatch(hierarchy, 'typeA[typeB]', 'typeA[typeC]');
    });

    suite('Correct number of params', function() {
      setup(function() {
        this.hierarchy = new TypeHierarchy({
          'typeA': {
            'params': [
              {
                'name': 'A',
                'variance': 'co',
              },
            ],
          },
          'typeB': { },
        });

        this.assertThrows = function(hierarchy, sub, sup) {
          chai.assert.throws(() => {
            hierarchy.typeFulfillsType(parseType(sub), parseType(sup));
          }, ActualParamsCountError);
        };
      });

      test('First missing params', function() {
        this.assertThrows(this.hierarchy, 'typeA', 'typeA[typeB]');
      });

      test('Second missing params', function() {
        this.assertThrows(this.hierarchy, 'typeA[typeB]', 'typeA');
      });

      test('First extra params', function() {
        this.assertThrows(
            this.hierarchy, 'typeA[typeB, typeB]', 'typeA[typeB]');
      });

      test('Second extra params', function() {
        this.assertThrows(
            this.hierarchy, 'typeA[typeB]', 'typeA[typeB, typeB]');
      });
    });
  });

  suite('typeFulfillsType', function() {
    setup(function() {
      this.assertFulfills = function(hierarchy, sub, sup, msg) {
        chai.assert.isTrue(
            hierarchy.typeFulfillsType(parseType(sub), parseType(sup)), msg);
      };
      this.assertDoesNotFulfill = function(hierarchy, sub, sup, msg) {
        chai.assert.isFalse(
            hierarchy.typeFulfillsType(parseType(sub), parseType(sup)), msg);
      };
    });

    test('Empty fulfills', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'fulfills': [],
        },
        'typeB': { },
      });
      this.assertDoesNotFulfill(hierarchy, 'typeA', 'typeB');
    });

    test('Undefined fulfills', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': { },
        'typeB': { },
      });
      this.assertDoesNotFulfill(hierarchy, 'typeA', 'typeB');
    });

    test('Super defined first', function() {
      const hierarchy = new TypeHierarchy({
        'typeB': { },
        'typeA': {
          'fulfills': ['typeB'],
        },
      });
      this.assertFulfills(hierarchy, 'typeA', 'typeB');
    });

    test('Super defined second', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'fulfills': ['typeB'],
        },
        'typeB': { },
      });
      this.assertFulfills(hierarchy, 'typeA', 'typeB');
    });

    test('Backwards', function() {
      const hierarchy = new TypeHierarchy({
        'typeB': { },
        'typeA': {
          'fulfills': ['typeB'],
        },
      });
      this.assertDoesNotFulfill(hierarchy, 'typeB', 'typeA');
    });

    test('Multiple supers', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'fulfills': ['typeB', 'typeC', 'typeD'],
        },
        'typeB': { },
        'typeC': { },
        'typeD': { },
      });
      this.assertFulfills(hierarchy, 'typeA', 'typeB');
      this.assertFulfills(hierarchy, 'typeA', 'typeC');
      this.assertFulfills(hierarchy, 'typeA', 'typeD');
    });

    test('Deep super', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'fulfills': ['typeB'],
        },
        'typeB': {
          'fulfills': ['typeC'],
        },
        'typeC': {
          'fulfills': ['typeD'],
        },
        'typeD': { },
      });
      this.assertFulfills(hierarchy, 'typeA', 'typeB');
      this.assertFulfills(hierarchy, 'typeA', 'typeC');
      this.assertFulfills(hierarchy, 'typeA', 'typeD');
    });

    test('Case', function() {
      const hierarchy = new TypeHierarchy({
        'typeA': {
          'fulfills': ['typeB'],
        },
        'typeb': { },
      });
      this.assertFulfills(hierarchy, 'typeA', 'typeb');
      this.assertFulfills(hierarchy, 'typeA', 'typeB');
      this.assertFulfills(hierarchy, 'typea', 'typeb');
      this.assertFulfills(hierarchy, 'typea', 'typeB');
    });

    suite('Params', function() {
      suite('Single params', function() {
        suite('Covariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Same', function() {
            this.assertFulfills(this.hierarchy, 'typeA[typeB]', 'typeA[typeB]');
          });

          test('Sub', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC]', 'typeA[typeB]');
          });

          test('Super', function() {
            this.assertFulfills(this.hierarchy, 'typeA[typeB]', 'typeA[typeC]');
          });
        });

        suite('Contravariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Same', function() {
            this.assertFulfills(this.hierarchy, 'typeA[typeB]', 'typeA[typeB]');
          });

          test('Sub', function() {
            this.assertFulfills(this.hierarchy, 'typeA[typeC]', 'typeA[typeB]');
          });

          test('Super', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB]', 'typeA[typeC]');
          });
        });

        suite('Invariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Same', function() {
            this.assertFulfills(this.hierarchy, 'typeA[typeB]', 'typeA[typeB]');
          });

          test('Sub', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC]', 'typeA[typeB]');
          });

          test('Super', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB]', 'typeA[typeC]');
          });
        });
      });

      suite('Multiple params', function() {
        suite('Covariant, Covariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB, typeB]', 'typeA[typeC, typeC]');
          });

          test('First bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC, typeB]', 'typeA[typeB, typeC]');
          });

          test('Second bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB, typeC]', 'typeA[typeC, typeB]');
          });
        });

        suite('Covariant, Contravariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB, typeC]', 'typeA[typeC, typeB]');
          });

          test('First bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC, typeC]', 'typeA[typeB, typeB]');
          });

          test('Second bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB, typeB]', 'typeA[typeC, typeC]');
          });
        });

        suite('Covariant, Invariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'inv',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB, typeC]', 'typeA[typeC, typeC]');
          });

          test('First bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC, typeC]', 'typeA[typeB, typeC]');
          });

          test('Second bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB, typeB]', 'typeA[typeC, typeC]');
          });
        });

        suite('Contravariant, Contravariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                  {
                    'name': 'B',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB, typeC]', 'typeA[typeB, typeB]');
          });

          test('First bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB, typeC]', 'typeA[typeC, typeB]');
          });

          test('Second bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC, typeB]', 'typeA[typeB, typeC]');
          });
        });

        suite('Contravariant, Invariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                  {
                    'name': 'B',
                    'variance': 'inv',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeC, typeC]', 'typeA[typeB, typeC]');
          });

          test('First bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB, typeC]', 'typeA[typeC, typeC]');
          });

          test('Second bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC, typeB]', 'typeA[typeB, typeC]');
          });
        });

        test('Mixed up params', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
                {
                  'name': 'B',
                  'variance': 'inv',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[B, A]'],
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
                {
                  'name': 'B',
                  'variance': 'inv',
                },
              ],
            },
            'typeC': { },
            'typeD': { },
          });
          this.assertFulfills(
              hierarchy, 'typeB[typeD, typeC]', 'typeA[typeC, typeD]');
          this.assertDoesNotFulfill(
              hierarchy, 'typeB[typeC, typeD]', 'typeA[typeC, typeD]');
        });

        test('Fulfill super with less params', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[A]'],
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
                {
                  'name': 'B',
                  'variance': 'inv',
                },
              ],
            },
            'typeC': { },
          });
          this.assertFulfills(hierarchy, 'typeB[typeC, typeC]', 'typeA[typeC]');
        });
      });

      suite('Nested params', function() {
        suite('Invariant, Invariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                  {
                    'name': 'B',
                    'variance': 'inv',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeC'],
              },
              'typeC': { },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeC, typeC]', 'typeA[typeC, typeC]');
          });

          test('First bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB, typeC]', 'typeA[typeC, typeC]');
          });

          test('Second bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC, typeB]', 'typeA[typeC, typeC]');
          });
        });

        suite('Covariant -> Covariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': { },
              'typeD': {
                'fulfills': ['typeC'],
              },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeB[typeC]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeA[typeD]]', 'typeA[typeB[typeC]]');
          });

          test('Inner bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeC]]', 'typeA[typeB[typeD]]');
          });
        });

        suite('Covariant -> Contravariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contravariant',
                  },
                ],
              },
              'typeC': { },
              'typeD': {
                'fulfills': ['typeC'],
              },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeC]]', 'typeA[typeB[typeD]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeA[typeC]]', 'typeA[typeB[typeD]]');
          });

          test('Inner bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeB[typeC]]');
          });
        });

        suite('Covariant -> Invariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeC': { },
              'typeD': {
                'fulfills': ['typeC'],
              },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeB[typeD]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeA[typeD]]', 'typeA[typeB[typeD]]');
          });

          test('Inner bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeB[typeC]]');
          });
        });

        suite('Contravariant -> Covariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
            });
          });

          test('Both good', function() {
            // This may not look correct, but remember we evalulate the *whole*
            // parameter when checking variance. So b/c typeA is contravariant
            // typeC[typeE] must be a subtype of typeB[typeD], which it is
            // because typeC and typeB are both covariant and typeE <: typeD
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeC[typeE]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC[typeE]]', 'typeA[typeB[typeD]]');
          });

          test('Inner bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeE]]', 'typeA[typeC[typeD]]');
          });
        });

        suite('Contravariant -> Contravariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contravariant',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contravariant',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeE]]', 'typeA[typeC[typeD]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC[typeD]]', 'typeA[typeB[typeE]]');
          });

          test('Inner bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeC[typeE]]');
          });
        });

        suite('Contravariant -> Invariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeC[typeD]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC[typeD]]', 'typeA[typeB[typeD]]');
          });

          test('Inner bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeE]]', 'typeA[typeC[typeD]]');
          });
        });

        suite('Invariant -> Covariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeB[typeD]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC[typeD]]', 'typeA[typeB[typeD]]');
          });

          test('Inner bad', function() {
            // This may look like it should be valid since typeE <: typeD and
            // typeB is covariant, but remember that because typeA is invariant
            // the *whole* parameter (including *its* parameters) needs to be
            // identical.
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeE]]', 'typeA[typeB[typeD]]');
          });
        });

        suite('Invariant -> Contravariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeB[typeD]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeC[typeD]]');
          });

          test('Inner bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeB[typeE]]');
          });
        });

        suite('Invariant -> Invariant', function() {
          setup(function() {
            this.hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'inv',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
            });
          });

          test('Both good', function() {
            this.assertFulfills(
                this.hierarchy, 'typeA[typeB[typeD]]', 'typeA[typeB[typeD]]');
          });

          test('Outer bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeC[typeD]]', 'typeA[typeB[typeD]]');
          });

          test('Inner bad', function() {
            this.assertDoesNotFulfill(
                this.hierarchy, 'typeA[typeB[typeE]]', 'typeA[typeB[typeD]]');
          });
        });
      });

      suite('Explicit params in def', function() {
        test('Single explicit, covariant', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'co',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[typeD]'],
            },
            'typeC': { },
            'typeD': {
              'fulfills': ['typeC'],
            },
            'typeE': {
              'fulfills': ['typeD'],
            },
          });
          this.assertFulfills(hierarchy, 'typeB', 'typeA[typeD]');
          this.assertFulfills(hierarchy, 'typeB', 'typeA[typeC]');
          this.assertDoesNotFulfill(hierarchy, 'typeB', 'typeA[typeE]');
        });

        test('Single explicit, contravariant', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'contra',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[typeD]'],
            },
            'typeC': { },
            'typeD': {
              'fulfills': ['typeC'],
            },
            'typeE': {
              'fulfills': ['typeD'],
            },
          });
          this.assertFulfills(hierarchy, 'typeB', 'typeA[typeD]');
          this.assertFulfills(hierarchy, 'typeB', 'typeA[typeE]');
          this.assertDoesNotFulfill(hierarchy, 'typeB', 'typeA[typeC]');
        });

        test('Single explicit, invariant', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[typeD]'],
            },
            'typeC': { },
            'typeD': {
              'fulfills': ['typeC'],
            },
            'typeE': {
              'fulfills': ['typeD'],
            },
          });
          this.assertFulfills(hierarchy, 'typeB', 'typeA[typeD]');
          this.assertDoesNotFulfill(hierarchy, 'typeB', 'typeA[typeC]');
          this.assertDoesNotFulfill(hierarchy, 'typeB', 'typeA[typeE]');
        });

        test('Multiple explicit', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
                {
                  'name': 'B',
                  'variance': 'inv',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[typeC, typeC]'],
            },
            'typeC': { },
          });
          this.assertFulfills(hierarchy, 'typeB', 'typeA[typeC, typeC]');
        });

        test('Explicit and generic', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
                {
                  'name': 'B',
                  'variance': 'inv',
                },
              ],
            },
            'typeB': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
              'fulfills': ['typeA[A, typeC]'],
            },
            'typeC': { },
          });
          this.assertFulfills(hierarchy, 'typeB[typeC]', 'typeA[typeC, typeC]');
        });

        test('Explicit with generic', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
            },
            'typeB': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
              'fulfills': ['typeA[typeC[A]]'],
            },
            'typeC': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
            },
            'typeD': { },
          });
          this.assertFulfills(hierarchy, 'typeB[typeD]', 'typeA[typeC[typeD]]');
        });
      });

      suite('Variance inheritance', function() {
        // This suite documents that it is the variance of the parent's
        // parameters that matter, not the child's.
        test('Covariant -> Invariant', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'co',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[A]'],
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
            },
            'typeC': { },
            'typeD': {
              'fulfills': ['typeC'],
            },
          });
          this.assertFulfills(hierarchy, 'typeB[typeD]', 'typeA[typeC]');
        });

        test('Contravariant -> Invariant', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'contra',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[A]'],
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
            },
            'typeC': { },
            'typeD': {
              'fulfills': ['typeC'],
            },
          });
          this.assertFulfills(hierarchy, 'typeB[typeC]', 'typeA[typeD]');
        });
      });

      suite('Correct number of params', function() {
        setup(function() {
          this.hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
            },
            'typeB': {
              'fulfills': ['typeA[A]'],
              'params': [
                {
                  'name': 'A',
                  'variance': 'inv',
                },
              ],
            },
            'typeC': { },
          });

          this.assertThrows = function(hierarchy, sub, sup) {
            chai.assert.throws(() => {
              hierarchy.typeFulfillsType(parseType(sub), parseType(sup));
            }, ActualParamsCountError);
          };
        });

        test('Sub missing params', function() {
          this.assertThrows(this.hierarchy, 'typeB', 'typeA[typeC]');
        });

        test('Super missing params', function() {
          this.assertThrows(this.hierarchy, 'typeB[typeC]', 'typeA');
        });

        test('Sub extra params', function() {
          this.assertThrows(
              this.hierarchy, 'typeB[typeC, typeC]', 'typeA[typeC]');
        });

        test('Super extra params', function() {
          this.assertThrows(
              this.hierarchy, 'typeB[typeC, typeC]', 'typeA[typeC]');
        });
      });
    });
  });

  suite('nearestCommonParents', function() {
    setup(function() {
      this.assertNearestCommonParents = function(hierarchy, toUnify, expected) {
        const actual = hierarchy.getNearestCommonParents(
            ...toUnify.map((type) => parseType(type)));
        chai.assert.equal(actual.length, expected.length,
            'Expected the length of the nearest common parents array to match' +
            ' the length of the expected array. Actual: ' +
            actual.map((struct) => structureToString(struct)));
        actual.forEach((typeStruct, i) => {
          if (!typeStruct.equals((parseType(expected[i])))) {
            chai.assert.fail('Expected ' + expected[i] + ' to equal ' +
                structureToString(typeStruct));
          }
        });
      };
      this.assertNoNearestCommonParents = function(hierarchy, toUnify) {
        const actual = hierarchy.getNearestCommonParents(
            ...toUnify.map((type) => parseType(type)));
        chai.assert.isArray(actual);
        chai.assert.isEmpty(actual);
      };
    });

    suite('Variable Arguments', function() {
      test('No args', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
        });
        this.assertNoNearestCommonParents(hierarchy, []);
      });

      test('One arg', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
        });
        this.assertNearestCommonParents(hierarchy, ['typeA'], ['typeA']);
      });
    });

    suite('Simple tree unions', function() {
      test('Unify self', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeA', 'typeA'], ['typeA']);
      });

      test('Unify parent', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeB', 'typeA'], ['typeA']);
      });

      test('Unify parsib', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeD', 'typeC'], ['typeA']);
      });

      test('Unify grandparent', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeB'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeC', 'typeA'], ['typeA']);
      });

      test('Unify grandparsib', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeD'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeE', 'typeC'], ['typeA']);
      });

      test('Unify sibling', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeB', 'typeC'], ['typeA']);
      });

      test('Unify cousin', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeC'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeD', 'typeE'], ['typeA']);
      });

      test('Unify second cousin', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeC'],
          },
          'typeF': {
            'fulfills': ['typeD'],
          },
          'typeG': {
            'fulfills': ['typeE'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeF', 'typeG'], ['typeA']);
      });

      test('Unify first cousin once removed', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeC'],
          },
          'typeF': {
            'fulfills': ['typeD'],
          },
          'typeG': {
            'fulfills': ['typeE'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeD', 'typeG'], ['typeA']);
      });

      test('Unify child', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeA', 'typeB'], ['typeA']);
      });

      test('Unify nibling', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeC', 'typeD'], ['typeA']);
      });

      test('Unify grandnibling', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeD'],
          },
        });
        this.assertNearestCommonParents(
            hierarchy, ['typeC', 'typeE'], ['typeA']);
      });

      test('Unify unrelated', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
        });
        this.assertNoNearestCommonParents(hierarchy, ['typeA', 'typeB']);
      });
    });

    suite('Inverse tree unions', function() {
      test('Unify grandparent and opt parent (inverse parsib)',
          function() {
            const hierarchy = new TypeHierarchy({
              'typeD': { },
              'typeC': { },
              'typeB': {
                'fulfills': ['typeD'],
              },
              'typeA': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNoNearestCommonParents(hierarchy, ['typeD', 'typeC']);
          });

      test('Unify greatgrandparent and opt parent (inverse grandparsib)',
          function() {
            const hierarchy = new TypeHierarchy({
              'typeE': { },
              'typeD': {
                'fulfills': ['typeE'],
              },
              'typeC': { },
              'typeB': {
                'fulfills': ['typeD'],
              },
              'typeA': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNoNearestCommonParents(hierarchy, ['typeE', 'typeC']);
          });

      test('Unify opt grandparents (inverse cousins)', function() {
        const hierarchy = new TypeHierarchy({
          'typeE': { },
          'typeD': { },
          'typeC': {
            'fulfills': ['typeE'],
          },
          'typeB': {
            'fulfills': ['typeD'],
          },
          'typeA': {
            'fulfills': ['typeB', 'typeC'],
          },
        });
        this.assertNoNearestCommonParents(hierarchy, ['typeD', 'typeE']);
      });

      test('Unify opt greatgrandparenst (inverse 2nd cousins)', function() {
        const hierarchy = new TypeHierarchy({
          'typeG': { },
          'typeF': { },
          'typeE': {
            'fulfills': ['typeG'],
          },
          'typeD': {
            'fulfills': ['typef'],
          },
          'typeC': {
            'fulfills': ['typeE'],
          },
          'typeB': {
            'fulfills': ['typeD'],
          },
          'typeA': {
            'fulfills': ['typeB', 'typeC'],
          },
        });
        this.assertNoNearestCommonParents(hierarchy, ['typeF', 'typeG']);
      });

      test('Unify greatgrandparent and opt grandparent ' +
          '(inverse 1st cousin once removed)',
      function() {
        const hierarchy = new TypeHierarchy({
          'typeG': { },
          'typeF': { },
          'typeE': {
            'fulfills': ['typeG'],
          },
          'typeD': {
            'fulfills': ['typef'],
          },
          'typeC': {
            'fulfills': ['typeE'],
          },
          'typeB': {
            'fulfills': ['typeD'],
          },
          'typeA': {
            'fulfills': ['typeB', 'typeC'],
          },
        });
        this.assertNoNearestCommonParents(hierarchy, ['typeD', 'typeG']);
      });

      test('Unify parent and opt grandparent (inverse nibling)', function() {
        const hierarchy = new TypeHierarchy({
          'typeD': { },
          'typeC': { },
          'typeB': {
            'fulfills': ['typeD'],
          },
          'typeA': {
            'fulfills': ['typeB', 'typeC'],
          },
        });
        this.assertNoNearestCommonParents(hierarchy, ['typeC', 'typeD']);
      });

      test('Unify parent and opt greatgrandparent (inverse grandnibling)',
          function() {
            const hierarchy = new TypeHierarchy({
              'typeE': { },
              'typeD': {
                'fulfills': ['typeE'],
              },
              'typeC': { },
              'typeB': {
                'fulfills': ['typeD'],
              },
              'typeA': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNoNearestCommonParents(hierarchy, ['typeC', 'typeE']);
          });
    });

    /* All of these tests use the following graph. Children are below their
     * parents, except in the case of W and V. In that case there is an arrow
     * to indicate that V is a child of W.
     *
     *  .------U----.
     *  |       \   |
     *  |  W---->V  |
     *  |  |\    |  |
     *  |  | \   |  |
     *  \  |  Z  |  Q
     *   \ | / \ | /
     *    \|/   \|/
     *     X     Y
     */
    suite('Harder graph unions', function() {
      const hierarchy = new TypeHierarchy({
        'typeU': {},
        'typeW': {},
        'typeQ': {
          'fulfills': ['typeU'],
        },
        'typeV': {
          'fulfills': ['typeU', 'typeW'],
        },
        'typeZ': {
          'fulfills': ['typeW'],
        },
        'typeX': {
          'fulfills': ['typeU', 'typeW', 'typeZ'],
        },
        'typeY': {
          'fulfills': ['typeZ', 'typeV', 'typeQ'],
        },
      });

      test('X and Y', function() {
        this.assertNearestCommonParents(
            hierarchy, ['typeX', 'typeY'], ['typeZ', 'typeU']);
      });

      test('X, Y and Z', function() {
        this.assertNearestCommonParents(
            hierarchy, ['typeX', 'typeY', 'typeZ'], ['typeZ']);
      });

      test('X, Y and W', function() {
        this.assertNearestCommonParents(
            hierarchy, ['typeX', 'typeY', 'typeW'], ['typeW']);
      });

      test('X, Y and V', function() {
        this.assertNearestCommonParents(
            hierarchy, ['typeX', 'typeY', 'typeV'], ['typeW', 'typeU']);
      });

      test('U and W', function() {
        this.assertNoNearestCommonParents(hierarchy, ['typeU', 'typeW']);
      });
    });

    suite('Multiparent unions', function() {
      suite('Two parents, two children', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
          'typeC': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeD': {
            'fulfills': ['typeA', 'typeB'],
          },
        });

        test('C and D', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeC', 'typeD'], ['typeA', 'typeB']);
        });

        test('C, D and A', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeC', 'typeD', 'typeA'], ['typeA']);
        });

        test('A and B', function() {
          this.assertNoNearestCommonParents(hierarchy, ['typeA', 'typeB']);
        });
      });

      suite('Three parents, three children', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
          'typeC': {},
          'typeD': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeE': {
            'fulfills': ['typeA', 'typeB', 'typeC'],
          },
          'typeF': {
            'fulfills': ['typeB', 'typeC'],
          },
        });

        test('D and E', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeD', 'typeE'], ['typeA', 'typeB']);
        });

        test('E and F', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeE', 'typeF'], ['typeB', 'typeC']);
        });

        test('D and F', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeD', 'typeF'], ['typeB']);
        });

        test('D, E and F', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeD', 'typeE', 'typeF'], ['typeB']);
        });

        test('D, E and A', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeD', 'typeE', 'typeA'], ['typeA']);
        });

        test('D, E, F and B', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeD', 'typeE', 'typeF', 'typeB'], ['typeB']);
        });

        test('D, E and C', function() {
          this.assertNoNearestCommonParents(
              hierarchy, ['typeD', 'typeE', 'typeC']);
        });
      });

      suite('Two layers', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
          'typeC': {},
          'typeD': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeE': {
            'fulfills': ['typeA', 'typeB', 'typeC'],
          },
          'typeF': {
            'fulfills': ['typeB', 'typeC'],
          },
          'typeG': {
            'fulfills': ['typeD', 'typeE'],
          },
          'typeH': {
            'fulfills': ['typeD', 'typeE'],
          },
        });

        test('G and H', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeG', 'typeH'], ['typeD', 'typeE']);
        });

        test('G, H and F', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeG', 'typeH', 'typeF'], ['typeB', 'typeC']);
        });
      });

      suite('Three layers', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
          'typeC': {},
          'typeD': {},
          'typeE': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeF': {
            'fulfills': ['typeA', 'typeB', 'typeC'],
          },
          'typeG': {
            'fulfills': ['typeB', 'typeC', 'typeD'],
          },
          'typeH': {
            'fulfills': ['typeC', 'typeD'],
          },
          'typeI': {
            'fulfills': ['typeE', 'typeF'],
          },
          'typeJ': {
            'fulfills': ['typeE', 'typeF', 'typeG'],
          },
          'typeK': {
            'fulfills': ['typeF', 'typeG'],
          },
          'typeL': {
            'fulfills': ['typeI', 'typeJ'],
          },
          'typeM': {
            'fulfills': ['typeI', 'typeJ'],
          },
        });

        test('L and M', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeL', 'typeM'], ['typeI', 'typeJ']);
        });

        test('L, M and K', function() {
          this.assertNearestCommonParents(
              hierarchy, ['typeL', 'typeM', 'typeK'], ['typeF', 'typeG']);
        });

        test('L, M, K and H', function() {
          this.assertNearestCommonParents(
              hierarchy,
              ['typeL', 'typeM', 'typeK', 'typeH'],
              ['typeC', 'typeD']);
        });
      });
    });

    suite.only('Params', function() {
      /*
       * In the context of this suite, "outer" refers to the parameterized type,
       * and "params" refers to the type parameters.
       */

      suite('Covariant', function() {
        suite('No common ancestors - params', function() {
          test('Single param', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': { // Makes sure descendant path isn't getting called.
                'fulfills': ['typeC', 'typeB'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy, ['typeA[typeB]', 'typeA[typeC]'], []);
          });

          test('Multiple params first bad', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                  {
                    'name': 'C',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
              'typeF': {
                'fulfills': ['typeD'],
              },
              'typeG': { // Makes sure descendant path isn't getting called.
                'fulfills': ['typeC', 'typeB'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeB, typeE, typeE]', 'typeA[typeC, typeF, typeF]'],
                []);
          });

          test('Multiple params second bad', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                  {
                    'name': 'C',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
              'typeF': {
                'fulfills': ['typeD'],
              },
              'typeG': { // Makes sure descendant path isn't getting called.
                'fulfills': ['typeC', 'typeB'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeE, typeB, typeE]', 'typeA[typeF, typeC, typeF]'],
                []);
          });

          test('Multiple params last bad', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                  {
                    'name': 'C',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
              'typeF': {
                'fulfills': ['typeD'],
              },
              'typeG': { // Makes sure descendant path isn't getting called.
                'fulfills': ['typeC', 'typeB'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeE, typeE, typeB]', 'typeA[typeF, typeF, typeC]'],
                []);
          });

          test('Multiple parents - one unifies params other does not',
              function() {
                const hierarchy = new TypeHierarchy({
                  'typeA': {
                    'params': [
                      {
                        'name': 'A',
                        'variance': 'covariant',
                      },
                    ],
                  },
                  'typeB': {
                    'params': [
                      {
                        'name': 'A',
                        'variance': 'covariant',
                      },
                    ],
                  },
                  'typeC': {
                    'fulfills': ['typeA[A]', 'typeB[B]'],
                    'params': [
                      {
                        'name': 'A',
                        'variance': 'covariant',
                      },
                      {
                        'name': 'B',
                        'variance': 'covariant',
                      },
                    ],
                  },
                  'typeD': {
                    'fulfills': ['typeA[A]', 'typeB[B]'],
                    'params': [
                      {
                        'name': 'A',
                        'variance': 'covariant',
                      },
                      {
                        'name': 'B',
                        'variance': 'covariant',
                      },
                    ],
                  },
                  'typeE': { },
                  'typeF': { },
                  'typeG': { },
                  'typeH': {
                    'fulfills': ['typeG'],
                  },
                  'typeI': {
                    'fulfills': ['typeG'],
                  },
                  'typeJ': { // Makes sure descendant path isn't getting called.
                    'fulfills': ['typeE', 'typeF'],
                  },
                });
                this.assertNearestCommonParents(
                    hierarchy,
                    ['typeC[typeH, typeE]', 'typeD[typeI, typeF]'],
                    ['typeA[typeG]']);
              });

          test('Nested params', function() {
          });
        });

        suite('Single common ancestor', function() {
          test('Unify self', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
            });
            this.assertNearestCommonParents(
                hierarchy,
                [
                  'typeA[typeB, typeA[typeB, typeB]]',
                  'typeA[typeB, typeA[typeB, typeB]]',
                ],
                ['typeA[typeB, typeA[typeB, typeB]]']);
          });

          test('Outer unify sibling', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': { },
            });
            this.assertNearestCommonParents(
                hierarchy, ['typeB[typeD]', 'typeC[typeD]'], ['typeA[typeD]']);
          });

          test('Params unify sibling', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': {
                'fulfills': ['typeB'],
              },
              'typeD': {
                'fulfills': ['typeB'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy, ['typeA[typeC]', 'typeA[typeD]'], ['typeA[typeB]']);
          });

          test('Outer and params unify sibling', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
              'typeF': {
                'fulfills': ['typeD'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy, ['typeB[typeE]', 'typeC[typeF]'], ['typeA[typeD]']);
          });

          test('Multiple params', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': {
                'fulfills': ['typeB'],
              },
              'typeE': {
                'fulfills': ['typeB'],
              },
              'typeF': {
                'fulfills': ['typeC'],
              },
              'typeG': {
                'fulfills': ['typeC'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeD, typeF]', 'typeA[typeE, typeG]'],
                ['typeA[typeB, typeC]']);
          });

          test('Nested params', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
              'typeF': {
                'fulfills': ['typeD'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeB[typeC[typeE]]', 'typeC[typeB[typeF]]'],
                ['typeA[typeA[typeD]]']);
          });

          suite('Mixed up params', function() {
            setup(function() {
              this.hierarchy = new TypeHierarchy({
                'typeA': {
                  'params': [
                    {
                      'name': 'A',
                      'variance': 'co',
                    },
                    {
                      'name': 'B',
                      'variance': 'co',
                    },
                  ],
                },
                'typeB': {
                  'fulfills': ['typeA[B, A]'],
                  'params': [
                    {
                      'name': 'A',
                      'variance': 'co',
                    },
                    {
                      'name': 'B',
                      'variance': 'co',
                    },
                  ],
                },
                'typeC': {
                  'fulfills': ['typeA[B, A]'],
                  'params': [
                    {
                      'name': 'A',
                      'variance': 'co',
                    },
                    {
                      'name': 'B',
                      'variance': 'co',
                    },
                  ],
                },
                'typeD': { },
                'typeE': { },
                'typeF': {
                  'fulfills': ['typeD'],
                },
                'typeG': {
                  'fulfills': ['typeD'],
                },
                'typeH': {
                  'fulfills': ['typeE'],
                },
                'typeI': {
                  'fulfills': ['typeE'],
                },
              });
            });

            test('Params unify self', function() {
              this.assertNearestCommonParents(
                  this.hierarchy,
                  ['typeB[typeF, typeG]', 'typeC[typeF, typeG]'],
                  ['typeA[typeG, typeF]'], // Observe how types reversed.
              );
            });

            test('Unify sibling', function() {
              this.assertNearestCommonParents(
                  this.hierarchy,
                  ['typeB[typeF, typeH]', 'typeC[typeG, typeI]'],
                  ['typeA[typeE, typeD]'], // Observe how types reversed.
              );
            });
          });
        });

        suite('Multiple common ancestors - outer', function() {
          test('Single param', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A]', 'typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': {
                'fulfills': ['typeA[A]', 'typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeE': { },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeC[typeE]', 'typeD[typeE]'],
                ['typeA[typeE]', 'typeB[typeE]']);
          });

          test('Multiple params', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A, B]', 'typeB[A, B]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': {
                'fulfills': ['typeA[A, B]', 'typeB[A, B]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeE': { },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeC[typeE, typeE]', 'typeD[typeE, typeE]'],
                ['typeA[typeE, typeE]', 'typeB[typeE, typeE]']);
          });

          test('Nested params', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A]', 'typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': {
                'fulfills': ['typeA[A]', 'typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeE': { },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeC[typeC[typeE]]', 'typeD[typeD[typeE]]'],
                [
                  'typeA[typeA[typeE]]',
                  'typeA[typeB[typeE]]',
                  'typeB[typeA[typeE]]',
                  'typeB[typeB[typeE]]',
                ]
            );
          });
        });

        suite('Multiple common ancestors - params', function() {
          test('Single param', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': {
                'fulfills': ['typeB', 'typeC'],
              },
              'typeE': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeD]', 'typeA[typeE]'],
                ['typeA[typeB]', 'typeA[typeC]']);
          });

          test('Multiple params', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': {
                'fulfills': ['typeB', 'typeC'],
              },
              'typeE': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeD, typeD]', 'typeA[typeE, typeE]'],
                [
                  'typeA[typeB, typeB]',
                  'typeA[typeB, typeC]',
                  'typeA[typeC, typeB]',
                  'typeA[typeC, typeC]',
                ]
            );
          });

          test('Nested multiple params', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': {
                'fulfills': ['typeB', 'typeC'],
              },
              'typeE': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                [
                  'typeA[typeD, typeA[typeD, typeD]]',
                  'typeA[typeE, typeA[typeE, typeE]]',
                ],
                [
                  'typeA[typeB, typeA[typeB, typeB]]',
                  'typeA[typeB, typeA[typeB, typeC]]',
                  'typeA[typeB, typeA[typeC, typeB]]',
                  'typeA[typeB, typeA[typeC, typeC]]',
                  'typeA[typeC, typeA[typeB, typeB]]',
                  'typeA[typeC, typeA[typeB, typeC]]',
                  'typeA[typeC, typeA[typeC, typeB]]',
                  'typeA[typeC, typeA[typeC, typeC]]',
                ]
            );
          });
        });

        suite('Multiple common ancestors - outer and params', function() {
          test('Single param', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A]', 'typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': {
                'fulfills': ['typeA[A]', 'typeB[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeE': { },
              'typeF': { },
              'typeG': {
                'fulfills': ['typeE', 'typeF'],
              },
              'typeH': {
                'fulfills': ['typeE', 'typeF'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeC[typeG]', 'typeD[typeH]'],
                [
                  'typeA[typeE]',
                  'typeA[typeF]',
                  'typeB[typeE]',
                  'typeB[typeF]',
                ]
            );
          });

          test('Multiple params', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A, B]', 'typeB[A, B]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': {
                'fulfills': ['typeA[A, B]', 'typeB[A, B]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeE': { },
              'typeF': { },
              'typeG': {
                'fulfills': ['typeE', 'typeF'],
              },
              'typeH': {
                'fulfills': ['typeE', 'typeF'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeC[typeG, typeG]', 'typeD[typeH, typeH]'],
                [
                  'typeA[typeE, typeE]',
                  'typeA[typeE, typeF]',
                  'typeA[typeF, typeE]',
                  'typeA[typeF, typeF]',
                  'typeB[typeE, typeE]',
                  'typeB[typeE, typeF]',
                  'typeB[typeF, typeE]',
                  'typeB[typeF, typeF]',
                ]
            );
          });

          test('Nested params', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A, B]', 'typeB[A, B]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': {
                'fulfills': ['typeA[A, B]', 'typeB[A, B]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeE': { },
              'typeF': { },
              'typeG': {
                'fulfills': ['typeE', 'typeF'],
              },
              'typeH': {
                'fulfills': ['typeE', 'typeF'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                [
                  'typeC[typeG, typeC[typeG, typeG]]',
                  'typeD[typeH, typeD[typeH, typeH]]',
                ],
                [
                  'typeA[typeE, typeA[typeE, typeE]]',
                  'typeA[typeE, typeA[typeE, typeF]]',
                  'typeA[typeE, typeA[typeF, typeE]]',
                  'typeA[typeE, typeA[typeF, typeF]]',
                  'typeA[typeE, typeB[typeE, typeE]]',
                  'typeA[typeE, typeB[typeE, typeF]]',
                  'typeA[typeE, typeB[typeF, typeE]]',
                  'typeA[typeE, typeB[typeF, typeF]]',
                  'typeA[typeF, typeA[typeE, typeE]]',
                  'typeA[typeF, typeA[typeE, typeF]]',
                  'typeA[typeF, typeA[typeF, typeE]]',
                  'typeA[typeF, typeA[typeF, typeF]]',
                  'typeA[typeF, typeB[typeE, typeE]]',
                  'typeA[typeF, typeB[typeE, typeF]]',
                  'typeA[typeF, typeB[typeF, typeE]]',
                  'typeA[typeF, typeB[typeF, typeF]]',
                  'typeB[typeE, typeA[typeE, typeE]]',
                  'typeB[typeE, typeA[typeE, typeF]]',
                  'typeB[typeE, typeA[typeF, typeE]]',
                  'typeB[typeE, typeA[typeF, typeF]]',
                  'typeB[typeE, typeB[typeE, typeE]]',
                  'typeB[typeE, typeB[typeE, typeF]]',
                  'typeB[typeE, typeB[typeF, typeE]]',
                  'typeB[typeE, typeB[typeF, typeF]]',
                  'typeB[typeF, typeA[typeE, typeE]]',
                  'typeB[typeF, typeA[typeE, typeF]]',
                  'typeB[typeF, typeA[typeF, typeE]]',
                  'typeB[typeF, typeA[typeF, typeF]]',
                  'typeB[typeF, typeB[typeE, typeE]]',
                  'typeB[typeF, typeB[typeE, typeF]]',
                  'typeB[typeF, typeB[typeF, typeE]]',
                  'typeB[typeF, typeB[typeF, typeF]]',
                ]
            );
          });
        });
      });

      suite('Contravariant', function() {
        suite('No common ancestors - params', function() {
          test('Single param', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': { },
              'typeC': {
                'fulfills': ['typeB'], // Makes sure ancestor path isn't called.
              },
              'typeD': {
                'fulfills': ['typeB'], // Makes sure ancestor path isn't called.
              },
            });
            this.assertNearestCommonParents(
                hierarchy, ['typeA[typeC]', 'typeA[typeD]'], []);
          });

          test('Multiple params first bad', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                  {
                    'name': 'B',
                    'variance': 'contra',
                  },
                  {
                    'name': 'C',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': { },
              'typeC': {
                'fulfills': ['typeB'], // Makes sure ancestor path isn't called.
              },
              'typeD': {
                'fulfills': ['typeB'], // Makes sure ancestor path isn't called.
              },
              'typeE': { },
              'typeF': {
                'fulfills': ['typeD'],
              },
              'typeG': {
                'fulfills': ['typeD'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeC, typeF, typeF]', 'typeA[typeD, typeG, typeG]'],
                []);
          });

          test('Multiple params second bad', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                  {
                    'name': 'B',
                    'variance': 'contra',
                  },
                  {
                    'name': 'C',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': { },
              'typeC': {
                'fulfills': ['typeB'], // Makes sure ancestor path isn't called.
              },
              'typeD': {
                'fulfills': ['typeB'], // Makes sure ancestor path isn't called.
              },
              'typeE': { },
              'typeF': {
                'fulfills': ['typeD'],
              },
              'typeG': {
                'fulfills': ['typeD'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeF, typeC, typeF]', 'typeA[typeG, typeD, typeG]'],
                []);
          });

          test('Multiple params last bad', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'contra',
                  },
                  {
                    'name': 'B',
                    'variance': 'contra',
                  },
                  {
                    'name': 'C',
                    'variance': 'contra',
                  },
                ],
              },
              'typeB': { },
              'typeC': { },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeD'],
              },
              'typeF': {
                'fulfills': ['typeD'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeA[typeE, typeE, typeB]', 'typeA[typeF, typeF, typeC]'],
                []);
          });

          test('Multiple parents - one unifies params other does not',
              function() {
                const hierarchy = new TypeHierarchy({
                  'typeA': {
                    'params': [
                      {
                        'name': 'A',
                        'variance': 'covariant',
                      },
                    ],
                  },
                  'typeB': {
                    'params': [
                      {
                        'name': 'A',
                        'variance': 'covariant',
                      },
                    ],
                  },
                  'typeC': {
                    'fulfills': ['typeA[A]', 'typeB[B]'],
                    'params': [
                      {
                        'name': 'A',
                        'variance': 'covariant',
                      },
                      {
                        'name': 'B',
                        'variance': 'covariant',
                      },
                    ],
                  },
                  'typeD': {
                    'fulfills': ['typeA[A]', 'typeB[B]'],
                    'params': [
                      {
                        'name': 'A',
                        'variance': 'covariant',
                      },
                      {
                        'name': 'B',
                        'variance': 'covariant',
                      },
                    ],
                  },
                  'typeE': { },
                  'typeF': { },
                  'typeG': { },
                  'typeH': {
                    'fulfills': ['typeG'],
                  },
                  'typeI': {
                    'fulfills': ['typeG'],
                  },
                });
                this.assertNearestCommonParents(
                    hierarchy,
                    ['typeC[typeH, typeE]', 'typeD[typeI, typeF]'],
                    ['typeA[typeG]']);
              });
        });
      });

      suite('Invariant', function() {
      });

      suite('Nested param variance', function() {
        test('Covariant, Covariant', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'co',
                },
              ],
            },
            'typeB': { },
            'typeC': { },
            'typeD': { // Makes sure descendant path isn't getting called.
              'fulfills': ['typeB', 'typeC'],
            },
          });
          this.assertNearestCommonParents(
              hierarchy, ['typeA[typeA[typeB]]', 'typeA[typeA[typeC]]'], []);
        });

        test('Covariant, Contravariant', function() {

        });

        test('Covariant, Invariant', function() {

        });

        test('Contravariant, Covariant', function() {

        });

        test('Contravariant, Contravariant', function() {
          const hierarchy = new TypeHierarchy({
            'typeA': {
              'params': [
                {
                  'name': 'A',
                  'variance': 'contra',
                },
              ],
            },
            'typeB': { },
            'typeC': {
              'fulfills': ['typeB'],
            },
            'typeD': {
              'fulfills': ['typeB'],
            },
          });
          this.assertNearestCommonParents(
              hierarchy,
              ['typeA[typeA[typeC]]', 'typeA[typeA[typeD]]'],
              ['typeA[typeA[typeB]']);
        });

        test('Contravariant, Invariant', function() {

        });

        test('Invariant, Covariant', function() {

        });

        test('Invariant, Contravariant', function() {

        });

        test('Invariant, Invariant', function() {

        });
      });

      suite('Explicit parameter inheritance', function() {
        suite('Single common parents', function() {
          test('Unify self', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': {
                'fulfills': ['typeA[typeB]'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy, ['typeC', 'typeC'], ['typeC']);
          });

          test('Unify sibling', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': {
                'fulfills': ['typeA[typeB]'],
              },
              'typeD': {
                'fulfills': ['typeA[typeB]'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy, ['typeC', 'typeD'], ['typeA[typeB]']);
          });

          test('Unify sibling - outer unify sibling', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeC': {
                'fulfills': ['typeA[A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': { },
              'typeE': {
                'fulfills': ['typeB[typeD]'],
              },
              'typeF': {
                'fulfills': ['typeC[typeD]'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeE', 'typeF'],
                ['typeA[typeD]'],
            );
          });

          test('Unify sibling - params unify sibling', function() {

          });

          test('Unify sibling - outer and params unify sibling', function() {

          });

          test('Multiple params - unify deep', function() {
            const hierarchy = new TypeHierarchy({
              'typeA': {
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeB': { },
              'typeC': {
                'fulfills': ['typeA[A, B]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeD': {
                'fulfills': ['typeA[A, B]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                  {
                    'name': 'B',
                    'variance': 'co',
                  },
                ],
              },
              'typeE': {
                'fulfills': ['typeC[typeB, A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeF': {
                'fulfills': ['typeD[typeB, A]'],
                'params': [
                  {
                    'name': 'A',
                    'variance': 'co',
                  },
                ],
              },
              'typeG': {
                'fulfills': ['typeE[typeB]'],
              },
              'typeH': {
                'fulfills': ['typeF[typeB]'],
              },
            });
            this.assertNearestCommonParents(
                hierarchy,
                ['typeG', 'typeH'],
                ['typeA[typeB, typeB]'],
            );
          });
        });

        suite('Multiple common parents - outer', function() {

        });

        suite('Multiple common parents - params', function() {

        });

        suite('Multiple common parents - outer and params', function() {

        });
      });
    });
  });

  suite('nearestCommonDescendants', function() {
    setup(function() {
      this.assertNearestCommonDescendants =
          function(hierarchy, toUnify, expected) {
            const actual = hierarchy.getNearestCommonDescendants(
                ...toUnify.map((type) => parseType(type)));
            chai.assert.equal(actual.length, expected.length,
                'Expected the length of the nearest common parents array to ' +
                'match the length of the expected array.');
            actual.forEach((typeStruct, i) => {
              if (!typeStruct.equals((parseType(expected[i])))) {
                chai.assert.fail('Expected ' + expected[i] + ' to equal ' +
                    structureToString(typeStruct));
              }
            });
          };
      this.assertNoNearestCommonDescendants = function(hierarchy, toUnify) {
        const actual = hierarchy.getNearestCommonDescendants(
            ...toUnify.map((type) => parseType(type)));
        chai.assert.isArray(actual);
        chai.assert.isEmpty(actual);
      };
    });

    suite('Variable Arguments', function() {
      test('No args', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
        });
        this.assertNoNearestCommonDescendants(hierarchy, []);
      });

      test('One arg', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
        });
        this.assertNearestCommonDescendants(hierarchy, ['typeA'], ['typeA']);
      });
    });

    suite('Simple tree unions', function() {
      test('Unify self', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
        });
        this.assertNearestCommonDescendants(
            hierarchy, ['typeA', 'typeA'], ['typeA']);
      });

      test('Unify parent', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
        });
        this.assertNearestCommonDescendants(
            hierarchy, ['typeB', 'typeA'], ['typeB']);
      });

      test('Unify parsib', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeD', 'typeC']);
      });

      test('Unify grandparent', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeB'],
          },
        });
        this.assertNearestCommonDescendants(
            hierarchy, ['typeC', 'typeA'], ['typeC']);
      });

      test('Unify grandparsib', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeD'],
          },
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeE', 'typeC']);
      });

      test('Unify sibling', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeB', 'typeC']);
      });

      test('Unify cousin', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeC'],
          },
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeD', 'typeE']);
      });

      test('Unfiy second cousin', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeC'],
          },
          'typeF': {
            'fulfills': ['typeD'],
          },
          'typeG': {
            'fulfills': ['typeE'],
          },
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeF', 'typeG']);
      });

      test('Unify first cousin once removed', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeC'],
          },
          'typeF': {
            'fulfills': ['typeD'],
          },
          'typeG': {
            'fulfills': ['typeE'],
          },
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeD', 'typeG']);
      });

      test('Unify child', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
        });
        this.assertNearestCommonDescendants(
            hierarchy, ['typeA', 'typeB'], ['typeB']);
      });

      test('Unify nibling', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeC', 'typeD']);
      });

      test('Unify grandnibling', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {
            'fulfills': ['typeA'],
          },
          'typeC': {
            'fulfills': ['typeA'],
          },
          'typeD': {
            'fulfills': ['typeB'],
          },
          'typeE': {
            'fulfills': ['typeD'],
          },
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeC', 'typeE']);
      });

      test('Unify unrelated', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
        });
        this.assertNoNearestCommonDescendants(hierarchy, ['typeA', 'typeB']);
      });
    });

    suite('Inverse tree unions', function() {
      test('Unify grandparent and opt parent (inverse parsib)',
          function() {
            const hierarchy = new TypeHierarchy({
              'typeD': {},
              'typeC': {},
              'typeB': {
                'fulfills': ['typeD'],
              },
              'typeA': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNearestCommonDescendants(
                hierarchy, ['typeD', 'typeC'], ['typeA']);
          });

      test('Unify greatgrandparent and opt parent (inverse grandparsib)',
          function() {
            const hierarchy = new TypeHierarchy({
              'typeE': {},
              'typeD': {
                'fulfills': ['typeE'],
              },
              'typeC': {},
              'typeB': {
                'fulfills': ['typeD'],
              },
              'typeA': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNearestCommonDescendants(
                hierarchy, ['typeE', 'typeC'], ['typeA']);
          });

      test('Unify opt grandparents (inverse cousins)', function() {
        const hierarchy = new TypeHierarchy({
          'typeE': {},
          'typeD': {},
          'typeC': {
            'fulfills': ['typeE'],
          },
          'typeB': {
            'fulfills': ['typeD'],
          },
          'typeA': {
            'fulfills': ['typeB', 'typeC'],
          },
        });
        this.assertNearestCommonDescendants(
            hierarchy, ['typeD', 'typeE'], ['typeA']);
      });

      test('Unify opt greatgrandparenst (inverse 2nd cousins)', function() {
        const hierarchy = new TypeHierarchy({
          'typeG': {},
          'typeF': {},
          'typeE': {
            'fulfills': ['typeG'],
          },
          'typeD': {
            'fulfills': ['typef'],
          },
          'typeC': {
            'fulfills': ['typeE'],
          },
          'typeB': {
            'fulfills': ['typeD'],
          },
          'typeA': {
            'fulfills': ['typeB', 'typeC'],
          },
        });
        this.assertNearestCommonDescendants(
            hierarchy, ['typeF', 'typeG'], ['typeA']);
      });

      test('Unify greatgrandparent and opt grandparent ' +
          '(inverse 1st cousin once removed)',
      function() {
        const hierarchy = new TypeHierarchy({
          'typeG': {},
          'typeF': {},
          'typeE': {
            'fulfills': ['typeG'],
          },
          'typeD': {
            'fulfills': ['typef'],
          },
          'typeC': {
            'fulfills': ['typeE'],
          },
          'typeB': {
            'fulfills': ['typeD'],
          },
          'typeA': {
            'fulfills': ['typeB', 'typeC'],
          },
        });
        this.assertNearestCommonDescendants(
            hierarchy, ['typeD', 'typeG'], ['typeA']);
      });

      test('Unify parent and opt grandparent (inverse nibling)', function() {
        const hierarchy = new TypeHierarchy({
          'typeD': {},
          'typeC': {},
          'typeB': {
            'fulfills': ['typeD'],
          },
          'typeA': {
            'fulfills': ['typeB', 'typeC'],
          },
        });
        this.assertNearestCommonDescendants(
            hierarchy, ['typeC', 'typeD'], ['typeA']);
      });

      test('Unify parent and opt greatgrandparent (inverse grandnibling)',
          function() {
            const hierarchy = new TypeHierarchy({
              'typeE': {},
              'typeD': {
                'fulfills': ['typeE'],
              },
              'typeC': {},
              'typeB': {
                'fulfills': ['typeD'],
              },
              'typeA': {
                'fulfills': ['typeB', 'typeC'],
              },
            });
            this.assertNearestCommonDescendants(
                hierarchy, ['typeC', 'typeE'], ['typeA']);
          });
    });

    /* All of these tests use the following graph. Children are below their
     * parents, except in the case of W and V. In that case there is an arrow
     * to indicate that V is a child of W.
     *
     *  .------U----.
     *  |       \   |
     *  |  W---->V  |
     *  |  |\    |  |
     *  |  | \   |  |
     *  \  |  Z  |  Q
     *   \ | / \ | /
     *    \|/   \|/
     *     X     Y
     */
    suite('Harder graph unions', function() {
      const hierarchy = new TypeHierarchy({
        'typeU': {},
        'typeW': {},
        'typeQ': {
          'fulfills': ['typeU'],
        },
        'typeV': {
          'fulfills': ['typeU', 'typeW'],
        },
        'typeZ': {
          'fulfills': ['typeW'],
        },
        'typeX': {
          'fulfills': ['typeU', 'typeW', 'typeZ'],
        },
        'typeY': {
          'fulfills': ['typeZ', 'typeV', 'typeQ'],
        },
      });

      test('X and Y', function() {
        this.assertNoNearestCommonDescendants(hierarchy, ['typeX', 'typeY']);
      });

      test('U and V', function() {
        this.assertNearestCommonDescendants(
            hierarchy, ['typeU', 'typeV'], ['typeV']);
      });

      test('U, V and Q', function() {
        this.assertNearestCommonDescendants(
            hierarchy, ['typeU', 'typeV', 'typeY'], ['typeY']);
      });

      test('U and W', function() {
        this.assertNearestCommonDescendants(
            hierarchy, ['typeU', 'typeW'], ['typeV', 'typeX']);
      });

      test('U and Z', function() {
        this.assertNearestCommonDescendants(
            hierarchy, ['typeU', 'typeZ'], ['typeX', 'typeY']);
      });
    });

    suite('Multiparent unions', function() {
      suite('Two parents, two children', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
          'typeC': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeD': {
            'fulfills': ['typeA', 'typeB'],
          },
        });

        test('A and B', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB'], ['typeC', 'typeD']);
        });

        test('A, B and C', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB', 'typeC'], ['typeC']);
        });

        test('C and D', function() {
          this.assertNoNearestCommonDescendants(hierarchy, ['typeC', 'typeD']);
        });
      });

      suite('Three parents, three children', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
          'typeC': {},
          'typeD': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeE': {
            'fulfills': ['typeA', 'typeB', 'typeC'],
          },
          'typeF': {
            'fulfills': ['typeB', 'typeC'],
          },
        });

        test('A and B', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB'], ['typeD', 'typeE']);
        });

        test('B and C', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeB', 'typeC'], ['typeE', 'typeF']);
        });

        test('A and C', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeC'], ['typeE']);
        });

        test('A, B and C', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB', 'typeC'], ['typeE']);
        });

        test('A, B and D', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB', 'typeD'], ['typeD']);
        });

        test('A, B, C and E', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB', 'typeC', 'typeE'], ['typeE']);
        });

        test('A, B and F', function() {
          this.assertNoNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB', 'typeF']);
        });
      });

      suite('Two layers', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
          'typeC': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeD': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeE': {},
          'typeF': {
            'fulfills': ['typeC', 'typeD'],
          },
          'typeG': {
            'fulfills': ['typeC', 'typeD', 'typeE'],
          },
          'typeH': {
            'fulfills': ['typeD', 'typeE'],
          },
        });

        test('A and B', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB'], ['typeC', 'typeD']);
        });

        test('A, B and E', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB', 'typeE'], ['typeG', 'typeH']);
        });
      });

      suite('Three layers', function() {
        const hierarchy = new TypeHierarchy({
          'typeA': {},
          'typeB': {},
          'typeC': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeD': {
            'fulfills': ['typeA', 'typeB'],
          },
          'typeE': {},
          'typeF': {
            'fulfills': ['typeC', 'typeD'],
          },
          'typeG': {
            'fulfills': ['typeC', 'typeD', 'typeE'],
          },
          'typeH': {
            'fulfills': ['typeD', 'typeE'],
          },
          'typeI': {},
          'typeJ': {
            'fulfills': ['typeF', 'typeG'],
          },
          'typeK': {
            'fulfills': ['typeF', 'typeG', 'typeH'],
          },
          'typeL': {
            'fulfills': ['typeG', 'typeH', 'typeI'],
          },
          'typeM': {
            'fulfills': ['typeH', 'typeI'],
          },
        });

        test('A and B', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB'], ['typeC', 'typeD']);
        });

        test('A, B and E', function() {
          this.assertNearestCommonDescendants(
              hierarchy, ['typeA', 'typeB', 'typeE'], ['typeG', 'typeH']);
        });

        test('A, B, E and I', function() {
          this.assertNearestCommonDescendants(
              hierarchy,
              ['typeA', 'typeB', 'typeE', 'typeI'],
              ['typeL', 'typeM']);
        });
      });
    });
  });
});
