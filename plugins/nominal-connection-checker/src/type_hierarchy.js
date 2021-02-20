/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Defines the TypeHierarchy and all of its private helper
 * prototypes.
 */
'use strict';

import {TypeStructure, parseType, structureToString} from './type_structure';
import {isGeneric} from './utils';


/**
 * Defines a type hierarchy. Used for doing operations like telling if one type
 * is a subtype of another type.
 */
export class TypeHierarchy {
  /**
   * Constructs the TypeHierarchy, initializing it with the given hierarchyDef.
   * @param {!Object} hierarchyDef The definition of the type hierarchy.
   */
  constructor(hierarchyDef) {
    /**
     * Map of type names to TypeDefs.
     * @type {!Map<string, !TypeDef>}
     * @private
     */
    this.types_ = new Map();

    /**
     * Map of type names to maps of type names to arrays of type names that are
     * the nearest common ancestors of the two types. You can think of it like
     * a two-dimensional array where both axes contain all of the type names.
     *
     * A nearest common ancestor of two types u and v is defined as:
     * A super type of both u and v that has no descendant which is also an
     * ancestor of both u and v.
     * @type {!Map<string, !Map<string, Array<string>>>}
     * @private
     */
    this.nearestCommonAncestors_ = new Map();

    /**
     * Map of type names to maps of type names to arrays of type names that are
     * the nearest common descendants of the two types. You can think of it like
     * a two-dimensional array where both axes contain all of the type names.
     *
     * A nearest common descendant of two types u and v is defined as:
     * A sub type of both U and v that has no ancestor which is also a
     * descendant of both u and v.
     * @type {!Map<string, !Map<string, Array<string>>>}
     * @private
     */
    this.nearestCommonDescendants_ = new Map();

    this.initTypes_(hierarchyDef);
    this.initNearestCommonAncestors_();
    this.initNearestCommonDescendants_();
  }

  /**
   * Initializes the TypeHierarchy's types_.
   * @param {!Object} hierarchyDef The definition of the type hierarchy.
   * @private
   */
  initTypes_(hierarchyDef) {
    // NOTE: This does not do anything to stop a developer from creating a
    // cyclic type hierarchy (eg Dog <: Mammal <: Dog). They are expected to
    // not do that.

    // Init types, direct supers, and parameters.
    for (const typeName of Object.keys(hierarchyDef)) {
      const lowerCaseName = typeName.toLowerCase();
      const type = new TypeDef(lowerCaseName);
      const info = hierarchyDef[typeName];
      if (info.params && info.params.length) {
        info.params.forEach((param) => {
          type.addParam(
              param.name.toLowerCase(), stringToVariance(param.variance));
        });
      }
      if (info.fulfills && info.fulfills.length) {
        info.fulfills.forEach(
            (superType) => type.addSuper(parseType(superType)));
      }
      this.types_.set(lowerCaseName, type);
    }

    // Init direct subs.
    for (const [typeName, type] of this.types_) {
      type.supers().forEach((superName) => {
        const superType = this.types_.get(superName);
        if (!superType) {
          throw Error('The type ' + typeName + ' says it fulfills the type ' +
              superName + ', but that type is not defined');
        }
        superType.addSub(type);
      });
    }

    // Init ancestors.
    let unvisitedTypes = new Set(this.types_.keys());
    while (unvisitedTypes.size) {
      for (const typeName of unvisitedTypes) {
        const type = this.types_.get(typeName);
        const unvisitedSupers = type.supers().filter(
            unvisitedTypes.has, unvisitedTypes);
        if (!unvisitedSupers.length) {
          type.supers().forEach((superName) => {
            const superType = this.types_.get(superName);
            superType.ancestors().forEach(
                (ancestor) => type.addAncestor(ancestor, superType));
          });
          unvisitedTypes.delete(typeName);
        }
      }
    }

    // Init descendants.
    unvisitedTypes = new Set(this.types_.keys());
    while (unvisitedTypes.size) {
      for (const typeName of unvisitedTypes) {
        const type = this.types_.get(typeName);
        const unvisitedSubs = type.subs().filter(
            unvisitedTypes.has, unvisitedTypes);
        if (!unvisitedSubs.length) {
          type.subs().forEach((subName) => {
            const subType = this.types_.get(subName);
            subType.descendants().forEach(
                (descendant) => type.addDescendant(descendant, subType));
          });
          unvisitedTypes.delete(typeName);
        }
      }
    }
  }

  /**
   * Initializes the nearestCommonAncestors_ graph so the nearest common
   * ancestors of two types can be accessed in constant time.
   * @private
   */
  initNearestCommonAncestors_() {
    this.initNearest_(
        this.nearestCommonAncestors_,
        (type) => type.supers(),
        (type, otherTypeName) => type.hasDescendant(otherTypeName));
  }

  /**
   * Initializes the nearestCommonDesendants_ graph so that the nearest common
   * descendants of two types can be accessed in constant time.
   * @private
   */
  initNearestCommonDescendants_() {
    this.initNearest_(
        this.nearestCommonDescendants_,
        (type) => type.subs(),
        (type, otherTypeName) => type.hasAncestor(otherTypeName));
  }

  /**
   * Initializes the given nearestCommonMap so that the nearest common
   * ancestors/descendants of two types can be accessed in constant type.
   *
   * Implements the pre-processing algorithm defined in:
   * Czumaj, Artur, Miroslaw Kowaluk and and Andrzej Lingas. "Faster algorithms
   * for finding lowest common ancestors in directed acyclic graphs."
   * Theoretical Computer Science, 380.1-2 (2007): 37-46.
   * https://bit.ly/2SrCRs5
   *
   * But the above has been slightly modified to work for both ancestors and
   * descendants.
   *
   * Operates in O(nm) where n is the number of nodes and m is the number of
   * edges.
   *
   * @param {!Map<string, !Map<string, Array<string>>>} nearestCommonMap The
   *      map of nearest common types (either ancestors or descendants) that we
   *     are initializing.
   * @param {function(TypeDef):!Array<string>} relevantRelatives Returns the
   *     relatives that are relevant to this procedure. In the case of
   *     ancestors, returns supertypes, and in the case of descendants, returns
   *     subtypes.
   * @param {function(TypeDef, string):boolean} isNearest Returns true if the
   *     type associated with the string name is the nearest common X of the
   *     type associated with the string name and the given type def.
   * @private
   */
  initNearest_(nearestCommonMap, relevantRelatives, isNearest) {
    const unvisitedTypes = new Set(this.types_.keys());
    while (unvisitedTypes.size) {
      for (const typeName of unvisitedTypes) {
        const type = this.types_.get(typeName);
        const hasUnvisited = !!relevantRelatives(type).filter(
            unvisitedTypes.has, unvisitedTypes).length;
        if (hasUnvisited) {
          continue;
        }
        unvisitedTypes.delete(typeName);

        const map = new Map();
        nearestCommonMap.set(typeName, map);
        for (const [otherTypeName] of this.types_) {
          let nearestCommon = [];
          if (isNearest(type, otherTypeName)) {
            nearestCommon.push(typeName);
          } else {
            // Get all the nearest common types this type's relevant relatives
            // have with the otherType.
            relevantRelatives(type).forEach((relTypeName) => {
              nearestCommon.push(
                  ...nearestCommonMap.get(relTypeName)
                      .get(otherTypeName));
            });
            // Remove types that have a nearer relative in the array.
            nearestCommon = nearestCommon.filter(
                (typeName, i, array) => {
                  return !array.some((otherTypeName) => {
                    // Don't match the type against itself, but do match against
                    // duplicates.
                    if (array.indexOf(otherTypeName) == i) {
                      return false;
                    }
                    return isNearest(this.types_.get(typeName), otherTypeName);
                  });
                });
          }
          map.set(otherTypeName, nearestCommon);
        }
      }
    }
  }

  /**
   * Returns true if the given type name exists in the hierarchy. False
   * otherwise.
   * @param {string} name The name of the type.
   * @return {boolean} True if the given type exists in the hierarchy. False
   * otherwise.
   */
  typeExists(name) {
    return this.types_.has(name.toLowerCase());
  }

  /**
   * Returns true if the types are exactly the same type. False otherwise.
   * @param {!TypeStructure} type1 The name of the first type.
   * @param {!TypeStructure} type2 The name of the second type.
   * @return {boolean} True if the types are exactly the same type. False
   *     otherwise.
   */
  typeIsExactlyType(type1, type2) {
    this.validateTypeStructure_(type1);
    this.validateTypeStructure_(type2);
    return type1.equals(type2);
  }

  /**
   * Returns true if the types are identical, or if the first type fulfills the
   * second type (directly or via one of its supertypes), as specified in the
   * type hierarchy definition. False otherwise.
   * @param {!TypeStructure} subType The structure of the subtype.
   * @param {!TypeStructure} superType The structure of the supertype.
   * @return {boolean} True if the types are identical, or if the first type
   *     fulfills the second type (directly or via its supertypes) as specified
   *     in the type hierarchy definition. False otherwise.
   */
  typeFulfillsType(subType, superType) {
    this.validateTypeStructure_(subType);
    this.validateTypeStructure_(superType);

    const subDef = this.types_.get(subType.name);
    const superDef = this.types_.get(superType.name);

    if (!subDef.hasAncestor(superType.name)) {
      // Not compatible.
      return false;
    }

    // TODO: We need to add checks to make sure the number of actual params for
    //  the subtype is correct. Here and in typeIsExactlyType.

    const orderedSubParams = subDef.getParamsForAncestor(
        superType.name, subType.params);
    return superType.params.every((actualSuper, i) => {
      const actualSub = orderedSubParams[i];
      const paramDef = superDef.getParamForIndex(i);

      switch (paramDef.variance) {
        case Variance.CO:
          return this.typeFulfillsType(actualSub, actualSuper);
        case Variance.CONTRA:
          return this.typeFulfillsType(actualSuper, actualSub);
        case Variance.INV:
          return this.typeIsExactlyType(actualSub, actualSuper);
      }
    });
  }

  /**
   * Returns an array of all the nearest common ancestors of the given types.
   * A nearest common ancestor of a set of types A is defined as:
   * A super type of all types in A that has no descendant which is also an
   * ancestor of all types in A.
   * @param {...TypeStructure} types A variable number of types that we want to
   *     find the nearest common ancestors of.
   * @return {!Array<TypeStructure>} An array of all the nearest common
   *     ancestors of the given types.
   */
  getNearestCommonParents(...types) {
    if (!types.length) {
      return [];
    }

    const getNearestCommonParentsRec = (typeStructs) => {
      // Get the common parents for the "outer" type.
      const commonParents = typeStructs.reduce((accumulator, currType) => {
        const nearestCommonParentsMap =
            this.nearestCommonAncestors_.get(currType.name);
        return accumulator
            .flatMap((type) => {
              return nearestCommonParentsMap.get(type.name).map((parentName) =>
                new TypeStructure(parentName));
            })
            // Get rid of duplicates.
            .filter((type, i, array) => {
              return array.every((type2, i2) => {
                return i <= i2 || !type.equals(type2);
              });
            });
      }, [typeStructs[0]]);

      // Create type structures for each combination of nearest common parents
      // of the parameter types.
      return commonParents.flatMap((parent) => {
        // An array of arrays, where each subarray is a list of actual types
        // we need to unify for a given parameter of the parent.
        let paramsLists = [];
        typeStructs.forEach((typeStruct) => {
          const mappedParams = this.types_.get(typeStruct.name)
              .getParamsForAncestor(parent.name, typeStruct.params);
          mappedParams.forEach((param, i) => {
            if (!paramsLists[i]) {
              paramsLists[i] = [];
            }
            paramsLists[i].push(param);
          });
        });

        if (!paramsLists.length) {
          return [parent];
        }

        // Change the paramsLists to an array of arrays of *nearest common
        // parents* of the types that are currently in the paramsLists.
        paramsLists = paramsLists.map(
            (paramList) => getNearestCommonParentsRec(paramList));

        const combine = ([firstArray, ...[secondArray, ...rest]]) => {
          if (!secondArray) {
            return firstArray;
          }
          const combined = firstArray.flatMap((a) =>
            secondArray.map((b) => [].concat(a, b)));
          return combine([combined, ...rest]);
        };


        // Create all the combinations of parameters (nearestCommonParents
        // should not allow for duplicates).
        paramsLists[0] = paramsLists[0].map((val) => [val]);
        const combinations = combine(paramsLists);

        // Turn parameter combinations into versions of the parent
        // types structure.
        return combinations.map((combo) => {
          const struct = new TypeStructure(parent.name);
          struct.params = combo;
          return struct;
        });
      });
    };

    return getNearestCommonParentsRec(types);
  }

  /**
   * Returns an array of all the nearest common descendants of the given types.
   * A nearest common ancestor of a set of types A is defined as:
   * A subtype of all types in A that has no ancestor which is also a descendant
   * of all types in A.
   * @param {...TypeStructure} types A variable number of types that we want to
   *     find the nearest common descendants of.
   * @return {!Array<TypeStructure>} An array of all the nearest common
   *     descendants of the given types.
   */
  getNearestCommonDescendants(...types) {
    if (!types.length) {
      return [];
    }
    return types.reduce((accumulator, currType) => {
      const nearestCommonDecendantsMap =
          // TODO: Nearest map?
          this.nearestCommonDescendants_.get(currType.name);
      return accumulator
          .map((type) => {
            // TODO: Nearest map?
            return nearestCommonDecendantsMap.get(type.name).map((parentName) =>
              new TypeStructure(parentName));
          })
          .reduce((flat, toFlatten) => {
            return [...flat, ...toFlatten];
          }, [])
          .filter((type, i, array) => {
            return array.every((type2, i2) => {
              return i <= i2 || !type.equals(type2);
            });
          });
    }, [types[0]]);
  }

  /**
   * Validates that the given type structure conforms to a definition known
   * to the type hierarchy. Note that this *only* validates the "top level"
   * type. It does *not* recursively validate parameters.
   * @param {!TypeStructure} struct The type structure to validate.
   * @private
   */
  validateTypeStructure_(struct) {
    const def = this.types_.get(struct.name);

    // TODO: Add throwing error if the def is not found. Note that there are
    //   some tests that need to be unskipped after this is added.

    if (struct.params.length != def.params().length) {
      throw new ActualParamsCountError(
          struct.name, struct.params.length, def.params().length);
    }
  }
}

/**
 * Represents a type.
 */
class TypeDef {
  /**
   * Constructs a TypeDef with the given name. Uses the hierarchy for further
   * initialization (eg defining supertypes).
   * @param {string} name The name of the type.
   */
  constructor(name) {
    /**
     * The name of this type.
     * @type {string}
     * @public
     */
    this.name = name.toLowerCase();

    /**
     * The caseless names of the direct supertypes of this type.
     * @type {!Set<string>}
     * @private
     */
    this.supers_ = new Set();

    /**
     * The caseless names of the direct subtypes of this type.
     * @type {!Set<string>}
     * @private
     */
    this.subs_ = new Set();

    /**
     * The caseless names of the ancestors of this type.
     * @type {!Set<string>}
     * @private
     */
    this.ancestors_ = new Set();
    this.ancestors_.add(this.name);

    /**
     * The caseless names of the descendants of this type.
     * @type {!Set<string>}
     * @private
     */
    this.descendants_ = new Set();
    this.descendants_.add(this.name);

    /**
     * The caseless names of the parameters of this type.
     * @type {!Array<ParamDef>}
     * @private
     */
    this.params_ = [];

    /**
     * A map of ancestor names to arrays of this type's parameters for
     * that type.
     * @type {!Map<string, !Array<!TypeStructure>>}
     * @private
     */
    this.ancestorParamsMap_ = new Map();

    /**
     * A map of descendant names to arrays of this type's parametesr for
     * that type.
     * @type {!Map<string, !Array<TypeStructure>>}
     * @private
     */
    this.descendantParamsMap_ = new Map();
  }

  /**
   * Adds the given type to the list of direct superTypes of this type.
   * @param {!TypeStructure} superType The type structure representing the type
   *     that is the supertype of this type.
   */
  addSuper(superType) {
    this.supers_.add(superType.name);
    this.ancestorParamsMap_.set(superType.name, superType.params);
  }

  /**
   * Adds the given type to the list of direct subtypes of this type.
   * @param {!TypeDef} subDef
   */
  addSub(subDef) {
    this.subs_.add(subDef.name);
    const subToThis = subDef.getParamsForAncestor(this.name);
    const thisToSub = subDef.params().map((param) => {
      const index = subToThis.findIndex((typeStruct) =>
        typeStruct.name == param.name);
      if (index == -1) {
        return null;
      }
      return new TypeStructure(this.getParamForIndex(index).name);
    });
    this.descendantParamsMap_.set(subDef.name, thisToSub);
  }

  /**
   * Adds the given type to the list of ancestors of this type.
   * @param {string} ancestorName The caseless name of the type to add to the
   *     list of ancestors of this type.
   * @param {!TypeDef} superType The superType that we get this ancestor from.
   */
  addAncestor(ancestorName, superType) {
    this.ancestors_.add(ancestorName);
    const superToAncestor = superType.getParamsForAncestor(ancestorName);
    const thisToSuper = this.getParamsForAncestor(superType.name);
    const thisToAncestor = [];
    superToAncestor.forEach((typeStruct) => {
      if (isGeneric(typeStruct.name)) {
        thisToAncestor.push(
            thisToSuper[superType.getIndexOfParam(typeStruct.name)]);
      } else {
        thisToAncestor.push(typeStruct);
      }
    });
    this.ancestorParamsMap_.set(ancestorName, thisToAncestor);
  }

  /**
   * Adds the given type to the list of descendants of this type.
   * @param {string} descendantName The caseless name of the type to add to the
   *     list of descendants of this type.
   * @param {!TypeDef} subType The subtype that we get this descendant from.
   */
  addDescendant(descendantName, subType) {
    this.descendants_.add(descendantName);
    const subToDescendant = subType.getParamsForDescendant(descendantName);
    const thisToSub = this.getParamsForDescendant(subType.name);
    const thisToDescendant = [];
    subToDescendant.forEach((typeStruct) => {
      if (!typeStruct) {
        thisToDescendant.push(null);
      } else {
        thisToDescendant.push(
            thisToSub[subType.getIndexOfParam(typeStruct.name)]);
      }
    });
    this.descendantParamsMap_.set(descendantName, thisToDescendant);
  }

  /**
   * Adds the given parameter info to the list of parameters of this type.
   * @param {string} paramName The caseless name of the parameter.
   * @param {!Variance} variance The variance of the parameter.
   * @param {number=} index The index to insert the parameter at. If undefined,
   *     the parameter will be added at the end.
   */
  addParam(paramName, variance, index = undefined) {
    const param = new ParamDef(paramName, variance);
    if (index != undefined) {
      this.params_.splice(index, param);
    } else {
      this.params_.push(param);
    }
  }

  /**
   * Returns a new array of all types that are direct supertypes of this type.
   * @return {!Array<string>} A new set of all types that are direct supertypes
   *     of this type.
   */
  supers() {
    return [...this.supers_];
  }

  /**
   * Returns true if this type has any direct supertypes. False otherwise.
   * @return {boolean} True if this type has any supertypes. False otherwise.
   */
  hasSupers() {
    return !!this.supers_.size;
  }

  /**
   * Returns true if this type has a direct supertype with the given name.
   * False otherwise.
   * @param {string} superName The caseless name of the possible direct super
   *     type.
   * @return {boolean} True if this type has a direct supertype with the given
   *     name. False otherwise.
   */
  hasDirectSuper(superName) {
    return this.supers_.has(superName);
  }

  /**
   * Returns a new set of all types that are direct subtypes of this type.
   * @return {!Array<string>} A new set of all types that are direct subtypes of
   *     this type.
   */
  subs() {
    return [...this.subs_];
  }

  /**
   * Returns true if this type has any direct subtypes. False otherwise.
   * @return {boolean} True if this type has any subtypes. False otherwise.
   */
  hasSubs() {
    return !!this.subs_.size;
  }

  /**
   * Returns true if this type has a direct subtype with the given name. False
   * otherwise.
   * @param {string} subName The caseless name of the possible direct subtype.
   * @return {boolean} True if this type has a direct subtype with the given
   *     name. False otherwise.
   */
  hasDirectSub(subName) {
    return this.subs_.has(subName);
  }

  /**
   * Returns a new set of all types that are ancestors of this type.
   * @return {!Array<string>} A new set of all types that are ancestors of this
   *     type.
   */
  ancestors() {
    return [...this.ancestors_];
  }

  /**
   * Returns true if this type has any ancestors. False otherwise.
   * @return {boolean} True if this type has any ancestors. False otherwise.
   */
  hasAncestors() {
    return !!this.ancestors_.size;
  }

  /**
   * Returns true if this type has an ancestor with the given name. False
   * otherwise.
   * @param {string} ancestorName The caseless name of the possible ancestor.
   * @return {boolean} True if this type has an ancestor with the given name.
   *     False otherwise.
   */
  hasAncestor(ancestorName) {
    return this.ancestors_.has(ancestorName);
  }

  /**
   * Returns a new set of all types that are descendants of this type.
   * @return {!Array<string>} A new set of all types that are descendants of
   *     this type.
   */
  descendants() {
    return [...this.descendants_];
  }

  /**
   * Returns true if this type has any descendants. False otherwise.
   * @return {boolean} True if this type has any descendants. False otherwise.
   */
  hasDescedants() {
    return !!this.descendants_.size;
  }

  /**
   * Returns true if this type has a descendant with the given name. False
   * otherwise.
   * @param {string} descendantName The caseless name of the possible
   *     descendant.
   * @return {boolean} True if this type has a descendant with the given name.
   *     False otherwise.
   */
  hasDescendant(descendantName) {
    return this.descendants_.has(descendantName);
  }

  /**
   * Returns a new set of all the parameter definitions of this type.
   * @return {!Array<ParamDef>} A new set of all the parameter definitions of
   *     this type.
   */
  params() {
    return [...this.params_];
  }

  /**
   * Returns an array of this type's parameters, in the order for its superType.
   * @param {string} ancestorName The caseless name of the ancestor to get the
   *     parameters for.
   * @param {!Array<!TypeStructure>=} actualTypes Optional actual types to
   *     substitute for parameters. These types may be generic.
   * @return {!Array<!TypeStructure>} This type's parameters, in the order for
   *     its superType.
   */
  getParamsForAncestor(ancestorName, actualTypes = undefined) {
    return /** @type{!Array<!TypeStructure>} */ (this.getParamsFor_(
        this.ancestorParamsMap_, ancestorName, actualTypes));
  }

  /**
   * Returns an array of this type's parameters, in the order for its subType.
   * If one of the parameters for the subtype does not have a proper mapping
   * in the supertype, the TypeStructure at that index is set to null.
   * @param {string} descendantName The caseless name of the descendant to get
   *     the parameters for.
   * @param {!Array<!TypeStructure>=} actualTypes Optional actual types to
   *     substitute for parameters. These types may be generic.
   * @return {!Array<TypeStructure>} This type's parameters, in the order for
   *     its subType.
   */
  getParamsForDescendant(descendantName, actualTypes = undefined) {
    return this.getParamsFor_(
        this.descendantParamsMap_, descendantName, actualTypes);
  }

  /**
   * Returns an array of this type's parameters, in the order for the given
   * type.
   * @param {!Map<string, !Array<TypeStructure>>} paramsMap The map mapping this
   *     type's params to the params of other types.
   * @param {string} typeName The name of the type to get the parameters in the
   *     order of.
   * @param {!Array<!TypeStructure>=} actualTypes Optional actual types to
   *     substitute for parameters. These types may be generic.
   * @return {!Array<TypeStructure>} This type's parameters, in the order of the
   *     other type.
   * @private
   */
  getParamsFor_(paramsMap, typeName, actualTypes = undefined) {
    if (typeName == this.name && !paramsMap.has(this.name)) {
      // Convert this type's params to a type structure.
      paramsMap.set(
          this.name,
          this.params_.map((param) => {
            return new TypeStructure(param.name);
          }));
    }
    if (!paramsMap.has(typeName)) {
      console.trace('skipping', typeName);
      return [];
    }

    // Deep copy structure so that we don't have to worry about corruption.
    const params = paramsMap.get(typeName)
        .map((param) => param ? parseType(structureToString(param)) : null);
    if (actualTypes) {
      const replaceFn = (param, i, array) => {
        if (!param) {
          return;
        }
        const paramIndex = this.getIndexOfParam(param.name);
        if (paramIndex != -1) {
          array[i] = actualTypes[paramIndex];
        } else {
          param.params.forEach(replaceFn, this);
        }
      };
      params.forEach(replaceFn, this);
    }
    return params;
  }

  /**
   * Returns true if this type has any parameters. False otherwise.
   * @return {boolean} True if this type has any parameters. False otherwise.
   */
  hasParameters() {
    return !!this.params_.length;
  }

  /**
   * Returns true if this type has a parameter with the given name.
   * False otherwise.
   * @param {string} paramName The caseless name of the possible parameter.
   * @return {boolean} True if this type has a parameter with the given name.
   *     False otherwise.
   */
  hasParameter(paramName) {
    return this.params_.some((param) => param.name == paramName);
  }

  /**
   * Returns the index of the parameter with the given name, or -1 if the
   * parameter does not exist..
   * @param {string} paramName The name of the parameter.
   * @return {number} The index of hte parameter.
   */
  getIndexOfParam(paramName) {
    return this.params_.findIndex((param) => param.name == paramName);
  }

  /**
   * Returns the parameter definition for the parameter at the given index.
   * @param {number} index The index to get the parameter definition of.
   * @return {!ParamDef} The parameter definition for the parameter at the
   *     given index.
   */
  getParamForIndex(index) {
    return this.params_[index];
  }

  /**
   * Returns the ParamDef with the given name, or undefined if not found.
   * @param {string} paramName The name of the parameter to find the
   *     ParamDef of.
   * @return {!ParamDef|undefined} The parameter with the given name, or
   *     undefined if not found.
   */
  getParamWithName(paramName) {
    return this.params_.find((param) => param.name == paramName);
  }
}

/**
 * Represents different parameter variances.
 * @enum {string}
 */
export const Variance = {
  CO: 'covariant',
  CONTRA: 'contravariant',
  INV: 'invariant',
};

/**
 * Converts a variance string to an actual variance.
 * @param {string} str The string to convert to a variance.
 * @return {!Variance} The converted variance value.
 */
export function stringToVariance(str) {
  str = str.toLowerCase();
  if (str.startsWith('inv')) {
    return Variance.INV;
  } else if (str.startsWith('contra')) {
    return Variance.CONTRA;
  } else if (str.startsWith('co')) {
    return Variance.CO;
  } else {
    throw new VarianceError('The variance "' + str + '" is not a valid ' +
        'variance. Valid variances are: "co", "contra", and "inv".');
  }
}

/**
 * Represents an error related to variances.
 */
export class VarianceError extends Error {
  /**
   * Constructs a VarianceError.
   * @param {string} message The message that goes with this error.
   */
  constructor(message) {
    super(message);

    this.name = this.constructor.name;
  }
}

/**
 * Represents a type parameter.
 */
class ParamDef {
  /**
   * Constructs the type parameter given its name and variance.
   * @param {string} name The caseless name of the type parameter.
   * @param {!Variance} variance The variance of the type parameter.
   */
  constructor(name, variance) {
    /**
     * The caseless name of this type parameter.
     * @type {string}
     */
    this.name = name;

    /**
     * The variance of this type parameter.
     * @type {!Variance}
     */
    this.variance = variance;
  }
}

/**
 * Represents an error where the number of params on an actual type does not
 * match the number of types expected by the type definition.
 */
export class ActualParamsCountError extends Error {
  /**
   * Constructs an ActualParamsCountError.
   * @param {string} type The type the parameters are associated with.
   * @param {number} actualCount The number of parameters that were given.
   * @param {number} expectedCount The number of parameters that were expected,
   *     as defined by the type hierarchy definition.
   */
  constructor(type, actualCount, expectedCount) {
    super('The number of parameters to ' + type + ' did not match the ' +
        'expected number of parameters (as defined in the type hierarchy). ' +
        'Expected: ' + expectedCount + ', Actual: ', actualCount);

    /**
     * The type the parameters were associated with.
     * @type {string}
     */
    this.type = type;

    /**
     * The number of parameters that were given.
     * @type {number}
     */
    this.actualCount = actualCount;

    /**
     * The number of parameters that were expected.
     * @type {number}
     */
    this.expectedCount = expectedCount;

    this.name = this.constructor.name;
  }
}
