// @flow

import { pipe } from "./utils";

type Reducer<S, T> = (S, T) => S;

type Reducible<T> = <S>(Reducer<S, T>, S) => S;

type Transducer<A, B> = (Reducible<A>) => Reducible<B>;

const from1to3: Reducible<number> = <S>(
  reducer: Reducer<S, number>,
  state: S
): S => reducer(reducer(reducer(state, 1), 2), 3);

export const fromArray = <T>(array: Array<T>): Reducible<T> => <S>(
  reducer: Reducer<S, T>,
  state: S
): S => array.reduce((memo: S, item: T) => reducer(memo, item), state);

export const map = <A, B>(fun: A => B): Transducer<A, B> => (
  reducible: Reducible<A>
) => <S>(reducer: Reducer<S, B>, state: S): S =>
  reducible((state: S, value: A) => reducer(state, fun(value)), state);

export const filter = <T>(predicate: T => boolean): Transducer<T, T> => (
  reducible: Reducible<T>
) => <S>(reducer: Reducer<S, T>, state: S): S =>
  reducible(
    (state: S, value: T) => (predicate(value) ? reducer(state, value) : state),
    state
  );

export const flatMap = <A, B>(fun: A => Reducible<B>): Transducer<A, B> => (
  reducible: Reducible<A>
) => <S>(reducer: Reducer<S, B>, state: S): S =>
  reducible((state: S, value: A) => fun(value)(reducer, state), state);

export const scan = <M, T>(fun: (M, T) => M, memo: M): Transducer<T, M> => (
  reducible: Reducible<T>
) => <S>(reducer: Reducer<S, M>, state: S): S =>
  reducible((state: S, value: T) => reducer(state, fun(memo, value)), state);