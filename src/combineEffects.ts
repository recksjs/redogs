import { merge, NEVER } from 'rxjs';
import { IEffect } from './store';

export const combineEffects = <S>(...effects: IEffect<S>[]): IEffect<S> => {
    return (action$, state$) => merge(
        NEVER,
        ...effects.map((effect) => effect(action$, state$))
    );
};
