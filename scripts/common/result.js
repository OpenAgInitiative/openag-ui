/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
Original source can be found at:
https://github.com/browserhtml/browserhtml/blob/master/src/common/result.js
*/

/*::
import type {Result, Ok, Error} from "./result"
export type {Result, Ok, Error}
*/

export const ok = /*::<value>*/
  (value/*:value*/)/*:Ok<value>*/ =>
  ( { isOk: true
    , isError: false
    , value
    }
  );

export const error = /*::<error>*/
  (error/*:error*/)/*:Error<error>*/ =>
  ( { isOk: false
    , isError: true
    , error
    }
  );

// Given an ok and error update function,
// create an update function for results that will unbox the value.
export const updater = (ok, error) => (model, result) =>
  result.isOk ?
  ok(model, result.value) :
  error(model, result.error);
