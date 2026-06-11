import ipaddress
import json
import re
import socket
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}


def _is_url_safe(url: str) -> bool:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if not hostname or hostname in BLOCKED_HOSTS:
        return False
    if hostname.endswith(".local") or hostname.endswith(".internal"):
        return False
    try:
        addresses = socket.getaddrinfo(hostname, None)
        for item in addresses:
            ip = ipaddress.ip_address(item[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
    except Exception:
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    return True


def _extract_urls(prompt: str) -> List[str]:
    return [u.rstrip(".,)") for u in re.findall(r"https?://[^\s]+", prompt)]


def execute_browser_task(prompt: str) -> List[Dict]:
    """Backward-compatible wrapper returning result rows only."""
    outcome = execute_browser_automation(prompt)
    return outcome.get("results", [])


def execute_browser_automation(
    prompt: str,
    task_type: str = "general",
    max_pages: int = 2,
) -> Dict[str, Any]:
    """
    Run a Playwright browser automation task.
    Returns logs, structured results, pages visited, and errors.
    """
    logs: List[str] = []
    errors: List[str] = []
    results: List[Dict[str, Any]] = []
    pages_visited: List[str] = []

    urls = _extract_urls(prompt)
    if not urls:
        errors.append("No URL found in task. Include a public http(s) URL to scrape.")
        return {
            "logs": logs,
            "results": results,
            "pages_visited": pages_visited,
            "errors": errors,
            "page_title": None,
            "extracted_text_preview": None,
        }

    url = urls[0]
    if not _is_url_safe(url):
        errors.append(f"Blocked URL (private/localhost/unsafe): {url}")
        return {
            "logs": logs,
            "results": results,
            "pages_visited": pages_visited,
            "errors": errors,
            "page_title": None,
            "extracted_text_preview": None,
        }

    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        errors.append(f"Playwright not available: {exc}")
        return {
            "logs": logs,
            "results": results,
            "pages_visited": pages_visited,
            "errors": errors,
            "page_title": None,
            "extracted_text_preview": None,
        }

    page_title = None
    text_preview = None

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            current_url = url

            for page_num in range(max_pages):
                logs.append(f"[{page_num + 1}] Navigating to {current_url}")
                page.goto(current_url, wait_until="domcontentloaded", timeout=30000)
                pages_visited.append(current_url)
                page_title = page.title()
                body_text = page.locator("body").inner_text()[:8000]
                text_preview = body_text[:1500]

                page_results = _extract_by_task_type(page, current_url, task_type, body_text)
                results.extend(page_results)
                logs.append(f"[{page_num + 1}] Extracted {len(page_results)} records from page")

                if page_num + 1 >= max_pages:
                    break
                next_url = _find_next_page_url(page, current_url)
                if not next_url or not _is_url_safe(next_url):
                    break
                current_url = next_url

            browser.close()
    except Exception as exc:
        errors.append(str(exc))
        logs.append(f"Error: {exc}")

    # Deduplicate by url/title
    seen = set()
    unique_results = []
    for row in results:
        key = (row.get("title"), row.get("url") or row.get("location"))
        if key in seen:
            continue
        seen.add(key)
        unique_results.append(row)

    return {
        "logs": logs,
        "results": unique_results[:50],
        "pages_visited": pages_visited,
        "errors": errors,
        "page_title": page_title,
        "extracted_text_preview": text_preview,
    }


def _find_next_page_url(page, current_url: str) -> Optional[str]:
    for selector in ['a[rel="next"]', 'a:has-text("Next")', 'a:has-text("›")']:
        try:
            href = page.locator(selector).first.get_attribute("href")
            if href:
                return urljoin(current_url, href)
        except Exception:
            continue
    return None


def _extract_by_task_type(page, url: str, task_type: str, body_text: str) -> List[Dict[str, Any]]:
    hostname = urlparse(url).hostname or ""
    task_type = (task_type or "general").lower().replace(" ", "_")

    if task_type in {"job_search", "job_listings"}:
        return _extract_job_listings(page, hostname)
    if task_type in {"pricing_monitoring", "pricing"}:
        return _extract_pricing(body_text, hostname)
    if task_type in {"table_extraction", "market_data"}:
        return _extract_tables(page, hostname)
    if task_type in {"company_info", "business_information", "competitor_research"}:
        return _extract_company_info(page, hostname, body_text)
    if task_type == "form_filling":
        return _extract_forms(page, hostname)
    return _extract_general_links(page, hostname)


def _extract_job_listings(page, hostname: str) -> List[Dict]:
    links = page.locator("a").evaluate_all(
        """(els) => els.slice(0, 40).map((a, i) => ({
            id: i + 1,
            title: (a.innerText || a.title || 'Listing').trim().slice(0, 200),
            url: a.href
        })).filter(x => x.title.length > 3)"""
    )
    rows = []
    for item in links:
        title = item.get("title", "")
        if not any(k in title.lower() for k in ["developer", "engineer", "job", "position", "role", "hiring"]):
            if len(rows) >= 5:
                continue
        rows.append(
            {
                "id": len(rows) + 1,
                "title": title[:200],
                "company": hostname,
                "location": item.get("url", ""),
                "salary": "-",
                "posted": "-",
                "url": item.get("url"),
            }
        )
        if len(rows) >= 20:
            break
    return rows


def _extract_general_links(page, hostname: str) -> List[Dict]:
    links = page.locator("a").evaluate_all(
        "(els) => els.slice(0, 25).map((a, i) => ({id: i + 1, title: (a.innerText || a.title || 'Link').trim(), url: a.href}))"
    )
    return [
        {
            "id": item["id"],
            "title": item.get("title", "")[:200],
            "company": hostname,
            "location": item.get("url", ""),
            "salary": "-",
            "posted": "-",
            "url": item.get("url"),
        }
        for item in links
        if item.get("url")
    ]


def _extract_pricing(body_text: str, hostname: str) -> List[Dict]:
    prices = re.findall(r"(?:\$|USD|€|£)\s?\d+(?:[.,]\d{2})?", body_text)
    rows = []
    for index, price in enumerate(prices[:20], start=1):
        rows.append(
            {
                "id": index,
                "title": f"Price point {index}",
                "company": hostname,
                "location": "-",
                "salary": price,
                "posted": "detected",
                "price": price,
            }
        )
    return rows


def _extract_tables(page, hostname: str) -> List[Dict]:
    tables = page.locator("table").evaluate_all(
        """(tables) => tables.slice(0, 3).flatMap((table, ti) => {
            const rows = Array.from(table.querySelectorAll('tr')).slice(0, 10);
            return rows.map((row, ri) => {
                const cells = Array.from(row.querySelectorAll('th,td')).map(c => c.innerText.trim());
                return { table: ti + 1, row: ri + 1, cells };
            });
        })"""
    )
    rows = []
    for entry in tables:
        cells = entry.get("cells", [])
        rows.append(
            {
                "id": len(rows) + 1,
                "title": " | ".join(cells[:3])[:200] or f"Row {entry.get('row')}",
                "company": hostname,
                "location": json.dumps(cells),
                "salary": "-",
                "posted": f"table-{entry.get('table')}",
            }
        )
    return rows[:25]


def _extract_company_info(page, hostname: str, body_text: str) -> List[Dict]:
    meta_desc = ""
    try:
        meta_desc = page.locator('meta[name="description"]').first.get_attribute("content") or ""
    except Exception:
        pass
    h1 = ""
    try:
        h1 = page.locator("h1").first.inner_text()[:200]
    except Exception:
        pass
    return [
        {
            "id": 1,
            "title": h1 or hostname,
            "company": hostname,
            "location": meta_desc[:300],
            "salary": "-",
            "posted": body_text[:300],
            "description": meta_desc or body_text[:500],
        }
    ]


def _extract_forms(page, hostname: str) -> List[Dict]:
    forms = page.locator("form").evaluate_all(
        """(forms) => forms.slice(0, 5).map((f, i) => {
            const fields = Array.from(f.querySelectorAll('input,select,textarea')).map(el => ({
                name: el.name || el.id || el.type,
                type: el.type || el.tagName.toLowerCase()
            }));
            return { id: i + 1, action: f.action, fields };
        })"""
    )
    rows = []
    for form in forms:
        rows.append(
            {
                "id": form.get("id", len(rows) + 1),
                "title": f"Form {form.get('id')}",
                "company": hostname,
                "location": form.get("action", ""),
                "salary": "-",
                "posted": json.dumps(form.get("fields", []))[:300],
                "fields": form.get("fields", []),
            }
        )
    return rows
