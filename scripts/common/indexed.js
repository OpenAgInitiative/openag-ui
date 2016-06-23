/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {forward, thunk, Effects} from 'reflex';
import {identity} from '../lang/functional';
import {merge} from '../common/prelude';
import {constant} from '../lang/functional';
import * as Unknown from '../common/unknown';

// Build an index object from an array.
// Returns a new index object.
export const indexWith = (array, mapKey, mapValue) => {
  const index = {};
  for (let object of array) {
    // Derive key using `mapKey`, then use it to assign value derived from
    // `mapValue`.
    index[mapKey(object)] = mapValue(object);
  }
  return index;
}

// Create a "getter" function that will get a particular key for an object.
export const getter = key => object => object[key];

export const getID = getter('id');

export const indexByID = array => indexWith(array, getID, identity);
export const orderByID = array => array.map(getID);

export const getByIndex = (model, i) => model.entries[model.order[i]];
export const getActive = (model) => model.entries[model.active];

// Create indexed model
export const create = (models, active) => ({
  active,
  // Build an array of ordered recipe IDs
  order: orderByID(models),
  // Index all recipes by ID
  entries: indexByID(models)
});

export const init = (active) => [
  create([], active),
  Effects.none
];

// Add a new indexed entry to model
export const add = (model, id, entry) =>
  merge(model, {
    // Prepend new recipe id
    order: [id, ...model.order],
    entries: merge(model.entries, {
      [id]: entry
    })
  });

// Given a view function and an action tagging factory function, will return
// a view that will list out all sub-views.
export const children = (view, tagByID) => (model, address) =>
  model.order.map(id => thunk(
    id,
    view,
    model.entries[id],
    forward(address, tagBy(id), model.id === model.active)
  ));

export const Activate = id => ({
  type: 'Activate',
  id
});

export const Reset = entries => ({
  type: 'Reset',
  entries
});

// An action representing "no further action".
export const NoOp = {
  type: 'NoOp'
};

const AlwaysNoOp = constant(NoOp);

// @TODO handle other common indexed actions.
export const update = (model, action) =>
  action.type === 'NoOp' ?
  [model, action] :
  action.type === 'Activate' ?
  [merge(model, {active: action.id}), Effects.none] :
  action.type === 'Reset' ?
  [create(action.entries, model.active), Effects.none] :
  Unknown.update(model, action);

// Create an updateById function
export const updateWithID = (update, tag, model, id, action) => {
  if (model.order.indexOf(id) < 0) {
    return [
      model,
      // @TODO can we handle this case in a way that doesn't require
      // the modul to implement noop?
      Effects
        .task(Unknown.error(`model with id: ${id} is not found`))
        .map(AlwaysNoOp)
    ];
  }
  else {
    const [entry, fx] = update(model.entries[id], action);
    return [
      merge(model, {entries: merge(model.entries, {[id]: entry})}),
      fx.map(tag)
    ];
  }
}
