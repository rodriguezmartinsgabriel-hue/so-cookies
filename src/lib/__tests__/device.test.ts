import { describe, it, expect } from "vitest"
import { isMobileUA, isIOSUA, isAndroidUA, isTabletUA } from "@/lib/device"

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
const WINDOWS_PHONE =
  "Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 520) like Gecko"
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const DESKTOP_FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

describe("isMobileUA", () => {
  it("detects iPhone Safari", () => {
    expect(isMobileUA(IPHONE_SAFARI)).toBe(true)
  })

  it("detects Android Chrome", () => {
    expect(isMobileUA(ANDROID_CHROME)).toBe(true)
  })

  it("detects Windows Phone", () => {
    expect(isMobileUA(WINDOWS_PHONE)).toBe(true)
  })

  it("detects iPad Safari as mobile", () => {
    expect(isMobileUA(IPAD_SAFARI)).toBe(true)
  })

  it("returns false for desktop Chrome/Firefox/Safari", () => {
    expect(isMobileUA(DESKTOP_CHROME)).toBe(false)
    expect(isMobileUA(DESKTOP_FIREFOX)).toBe(false)
    expect(isMobileUA(MAC_SAFARI)).toBe(false)
  })

  it("returns false for Googlebot", () => {
    expect(isMobileUA(GOOGLEBOT)).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isMobileUA("")).toBe(false)
  })
})

describe("isIOSUA", () => {
  it("detects iPhone and iPad", () => {
    expect(isIOSUA(IPHONE_SAFARI)).toBe(true)
    expect(isIOSUA(IPAD_SAFARI)).toBe(true)
  })

  it("returns false for Android and desktop", () => {
    expect(isIOSUA(ANDROID_CHROME)).toBe(false)
    expect(isIOSUA(DESKTOP_CHROME)).toBe(false)
  })
})

describe("isAndroidUA", () => {
  it("detects Android", () => {
    expect(isAndroidUA(ANDROID_CHROME)).toBe(true)
  })

  it("returns false for iOS and desktop", () => {
    expect(isAndroidUA(IPHONE_SAFARI)).toBe(false)
    expect(isAndroidUA(DESKTOP_CHROME)).toBe(false)
  })
})

describe("isTabletUA", () => {
  it("detects iPad as tablet", () => {
    expect(isTabletUA(IPAD_SAFARI)).toBe(true)
  })

  it("returns false for phone and desktop", () => {
    expect(isTabletUA(IPHONE_SAFARI)).toBe(false)
    expect(isTabletUA(DESKTOP_CHROME)).toBe(false)
  })
})
