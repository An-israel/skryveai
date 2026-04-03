interface SkryveLogoProps {
  size?: number
  className?: string
}

/** The real SkryveAI brand mark — white S-shape on purple background */
export function SkryveLogo({ size = 32, className = "" }: SkryveLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1018 1018"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: "22%" }}
    >
      <rect width="1018" height="1018" fill="#882DFF" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M352.388 276.521L221 352.714C221 375.468 233.086 396.494 252.705 407.871L609.154 614.579C638.288 631.473 656.235 662.696 656.235 696.486V738.036L668.558 745.182L798 670.118C798 638.164 781.028 608.637 753.477 592.66L410.369 393.689C381.235 376.794 363.288 345.572 363.288 311.782L363.288 282.843L352.388 276.521Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M268.081 695.794C238.947 678.899 221 647.677 221 613.887L221 485.64L538.01 669.477C567.144 686.371 585.091 717.594 585.091 751.384V793.586L510.902 836.608L268.081 695.794Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M515.737 181.794L430.771 231.066V267.371C430.771 301.161 448.718 332.384 477.851 349.279L798 534.935L798 400.085C798 366.296 780.053 335.073 750.919 318.178L515.737 181.794Z"
        fill="white"
      />
    </svg>
  )
}
