export const getJoinRequestAcceptedTemplate = (
  userName: string,
  companyName: string,
  redirectLink: string,
  logoUrl?: string
) => {
  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Join Request Accepted</title>
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
          max-width: 600px;
          margin: 0 auto;
        }
        .logo {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 200px;
          height: auto;
        }
        .button {
          background-color: #4CAF50;
          border: none;
          color: white;
          padding: 10px 20px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <h2>Join Request Accepted</h2>
        <p>Dear ${userName},</p>
        <p>We are pleased to inform you that your request to join <strong>${companyName}</strong> has been accepted!</p>
        <p>You can now access the organization's resources and collaborate with your new team members.</p>
        <p>To get started, please click the button below:</p>
        <p style="text-align: center;">
          <a href="${redirectLink}" target="_blank" class="button">
            Go to Organization
          </a>
        </p>
      </div>
    </body>
    </html>`;
};
