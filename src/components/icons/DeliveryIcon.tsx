import { type SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  color?: string;
};

const DeliveryICon = ({ color = "currentColor", ...props }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 512 512"
    fill="none"
    stroke={color}
    {...props}
  >
    <path d="M219.4 47.4c-10.7 2.6..." />
    <path d="M258 94v9l6.3 4..." />
    <path d="M205.5 111.9c6.2 11.3..." />
    <path d="M175.5 122.3c-10.9 3.6..." />
    <path d="M182.1 140.7c-4.8 2.4..." />
    <path d="M337 188.4c-3 .9..." />
    <path d="M404.7 211.1c-5.6 1.3..." />
    <path d="M61 314.6c-27.1 5.8..." />
    <path d="M421.1 314.1c-2.4.5..." />
  </svg>
);

export default DeliveryICon;