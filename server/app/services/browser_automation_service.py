import ipaddress
import json
import re
import socket
import time
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
    *,
    steps: Optional[List[Dict[str, Any]]] = None,
    form_data: Optional[Dict[str, str]] = None,
    login_config: Optional[Dict[str, Any]] = None,
    submit_form: bool = False,
    target_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run a Playwright browser automation task.
    Supports extraction, form filling, login automation, and multi-step workflows.
    """
    logs: List[str] = []
    errors: List[str] = []
    results: List[Dict[str, Any]] = []
    pages_visited: List[str] = []

    parsed_steps = steps or _parse_workflow_from_instruction(prompt)
    urls = _extract_urls(prompt)
    if target_url and target_url not in urls:
        urls.insert(0, target_url)
    if login_config and login_config.get("login_url"):
        urls.insert(0, login_config["login_url"])

    if not urls and not parsed_steps:
        errors.append("No URL found in task. Include a public http(s) URL to automate.")
        return _empty_outcome(logs, results, pages_visited, errors)

    url = urls[0] if urls else None
    if url and not _is_url_safe(url):
        errors.append(f"Blocked URL (private/localhost/unsafe): {url}")
        return _empty_outcome(logs, results, pages_visited, errors)

    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        errors.append(f"Playwright not available: {exc}")
        return _empty_outcome(logs, results, pages_visited, errors)

    page_title = None
    text_preview = None
    task_type = (task_type or "general").lower().replace(" ", "_")

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()

            if parsed_steps:
                logs.append(f"Running multi-step workflow ({len(parsed_steps)} steps)")
                step_results = _execute_workflow_steps(page, parsed_steps, logs, errors, pages_visited)
                results.extend(step_results)
            elif task_type == "login_automation" and login_config:
                login_url = login_config.get("login_url") or url
                if not login_url or not _is_url_safe(login_url):
                    errors.append("Valid login URL required for login automation")
                else:
                    logs.append(f"Login automation at {login_url}")
                    page.goto(login_url, wait_until="domcontentloaded", timeout=30000)
                    pages_visited.append(login_url)
                    login_result = _perform_login(page, login_config, logs, errors)
                    results.append(login_result)
                    page_title = page.title()
                    text_preview = page.locator("body").inner_text()[:1500]
                    page_results = _extract_by_task_type(page, page.url, "general", text_preview or "")
                    results.extend(page_results)
            else:
                current_url = url
                for page_num in range(max_pages):
                    logs.append(f"[{page_num + 1}] Navigating to {current_url}")
                    page.goto(current_url, wait_until="domcontentloaded", timeout=30000)
                    pages_visited.append(current_url)
                    page_title = page.title()
                    body_text = page.locator("body").inner_text()[:8000]
                    text_preview = body_text[:1500]

                    if task_type == "form_filling" and form_data:
                        fill_result = _fill_form_fields(page, form_data, submit_form, logs, errors)
                        results.append(fill_result)
                    elif login_config:
                        login_result = _perform_login(page, login_config, logs, errors)
                        results.append(login_result)

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

    seen = set()
    unique_results = []
    for row in results:
        key = (row.get("title"), row.get("url") or row.get("location") or row.get("action"))
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


def _empty_outcome(logs, results, pages_visited, errors):
    return {
        "logs": logs,
        "results": results,
        "pages_visited": pages_visited,
        "errors": errors,
        "page_title": None,
        "extracted_text_preview": None,
    }


def _parse_workflow_from_instruction(prompt: str) -> List[Dict[str, Any]]:
    match = re.search(r"\{[\s\S]*\"steps\"[\s\S]*\}", prompt)
    if not match:
        return []
    try:
        payload = json.loads(match.group(0))
        steps = payload.get("steps", [])
        return [s for s in steps if isinstance(s, dict) and s.get("action")]
    except Exception:
        return []


def _execute_workflow_steps(
    page,
    steps: List[Dict[str, Any]],
    logs: List[str],
    errors: List[str],
    pages_visited: List[str],
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, step in enumerate(steps, start=1):
        action = (step.get("action") or "").lower()
        selector = step.get("selector")
        value = step.get("value")
        url = step.get("url")
        wait_ms = step.get("wait_ms") or 0
        logs.append(f"[step {index}] {action}" + (f" → {selector or url or ''}" if selector or url else ""))
        try:
            if action == "goto":
                if not url or not _is_url_safe(url):
                    errors.append(f"Step {index}: invalid or blocked URL")
                    continue
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                pages_visited.append(url)
                results.append({"id": index, "action": action, "title": f"Navigated to {url}", "url": url})
            elif action == "click" and selector:
                page.locator(selector).first.click(timeout=10000)
                results.append({"id": index, "action": action, "title": f"Clicked {selector}", "selector": selector})
            elif action == "fill" and selector:
                page.locator(selector).first.fill(value or "", timeout=10000)
                results.append({"id": index, "action": action, "title": f"Filled {selector}", "selector": selector})
            elif action == "fill_form" and value:
                form_payload = json.loads(value) if isinstance(value, str) else (value or {})
                if isinstance(form_payload, dict):
                    fill_result = _fill_form_fields(page, form_payload, step.get("submit", False), logs, errors)
                    fill_result["id"] = index
                    results.append(fill_result)
            elif action == "login" and value:
                login_payload = json.loads(value) if isinstance(value, str) else (value or {})
                if isinstance(login_payload, dict):
                    login_result = _perform_login(page, login_payload, logs, errors)
                    login_result["id"] = index
                    results.append(login_result)
            elif action == "wait":
                time.sleep(min((wait_ms or 1000) / 1000.0, 10))
                results.append({"id": index, "action": action, "title": f"Waited {wait_ms or 1000}ms"})
            elif action == "wait_for" and selector:
                page.locator(selector).first.wait_for(timeout=wait_ms or 10000)
                results.append({"id": index, "action": action, "title": f"Waited for {selector}"})
            elif action == "extract":
                body_text = page.locator("body").inner_text()[:8000]
                extracted = _extract_by_task_type(page, page.url, step.get("task_type", "general"), body_text)
                for row in extracted:
                    row["workflow_step"] = index
                results.extend(extracted)
            elif action == "submit" and selector:
                page.locator(selector).first.click(timeout=10000)
                results.append({"id": index, "action": action, "title": f"Submitted via {selector}"})
            else:
                errors.append(f"Step {index}: unsupported or incomplete action '{action}'")
        except Exception as exc:
            errors.append(f"Step {index} failed: {exc}")
            logs.append(f"Step {index} error: {exc}")
    return results


def _fill_form_fields(
    page,
    form_data: Dict[str, str],
    submit: bool,
    logs: List[str],
    errors: List[str],
) -> Dict[str, Any]:
    filled = []
    for field_name, field_value in form_data.items():
        selectors = [
            f'[name="{field_name}"]',
            f'#{field_name}',
            f'[id="{field_name}"]',
            field_name if field_name.startswith(("#", ".", "[")) else None,
        ]
        filled_field = False
        for selector in selectors:
            if not selector:
                continue
            try:
                locator = page.locator(selector).first
                if locator.count() > 0:
                    tag = locator.evaluate("el => el.tagName.toLowerCase()")
                    if tag == "select":
                        locator.select_option(label=field_value)
                    else:
                        locator.fill(str(field_value))
                    filled.append({"field": field_name, "selector": selector, "value": field_value})
                    filled_field = True
                    break
            except Exception:
                continue
        if not filled_field:
            errors.append(f"Could not fill field: {field_name}")

    submitted = False
    if submit and filled:
        for submit_selector in ['button[type="submit"]', 'input[type="submit"]', 'form button']:
            try:
                page.locator(submit_selector).first.click(timeout=5000)
                submitted = True
                logs.append(f"Form submitted via {submit_selector}")
                break
            except Exception:
                continue
        if not submitted:
            errors.append("Form fill succeeded but submit button not found")

    return {
        "id": 0,
        "action": "fill_form",
        "title": f"Filled {len(filled)} field(s)" + (" and submitted" if submitted else ""),
        "fields_filled": filled,
        "submitted": submitted,
    }


def _perform_login(
    page,
    login_config: Dict[str, Any],
    logs: List[str],
    errors: List[str],
) -> Dict[str, Any]:
    username = login_config.get("username", "")
    password = login_config.get("password", "")
    username_selector = login_config.get(
        "username_selector",
        'input[name="username"], input[name="email"], input[type="email"]',
    )
    password_selector = login_config.get(
        "password_selector",
        'input[name="password"], input[type="password"]',
    )
    submit_selector = login_config.get(
        "submit_selector",
        'button[type="submit"], input[type="submit"]',
    )
    try:
        page.locator(username_selector).first.fill(username, timeout=10000)
        page.locator(password_selector).first.fill(password, timeout=10000)
        page.locator(submit_selector).first.click(timeout=10000)
        page.wait_for_load_state("domcontentloaded", timeout=15000)
        logs.append("Login form submitted")
        return {
            "id": 0,
            "action": "login",
            "title": "Login automation completed",
            "url": page.url,
            "status": "submitted",
        }
    except Exception as exc:
        errors.append(f"Login automation failed: {exc}")
        return {
            "id": 0,
            "action": "login",
            "title": "Login automation failed",
            "status": "failed",
            "error": str(exc),
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
