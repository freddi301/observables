// @flow

export const identity = <T>(x: T): T => x;

declare function compose<A, B, C>(f: (B) => C, g: (A) => B): A => C;

// $FlowFixMe
export const compose = (...args) => {
  const funs = args.reverse();
  return arg => funs.reduce((memo, item) => item(memo), arg);
};

declare function pipe<A, B, C>(f: (A) => B, g: (B) => C): A => C;
// $FlowFixMe
export const pipe = (...args) => arg =>
  args.reverse().reduce((memo, item) => item(memo), arg);
