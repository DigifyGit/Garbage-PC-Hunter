from seleniumbase import SB
import json
import os
import sys


def _extract_manual_cookies(raw_cookie_data):
    if not raw_cookie_data:
        return []

    parsed = json.loads(raw_cookie_data)
    cookies = parsed if isinstance(parsed, list) else parsed.get("cookies", [])
    required = {"datr", "c_user", "xs"}

    return [cookie for cookie in cookies if cookie.get("name") in required and cookie.get("value")]


def scrape_fb():
    results = []
    # uc=True activates Undetected ChromeDriver to bypass WAFs
    with SB(uc=True, headless=True) as sb:
        try:
            sb.open("https://www.facebook.com/")

            for cookie in _extract_manual_cookies(os.getenv("FACEBOOK_AUTH")):
                sb.driver.add_cookie(
                    {
                        "name": cookie["name"],
                        "value": cookie["value"],
                        "domain": cookie.get("domain", ".facebook.com"),
                        "path": cookie.get("path", "/"),
                    }
                )

            sb.open("https://www.facebook.com/marketplace/lisbon/search/?query=port%C3%A1til&maxPrice=500")
            sb.sleep(4)
            # Dismiss the unauthenticated login wall modal
            sb.press_keys("body", "\x1b")
            sb.sleep(2)

            # Extract basic text chunks from the grid (simplified extraction)
            items = sb.find_elements('div[style*="max-width"]')
            for item in items[:15]:
                text = item.text.replace("\n", " ")
                if "€" in text:
                    results.append(
                        {
                            "title": text,
                            "price": 0,
                            "description": "FB Listing",
                            "url": "https://facebook.com/marketplace",
                        }
                    )

            if not results:
                sb.save_screenshot("public/fb_debug.png")
        except Exception as e:
            print(f"FB_ERROR: {str(e)}")
            sys.exit(1)

    print(json.dumps(results))


if __name__ == "__main__":
    scrape_fb()
