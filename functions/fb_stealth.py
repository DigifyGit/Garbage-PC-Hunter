from seleniumbase import SB
import json
import sys


def scrape_fb():
    results = []
    # uc=True activates Undetected ChromeDriver to bypass WAFs
    with SB(uc=True, headless=True) as sb:
        try:
            sb.open("https://www.facebook.com/marketplace/lisbon/search/?query=i7%2016gb&maxPrice=500")
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
        except Exception as e:
            print(f"FB_ERROR: {str(e)}")
            sys.exit(1)

    print(json.dumps(results))


if __name__ == "__main__":
    scrape_fb()
