const MOBILE_UA_PATTERN = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|Opera Mini|IEMobile|BlackBerry/i

const IOS_UA_PATTERN = /iPhone|iPad|iPod/i

const ANDROID_UA_PATTERN = /Android/i

const TABLET_UA_PATTERN = /iPad|Tablet|PlayBook/i

export function isMobileUA(userAgent: string): boolean {
  if (!userAgent) return false
  return MOBILE_UA_PATTERN.test(userAgent)
}

export function isIOSUA(userAgent: string): boolean {
  if (!userAgent) return false
  return IOS_UA_PATTERN.test(userAgent)
}

export function isAndroidUA(userAgent: string): boolean {
  if (!userAgent) return false
  return ANDROID_UA_PATTERN.test(userAgent)
}

export function isTabletUA(userAgent: string): boolean {
  if (!userAgent) return false
  return TABLET_UA_PATTERN.test(userAgent)
}
