import { IReducer } from './store';

type TReducersObject<S extends Object = unknown> = {
    [P in keyof S]: IReducer<S[P]>
}

export const combineReducers = <S extends Object>(reducers: TReducersObject<S>, initialState?: S) => {
    const entries = Object.entries(reducers);

    const initialStateSafe = initialState != null
        ? initialState
        : Object.create(null);

    return (action, state = initialStateSafe) => {
        // shallow check if store branch was updated
        let shouldUpdate = false;

        const newState = entries.reduce(
            // [any, any] TS hack
            (acc, [key, fn]: [any, any]) => {
                acc[key] = fn(action, state[key] || void 0);
                if (acc[key] !== state[key]) {
                    shouldUpdate = true;
                }

                return acc;
            }, Object.create(null));

        return shouldUpdate
            ? newState
            : state;
    };
};
