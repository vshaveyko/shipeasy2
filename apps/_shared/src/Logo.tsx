import type { SVGAttributes } from "react";

export function Logo(props: SVGAttributes<SVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48 0H152A48 48 0 0 1 200 48V152A48 48 0 0 1 152 200H48A48 48 0 0 1 0 152V48A48 48 0 0 1 48 0ZM100 60L60 120H100V60ZM100 120H140L100 60V120ZM45 125L100 150L155 125L140 120H60L45 125Z"
      />
    </svg>
  );
}
