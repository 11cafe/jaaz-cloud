import { useEffect, useRef } from "react";
import { useDebounceFunc } from "./useDebounceFunc";
import useSWRInfinite from "swr/infinite";

const useSWRInfiniteScroll = (
  getKey: (index: number) => string,
  options: {
    targetElement?: HTMLDivElement | null;
    threshold?: number;
  } = {},
) => {
  const { threshold = 100, targetElement } = options;
  const scrollListenerAddedRef = useRef(false);
  const targetElementRef = useRef<HTMLElement>();
  const isValidatingRef = useRef(false);
  const sizeRef = useRef(0);

  const {
    data = [],
    isValidating,
    size,
    setSize,
  } = useSWRInfinite(
    getKey,
    (key) =>
      fetch(key)
        .then((res) => res.json())
        .then((res) => res.data),
    {
      revalidateFirstPage: false,
    },
  );

  sizeRef.current = size;
  isValidatingRef.current = isValidating;

  const handleScroll = useDebounceFunc(async () => {
    if (isValidatingRef.current) return;

    const { scrollHeight, scrollTop, clientHeight } = targetElementRef.current!;
    if (scrollHeight - scrollTop <= clientHeight + threshold) {
      setSize(sizeRef.current + 1);
    }
  }, 200);

  useEffect(() => {
    let target: HTMLElement | null = null;
    if (targetElement !== undefined) {
      target = targetElement;
    } else {
      target = document.documentElement;
    }

    if (!scrollListenerAddedRef.current && target) {
      targetElementRef.current = target;
      scrollListenerAddedRef.current = true;
      target.addEventListener("scroll", handleScroll);

      return () => target?.removeEventListener("scroll", handleScroll);
    }
  }, [targetElement]);

  return {
    data: data?.flat(),
    isValidating,
    isNoMore: data?.[data.length - 1]?.length === 0,
  };
};

export default useSWRInfiniteScroll;
