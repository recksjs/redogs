# Redogs

Redux-like store with RxJS Observable output and effects

```
npm i redogs
```

## Basic usage

```js
import { createStandardAction, createStore, getType, isActionOf } from 'redogs';
import { filter, map, tap, withLatestFrom } from 'rxjs/operators';

// create reusable action creators
const incrementAction = createStandardAction('INCREMENT')<void>();
const decrementAction = createStandardAction('DECREMENT')<void>();
const resetAction     = createStandardAction('RESET')<number>();

// create a store
const store = createStore(reducer, effect);

// listen to the state updates
store.state$.subscribe(state => {
    console.log(state);
});

// dispatch actions
store.dispatch(incrementAction());
store.dispatch(incrementAction());
store.dispatch(decrementAction());
store.dispatch(resetAction(42));

// A reducer
function reducer(action, state = 0) {
    switch (action.type) {
        case (getType(incrementAction)): {
            return state + 1;
        }
        case (getType(decrementAction)): {
            return state + 1;
        }
        case (getType(resetAction)): {
            return action.payload;
        }
        default:
            return state;
    }
}

// an effect
function effect(actions$, state$) {
    return actions$.pipe(
        filter(isActionOf([incrementAction])),
        withLatestFrom(state$),
        tap(([action, state]) => {
            // perform sideeffects
            console.log('Action', action.type);
            console.log('Payload', action.payload);
            console.log('State', state);
        }),
        map(() => {
            // or generate another action
            return { type: 'ANOTHER_ACTION' };
        })
    )
}
```
