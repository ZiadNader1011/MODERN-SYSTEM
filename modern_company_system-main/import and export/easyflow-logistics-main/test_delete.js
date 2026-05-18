import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => {
      console.error('PAGE ERROR:', error.message);
      console.error(error.stack);
    });

    await page.goto('http://localhost:5173/containers', { waitUntil: 'networkidle0' });
    
    // Add a dummy container directly to bypass state issues
    await page.evaluate(() => {
        const containers = [{id: 'cont1', containerNumber: 'MSKU1234567', type: '20ft', status: 'loading', products:[]}];
        localStorage.setItem('erp_containers', JSON.stringify(containers));
    });
    
    await page.reload({ waitUntil: 'networkidle0' });
    
    // Wait for the trash button to appear
    const trashBtn = await page.$('.lucide-trash-2');
    if (!trashBtn) {
        console.error("Trash button not found!");
        await browser.close();
        return;
    }
    
    console.log("Clicking delete icon...");
    const btn = await trashBtn.evaluateHandle(el => el.closest('button'));
    await btn.click();
    
    // Wait for delete confirm dialog
    await page.waitForSelector('button.bg-destructive', {visible: true, timeout: 2000});
    const confirmBtn = await page.$('button.bg-destructive');
    console.log("Clicking confirm button...");
    await confirmBtn.click();
    
    await new Promise(r => setTimeout(r, 2000));
    console.log("Finished successfully");
    await browser.close();
})();
