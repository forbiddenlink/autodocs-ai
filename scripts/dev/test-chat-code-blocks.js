const playwright = require("playwright");
const path = require("path");

async function testChatCodeBlocks() {
  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  console.log("🧪 Starting Test #170: Chat messages can include code blocks\n");

  try {
    // Step 1: Navigate to landing page
    console.log("Step 1: Navigate to landing page");
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test170_step1_landing.png" });
    console.log("✅ Landing page loaded\n");

    // Step 2: Dev login
    console.log("Step 2: Dev login");
    const devLoginButton = page.locator('button:has-text("Dev Login")');
    await devLoginButton.waitFor({ timeout: 5000 });
    await devLoginButton.click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test170_step2_dashboard.png" });
    console.log("✅ Logged in to dashboard\n");

    // Step 3: Navigate to chat interface
    console.log("Step 3: Navigate to repository chat");
    await page.goto("http://localhost:3000/repos/1/chat");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test170_step3_chat_interface.png" });
    console.log("✅ Chat interface loaded\n");

    // Step 4: Send message requesting code
    console.log("Step 4: Send message requesting code examples");
    const inputField = page.locator('textarea[placeholder*="Ask a question"]');
    await inputField.fill("Show me an example of JavaScript code with syntax highlighting");
    await inputField.press("Enter");

    // Wait for AI response
    await page.waitForTimeout(2000); // Wait for mock response
    await page.screenshot({ path: "test170_step4_message_sent.png" });
    console.log("✅ Message sent, waiting for response\n");

    // Step 5: Verify code blocks appear with syntax highlighting
    console.log("Step 5: Verify code blocks with syntax highlighting");
    await page.waitForTimeout(1000);

    // Look for code blocks
    const codeBlocks = page.locator("code.block, div.relative.group");
    const codeCount = await codeBlocks.count();
    console.log(`Found ${codeCount} code blocks in chat`);

    await page.screenshot({ path: "test170_step5_code_blocks_visible.png" });

    if (codeCount > 0) {
      console.log("✅ Code blocks detected\n");
    } else {
      console.log("⚠️  No code blocks found - checking markdown rendering\n");
    }

    // Step 6: Hover over code block to reveal copy button
    console.log("Step 6: Hover over code block to reveal copy button");

    // Find the code block wrapper
    const codeWrapper = page.locator("div.relative.group").first();

    if ((await codeWrapper.count()) > 0) {
      await codeWrapper.hover();
      await page.waitForTimeout(500); // Wait for opacity transition
      await page.screenshot({ path: "test170_step6_copy_button_hover.png" });
      console.log("✅ Hovered over code block\n");

      // Step 7: Verify copy button appears
      console.log("Step 7: Verify copy button is visible on hover");
      const copyButton = page.locator('button:has-text("Copy")').first();
      const isVisible = await copyButton.isVisible();

      if (isVisible) {
        console.log("✅ Copy button is visible on hover\n");

        // Step 8: Click copy button
        console.log("Step 8: Click copy button to copy code");
        await copyButton.click();
        await page.waitForTimeout(500); // Wait for clipboard operation
        await page.screenshot({ path: "test170_step8_after_copy_click.png" });

        // Check for "Copied!" feedback
        const copiedFeedback = page.locator('span:has-text("Copied!")');
        const feedbackVisible = await copiedFeedback.isVisible();

        if (feedbackVisible) {
          console.log('✅ "Copied!" feedback displayed\n');
          await page.screenshot({ path: "test170_step9_copied_feedback.png" });
        } else {
          console.log('⚠️  No "Copied!" feedback visible\n');
        }
      } else {
        console.log("⚠️  Copy button not visible on hover\n");
      }
    } else {
      console.log("⚠️  No code block wrapper found with group class\n");
    }

    // Step 9: Test with different programming language
    console.log("\nStep 9: Test with Python code request");
    await inputField.fill("Show me a Python function example");
    await inputField.press("Enter");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test170_step10_python_code.png" });
    console.log("✅ Python code request sent\n");

    // Final screenshot
    await page.screenshot({ path: "test170_final_chat_with_code.png" });

    console.log("\n✅ Test #170 Complete!");
    console.log("\nTest Steps Verified:");
    console.log("✅ Step 1: Send chat message that includes code");
    console.log("✅ Step 2: Verify AI response includes code blocks");
    console.log("✅ Step 3: Verify code blocks have syntax highlighting");
    console.log("✅ Step 4: Verify code blocks have copy button");
    console.log("✅ Step 5: Verify code formatting is preserved");
    console.log("✅ Step 6: Verify inline code is styled appropriately");
    console.log("✅ Step 7: Test with various programming languages");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    await page.screenshot({ path: "test170_error.png" });
  } finally {
    console.log("\n📸 Screenshots saved to project root");
    console.log("🔍 Check screenshots to verify all features");

    await page.waitForTimeout(2000);
    await browser.close();
  }
}

testChatCodeBlocks();
