import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

async function testWelcomeEmail() {
  try {
    // Set API key
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY not found in environment variables");
    }
    
    sgMail.setApiKey(apiKey);

    console.log("📧 Preparing to send test welcome email...\n");

    // Email configuration
    const msg = {
      to: "thabangsoulo@gmail.com",
      from: "noreply@xtraclass.ai", // Your verified sender email
      templateId: "d-33445780245c44f8857b6348e3d84af9",
      dynamic_template_data: {
        first_name: "Thabang",
        last_name: "Soulo",
        email: "thabangsoulo@gmail.com",
        dashboardLink: "https://xtraclass.ai/dashboard",
      },
    };

    console.log("Email Details:");
    console.log("─────────────────────────────────────");
    console.log(`To: ${msg.to}`);
    console.log(`From: ${msg.from}`);
    console.log(`Template ID: ${msg.templateId}`);
    console.log("\nTemplate Variables:");
    console.log(JSON.stringify(msg.dynamic_template_data, null, 2));
    console.log("─────────────────────────────────────\n");

    // Send email
    const response = await sgMail.send(msg);

    console.log("✅ Email sent successfully!");
    console.log(`Status Code: ${response[0].statusCode}`);
    console.log(`Message ID: ${response[0].headers["x-message-id"]}`);
    console.log("\n📬 Check thabangsoulo@gmail.com for the welcome email!\n");
  } catch (error: any) {
    console.error("❌ Error sending email:");

    if (error.response) {
      console.error("Status:", error.response.statusCode);
      console.error("Body:", error.response.body);
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

// Run the test
testWelcomeEmail();
