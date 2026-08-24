import type { SVGProps } from 'react';

/**
 * One small stroke-icon set, drawn on a 24px grid. Inline SVG rather than an
 * icon dependency: the app ships a couple of dozen glyphs, not a library.
 */
const PATHS = {
  dashboard: 'M4 4h6v7H4zM14 4h6v5h-6zM14 13h6v7h-6zM4 15h6v5H4z',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 20v-1.5a4 4 0 0 0-3-3.87M16 4.13a4 4 0 0 1 0 7.75',
  clipboard:
    'M9 4h6v3H9zM9 5.5H7.5A1.5 1.5 0 0 0 6 7v12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7a1.5 1.5 0 0 0-1.5-1.5H15M9.5 12h5M9.5 16h3',
  layers: 'M12 3.5 3.5 8l8.5 4.5L20.5 8 12 3.5ZM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5',
  helpCircle:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.6 9.4a2.5 2.5 0 0 1 4.86.83c0 1.67-2.5 2.5-2.5 2.5M12 17h.01',
  barChart: 'M4.5 20V11M9.8 20V4.5M15.2 20v-6.5M20.5 20V8',
  settings:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a1.94 1.94 0 1 1-2.75 2.75l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.94 1.94 0 1 1-3.88 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a1.94 1.94 0 1 1-2.75-2.75l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.17a1.94 1.94 0 0 1 0-3.88h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.94 1.94 0 1 1 2.75-2.75l.06.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.47v-.17a1.94 1.94 0 1 1 3.88 0v.09a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.94 1.94 0 1 1 2.75 2.75l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.94 1.94 0 0 1 0 3.88h-.09a1.6 1.6 0 0 0-1.46.97Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  bell: 'M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5ZM13.7 19a2 2 0 0 1-3.4 0',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5a8.5 8.5 0 1 0 10.9 10.9Z',
  monitor: 'M4 5h16v10.5H4zM9.5 20h5M12 15.5V20',
  chevronDown: 'm6 9.5 6 6 6-6',
  chevronUp: 'm6 14.5 6-6 6 6',
  chevronLeft: 'm14.5 6-6 6 6 6',
  chevronRight: 'm9.5 6 6 6-6 6',
  chevronsUpDown: 'm8 9 4-4 4 4M8 15l4 4 4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  alertTriangle: 'M12 4.5 2.8 20h18.4L12 4.5ZM12 10v4.5M12 17.5h.01',
  alertCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v5M12 16h.01',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12.2l2.4 2.4 4.6-4.9',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01',
  flag: 'M5 21V4M5 4h11l-1.6 3.4L16 11H5',
  skip: 'M6 5v14M18 5v14M8 12h9M14 8.5 17.5 12 14 15.5',
  play: 'M8 5.5v13l11-6.5-11-6.5Z',
  pause: 'M9 5.5v13M15 5.5v13',
  stop: 'M6.5 6.5h11v11h-11z',
  download: 'M12 4v11M7.5 11l4.5 4.5 4.5-4.5M4.5 19.5h15',
  upload: 'M12 16V4.5M7.5 9 12 4.5 16.5 9M4.5 19.5h15',
  printer: 'M7 9V4h10v5M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6H7z',
  trash: 'M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5 7.5 20h9l1-13.5M10 10v6.5M14 10v6.5',
  edit: 'M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5l-1 3ZM14.5 7.5l2 2',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  filter: 'M4 5.5h16l-6.2 7.2V19l-3.6 1.5v-7.8L4 5.5Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  external: 'M14 5h5v5M19 5l-8 8M17 14v4.5A1.5 1.5 0 0 1 15.5 20h-9A1.5 1.5 0 0 1 5 18.5v-9A1.5 1.5 0 0 1 6.5 8H11',
  keyboard:
    'M3.5 6.5h17v11h-17zM7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M7 13.5h.01M17.5 13.5h.01M10 13.5h4.5',
  save: 'M5 4.5h11L19.5 8v11.5h-15zM8 4.5v5h7v-5M8 19.5v-6h8v6',
  copy: 'M9 9.5h9.5V19H9zM15 9.5v-4H5.5V15h3.5',
  archive: 'M3.5 5h17v3.5h-17zM5 8.5V19h14V8.5M9.5 12h5',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  phone:
    'M20 16.5v2.5a1.5 1.5 0 0 1-1.7 1.5A17 17 0 0 1 3.5 5.7 1.5 1.5 0 0 1 5 4h2.5a1.5 1.5 0 0 1 1.5 1.3c.1.9.3 1.7.6 2.5a1.5 1.5 0 0 1-.4 1.6L8.2 10.5a13 13 0 0 0 5.3 5.3l1.1-1a1.5 1.5 0 0 1 1.6-.4c.8.3 1.6.5 2.5.6A1.5 1.5 0 0 1 20 16.5Z',
  mapPin: 'M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0ZM12 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  link: 'M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7L11.9 6.4M13.5 10.5a4 4 0 0 0-5.7 0L5 13.3a4 4 0 1 0 5.7 5.7l1.4-1.4',
  briefcase: 'M4 8h16v11.5H4zM9 8V5.5h6V8M4 13h16',
  calendar: 'M4.5 6.5h15v13h-15zM8 4v4M16 4v4M4.5 11h15',
  star: 'm12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8L12 4Z',
  trendingUp: 'm4 16 5-5 3.5 3.5L20 8M15.5 8H20v4.5',
  loader: 'M12 3v3.5M12 17.5V21M5 12H1.5M22.5 12H19M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  panelLeft: 'M4 5h16v14H4zM10 5v14',
  database: 'M12 8.5c4.4 0 8-1.1 8-2.5s-3.6-2.5-8-2.5-8 1.1-8 2.5 3.6 2.5 8 2.5ZM4 6v12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V6M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5',
  shield: 'M12 21s7-3.2 7-8.5V5.8L12 3 5 5.8v6.7C5 17.8 12 21 12 21ZM9 12l2.2 2.2L15.5 10',
  compare: 'M7.5 4.5v15M16.5 4.5v15M4 8.5h7M13 15.5h7M11 8.5 8.5 6M11 8.5 8.5 11M13 15.5l2.5-2.5M13 15.5l2.5 2.5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  fileText: 'M6 3.5h8L18.5 8v12.5h-13zM14 3.5V8h4.5M8.5 12h7M8.5 15.5h7M8.5 18h4',
  refresh: 'M20 5.5v5h-5M4 18.5v-5h5M19.2 9.5A7.5 7.5 0 0 0 6.2 7.2L4 9.5M4.8 14.5a7.5 7.5 0 0 0 13 2.3l2.2-2.3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  mic: 'M12 14.5a3 3 0 0 0 3-3v-5a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3ZM6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6',
  award: 'M12 14.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5',
  zap: 'M13 3 5 13.5h6L11 21l8-10.5h-6L13 3Z',
  logo: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM8.5 14.5l2.5 2.5 5-6.5',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.75, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={`animate-spin ${className ?? ''}`}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
