export const getPasswordResetTemplate = (
  resetLink: string,
  companyName: string
) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reset Your Password for ${companyName}</title>
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
    <h2>Reset Your Password for ${companyName}</h2>
    <p>Dear User,</p>
    <p>We received a request to reset your password for your ${companyName} account. If you didn't make this request, please ignore this email.</p>
    <p>To reset your password, please click the button below:</p>
    <a href="${resetLink}" target="_blank">
      <button class="button">Reset Password</button>
    </a>
    <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
    <p>${resetLink}</p>
    <p>This link will expire in 1 hour for security reasons. If you don't reset your password within this time, you may need to request a new password reset link.</p>
    <p>If you didn't request a password reset, please contact our support team immediately as your account may be at risk.</p>
    <p>For your security, please remember to:</p>
    <ul>
      <li>Use a strong, unique password</li>
      <li>Never share your password with anyone</li>
      <li>Enable two-factor authentication if available</li>
    </ul>
    <p>Thank you for using ${companyName}. We're here to help keep your account secure.</p>
    <p>Best regards,</p>
    <p>The ${companyName} Team</p>
  </div>
</body>
</html>`;
};
