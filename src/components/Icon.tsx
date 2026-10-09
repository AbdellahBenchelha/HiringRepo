import type { SVGProps } from "react";

/**
 * Lightweight inline icon set (no external icon dependency).
 * Icons inherit `currentColor` and are decorative by default (aria-hidden).
 * Pass `title` to expose an accessible label.
 */

export type IconName =
  | "wallet"
  | "trophy"
  | "graduation"
  | "trendingUp"
  | "handshake"
  | "users"
  | "clock"
  | "globe"
  | "world"
  | "chat"
  | "ladder"
  | "sparkles"
  | "phone"
  | "mail"
  | "mapPin"
  | "check"
  | "checkCircle"
  | "arrowRight"
  | "menu"
  | "close"
  | "chevronDown"
  | "chevronUp"
  | "upload"
  | "trash"
  | "plus"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "x"
  | "shield"
  | "settings"
  | "headset"
  | "search"
  | "zoomIn"
  | "zoomOut"
  | "rotate"
  | "chevronLeft"
  | "chevronRight"
  | "expand"
  | "briefcase"
  | "document"
  | "microphone"
  | "star"
  | "send"
  | "pencil"
  | "home"
  | "laptop"
  | "chartBar"
  | "gift"
  | "calendar"
  | "heart"
  | "megaphone"
  | "quote"
  | "question"
  | "user"
  | "fileEdit"
  | "fileSearch"
  | "fileCheck"
  | "monitorUser"
  | "list"
  | "heartLine"
  | "chatDots"
  | "shieldCheck"
  | "usersGroup"
  | "headsetLine"
  | "phoneLine"
  | "chatsLine"
  | "laptopLine"
  | "mapPinLine"
  | "briefcaseLine"
  | "fileAdd";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  title?: string;
}

const paths: Record<IconName, React.ReactNode> = {
  wallet: (
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1h-3a3 3 0 0 0 0 6h3v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm16 3h-3a1 1 0 1 0 0 2h3v-2Z" />
  ),
  trophy: (
    <path d="M7 4h10v2h3v2a4 4 0 0 1-4 4 5 5 0 0 1-3 2.83V18h3v2H8v-2h3v-3.17A5 5 0 0 1 8 12a4 4 0 0 1-4-4V6h3V4Zm0 4H6v0a2 2 0 0 0 1 1.73V8Zm10 0v1.73A2 2 0 0 0 18 8h-1Z" />
  ),
  graduation: <path d="M12 3 1 8l11 5 9-4.09V14h2V8L12 3ZM5 13.18V17c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.82l-7 3.18-7-3.18Z" />,
  trendingUp: <path d="M3 17l6-6 4 4 8-8v5h2V4h-7v2h3.59L13 12.59l-4-4L1.5 16 3 17Z" />,
  handshake: (
    <path d="m11 6 3 3-1.5 1.5L11 9l-2 2a1.5 1.5 0 0 1-2.12-2.12L9.76 6H11Zm2.5-2L21 11.5l-3 3-1-1-2.5 2.5a2 2 0 0 1-3 .12l-.62.62a2 2 0 0 1-2.83-2.83l.62-.62a2 2 0 0 1 .12-3L13.5 4ZM3 9.5 6.5 6 8 7.5 4.5 11 3 9.5Z" />
  ),
  users: (
    <path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.67 0-8 1.34-8 4v3h10v-3c0-1.07.79-2 2-2.7-1.06-.18-2.2-.3-4-.3Zm8 0c-.35 0-.74.02-1.15.06C16.16 14.06 17 15.2 17 16.5V20h7v-3c0-2.66-5.33-4-8-4Z" />
  ),
  clock: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11H8v-2h3V6h2v7Z" />,
  globe: (
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8ZM12 4c.83 1.2 1.48 2.54 1.91 4h-3.82A12.6 12.6 0 0 1 12 4ZM4.26 14a7.96 7.96 0 0 1 0-4h3.38a16.6 16.6 0 0 0 0 4H4.26Zm.81 2h2.95c.34 1.27.81 2.48 1.38 3.56A8.03 8.03 0 0 1 5.07 16Zm2.95-8H5.07a8.03 8.03 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.02 8ZM12 20c-.83-1.2-1.48-2.54-1.91-4h3.82A12.6 12.6 0 0 1 12 20Zm2.36-6H9.64a14.4 14.4 0 0 1 0-4h4.72a14.4 14.4 0 0 1 0 4Zm.27 5.56c.57-1.08 1.04-2.29 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14a16.6 16.6 0 0 0 0-4h3.38a7.96 7.96 0 0 1 0 4h-3.38Z" />
  ),
  world: (
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 0 1 7.75 6H16.5a13 13 0 0 0-1.6-4.36A8 8 0 0 1 12 4Zm0 16a8 8 0 0 1-3.9-1A12.9 12.9 0 0 0 9.5 16h5a12.9 12.9 0 0 0 1.4 3A8 8 0 0 1 12 20ZM4.25 14A8 8 0 0 1 4 12c0-.34.02-.67.06-1h3.2a15 15 0 0 0 0 2H4.25Zm5.01 0a13 13 0 0 1 0-2h5.48a13 13 0 0 1 0 2H9.26Z" />
  ),
  chat: <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 0-2Z" />,
  ladder: <path d="M7 2h2v3h6V2h2v20h-2v-3H9v3H7V2Zm2 5v3h6V7H9Zm0 5v3h6v-3H9Z" />,
  sparkles: <path d="M12 2l1.8 4.6L18.5 8l-4.7 1.4L12 14l-1.8-4.6L5.5 8l4.7-1.4L12 2Zm6 10 .9 2.3 2.3.9-2.3.9L18 18l-.9-2.3-2.3-.9 2.3-.9L18 12ZM6 13l.8 2 2 .8-2 .8L6 19l-.8-2.4-2-.8 2-.8L6 13Z" />,
  phone: <path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1L6.6 10.8Z" />,
  mail: <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 4v.01L12 13l8-4.99V8l-8 5-8-5Z" />,
  mapPin: <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />,
  check: <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z" />,
  checkCircle: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2L6.6 12l1.4-1.4 2.8 2.8 5.6-5.6L17.8 9l-7 7.2Z" />,
  arrowRight: <path d="M12 4l-1.4 1.4L16.2 11H4v2h12.2l-5.6 5.6L12 20l8-8-8-8Z" />,
  menu: <path d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" />,
  close: <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 6.3 19.7 4.9 18.3 11.2 12 4.9 5.7 6.3 4.3l4.3 6.3 6.3-6.3 1.4 1.4Z" />,
  chevronDown: <path d="M12 15.5 5.5 9 7 7.5l5 5 5-5L18.5 9 12 15.5Z" />,
  chevronUp: <path d="M12 8.5 18.5 15 17 16.5l-5-5-5 5L5.5 15 12 8.5Z" />,
  upload: <path d="M11 16V7.8L8.4 10.4 7 9l5-5 5 5-1.4 1.4L13 7.8V16h-2ZM5 18h14v2H5v-2Z" />,
  trash: <path d="M6 7h12l-1 14H7L6 7Zm3-3h6l1 2h4v2H4V6h4l1-2Z" />,
  plus: <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />,
  linkedin: <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C20.6 8.65 22 10.6 22 14v7h-4v-6.2c0-1.48-.03-3.4-2.07-3.4-2.07 0-2.39 1.62-2.39 3.3V21H9V9Z" />,
  facebook: <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />,
  instagram: <path d="M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.8.22 2.43.46.66.26 1.22.6 1.77 1.16.56.55.9 1.11 1.16 1.77.24.63.41 1.36.46 2.43C21.99 8.94 22 9.28 22 12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.8-.46 2.43a4.9 4.9 0 0 1-1.16 1.77c-.55.56-1.11.9-1.77 1.16-.63.24-1.36.41-2.43.46-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.8-.22-2.43-.46a4.9 4.9 0 0 1-1.77-1.16 4.9 4.9 0 0 1-1.16-1.77c-.24-.63-.41-1.36-.46-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.8.46-2.43.26-.66.6-1.22 1.16-1.77.55-.56 1.11-.9 1.77-1.16.63-.24 1.36-.41 2.43-.46C8.94 2.01 9.28 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.2-9.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z" />,
  x: <path d="M17.5 3h3l-7 8 8.2 10h-6.4l-5-6.1L3.9 21H1l7.5-8.6L1 3h6.6l4.5 5.6L17.5 3Zm-1 16h1.7L7.6 4.8H5.8L16.5 19Z" />,
  shield: <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6Z" />,
  settings: (
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm8.4-1.1a8.6 8.6 0 0 0 0-1.8l2-1.5-2-3.4-2.3 1a8 8 0 0 0-1.6-.9L15.9 2h-3.8l-.6 2.3c-.6.2-1.1.5-1.6.9l-2.3-1-2 3.4 2 1.5a8.6 8.6 0 0 0 0 1.8l-2 1.5 2 3.4 2.3-1c.5.4 1 .7 1.6.9l.6 2.3h3.8l.6-2.3c.6-.2 1.1-.5 1.6-.9l2.3 1 2-3.4-2-1.5Z" />
  ),
  headset: <path d="M12 2a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h1v-8H5v-1a7 7 0 0 1 14 0v1h-2v8h1a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9Z" />,
  star: <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7L12 2Z" />,
  send: <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.2l12.6 1.8-12.6 1.8v6.6Z" />,
  pencil: <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Zm17.7-10.2a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />,
  microphone: (
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM6 10a1 1 0 0 0-2 0 8 8 0 0 0 7 7.94V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-3.06A8 8 0 0 0 20 10a1 1 0 1 0-2 0 6 6 0 0 1-12 0Z" />
  ),
  search: (
    <path d="M10 2a8 8 0 1 0 4.9 14.32l5.39 5.4 1.42-1.42-5.4-5.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
  ),
  document: (
    <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5ZM8 12h8v1.6H8V12Zm0 3.4h8V17H8v-1.6Z" />
  ),
  briefcase: (
    <path d="M9 4a2 2 0 0 0-2 2v1H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3V6a2 2 0 0 0-2-2H9Zm0 3V6h6v1H9Z" />
  ),
  zoomIn: (
    <path d="M10 2a8 8 0 1 0 4.9 14.32l5.39 5.4 1.42-1.42-5.4-5.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-1 2v2H7v2h2v2h2V10h2V8h-2V6H9Z" />
  ),
  zoomOut: (
    <path d="M10 2a8 8 0 1 0 4.9 14.32l5.39 5.4 1.42-1.42-5.4-5.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12ZM7 8v2h6V8H7Z" />
  ),
  rotate: (
    <path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" />
  ),
  chevronLeft: <path d="M14.5 5.5 8 12l6.5 6.5L16 17l-5-5 5-5-1.5-1.5Z" />,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5L8 17l5-5-5-5 1.5-1.5Z" />,
  // Added for the redesigned home page. Compound shapes use evenodd so their
  // inner outlines read as holes.
  home: <path d="M12 3 2 11.2l1.3 1.5L5 11.3V20a1 1 0 0 0 1 1h4.5v-6h3v6H18a1 1 0 0 0 1-1v-8.7l1.7 1.4 1.3-1.5L12 3Z" />,
  laptop: (
    <path fillRule="evenodd" clipRule="evenodd" d="M5 4a1 1 0 0 0-1 1v10h16V5a1 1 0 0 0-1-1H5Zm1 2h12v7H6V6ZM2 17h20v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1Z" />
  ),
  chartBar: <path d="M4 13h4v7H4v-7Zm6-5h4v12h-4V8Zm6-5h4v17h-4V3Z" />,
  gift: (
    <path fillRule="evenodd" clipRule="evenodd" d="M9 3a3 3 0 0 0-2.83 4H4a1 1 0 0 0-1 1v3h8V7.5h2V11h8V8a1 1 0 0 0-1-1h-2.17A3 3 0 0 0 12 4.4 3 3 0 0 0 9 3Zm0 2a1 1 0 0 1 1 1v1H9a1 1 0 1 1 0-2Zm6 0a1 1 0 1 1 0 2h-1V6a1 1 0 0 1 1-1ZM4 13v6a1 1 0 0 0 1 1h6v-7H4Zm9 0v7h6a1 1 0 0 0 1-1v-6h-7Z" />
  ),
  calendar: (
    <path fillRule="evenodd" clipRule="evenodd" d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2Zm-2 8v9h14v-9H5Zm2 2h3v3H7v-3Z" />
  ),
  heart: (
    <path d="M12 21s-7.4-4.5-9.5-9C1 8.6 3.1 4.5 6.8 4.5c2 0 3.4 1 5.2 3 1.8-2 3.2-3 5.2-3 3.7 0 5.8 4.1 4.3 7.5-2.1 4.5-9.5 9-9.5 9Z" />
  ),
  megaphone: (
    <path d="M18 3v18l-6-4H9.3l1 4H7l-1.2-4.2A3.5 3.5 0 0 1 2 13.4v-2.8A3.5 3.5 0 0 1 5.5 7H12l6-4Zm2 6.2a3 3 0 0 1 0 5.6V9.2Z" />
  ),
  quote: (
    <path d="M7.4 5C4.7 6.5 3 9.2 3 12.6V19h7v-7H6.2c.3-1.8 1.4-3.2 3.1-4L7.4 5Zm10 0c-2.7 1.5-4.4 4.2-4.4 7.6V19h7v-7h-3.8c.3-1.8 1.4-3.2 3.1-4L17.4 5Z" />
  ),
  question: (
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.8h2.3V19h-2.3v-2.2ZM12 5.5a4 4 0 0 1 2.3 7.3c-.9.6-1.2 1-1.2 2.1h-2.3c0-1.9.8-2.8 2-3.6a1.8 1.8 0 1 0-2.6-1.6H8a4 4 0 0 1 4-4.2Z" />
  ),
  user: <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9a8 8 0 0 1 16 0H4Z" />,
  fileEdit: (
    <path fillRule="evenodd" clipRule="evenodd" d="M6 2h8l5 5v5.2l-2 2V8h-4V4H6v16h5.5l-.5 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm14.3 11.3 1.4 1.4-6.6 6.6-2.4.7.7-2.4 6.9-6.3ZM8 11h7v2H8v-2Zm0 4h4v2H8v-2Z" />
  ),
  fileSearch: (
    <path fillRule="evenodd" clipRule="evenodd" d="M6 2h8l5 5v3.6a5.5 5.5 0 0 0-2-.6V8h-4V4H6v16h5.4c.3.7.8 1.4 1.3 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm10.5 10a3.5 3.5 0 0 1 2.9 5.5l2.3 2.3-1.4 1.4-2.3-2.3a3.5 3.5 0 1 1-1.5-6.9Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
  ),
  fileCheck: (
    <path fillRule="evenodd" clipRule="evenodd" d="M6 2h8l5 5v5h-2V8h-4V4H6v16h6.5v2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm10.4 17.2 4.6-4.7 1.4 1.4-6 6.1-3.4-3.4 1.4-1.4 2 2ZM8 11h7v2H8v-2Zm0 4h4v2H8v-2Z" />
  ),
  monitorUser: (
    <path fillRule="evenodd" clipRule="evenodd" d="M3 3h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm1 2v10h16V5H4Zm8 1.5a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Zm-4 7.5c.4-1.7 2-2.6 4-2.6s3.6.9 4 2.6H8Z" />
  ),
  list: <path d="M4 5h2v2H4V5Zm4 0h12v2H8V5ZM4 11h2v2H4v-2Zm4 0h12v2H8v-2Zm-4 6h2v2H4v-2Zm4 0h12v2H8v-2Z" />,
  // Outline icons, drawn with a stroke for the values cards.
  heartLine: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      d="M12 20s-7-4.4-8.9-8.4C1.7 8.6 3.6 5 7 5c1.9 0 3.2 1 5 3 1.8-2 3.1-3 5-3 3.4 0 5.3 3.6 3.9 6.6C19 15.6 12 20 12 20Z"
    />
  ),
  chatDots: (
    <g>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M12 3.5c4.97 0 9 3.36 9 7.5s-4.03 7.5-9 7.5c-1.1 0-2.15-.16-3.12-.46L4 20l1.3-3.9C3.85 14.75 3 12.95 3 11c0-4.14 4.03-7.5 9-7.5Z"
      />
      <circle cx="8.4" cy="11" r="1.25" />
      <circle cx="12" cy="11" r="1.25" />
      <circle cx="15.6" cy="11" r="1.25" />
    </g>
  ),
  // Outline icons for the job cards.
  headsetLine: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14a2 2 0 0 1 2-2h1.5v6H6a2 2 0 0 1-2-2v-2Z" />
      <path d="M20 14a2 2 0 0 0-2-2h-1.5v6H18a2 2 0 0 0 2-2v-2Z" />
      <path d="M18 18c0 1.7-1.8 3-4 3h-1.5" />
    </g>
  ),
  phoneLine: (
    <path
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      d="M5.2 3.8h3.1l1.6 4.1-2.1 1.4a11.5 11.5 0 0 0 6.9 6.9l1.4-2.1 4.1 1.6v3.1a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 3.2 5.9a2 2 0 0 1 2-2.1Z"
    />
  ),
  chatsLine: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 4.5h9.5a1.5 1.5 0 0 1 1.5 1.5v5.5a1.5 1.5 0 0 1-1.5 1.5H8.5L5 15.5v-2.5h-.5A1.5 1.5 0 0 1 3 11.5V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M15.5 9h3A1.5 1.5 0 0 1 20 10.5V16a1.5 1.5 0 0 1-1.5 1.5H18V20l-3.5-2.5H11A1.5 1.5 0 0 1 9.5 16v-1" />
      <path d="M6.5 8h5.5M6.5 10.2h3.5" />
    </g>
  ),
  laptopLine: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="5" width="15" height="10" rx="1.5" />
      <path d="M2.5 19h19" />
    </g>
  ),
  mapPinLine: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.1" />
    </g>
  ),
  briefcaseLine: (
    <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="7" width="17" height="12.5" rx="2" />
      <path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7M3.5 12.5h17" />
    </g>
  ),
  fileAdd: (
    <g>
      <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path fill="#fff" fillOpacity="0.55" d="M14 2v3.5A1.5 1.5 0 0 0 15.5 7H19l-5-5Z" />
      <path fill="#fff" d="M11 10.5h2v2.75h2.75v2H13V18h-2v-2.75H8.25v-2H11V10.5Z" />
    </g>
  ),
  usersGroup: (
    <g>
      <circle cx="12" cy="7" r="3.1" />
      <path d="M6.8 19.2c0-3.1 2.3-5.4 5.2-5.4s5.2 2.3 5.2 5.4V20H6.8v-.8Z" />
      <circle cx="5.4" cy="9.3" r="2.3" />
      <path d="M1.2 19.2c0-2.5 1.7-4.2 4.1-4.2.9 0 1.7.2 2.3.6a7.2 7.2 0 0 0-1.9 4.3V20H1.2v-.8Z" />
      <circle cx="18.6" cy="9.3" r="2.3" />
      <path d="M22.8 19.2c0-2.5-1.7-4.2-4.1-4.2-.9 0-1.7.2-2.3.6a7.2 7.2 0 0 1 1.9 4.3V20h4.5v-.8Z" />
    </g>
  ),
  shieldCheck: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </g>
  ),
  expand: (
    <path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z" />
  ),
};

export function Icon({ name, title, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
