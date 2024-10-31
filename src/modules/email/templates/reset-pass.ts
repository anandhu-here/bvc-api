export const getPasswordResetTemplate = (
    resetCode: string,
    companyName: string
  ) => {
    return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Password Reset for ${companyName}</title>
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
      .code {
        font-size: 24px;
        font-weight: bold;
        color: #4CAF50;
        padding: 10px;
        background-color: #e8f5e9;
        border-radius: 5px;
        display: inline-block;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Password Reset for ${companyName}</h2>
      <p>Dear User,</p>
      <p>We received a request to reset your password for your ${companyName} account. If you didn't make this request, please ignore this email.</p>
      <p>To reset your password, use the following code:</p>
      <p class="code">${resetCode}</p>
      <p>This code will expire in 1 hour for security reasons. If you don't use this code within this time, you may need to request a new password reset.</p>
      <p>To reset your password:</p>
      <ol>
        <li>Go to the password reset page on our website or app</li>
        <li>Enter this code when prompted</li>
        <li>Create your new password</li>
      </ol>
      <p>If you have any issues or didn't request this password reset, please contact our support team immediately.</p>
      <p>Thank you for using Wyecare.</p>
      <p>Best regards,</p>
      <p>Wyecare Team</p>
    </div>
  </body>
  </html>`;
  };