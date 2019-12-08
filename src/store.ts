import { EMPTY, merge, NEVER, Observable, pipe, ReplaySubject, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, takeUntil, withLatestFrom } from 'rxjs/operators';

interface IAction { type: string, payload?: any };

const INIT_STORE_ACTION: IAction = { type: 'INIT_STORE' };

// Reducers {{{
interface IReducer<S = unknown> {
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

type TReducersObject<S extends Object = unknown> = {
    [P in keyof S]: IReducer<S[P]>
}


const combineReducers = <S extends Object>(reducers: TReducersObject<S>, initialState?: S) => {
    const entries = Object.entries(reducers);

    const initialStateSafe =
        initialState != null
        ? initialState
        : Object.create(null)
        ;

    return (action: IAction, state = initialStateSafe) => {
        // shallow check if store branch was updated
        let shouldUpdate = false;

        const newState = entries.reduce(
            // [any, any] TS hack
            (acc, [key, fn] : [any, any]) => {
                acc[key] = fn(action, state[key] || void 0);
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
interface IEffect<S = unknown> {
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

export { IReducer, IEffect };
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
