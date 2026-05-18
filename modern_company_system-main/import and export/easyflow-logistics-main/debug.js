import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.error('REQUEST FAILED:', request.url(), request.failure().errorText));

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    const content = await page.content();
    console.log("Root div length:", content.includes('<div id="root"></div>'));
    await browser.close();
})();
