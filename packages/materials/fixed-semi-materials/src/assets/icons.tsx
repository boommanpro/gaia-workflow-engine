/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

export function IconStyleBorder(props: any) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="1.5"
        strokeWidth="1.499"
      >
        <path
          strokeDasharray="2 2"
          d="M16 2H8a6 6 0 0 0-6 6v8a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6Z"
        />
        <path d="M16 5H8a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3Z" />
      </g>
    </svg>
  );
}

export function IconParkRightBranch(props: any) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 48 48" {...props}>
      <g fill="none">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          d="M22 8.01176C20.5 8.01193 16.0714 7.93811 15 13.0005C13.917 18.1177 9.85714 22.8477 8 24"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          d="M22 40C20.5 40.0003 16.0714 40.0628 15 35.0005C13.917 29.8833 9.85714 25.1522 8 23.9999"
        />
        <circle cx="8" cy="24" r="4" fill="currentColor" />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          d="M8 24L22 24"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          d="M30 24.001H42"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          d="M30 8.00098H42"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          d="M30 40.001H42"
        />
      </g>
    </svg>
  );
}

export function PhCircleBold(props: any) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 256 256" {...props}>
      <path
        fill="currentColor"
        d="M128 236a108 108 0 1 1 108-108a108.1 108.1 0 0 1-108 108Zm0-192a84 84 0 1 0 84 84a84.1 84.1 0 0 0-84-84Z"
      />
    </svg>
  );
}

export function BiCloud(props: any) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 16 16" {...props}>
      <path
        fill="currentColor"
        d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773C16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593c.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318C1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z"
      />
    </svg>
  );
}

export function BiBootstrapReboot(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      {...props}
    >
      <g fill="currentColor">
        <path d="M1.161 8a6.84 6.84 0 1 0 6.842-6.84a.58.58 0 1 1 0-1.16a8 8 0 1 1-6.556 3.412l-.663-.577a.58.58 0 0 1 .227-.997l2.52-.69a.58.58 0 0 1 .728.633l-.332 2.592a.58.58 0 0 1-.956.364l-.643-.56A6.812 6.812 0 0 0 1.16 8z" />
        <path d="M6.641 11.671V8.843h1.57l1.498 2.828h1.314L9.377 8.665c.897-.3 1.427-1.106 1.427-2.1c0-1.37-.943-2.246-2.456-2.246H5.5v7.352h1.141zm0-3.75V5.277h1.57c.881 0 1.416.499 1.416 1.32c0 .84-.504 1.324-1.386 1.324h-1.6z" />
      </g>
    </svg>
  );
}

export function FeAlignCenter(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="#888888"
        fillRule="evenodd"
        d="M11 13v-2H6.286C5.023 11 4 10.105 4 9s1.023-2 2.286-2H11V3a1 1 0 0 1 2 0v4h4.714C18.977 7 20 7.895 20 9s-1.023 2-2.286 2H13v2h3a2 2 0 1 1 0 4h-3v4a1 1 0 0 1-2 0v-4H8a2 2 0 1 1 0-4h3Z"
      />
    </svg>
  );
}

export function Arrow({ color, circleColor }: { color: string; circleColor: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill={circleColor} />
      <path
        fill={color}
        d="M10.8281 9.4715C11.0883 9.21131 11.0885 8.78909 10.8291 8.52804C10.6413 8.33892 10.4536 8.14952 10.266 7.9601C9.66706 7.35551 9.06799 6.75079 8.46068 6.15496C8.20439 5.90352 7.7947 5.90352 7.53841 6.15496C6.93103 6.75085 6.33191 7.35564 5.73291 7.96029C5.5454 8.14957 5.3579 8.33884 5.17017 8.52782C4.91075 8.78895 4.91096 9.21099 5.17124 9.47127C5.43152 9.73155 5.85355 9.73176 6.11383 9.47148L7.99955 7.58576L9.88548 9.4717C10.1457 9.73189 10.5679 9.73169 10.8281 9.4715Z"
      />
      <path
        fill={color}
        d="M0.888672 7.99997C0.888672 4.07261 4.07242 0.888855 7.99978 0.888855C11.9271 0.888855 15.1109 4.07261 15.1109 7.99997C15.1109 11.9273 11.9271 15.1111 7.99978 15.1111C4.07242 15.1111 0.888672 11.9273 0.888672 7.99997ZM13.818 7.99997C13.818 4.78667 11.2131 2.18178 7.99978 2.18178C4.78649 2.18178 2.1816 4.78667 2.1816 7.99997C2.1816 11.2133 4.78649 13.8181 7.99978 13.8181C11.2131 13.8181 13.818 11.2133 13.818 7.99997Z"
      />
    </svg>
  );
}
