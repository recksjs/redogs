// RxJS import hack {{{
// Due to closurejs bundling of rxjs imports (which are peer dependencies) to
// `require(rxjs)` & `require(rxjs/operators)`. That bundling eliminates import
// optimisation and whole rxjs is imported. Therefore internal functions and
// operators are imported directly from rxjs internals which might not be
// reliable through npm versions following imports were substituted
// import { of, pipe, combineLatest, ReplaySubject, Subject, Observable } from 'rxjs';
// import { pairwise, switchMap, tap, distinctUntilChanged, startWith, map, takeUntil } from 'rxjs/operators';
import { Observable } from 'rxjs/internal/Observable';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { merge } from 'rxjs/internal/observable/merge';
import { NEVER } from 'rxjs/internal/observable/never';
import { catchError } from 'rxjs/internal/operators/catchError';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { map } from 'rxjs/internal/operators/map';
import { startWith } from 'rxjs/internal/operators/startWith';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { withLatestFrom } from 'rxjs/internal/operators/withLatestFrom';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';
import { Subject } from 'rxjs/internal/Subject';
import { pipe } from 'rxjs/internal/util/pipe';
// }}}

interface IAction { type: string, payload?: any };

const INIT_STORE_ACTION: IAction = { type: 'INIT_STORE' };

// Reducers {{{
interface IReducer<S> {
    (action: IAction, state: S) : S;
}

const createStore = <S>(reducersRoot: IReducer<S>, effectsRoot?: IEffect<S>) => {
    const actions$ = new Subject<IAction>();
    const state$ = new ReplaySubject<S>(1);
    const destroy$ = new Subject<void>();

    // reducers
    actions$.pipe(
        withLatestFrom(state$.pipe(startWith(void 0))),
        map(([action, state]: [IAction, S]) => reducersRoot(action, state)),
        distinctUntilChanged(),
        suppressAndLogError('[redogs:store]'),
        takeUntil(destroy$),
    ).subscribe(state$);

    // effects
    if (typeof effectsRoot == 'function') {
        effectsRoot(actions$, state$).pipe(
            suppressAndLogError('[redogs:effects]'),
            takeUntil(destroy$),
        )
            .subscribe(actions$);
    }

    // init store
    actions$
        .next(INIT_STORE_ACTION);

    return {
        state$: state$.asObservable(),
        dispatch(action) {
            actions$.next(action);
        },
        destroy$
    }
}

type TReducersObject<S extends Object> = {
    [P in keyof S]: IReducer<S[P]>
}


const combineReducers = <S>(reducers: TReducersObject<S>, initialState?: S) => {
    const entries = Object.entries(reducers);

    return (action: IAction, state = initialState) => {
        // shallow check if store branch was updated
        let shouldUpdate = false;

        const newState = entries.reduce(
            // [any, any] TS hack
            (acc, [key, fn] : [any, any]) => {
                acc[key] = fn(action, state && state[key] || void 0);
                if (acc[key] !== state[key]) {
                    shouldUpdate = true;
                }
                return acc;
            }
            , Object.create(null)
        );

        return shouldUpdate
            ? newState
            : state;
    }
}
// }}}

// Effects combiner {{{
interface IEffect<S> {
    (actions$: Observable<IAction>, store$: Observable<S>) : Observable<IAction>;
}

const combineEffects = <S>(...effects: IEffect<S>[]) : IEffect<S> => {
    return (action$, state$) =>
        merge(
            NEVER,
            ...effects.map((effect) => effect(action$, state$))
        )
}
// }}}

export { INIT_STORE_ACTION, createStore, combineReducers, combineEffects };


// Helpers
function suppressAndLogError (msgPrefix: string) {
    return pipe(
        catchError(err => {
            // NOTE: basically, we're suppressing errors here
            if (console && typeof console.error == 'function') {
                console.error(msgPrefix, err);
            }
            return EMPTY;
        })
    )
}
