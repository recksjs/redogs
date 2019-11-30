// Action constructors and type checking helpers

interface IAction<T extends string, P> {
    type: T;
    payload?: P;
}

interface ActionCreator<T extends string, P> {
    type: T;
    (payload: P): IAction<T, P>;
}

// Constructors
const createStandardAction = <T extends string>(type: T): <P>() => ActionCreator<typeof type, P> => {
    const ctor = (payload) => ({ type, payload });
    ctor.type = type;
    return () => ctor;
};

// Redux
// helper to use in switch-case
const getType = <T extends string>(actionCtor: ActionCreator<T, unknown>) => actionCtor.type;

// Effects
// helper for pipe filtering in effects
const isActionOf = <S extends string, T extends ActionCreator<S, unknown>>(actionCtors: T[]) =>  {
    return (action: IAction<S, unknown>) : action is ReturnType<T> => 
        actionCtors.some(ctor => ctor.type === action.type);
}

export { createStandardAction, getType, isActionOf };