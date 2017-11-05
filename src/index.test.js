const {
  fromArray,
  hot,
  map,
  cold,
  flatMap,
  identity,
  fluent,
  chain,
  filter,
  coldFluent
} = require("./");

const mockObserver = expectedItems => {
  let index = 0;
  const mock = {
    complete: expectedItems.length === 0,
    observer: item => {
      if (index >= expectedItems.length)
        throw new Error("too much invocations");
      expect(item).toEqual(expectedItems[index]);
      if (index === expectedItems.length - 1) {
        mock.complete = true;
        index++;
        return mock.observer;
      } else {
        index++;
        return mock.observer;
      }
    }
  };
  return mock;
};

test("fromArray", () => {
  const mock = mockObserver([1, 2, 3]);
  fromArray([1, 2, 3])(mock.observer);
  expect(mock.complete).toBe(true);
});

describe("hot", () => {
  test("map", () => {
    const hotObservable = hot(map(x => [x, x]));
    hotObservable.publish("event1");
    const mock = mockObserver([["event2", "event2"], ["event3", "event3"]]);
    hotObservable.subscribe(mock.observer);
    hotObservable.publish("event2");
    hotObservable.publish("event3");
    expect(mock.complete).toBe(true);
  });
});

describe("cold", () => {
  test("flatMap", () => {
    const coldObservable = cold(flatMap(x => fromArray([x, x])));
    coldObservable.publish("event1");
    const mock = mockObserver(["event1", "event1", "event2", "event2"]);
    coldObservable.subscribe(mock.observer);
    coldObservable.publish("event2");
    expect(mock.complete).toBe(true);
  });
});

test("connecting stateful", () => {
  const subject = cold();
  const adder = cold(map(x => x + 1));
  const doubler = cold(map(x => x * 2));
  subject.subscribe(adder.publish);
  subject.subscribe(doubler.publish);
  const result = cold();
  adder.subscribe(result.publish);
  doubler.subscribe(result.publish);
  const mock = mockObserver([2, 2, 3, 4, 4, 6]);
  result.subscribe(mock.observer);
  fromArray([1, 2, 3])(subject.publish);
  expect(mock.complete).toBe(true);
});

test("fluent", () => {
  const observable = fluent(fromArray([7, 8, 9]))
    .map(x => x + 1)
    .pipe(filter(x => x % 2 === 0))
    .flatMap(x => fromArray([x, x + 1, x * 2]))
    .scan(m => x => m + x)(-74).observable;
  const mock = mockObserver([-66, -57, -41, -31, -20, 0]);
  observable(mock.observer);
  expect(mock.complete).toBe(true);
});

test("chain", () => {
  const operator = chain()
    .pipe(map(x => x + 1))
    .filter(x => x % 2 === 0)
    .flatMap(x => fromArray([x, x + 1, x * 2]))
    .scan(m => x => m + x)(-74).operator;
  const mock = mockObserver([-66, -57, -41, -31, -20, 0]);
  operator(fromArray([7, 8, 9]))(mock.observer);
  expect(mock.complete).toBe(true);
});

test("stateful fluent", () => {
  const observable = coldFluent()
    .map(x => x + 1)
    .filter(x => x % 2 === 0)
    .pipe(flatMap(x => fromArray([x, x + 1, x * 2])))
    .scan(m => x => m + x)(-74);
  fromArray([7, 8, 9])(observable.publish);
  const mock = mockObserver([-66, -57, -41, -31, -20, 0]);
  observable.subscribe(mock.observer);
  expect(mock.complete).toBe(true);
});
