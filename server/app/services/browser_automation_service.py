import ipaddress
import re
import socket
from typing import Dict, List
from urllib.parse import urlparse


def execute_browser_task(prompt: str) -> List[Dict]:
    """Extract structured link data from the first public URL found in a task prompt."""
    urls = re.findall(r"https?://[^\s]+", prompt)
    if not urls:
        return []
    url = urls[0].rstrip(".,)")
    parsed = urlparse(url)
    try:
        addresses = socket.getaddrinfo(parsed.hostname, None)
        if any(ipaddress.ip_address(item[4][0]).is_private for item in addresses):
            return []
        from playwright.sync_api import sync_playwright

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            links = page.locator("a").evaluate_all(
                "(els) => els.slice(0, 20).map((a, i) => ({id: i + 1, title: (a.innerText || a.title || 'Link').trim(), url: a.href}))"
            )
            title = page.title()
            browser.close()
        return [
            {
                "id": item["id"],
                "title": item["title"][:200],
                "company": parsed.hostname,
                "location": item["url"],
                "salary": "-",
                "posted": title[:100],
            }
            for item in links
            if item.get("url")
        ]
    except Exception:
        return []
