import { EMPTY, Observable, pipe, ReplaySubject, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, takeUntil, withLatestFrom } from 'rxjs/operators';

// local to store definition of IAction
// TODO: unify with IAction in ./actions.ts
interface IAction { type: string, payload?: any };

const INIT_STORE_ACTION: IAction = { type: 'INIT_STORE' };

// Effects {{{
interface IEffect<S = unknown> {
    (actions$: Observable<IAction>, store$: Observable<S>) : Observable<IAction>;
}
// }}}

// Reducers {{{
interface IReducer<S = unknown> {
    (action: IAction, state: S) : S;
}
// }}}

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

export { IReducer, IEffect };
export { INIT_STORE_ACTION, createStore };

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
