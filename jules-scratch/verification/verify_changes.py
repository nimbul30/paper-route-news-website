from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Verify homepage changes
    page.goto("http://localhost:3000/home.html")
    expect(page.get_by_text("Entertainment")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/homepage_verification.png")

    # Verify article page and modal changes
    # First, find an article to click on. We'll take the first one.
    article_link = page.locator(".article-item a").first
    article_link.click()

    page.wait_for_load_state("networkidle")

    # Now on the article page, click the transparency button
    transparency_button = page.locator("#article-transparency-btn")
    expect(transparency_button).to_be_visible()
    transparency_button.click()

    # Wait for the modal to appear
    modal = page.locator("#transparency-modal")
    expect(modal).to_be_visible()

    # Take a screenshot of the modal
    page.screenshot(path="jules-scratch/verification/modal_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)