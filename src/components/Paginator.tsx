import React from "react";
import { Button } from "@/components/ui/button";

type PaginatorProps = {
  pageNumber: number;
  loading: boolean;
  noMoreData: boolean;
  onPageChange: (newPage: number) => void;
};

const Paginator: React.FC<PaginatorProps> = ({
  pageNumber,
  loading,
  noMoreData,
  onPageChange,
}) => {
  const handlePrevPage = () => {
    if (pageNumber > 1) {
      onPageChange(pageNumber - 1);
    }
  };

  const handleNextPage = () => {
    if (!noMoreData) {
      onPageChange(pageNumber + 1);
    }
  };

  return (
    <div className="flex justify-center items-center mt-2">
      <Button
        onClick={handlePrevPage}
        disabled={pageNumber === 1 || loading}
        variant="outline"
        className="mr-2"
      >
        Previous
      </Button>
      <span className="mx-4 text-sm font-medium">{pageNumber}</span>
      <Button
        onClick={handleNextPage}
        disabled={noMoreData || loading}
        variant="outline"
        className="ml-2"
      >
        Next
      </Button>
      {noMoreData && !loading && (
        <span className="ml-4 text-sm text-muted-foreground">No more data!</span>
      )}
    </div>
  );
};

export default Paginator;
