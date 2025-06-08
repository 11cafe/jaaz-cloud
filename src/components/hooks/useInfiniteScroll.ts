import { useRef, useEffect } from "react";
import { useDebounceFunc } from "./useDebounceFunc";
import { useStateWithRef } from "./useStateWithRef";

type Data = { list: any[]; count?: number };

type req = { pageNumber: number; pageSize: number };

const useInfiniteScroll = (
  service: (params: req) => Promise<Data>,
  options: {
    pageSize?: number;
    target?: HTMLElement;
    threshold?: number;
    initPageNumber?: number;
    initData?: any[];
  } = {},
) => {
  const {
    pageSize = 20,
    threshold = 100,
    initPageNumber = 1,
    initData = [],
  } = options;
  const pageNumberRef = useRef<number>(initPageNumber);
  const [finalData, setFinalData, finalDataRef] = useStateWithRef<Data>({
    list: initData,
  });
  const [loading, setLoading, loadingRef] = useStateWithRef(false);
  const [isNoMore, setIsNoMore, isNoMoreRef] = useStateWithRef(false);

  const handleScroll = useDebounceFunc(async () => {
    if (isNoMoreRef.current || loadingRef.current) return;
    const target = options.target ?? document.documentElement;
    if (
      target.scrollHeight - target.scrollTop <=
      target.clientHeight + threshold
    ) {
      setLoading(true);
      service({
        pageNumber: pageNumberRef.current + 1,
        pageSize,
      }).then((data) => {
        setFinalData((pre) => ({
          list: pre.list.concat(data.list),
          count: data.count,
        }));
        setLoading(false);
        pageNumberRef.current++;

        if (
          finalDataRef.current.count &&
          pageNumberRef.current * pageSize >= finalDataRef.current.count
        ) {
          setIsNoMore(true);
          return;
        }
      });
    }
  }, 200);

  const reload = () => {
    setFinalData({
      list: [],
    });
    setLoading(true);
    pageNumberRef.current = 1;
    service({
      pageNumber: 1,
      pageSize,
    }).then((data) => {
      setFinalData((pre) => ({
        list: pre.list.concat(data.list),
        count: data.count,
      }));
      setLoading(false);
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return {
    data: finalData.list,
    loading,
    isNoMore,
    reload,
  };
};

export default useInfiniteScroll;
