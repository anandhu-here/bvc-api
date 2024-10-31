export const getAgencyInvitationTemplate = (
  link: string,
  companyName: string
) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invitation to Join Our Care Home Staff</title>
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
    <h2>Invitation to Join Our Care Home Staff</h2>
    <p>Dear Care Professional,</p>
    <p>We are excited to invite you to join the staff at ${companyName}. As a respected care home in the community, we are always looking for dedicated professionals to join our team and help us provide exceptional care to our residents.</p>
    <p>By joining our care home staff, you will enjoy:</p>
    <ul>
      <li>A supportive and collaborative work environment</li>
      <li>Opportunities for professional growth and development</li>
      <li>Competitive salary and benefits</li>
      <li>The chance to make a real difference in the lives of our residents</li>
    </ul>
    <p>To accept this invitation and learn more about the position, please click the button below:</p>
    <a href="${link}" target="_blank">
      <button class="button">Accept Invitation</button>
    </a>
    <p>We believe that your skills and experience would be a valuable addition to our team, and we look forward to the possibility of working together to provide the highest quality of care for our residents.</p>
    <p>If you have any questions about this opportunity or would like more information, please don't hesitate to contact us.</p>
    <p>Best regards,</p>
    <p>${companyName} Management Team</p>
  </div>
</body>
</html>`;
};
