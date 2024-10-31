export const getEmailVerificationTemplate = (
  verificationCode: string,
  companyName: string
) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verify Your Email for ${companyName}</title>
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
      background-color: #e8f5e9;
      padding: 10px;
      border-radius: 5px;
      display: inline-block;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify Your Email for ${companyName}</h2>
    <p>Dear User,</p>
    <p>Thank you for registering with ${companyName}. We're excited to have you on board!</p>
    <p>To complete your registration and activate your account, please use the following verification code:</p>
    <div class="code">${verificationCode}</div>
    <p>Enter this code on our website to verify your email address.</p>
    <p>This code will expire in 24 hours for security reasons. If you don't verify your email within this time, you may need to request a new verification code.</p>
    <p>If you didn't create an account with ${companyName}, please ignore this email or contact our support team if you have concerns.</p>
    <p>For your security, please remember to:</p>
    <ul>
      <li>Never share this verification code with anyone</li>
      <li>Make sure you're on our official website before entering the code</li>
      <li>Contact us immediately if you suspect any unauthorized access to your account</li>
    </ul>
    <p>Thank you for choosing ${companyName}. We look forward to serving you!</p>
    <p>Best regards,</p>
    <p>The ${companyName} Team</p>
  </div>
</body>
</html>`;
};
