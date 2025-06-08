import { useState, useRef, MutableRefObject, useCallback } from "react";

type SetStateFunc<S> = (preState: S) => S;
type SetStateAction<S> = S | SetStateFunc<S>;
type DispatchWithRef<S> = (value: SetStateAction<S>) => void;

export const useStateWithRef = <S>(
  initValue: S,
): [S, DispatchWithRef<S>, MutableRefObject<S>] => {
  const [state, setState] = useState<S>(initValue);
  const ref = useRef<S>(state);

  const setStateAndRef = useCallback((value: SetStateAction<S>) => {
    setState((pre) => {
      const newState =
        typeof value === "function" ? (value as SetStateFunc<S>)(pre) : value;
      ref.current = newState;
      return newState;
    });
  }, []);

  return [state, setStateAndRef, ref];
};
