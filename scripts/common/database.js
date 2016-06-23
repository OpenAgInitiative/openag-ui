// Effect/action wrappers for common PouchDb operations

import {Effects, Task} from 'reflex';
import * as Result from '../common/result';
import {compose, constant} from '../lang/functional';

export const Put = value => ({
  type: 'Put',
  value
})

// Apologies for the silly name
export const Putted = result => ({
  type: 'Putted',
  result
});

export const DoPut = (db, doc) =>
  Effects.perform(new Task((succeed, fail) => {
    const alwaysDoc = constant(doc);
    db
      .put(doc)
      .then(
          compose(succeed, Putted, Result.ok, alwaysDoc),
          compose(succeed, Putted, Result.error)
      );
  }));

export const put = (model, db, doc) =>
  [model, DoPut(db, doc)];

// Request a restore from database.
export const Restore = {
  type: 'Restore'
};

export const Restored = result => ({
  type: 'Restored',
  result
});

// Mapping functions to just get the docs from an allDocs response.
const readDocFromRow = row => row.doc;
const readDocs = database => database.rows.map(readDocFromRow);

// Request in-memory restore from DB
const DoRestore = db =>
  Effects.perform(new Task((succeed, fail) => {
    db
      .allDocs({include_docs: true})
      .then(
        compose(succeed, Restored, Result.ok, readDocs),
        compose(succeed, Restored, Result.error)
      );
  }));

export const restore = (model, db) =>
  [model, DoRestore(db)];

// Sync actions and effects
// See https://pouchdb.com/api.html#sync
// https://pouchdb.com/api.html#replication

// Request up-directional sync
export const Push = {
  type: 'Push'
};

export const Pushed = result => ({
  type: 'Pushed',
  result
});

const DoPush = (db, replica) =>
  Effects.perform(new Task((succeed, fail) => {
    // Pouch will throw an error from xhr if there is no internet connection.
    // @TODO find out why Pouch isn't catching these 404s within the promise.
    try {
      db
        .replicate.to(replica)
        .then(
          compose(succeed, Pushed, Result.ok),
          compose(succeed, Pushed, Result.error)
        );
    }
    catch (error) {
      succeed(Pushed(Result.error(error)));
    }
  }));

export const push = (model, db, replica) =>
  [model, DoPush(db, replica)];

// Request down-directional sync
export const Pull = {
  type: 'Pull'
};

export const Pulled = result => ({
  type: 'Pulled',
  result
});

const DoPull = (db, replica) =>
  Effects.perform(new Task((succeed, fail) => {
    db
      .replicate.from(replica)
      .then(
        compose(succeed, Pulled, Result.ok),
        compose(succeed, Pulled, Result.error)
      )
      .catch(compose(succeed, Pulled, Result.error));
  }));

export const pull = (model, db, replica) =>
  [model, DoPull(db, replica)];

// Request bi-directional sync
export const Sync = {
  type: 'Sync'
};

export const Synced = result => ({
  type: 'Synced',
  result
});

export const DoSync = (db, replica) =>
  Effects.perform(new Task((succeed, fail) => {
    try {
      db
        .sync(replica)
        .then(
          compose(succeed, Synced, Result.ok),
          compose(succeed, Synced, Result.error)
        );
    }
    catch (error) {
      succeed(Synced(Result.error(error)));
    }
  }));

export const sync = (model, db, replica) =>
  [model, DoSync(db, replica)];
