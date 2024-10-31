export const getJoinRequestTemplate = (
  requesterName: string,
  requesterEmail: string,
  orgName: string,
  companyName: string
) => {
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>New Join Request for ${orgName}</title>
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
      <h2>New Join Request for ${orgName}</h2>
      <p>Dear ${orgName} Admin,</p>
      <p>A new user has requested to join your organization on ${companyName}. Here are the details of the request:</p>
      <ul>
        <li>Requester Name: <span class="highlight">${requesterName}</span></li>
        <li>Requester Email: <span class="highlight">${requesterEmail}</span></li>
        <li>Organization: <span class="highlight">${orgName}</span></li>
      </ul>
      <p>To review and respond to this request:</p>
      <ol>
        <li>Log in to your ${companyName} account</li>
        <li>Navigate to the 'Join Requests' or 'Pending Members' section</li>
        <li>Review the requester's information</li>
        <li>Choose to approve or decline the request</li>
      </ol>
      <p>Please handle this request at your earliest convenience. If approved, the user will be granted access to your organization based on the role you assign.</p>
      <p>If you have any questions or concerns about this join request, please contact our support team.</p>
      <p>Thank you for your attention to this matter.</p>
      <p>Best regards,</p>
      <p>The ${companyName} Team</p>
    </div>
  </body>
  </html>`;
};
