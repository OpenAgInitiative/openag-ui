import {Effects, Task} from 'reflex';
import {merge} from '../common/prelude';
import {constant} from '../lang/functional';
import * as Unknown from '../common/unknown';

// Useful constants
const seconds = 1000;
const minutes = seconds * 60;
const MAX_DELAY = 10 * minutes;

// Actions and effects

export const Schedule = delay => ({
  type: 'Schedule',
  delay
});

export const Ping = {
  type: 'Ping'
};

export const Pong = {
  type: 'Pong'
};

export const Miss = {
  type: 'Miss'
};

// Send an action as an effect after a delay.
export const schedule = (action, time) =>
  Effects.perform(Task.sleep(time)).map(constant(action));

export const calcDelay = (delay, misses) =>
  Math.min(delay + (delay * misses), MAX_DELAY);

export const init = (timeout) => [
  {
    timeout,
    misses: 0
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Schedule' ?
  [model, schedule(Ping, action.delay)] :
  action.type === 'Miss' ?
  [
    merge(model, {
      misses: model.misses + 1
    }),
    Effects.receive(Schedule(calcDelay(model.timeout, model.misses)))
  ] :
  action.type === 'Pong' ?
  [
    merge(model, {
      misses: 0
    }),
    Effects.receive(Schedule(calcDelay(model.timeout, model.misses)))
  ] :
  action.type === 'Ping' ?
  [model, Effects.none] :
  Unknown.update(model, action);
