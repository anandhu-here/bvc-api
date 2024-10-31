export const getLinkConfirmationTemplate = (
  fromOrgName: string,
  toOrgName: string,
  companyName: string
) => {
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Organization Link Confirmed: ${fromOrgName} and ${toOrgName}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f2f2f2;
        padding: 20px;
      }
      .container {
        background-color: white;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      .highlight {
        font-weight: bold;
        color: #4CAF50;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Organization Link Confirmed</h2>
      <p>Dear Admin,</p>
      <p>We are pleased to inform you that the link between <span class="highlight">${fromOrgName}</span> and <span class="highlight">${toOrgName}</span> has been successfully established on ${companyName}.</p>
      <p>This linkage allows for improved collaboration and resource sharing between the two organizations. Here are the key points:</p>
      <ul>
        <li>The link is now active and operational</li>
        <li>Both organizations can now access shared resources as per the link agreement</li>
        <li>Any changes to this link will be communicated to both organizations</li>
      </ul>
      <p>To review the details of this link or make any adjustments:</p>
      <ol>
        <li>Log in to your ${companyName} account</li>
        <li>Navigate to the 'Linked Organizations' section</li>
        <li>Select the relevant organization to view or modify link details</li>
      </ol>
      <p>If you have any questions about this link or need assistance, please don't hesitate to contact our support team.</p>
      <p>Thank you for continuing to use ${companyName} for your organizational needs.</p>
      <p>Best regards,</p>
      <p>The ${companyName} Team</p>
    </div>
  </body>
  </html>`;
};
