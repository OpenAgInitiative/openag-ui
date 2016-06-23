import * as Config from '../openag-config.json';
import PouchDB from 'pouchdb';
import {html, forward, Effects, thunk} from 'reflex';
import {merge, tagged, tag, batch} from './common/prelude';
import * as ClassName from './common/classname';
import * as Template from './common/stache';
import {cursor} from './common/cursor';
import * as Result from './common/result';
import * as Request from './common/request';
import * as Indexed from './common/indexed';
import * as Unknown from './common/unknown';
import * as Poll from './common/poll';
import {compose} from './lang/functional';
import * as Environments from './environmental-data-point/environments';
import * as CurrentRecipe from './environmental-data-point/recipe';
// @TODO do proper localization
import * as LANG from './environmental-data-point/lang';

const ORIGIN_LATEST = Template.render(
  Config.environmental_data_point_origin_latest,
  {
    origin_url: Config.origin_url
  }
);

const seconds = 1000;
const POLL_TIMEOUT = 2 * seconds;

// Actions and action tagging functions

const EnvironmentsAction = tag('Environments');
const RestoreEnvironments = compose(EnvironmentsAction, Environments.Restore);

const PollAction = action =>
  action.type === 'Ping' ?
  GetLatest :
  tagged('Poll', action);

const PongPoll = PollAction(Poll.Pong);
const MissPoll = PollAction(Poll.Miss);

const Got = Request.Got;
const GetLatest = Request.Get(ORIGIN_LATEST);

// Init and update

export const init = () => {
  const [poll, pollFx] = Poll.init(POLL_TIMEOUT);
  const [environments, environmentsFx] = Environments.init();

  return [
    {
      environments,
      poll,
    },
    Effects.batch([
      environmentsFx.map(EnvironmentsAction)
    ])
  ];
};

const updatePoll = cursor({
  get: model => model.poll,
  set: (model, poll) => merge(model, {poll}),
  update: Poll.update,
  tag: PollAction
});

const updateEnvironments = cursor({
  get: model => model.environments,
  set: (model, environments) => merge(model, {environments}),
  update: Environments.update,
  tag: EnvironmentsAction
});

const readDataPointFromRow = row => row.value;
const readDataPoints = (record, predicate) =>
  record.rows
    .map(readDataPointFromRow)
    .filter(predicate);

// Read most recent data point from record set.
// Filter by predicate. Get most recent.
// Returns most recent data point matching predicate or null.
const readDataPoint = (record, predicate) =>
  readDataPoints(record, predicate).shift();

const readRecipeStartData = ({value, timestamp}) => ({
  id: value,
  startTime: timestamp
});

const got = Result.updater(
  (model, record) => batch(update, model, [
    RestoreEnvironments(record),
    PongPoll
  ]),
  (model, error) => update(model, MissPoll)
);

// Is the problem that I'm not mapping the returned effect?
export const update = (model, action) =>
  action.type === 'Environments' ?
  updateEnvironments(model, action.source) :
  action.type === 'Poll' ?
  updatePoll(model, action.source) :
  action.type === 'Get' ?
  [model, Request.get(action.url).map(Got)] :
  action.type === 'Got' ?
  got(model, action.source) :
  Unknown.update(model, action);

export const view = (model, address) =>
  Environments.view(model.environments, forward(address, EnvironmentsAction));
