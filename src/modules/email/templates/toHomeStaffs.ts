export const getGeneralInvitationTemplate = (
  link: string,
  companyName: string
) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invitation to Join ${companyName}</title>
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
    <h2>Invitation to Join ${companyName}</h2>
    <p>Dear Invitee,</p>
    <p>We are excited to invite you to join ${companyName}. Our platform is designed to connect professionals and organizations, fostering collaboration and growth in our community.</p>
    <p>By accepting this invitation, you'll gain access to:</p>
    <ul>
      <li>A network of professionals and organizations in your field</li>
      <li>Opportunities for collaboration and partnership</li>
      <li>Valuable resources and tools to support your work</li>
      <li>Updates on industry trends and best practices</li>
    </ul>
    <p>To accept this invitation and set up your account, please click the button below:</p>
    <a href="${link}" target="_blank">
      <button class="button">Accept Invitation</button>
    </a>
    <p>We believe that your participation will add significant value to our community, and we look forward to the possibility of collaborating with you.</p>
    <p>If you have any questions about this invitation or would like more information, please don't hesitate to contact us.</p>
    <p>Best regards,</p>
    <p>The ${companyName} Team</p>
  </div>
</body>
</html>`;
};
