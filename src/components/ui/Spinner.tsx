import React, { forwardRef } from "react";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number | "sm" | "md" | "lg";
}

const Spinner = forwardRef<HTMLDivElement, SpinnerProps>((props, ref) => {
  let { size = 18, ...rest } = props;
  if (typeof size === "string") {
    size = size === "sm" ? 12 : size === "md" ? 24 : 18;
  }
  return (
    <div
      className="inline-flex flex-col items-center justify-center gap-3"
      {...rest}
    >
      <div className={`relative size-[${size}px]`}>
        <div className="absolute rounded-full border-transparent size-4 border"></div>
        <svg
          width="100%"
          height="100%"
          fill="none"
          className="absolute animate-spin stroke-white"
          xmlns="http://www.w3.org/2000/svg"
          strokeWidth="2.0"
          viewBox="1 0.25 23 23.5"
        >
          <path
            d="M12.5 23c6.075 0 11-4.925 11-11s-4.925-11-11-11-11 4.925-11 11"
            strokeLinecap="round"
          ></path>
        </svg>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
});
Spinner.displayName = "Spinner";
export default Spinner;
