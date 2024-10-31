// modules/email/templates/org-invitation.ts
export const getOrgInvitationTemplate = (
  organizationName: string,
  inviteLink: string,
  logoUrl: string
) => {
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Organization Linking Invitation - ${organizationName}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f2f2f2;
        padding: 20px;
        margin: 0;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      .logo {
        text-align: center;
        margin-bottom: 30px;
      }
      .logo img {
        max-width: 200px;
        height: auto;
      }
      .button {
        background-color: #0056b3;
        border: none;
        color: white;
        padding: 12px 24px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        margin: 20px 0;
        cursor: pointer;
        border-radius: 5px;
        font-weight: bold;
      }
      .button:hover {
        background-color: #003d82;
      }
      .highlight {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        font-size: 14px;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">
        <img src="${logoUrl}" alt="${organizationName} Logo">
      </div>
      
      <h2>Organization Linking Invitation</h2>
      
      <p>Hello,</p>
      
      <p>You have been invited to link with <strong>${organizationName}</strong> on our platform. This connection will enable seamless collaboration and resource sharing between organizations.</p>
      
      <div class="highlight">
        <p><strong>What happens next:</strong></p>
        <ol>
          <li>Click the "Accept Invitation" button below</li>
          <li>Create your account if you're new to our platform</li>
          <li>Your organization will be automatically linked with ${organizationName}</li>
        </ol>
      </div>
  
      <div style="text-align: center;">
        <a href="${inviteLink}" class="button" target="_blank">
          Accept Invitation
        </a>
      </div>
  
      <p>Benefits of linking organizations:</p>
      <ul>
        <li>Streamlined communication between organizations</li>
        <li>Enhanced collaboration opportunities</li>
        <li>Shared resources and best practices</li>
        <li>Integrated workflow management</li>
      </ul>
  
      <p>This invitation will expire in 7 days for security purposes.</p>
  
      <div class="footer">
        <p>If you didn't expect this invitation or have questions, please contact the ${organizationName} team directly.</p>
        <p>Best regards,<br>The ${organizationName} Team</p>
      </div>
    </div>
  </body>
  </html>`;
};
