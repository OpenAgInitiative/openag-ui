import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from '../common/prelude';
import * as Indexed from '../common/indexed';
import * as Unknown from '../common/unknown';
import {cursor} from '../common/cursor';
import {compose} from '../lang/functional';
import * as Environment from '../environmental-data-point/environment';

// Actions and tagging functions

export const Restore = value => ({
  type: 'Restore',
  value
});

const IndexedAction = tag('Indexed');
const AddIndexed = compose(IndexedAction, Indexed.Add);

// Address a specific environment by id.
export const EnvironmentByID = (id, source) => ({
  type: 'EnvironmentByID',
  id,
  source
});

// Tag actions by id
// @TODO figure out how to generalize this.
const ByID = id => action => EnvironmentByID(id, action);

const AddDataPoint = value => ({
  type: 'AddDataPoint',
  value
});

const CreateEnvironment = id => ({
  type: 'CreateEnvironment',
  id
});

const AddDataPointByID = (id, dataPoint) =>
  EnvironmentByID(id, Environment.AddDataPoint(dataPoint));

// Model init and update functions

export const init = Indexed.init;

const updateIndexed = cursor({
  get: model => model,
  set: (model, patch) => merge(model, patch),
  update: Indexed.update,
  tag: IndexedAction
});

const readRow = row => row.value;
const readRecord = record => record.rows.map(readRow);

const restore = (model, record) =>
  // Dispatch restore per id
  batch(update, model, readRecord(record).map(AddDataPoint));

const addDataPoint = (model, action) =>
  // If an environment exists, send datapoint to it.
  model.entries[action.value.environment] != null ?
  update(model, AddDataPointByID(action.value.environment, action.value)) :
  // Otherwise, create the environment, then send datapoint to it.
  batch(update, model, [
    CreateEnvironment(action.value.environment),
    AddDataPointByID(action.value.environment, action.value)
  ]);

const createEnvironment = (model, id) => {
  const [environment, environmentFx] = Environment.init();
  const next = Indexed.add(model, id, environment);
  return [
    next,
    environmentFx.map(ByID(environment))
  ];
}

const environmentByID = (model, id, action) =>
  // @TODO create environment if it doesn't exist already.
  Indexed.updateWithID(Environment.update, ByID(id), model, id, action);

export const update = (model, action) =>
  action.type === 'Indexed' ?
  updateIndexed(model, action) :
  action.type === 'EnvironmentByID' ?
  environmentByID(model, action.id, action.source) :
  action.type === 'AddDataPoint' ?
  addDataPoint(model, action) :
  action.type === 'CreateEnvironment' ?
  createEnvironment(model, action.id) :
  action.type === 'Restore' ?
  restore(model, action.value) :
  Unknown.update(model, action);
