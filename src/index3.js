// @flow

import { compose, identity } from "./utils";

export type Reducer<Memo, Item> = (Memo, Item) => Memo;

export type Reducee<Item> = <Memo>(Reducer<Memo, Item>, Memo) => Memo;

export type Transducer<ItemA, ItemB> = <Memo>(
  Reducer<Memo, ItemB>
) => Reducer<Memo, ItemA>;

export const map = <ItemA, ItemB>(
  mapper: ItemA => ItemB
): Transducer<ItemA, ItemB> => <Memo>(
  reducer: Reducer<Memo, ItemB>
): Reducer<Memo, ItemA> => (memo, item) => reducer(memo, mapper(item));

export const filter = <Item>(
  predicate: Item => boolean
): Transducer<Item, Item> => <Memo>(
  reducer: Reducer<Memo, Item>
): Reducer<Memo, Item> => (memo, item) =>
  predicate(item) ? reducer(memo, item) : memo;

export const flatMap = <ItemA, ItemB>(
  mapper: ItemA => Reducee<ItemB>
): Transducer<ItemA, ItemB> => <Memo>(
  reducer: Reducer<Memo, ItemB>
): Reducer<Memo, ItemA> => (memo, item) => mapper(item)(reducer, memo);

export const scan = <Item, MemoItem>(
  scanner: Reducer<MemoItem, Item>,
  memoItem: MemoItem
): Transducer<Item, MemoItem> => <Memo>(
  reducer: Reducer<Memo, MemoItem>
): Reducer<Memo, Item> => {
  let scannee = memoItem; // TODO: fix for mutliple use of returned reducer
  return (memo, item) => {
    scannee = scanner(scannee, item);
    return reducer(memo, scannee);
  };
};

// TODO: optimize
export const flatten = <Item>(): Transducer<Reducee<Item>, Item> =>
  flatMap(identity);

export const once = <Item>(item: Item): Reducee<Item> => <Memo>(
  reducer: Reducer<Memo, Item>,
  memo: Memo
): Memo => reducer(memo, item);

export const fromIterable = <Item>(
  iterable: Iterable<Item>
): Reducee<Item> => <Memo>(
  reducer: Reducer<Memo, Item>,
  memo: Memo
): Memo => {
  for (const item of iterable) {
    memo = reducer(memo, item);
  }
  return memo;
};

// TODO: optimize
export const toIterable = <Item>(): Reducer<Iterable<Item>, Item> => (
  memo,
  item
) => Array.from(memo).concat([item]);

export const promise = <Memo, Item>(
  reducer: Reducer<Memo, Item>
): Reducer<Promise<Memo>, Item> => async (memo, item) => reducer(await memo, item);

/*
  TODO:
  http://cognitect-labs.github.io/transducers-js/classes/transducers.html
  drop(n)
  dropWhile(predicate)
  first()
  keep(predicate)
  mapCat
  pertition, all, by
  remove(predicate)
  take(n)
  takeNth
  takeWhile
  https://github.com/jlongster/transducers.js
  dedupe
  implement rxjs
*/
