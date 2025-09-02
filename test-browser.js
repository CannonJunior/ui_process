const puppeteer = require('puppeteer');

async function testUIOpportunityFlow() {
    console.log('🚀 Starting browser automation test...');
    
    const browser = await puppeteer.launch({ 
        headless: false,  // Set to false to see what's happening
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => console.log('🌐 PAGE:', msg.text()));
        page.on('pageerror', error => console.error('❌ PAGE ERROR:', error.message));
        
        console.log('📖 Navigating to http://localhost:8000...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
        
        console.log('⏱️ Waiting for page to load...');
        await page.waitForTimeout(5000);
        
        console.log('🔍 Looking for add button...');
        const addButton = await page.$('.add-button');
        if (!addButton) {
            throw new Error('Add button not found!');
        }
        
        console.log('🖱️ Clicking add button...');
        await addButton.click();
        await page.waitForTimeout(1000);
        
        console.log('🔍 Looking for opportunity menu item...');
        const oppMenuItem = await page.$('[data-add-type="opportunity"]');
        if (!oppMenuItem) {
            throw new Error('Opportunity menu item not found!');
        }
        
        console.log('🖱️ Clicking opportunity menu item...');
        await oppMenuItem.click();
        await page.waitForTimeout(1000);
        
        console.log('📝 Filling opportunity form...');
        await page.type('#opportunityTitle', 'Browser Test Opportunity');
        await page.type('#opportunityDescription', 'This is a test from browser automation');
        await page.select('#opportunityStatus', 'active');
        
        console.log('🖱️ Clicking Create button...');
        const createButton = await page.$('#opportunityModalCreate');
        if (!createButton) {
            throw new Error('Create button not found!');
        }
        
        await createButton.click();
        await page.waitForTimeout(3000);
        
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testUIOpportunityFlow();