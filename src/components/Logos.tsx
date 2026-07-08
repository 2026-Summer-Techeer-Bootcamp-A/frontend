interface LogoProps {
  size?: number
}

export function GoogleLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A21.99 21.99 0 0 0 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.94 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
      />
    </svg>
  )
}

export function AmazonLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path
        fill="#111"
        d="M13 20.8c0-3.9 3.2-6.4 7.3-6.4 2 0 4.3.55 5.8 2.05 1.9 1.85 1.7 4.3 1.7 6.98v6.35c0 1.9.8 2.73 1.55 3.75.26.36.32.8.01 1.07-.86.72-2.38 2.04-3.22 2.79l-.02-.02c-.28.25-.69.27-1.01.1-1.42-1.18-1.68-1.73-2.45-2.85-2.35 2.4-4.01 3.12-7.05 3.12-3.6 0-6.4-2.22-6.4-6.66 0-3.47 1.88-5.83 4.56-6.99 2.32-1.02 5.56-1.2 8.03-1.48v-.55c0-1.02.08-2.22-.52-3.1-.52-.79-1.52-1.12-2.4-1.12-1.63 0-3.08.84-3.44 2.57-.07.38-.35.76-.74.78l-3.72-.4c-.31-.07-.66-.32-.57-.8Zm10.35 3.53v-.79c-3.08 0-6.34.66-6.34 4.29 0 1.84.95 3.08 2.59 3.08 1.2 0 2.27-.74 2.95-1.94.84-1.48.8-2.87.8-4.64Z"
      />
      <path
        fill="#FF9900"
        d="M36.2 37.4c-3.8 2.8-9.3 4.3-14 4.3-6.6 0-12.6-2.45-17.1-6.52-.35-.32-.04-.76.39-.51 4.86 2.83 10.87 4.53 17.08 4.53 4.19 0 8.79-.87 13.03-2.67.64-.27 1.17.42.6.84Z"
      />
      <path
        fill="#FF9900"
        d="M37.78 35.6c-.49-.62-3.22-.3-4.45-.15-.37.04-.43-.28-.09-.52 2.18-1.53 5.75-1.09 6.17-.58.42.52-.11 4.1-2.15 5.81-.31.26-.61.12-.47-.23.46-1.15 1.48-3.72.99-4.34Z"
      />
    </svg>
  )
}

export function NetflixLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#E50914" d="M14 6h6.4l7.2 20.4V6H34v36h-6.1l-7.5-21.2V42H14V6Z" />
    </svg>
  )
}

export function MicrosoftLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="5" y="5" width="17" height="17" fill="#F25022" />
      <rect x="26" y="5" width="17" height="17" fill="#7FBA00" />
      <rect x="5" y="26" width="17" height="17" fill="#00A4EF" />
      <rect x="26" y="26" width="17" height="17" fill="#FFB900" />
    </svg>
  )
}

export function FigmaLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#1ABCFE" d="M24 24a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" />
      <path fill="#0ACF83" d="M12 36a6 6 0 0 1 6-6h6v6a6 6 0 1 1-12 0Z" />
      <path fill="#FF7262" d="M24 6h6a6 6 0 1 1 0 12h-6V6Z" />
      <path fill="#F24E1E" d="M12 12a6 6 0 0 1 6-6h6v12h-6a6 6 0 0 1-6-6Z" />
      <path fill="#A259FF" d="M12 24a6 6 0 0 1 6-6h6v12h-6a6 6 0 0 1-6-6Z" />
    </svg>
  )
}

export function AdobeLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#FA0F00" d="M28 8h13v32L28 8Z" />
      <path fill="#FA0F00" d="M20 8H7v32L20 8Z" />
      <path fill="#FA0F00" d="M24 20l8 20h-5.2l-2.4-6h-5.8L24 20Z" />
    </svg>
  )
}
