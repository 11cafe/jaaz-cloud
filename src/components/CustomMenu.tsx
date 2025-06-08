import React, { useRef, useState, useEffect } from "react";

type Props = {
  menuButton: React.ReactElement;
  menuContent: React.ReactElement;
};

export default function CustomMenu({ menuContent, menuButton }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);

  return (
    <div className="relative">
      <div
        className="cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
      >
        {menuButton}
      </div>
      {isOpen && (
        <div
          className="gap-4 mt-2 shadow-md border border-gray-300 absolute right-0 z-50"
          ref={ref}
        >
          {menuContent}
        </div>
      )}
    </div>
  );
}
