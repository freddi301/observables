// @flow

import type { Transducer } from "./";

declare function pipe<A, B, C>(f: (A) => B, g: (B) => C): A => C;
declare function pipe<A, B, C>(
  f: Transducer<A, B>,
  g: Transducer<B, C>
): Transducer<A, C>;
// $FlowFixMe
export const pipe = (...args) => arg =>
  args.reduce((memo, item) => item(memo), arg);
