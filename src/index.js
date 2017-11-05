// alternative observables, knowledge about Observables implemetation is required (ex: RxJs)
// this is fully type-annoteable (typescript, flowtype)

// An observer is a function that takes an item from the stream
// and must return a function that will be called with the next item in the stream
// this way stateful observers can mantain state in clojures and every instance of them if replayable.
// observers should not have side effects

// type Observer<T> = (item: T) => Observer<T>

// example:
// log :: number => Observer<T>
const logCount = step => item => {
  console.log(step, item);
  return logCount(step + 1);
};

// An observable is a function that takes an observer
// and calls it, retaining state when necessary

// type Observable<T> = (observer: Observer<T>) => Observer<T>

// example:
// from1to3 :: Observable<number>
const from1to3 = observer => observer(1)(2)(3);
// fromArray :: Array<T> => Observable<T>
const fromArray = array => observer =>
  array.reduce((memo, item) => memo(item), observer);

const mockObserver = expected => item => {
  expect(item).toEqual(expected[0]);
  return mockObserver(expected.slice(1));
};

// subscribing to an observable is a simple function call
// fromArray([1,2,3])(logCount(0))

// a very useful operator over observables is map
// that takes an observable A, an function F
// and return a new observable B whose items are the return of F
// map :: (A => B) => Observable<A> => Observable<B>
const map = fun => observable => observer => {
  const callout = observer => item => callout(observer(fun(item)));
  return observable(callout(observer));
};

//map(x=>x*100)(fromArray([1,2,3]))(logCount(0))
//map(x=>x/2)(map(x=>x*100)(fromArray([1,2,3])))(logCount(0))

// works well with composition
const pipe = (...args) => arg => args.reduce((memo, item) => item(memo), arg);
// pipe(map(x=>x*100), map(x=>x/2))(fromArray([1,2,3]))(logCount(0))

// filter :: (A => boolean) => Observable<A> => Observable<A>
const filter = predicate => observable => observer => {
  const callout = observer => item =>
    predicate(item) ? callout(observer(item)) : callout(observer);
  return observable(callout(observer));
};

// const isEven = n => n % 2 === 0;
// pipe(filter(isEven), map(x=>x*2))(fromArray([1,2,3,4]))(logCount(0))

// flatMap :: (A => Observable<B>) => Observable<A> => Observable<B>
const flatMap = fun => observable => observer => {
  const callout = observer => item => callout(fun(item)(observer));
  return observable(callout(observer));
};

// flatMap(n => fromArray([n, n]))(fromArray([1,2,3]))(logCount(0))

// scan :: (M => A => M) => M => Observable<A> => Observable<M>
// the reducer cannot maintain internal state by returning next action,
// instead it receives previous result as first argument and the actual item as second
const scan = reducer => memo => observable => observer => {
  const callout = observer => memo => item => {
    const next = reducer(memo)(item);
    return callout(observer(next))(next);
  };
  return observable(callout(observer)(memo));
};

const sum = m => x => m + x;
// scan(sum)(0)(fromArray([10,20,30]))(logCount(0))

// memoize :: Observable<T> => Observable<T>
const memoize = observable => {
  const cache = [];
  const callout = item => {
    cache.push(item);
    return callout;
  };
  observable(callout);
  return observer => cache.reduce((memo, item) => memo(item), observer);
};

// const rangeAndLog = observer => {
//   ["a", "b", "c"].reduce((memo, item) => {
//     console.log(item);
//     return memo(item);
//   }, observer);
// };
//const memoized = memoize(rangeAndLog);

// map(x=>x+" - cold")(rangeAndLog)(logCount(0));
// map(x=>x+" - memoized")(memoized)(logCount(0));

// fluent is a decorator that enables fluent usage of the api
const fluent = observable => {
  const decorate0 = operator => fluent(operator(observable));
  const decorate1 = operator => arg => fluent(operator(arg)(observable));
  const decorate2 = operator => arg => arg2 =>
    fluent(operator(arg)(arg2)(observable));
  return {
    observable,
    map: decorate1(map),
    filter: decorate1(filter),
    flatMap: decorate1(flatMap),
    scan: decorate2(scan),
    memoize: decorate0(memoize),
    pipe: decorate0
  };
};

// fluent(fromArray([1,2,3,4])).subscribe(logCount)
// fluent(fromArray([7, 8, 9]))
//   .map(x => x + 1)
//   .filter(isEven)
//   .flatMap(x => fromArray([x, x + 1, x * 2]))
//   .memoize()
//   .scan(sum)(-74);
//.observable(logCount(0))

const identity = x => x;

// once :: T => Observable<T>
const once = item => observer => observer(item);

const applyTo = arg => fun => fun(arg);

// creates a "hot" stateful observer (observers receive items from after subscription)
const hot = (operator = identity) => {
  let observers = [];
  const decorate = operator(identity);
  const publish = item => {
    observers = observers.map(applyTo(item));
    return publish;
  };
  const subscribe = observer => {
    observers.push(decorate(observer));
  };
  return { publish, subscribe };
};

// creates a "cold" stateful observer (observers receives items from before subscription)
const cold = (operator = identity) => {
  let observers = [];
  const items = [];
  const decorate = operator(identity);
  const publish = item => {
    items.push(item);
    observers = observers.map(applyTo(item));
    return publish;
  };
  const subscribe = observer => {
    observers.push(fromArray(items)(decorate(observer)));
  };
  return { publish, subscribe };
};

const chain = (operator = map(identity)) => {
  const decorate0 = operatorFactory => chain(pipe(operator, operatorFactory));
  const decorate1 = operatorFactory => arg =>
    chain(pipe(operator, operatorFactory(arg)));
  const decorate2 = operatorFactory => arg => arg2 =>
    chain(pipe(operator, operatorFactory(arg)(arg2)));
  return {
    operator,
    map: decorate1(map),
    filter: decorate1(filter),
    flatMap: decorate1(flatMap),
    scan: decorate2(scan),
    memoize: decorate0(memoize),
    pipe: decorate0
  };
};

const fluentStateful = cons => (operator = map(identity)) => {
  const { publish, subscribe } = cons(operator);
  const decorate0 = operatorFactory => {
    const decorated = fluentStateful(cons)(pipe(operator, operatorFactory));
    subscribe(decorated.publish);
    return decorated;
  };
  const decorate1 = operatorFactory => arg => {
    const decorated = fluentStateful(cons)(
      pipe(operator, operatorFactory(arg))
    );
    subscribe(decorated.publish);
    return decorated;
  };
  const decorate2 = operatorFactory => arg => arg2 => {
    const decorated = fluentStateful(cons)(
      pipe(operator, operatorFactory(arg)(arg2))
    );
    subscribe(decorated.publish);
    return decorated;
  };
  return {
    publish,
    subscribe,
    map: decorate1(map),
    filter: decorate1(filter),
    flatMap: decorate1(flatMap),
    scan: decorate2(scan),
    memoize: decorate0(memoize),
    pipe: decorate0
  };
};

// const createFluentOperators = (...decorate) => ({
//   map: decorate[1](map),
//   filter: decorate[1](filter),
//   flatMap: decorate[1](flatMap),
//   scan: decorate[2](scan),
//   memoize: decorate[0](memoize),
//   pipe: decorate[0]
// })

module.exports = {
  fromArray,
  pipe,
  fluent,
  chain,
  hot,
  cold,
  once,
  identity,
  map,
  filter,
  flatMap,
  scan,
  memoize,
  hotFluent: fluentStateful(hot),
  coldFluent: fluentStateful(cold)
};
