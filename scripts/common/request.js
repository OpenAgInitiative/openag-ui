import 'whatwg-fetch';
import {Effects, Task} from 'reflex';
import * as Result from '../common/result';
import {compose} from '../lang/functional';
import {tag} from '../common/prelude';

// Read a Response object to JSON.
// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
const readResponseJSON = response => response.json();

const getFetch = url => {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  const request = new Request(url, {
    method: 'GET',
    headers
  });
  return fetch(request).then(readResponseJSON);
}

const postFetch = (url, body) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  const request = new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return fetch(request).then(readResponseJSON);
}

export const Get = url => ({
  type: 'Get',
  url
});

export const Got = tag('Got');

// Returns a get effect
export const get = url => Effects.perform(new Task((succeed, fail) => {
  getFetch(url).then(Result.ok, Result.error).then(succeed);
}));

export const Post = url => ({
  type: 'Post',
  url
});

// Apologies for the silly name
export const Posted = result => ({
  type: 'Posted',
  result
});

const PostEffect = (url, body) =>
  Effects.perform(new Task((succeed, fail) => {
    const ok = compose(succeed, Posted, Result.ok);
    const error = compose(succeed, Posted, Result.error);
    postFetch(url, body).then(ok, error);
  }));

export const post = (model, url, body) => [
  model,
  PostEffect(url, body)
];
